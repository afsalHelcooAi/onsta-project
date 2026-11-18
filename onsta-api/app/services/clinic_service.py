from typing import Dict, Any, Optional
from app.config import settings, ClinicStatus, DocumentType
from app.core.state_machine import ClinicStateMachine, DashboardAccessDeniedError
from app.core.idempotency import IdempotencyManager
from app.services.storage_service import StorageService
from app.services.ai_gateway import AIGatewayService
from app.schemas.registration import (
    PresignedUrlRequest,
    PresignedUrlResponse,
    FastExtractRequest,
    FastExtractResponse,
    SubmitRegistrationRequest,
    SubmitRegistrationResponse,
    DashboardGateCheckResponse
)

class ClinicRecord:
    def __init__(self, clinic_id: str, status: ClinicStatus = ClinicStatus.DRAFT):
        self.clinic_id = clinic_id
        self.status = status
        self.legal_name: Optional[str] = None
        self.display_name: Optional[str] = None
        self.contact_phone: Optional[str] = None
        self.company_email: Optional[str] = None
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.extracted_data: Optional[Dict[str, Any]] = None
        self.is_approved: bool = False

class ClinicService:
    def __init__(
        self,
        storage_service: Optional[StorageService] = None,
        ai_gateway: Optional[AIGatewayService] = None,
        idempotency_mgr: Optional[IdempotencyManager] = None
    ):
        self.storage = storage_service or StorageService()
        self.ai = ai_gateway or AIGatewayService()
        self.idempotency = idempotency_mgr or IdempotencyManager()
        # In-memory repository (mirrors Local / RDS PostgreSQL)
        self.clinics: Dict[str, ClinicRecord] = {}

    def get_or_create_clinic(self, clinic_id: str) -> ClinicRecord:
        if clinic_id not in self.clinics:
            self.clinics[clinic_id] = ClinicRecord(clinic_id=clinic_id)
        return self.clinics[clinic_id]

    async def get_upload_url(
        self, clinic_id: str, req: PresignedUrlRequest
    ) -> PresignedUrlResponse:
        clinic = self.get_or_create_clinic(clinic_id)
        
        # State transition: DRAFT -> DOCUMENTS_UPLOADED
        if clinic.status == ClinicStatus.DRAFT:
            clinic.status = ClinicStateMachine.transition(clinic.status, ClinicStatus.DOCUMENTS_UPLOADED)

        res = self.storage.generate_upload_url(
            clinic_id=clinic_id,
            document_type=req.document_type,
            file_name=req.file_name,
            mime_type=req.mime_type
        )

        clinic.documents[res["document_id"]] = {
            "type": req.document_type.value,
            "storage_key": res["storage_key"],
            "file_name": req.file_name,
            "backend": res["backend"]
        }

        return PresignedUrlResponse(
            document_id=res["document_id"],
            upload_url=res["upload_url"],
            s3_key=res["storage_key"],
            expires_in_seconds=res["expires_in_seconds"]
        )

    async def fast_extract_3doc(
        self, req: FastExtractRequest, idempotency_key: Optional[str] = None
    ) -> FastExtractResponse:
        """
        Idempotent 3-Document Extraction Pipeline.
        Triggers Gemini 2.0 Flash multimodal extraction across Trade, Facility, and MOHAP licenses.
        Logs latency in milliseconds for performance analysis.
        """
        # 1. Idempotency Check
        if idempotency_key:
            is_new, cached = await self.idempotency.lock_or_retrieve(idempotency_key)
            if not is_new and cached:
                return FastExtractResponse(**cached)

        clinic = self.get_or_create_clinic(req.clinic_id)
        
        # 2. State machine: Move to PROCESSING
        clinic.status = ClinicStateMachine.transition(clinic.status, ClinicStatus.PROCESSING)

        # 3. Call AI Gateway with Latency Logging
        trade_doc = clinic.documents.get(req.trade_license_doc_id, {"storage_key": "uploads/mock/trade.pdf"})
        facility_doc = clinic.documents.get(req.facility_license_doc_id, {"storage_key": "uploads/mock/facility.pdf"})
        ad_doc = clinic.documents.get(req.advertising_permit_doc_id, {"storage_key": "uploads/mock/ad.pdf"})

        extracted, latency_ms = await self.ai.parse_three_documents(
            trade_storage_key=trade_doc["storage_key"],
            facility_storage_key=facility_doc["storage_key"],
            advertising_storage_key=ad_doc["storage_key"]
        )

        # 4. Pre-fill Clinic Record
        clinic.legal_name = extracted.trade_license.legal_name
        clinic.display_name = extracted.trade_license.trade_name or extracted.facility_license.facility_name
        clinic.extracted_data = extracted.model_dump()

        # 5. Transition to READY_FOR_REVIEW
        clinic.status = ClinicStateMachine.transition(clinic.status, ClinicStatus.READY_FOR_REVIEW)

        response = FastExtractResponse(
            clinic_id=clinic.clinic_id,
            status=clinic.status,
            extracted_data=extracted,
            prefilled_fields_count=26,
            latency_ms=latency_ms,
            ai_model_used=self.ai.model_name,
            storage_backend=self.storage.backend
        )

        # Cache in idempotency store
        if idempotency_key:
            await self.idempotency.mark_completed(idempotency_key, response.model_dump())

        return response

    async def submit_registration(
        self, req: SubmitRegistrationRequest, idempotency_key: Optional[str] = None
    ) -> SubmitRegistrationResponse:
        """
        Final Submission & Automated Approval Gate.
        """
        if idempotency_key:
            is_new, cached = await self.idempotency.lock_or_retrieve(idempotency_key)
            if not is_new and cached:
                return SubmitRegistrationResponse(**cached)

        clinic = self.get_or_create_clinic(req.clinic_id)
        
        # State transition: READY_FOR_REVIEW -> SUBMITTED
        clinic.status = ClinicStateMachine.transition(clinic.status, ClinicStatus.SUBMITTED)
        clinic.contact_phone = req.contact_phone
        clinic.company_email = req.company_email

        # Compliance Rule Check: Check if cross-validation had any fatal flags
        has_flags = False
        if clinic.extracted_data and "cross_validation" in clinic.extracted_data:
            flags = clinic.extracted_data["cross_validation"].get("flags", [])
            has_flags = len(flags) > 0

        if not has_flags:
            # Fast-path auto-approval
            clinic.status = ClinicStateMachine.transition(clinic.status, ClinicStatus.APPROVED)
            clinic.is_approved = True
            msg = "Application Verified & Approved. Full dashboard access unlocked."
            dashboard_unlocked = True
            queue_id = None
        else:
            # Route to admin verification queue
            clinic.status = ClinicStateMachine.transition(clinic.status, ClinicStatus.UNDER_REVIEW)
            clinic.is_approved = False
            msg = "Application submitted. Routed to ONSTA Compliance Officer for manual verification."
            dashboard_unlocked = False
            queue_id = f"QUEUE-{clinic.clinic_id[:8]}"

        resp = SubmitRegistrationResponse(
            clinic_id=clinic.clinic_id,
            status=clinic.status,
            message=msg,
            dashboard_unlocked=dashboard_unlocked,
            review_queue_id=queue_id
        )

        if idempotency_key:
            await self.idempotency.mark_completed(idempotency_key, resp.model_dump())

        return resp

    def check_dashboard_access(self, clinic_id: str) -> DashboardGateCheckResponse:
        """
        Dashboard Gatekeeper.
        Throws DashboardAccessDeniedError if not APPROVED.
        """
        clinic = self.get_or_create_clinic(clinic_id)

        try:
            ClinicStateMachine.assert_dashboard_access(clinic.status)
            return DashboardGateCheckResponse(
                clinic_id=clinic.clinic_id,
                status=clinic.status,
                access_granted=True,
                dashboard_url="/dashboard/overview",
                lock_reason=None
            )
        except DashboardAccessDeniedError as e:
            return DashboardGateCheckResponse(
                clinic_id=clinic.clinic_id,
                status=clinic.status,
                access_granted=False,
                dashboard_url=None,
                lock_reason=str(e)
            )

# Shared singleton service instance across registration and admin modules
clinic_service = ClinicService()
