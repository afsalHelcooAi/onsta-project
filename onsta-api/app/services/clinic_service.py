import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import ClinicStatus
from app.core.idempotency import IdempotencyManager
from app.core.state_machine import ClinicStateMachine, DashboardAccessDeniedError
from app.db.database import SessionLocal
from app.db.models import (AIExtractedField, AIScanJob, ApplicationHistory, ClinicApplication,
                           ClinicApplicationDocument, ClinicInvitation)
from app.schemas.registration import (
    DashboardGateCheckResponse,
    FastExtractRequest,
    FastExtractResponse,
    PresignedUrlRequest,
    PresignedUrlResponse,
    SubmitRegistrationRequest,
    SubmitRegistrationResponse,
    ClinicInvitationCreateRequest,
    OnboardingApplicationRequest,
)
from app.services.ai_gateway import AIGatewayService
from app.services.storage_service import StorageService


class ClinicService:
    def __init__(self, storage_service=None, ai_gateway=None, idempotency_mgr=None):
        self.storage = storage_service or StorageService()
        self.ai = ai_gateway or AIGatewayService()
        self.idempotency = idempotency_mgr or IdempotencyManager()

    async def _get_or_create(self, session: AsyncSession, clinic_id: str) -> ClinicApplication:
        clinic = await session.get(ClinicApplication, clinic_id)
        if clinic is None:
            clinic = ClinicApplication(
                clinic_id=clinic_id,
                status=ClinicStatus.DRAFT.value,
                legal_name="Pending Legal Entity",
                display_name="Pending Clinic",
                facility_type="Medical Clinic",
                company_email="pending@onsta.health",
                contact_phone="+971500000000",
                contact_name="Authorized Representative",
                emirate="Dubai",
                city_area="Dubai",
                street_building="Pending Address"
            )
            session.add(clinic)
            await session.flush()
        return clinic

    async def get_or_create_clinic(self, clinic_id: str) -> ClinicApplication:
        async with SessionLocal() as session:
            async with session.begin():
                return await self._get_or_create(session, clinic_id)

    async def set_clinic_status(self, clinic_id: str, new_status: ClinicStatus):
        async with SessionLocal() as session:
            async with session.begin():
                clinic = await self._get_or_create(session, clinic_id)
                clinic.status = new_status.value
                clinic.application_status = new_status.value

    async def create_invitation(self, req: ClinicInvitationCreateRequest, created_by: str = "platform-admin") -> tuple[ClinicInvitation, str]:
        raw_token = secrets.token_urlsafe(32)
        invitation = ClinicInvitation(
            clinic_name=req.clinic_name, contact_name=req.contact_name, email=req.email,
            phone=req.phone, emirate=req.emirate, facility_type=req.facility_type,
            source=req.source.value, sales_representative=req.sales_representative,
            referral_partner=req.referral_partner,
            token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
            status="SENT", expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            created_by=created_by, internal_notes=req.internal_notes,
        )
        async with SessionLocal() as session:
            async with session.begin():
                session.add(invitation)
                await session.flush()
            await session.refresh(invitation)
            return invitation, raw_token

    async def create_application_from_invitation(self, token: str, req: OnboardingApplicationRequest) -> ClinicApplication:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        async with SessionLocal() as session:
            async with session.begin():
                invitation = await session.scalar(select(ClinicInvitation).where(ClinicInvitation.token_hash == token_hash).with_for_update())
                if invitation is None or invitation.status in {"EXPIRED", "REVOKED"} or invitation.expires_at <= datetime.now(timezone.utc):
                    raise ValueError("Invitation is invalid or expired.")
                existing = await session.scalar(select(ClinicApplication).where(ClinicApplication.invitation_id == invitation.id))
                if existing:
                    return existing
                application = ClinicApplication(
                    invitation_id=invitation.id, source=invitation.source,
                    status=ClinicStatus.DRAFT.value, application_status=ClinicStatus.DRAFT.value,
                    legal_name=req.legal_name, display_name=req.trading_name,
                    company_email=req.official_email, contact_phone=req.phone,
                    contact_name=req.contact_name, contact_title=req.contact_title,
                    facility_type=req.facility_type,
                    company_registration_number=req.company_registration_number,
                    trade_license_number=req.trade_license_number,
                    trade_license_authority=req.trade_license_authority,
                    trade_license_issue_date=req.trade_license_issue_date,
                    trade_license_expiry_date=req.trade_license_expiry_date,
                    facility_license_number=req.facility_license_number,
                    facility_license_authority=req.facility_license_authority,
                    facility_license_issue_date=req.facility_license_issue_date,
                    facility_license_expiry_date=req.facility_license_expiry_date,
                    emirate=req.emirate, city_area=req.city_area, street_building=req.street_building,
                    office_unit=req.office_unit, po_box=req.po_box, number_of_branches=req.number_of_branches,
                    authorized_representative_name=req.authorized_representative_name,
                    representative_email=req.representative_email, representative_phone=req.representative_phone,
                )
                session.add(application)
                await session.flush()
                invitation.status = "ACCEPTED"
                session.add(ApplicationHistory(clinic_id=application.clinic_id, old_status=None, new_status=ClinicStatus.DRAFT.value, reason="Application started from invitation", changed_by="clinic-contact"))
            await session.refresh(application)
            return application

    async def get_upload_url(self, clinic_id: str, req: PresignedUrlRequest) -> PresignedUrlResponse:
        result = self.storage.generate_upload_url(clinic_id, req.document_type, req.file_name, req.mime_type)
        async with SessionLocal() as session:
            async with session.begin():
                clinic = await self._get_or_create(session, clinic_id)
                old_status = clinic.status
                if clinic.status == ClinicStatus.DRAFT.value:
                    clinic.status = ClinicStateMachine.transition(ClinicStatus(clinic.status), ClinicStatus.DOCUMENTS_UPLOADED).value
                    clinic.application_status = clinic.status
                    session.add(ApplicationHistory(clinic_id=clinic_id, old_status=old_status, new_status=clinic.status, reason="Document upload started"))
                session.add(ClinicApplicationDocument(
                    document_id=result["document_id"], clinic_id=clinic_id,
                    document_type=req.document_type.value, file_name=req.file_name,
                    storage_key=result["storage_key"], storage_backend=result["backend"],
                    mime_type=req.mime_type, file_size_bytes=req.file_size_bytes,
                ))
        return PresignedUrlResponse(document_id=result["document_id"], upload_url=result["upload_url"], s3_key=result["storage_key"], expires_in_seconds=result["expires_in_seconds"])

    async def fast_extract_3doc(self, req: FastExtractRequest, idempotency_key: Optional[str] = None) -> FastExtractResponse:
        if idempotency_key:
            is_new, cached = await self.idempotency.lock_or_retrieve(idempotency_key)
            if not is_new and cached:
                return FastExtractResponse(**cached)

        async with SessionLocal() as session:
            async with session.begin():
                clinic = await self._get_or_create(session, req.clinic_id)
                old_status = clinic.status
                clinic.status = ClinicStateMachine.transition(ClinicStatus(clinic.status), ClinicStatus.PROCESSING).value
                clinic.application_status = clinic.status
                session.add(ApplicationHistory(clinic_id=req.clinic_id, old_status=old_status, new_status=clinic.status, reason="Document extraction started"))
                ids = [req.trade_license_doc_id, req.facility_license_doc_id, req.advertising_permit_doc_id]
                docs = (await session.scalars(select(ClinicApplicationDocument).where(ClinicApplicationDocument.document_id.in_(ids), ClinicApplicationDocument.clinic_id == req.clinic_id))).all()
                doc_map = {d.document_id: d.storage_key for d in docs}
                scan_job = AIScanJob(clinic_id=req.clinic_id, provider="gemini" if self.ai.api_key else "local", model_name=self.ai.model_name, status="PROCESSING", started_at=datetime.now(timezone.utc))
                session.add(scan_job)
                await session.flush()
                scan_job_id = scan_job.id

        extracted, latency_ms = await self.ai.parse_three_documents(
            trade_storage_key=doc_map.get(req.trade_license_doc_id, "uploads/mock/trade.pdf"),
            facility_storage_key=doc_map.get(req.facility_license_doc_id, "uploads/mock/facility.pdf"),
            advertising_storage_key=doc_map.get(req.advertising_permit_doc_id, "uploads/mock/ad.pdf"),
        )
        data = extracted.model_dump(mode="json")
        async with SessionLocal() as session:
            async with session.begin():
                clinic = await self._get_or_create(session, req.clinic_id)
                old_status = clinic.status
                clinic.legal_name = extracted.trade_license.legal_name
                clinic.display_name = extracted.trade_license.trade_name or extracted.facility_license.facility_name
                clinic.extracted_data = data
                clinic.status = ClinicStateMachine.transition(ClinicStatus(clinic.status), ClinicStatus.READY_FOR_REVIEW).value
                clinic.application_status = clinic.status
                session.add(ApplicationHistory(clinic_id=req.clinic_id, old_status=old_status, new_status=clinic.status, reason="AI extraction completed"))
                persisted_job = await session.get(AIScanJob, scan_job_id)
                persisted_job.status = "COMPLETED"
                persisted_job.completed_at = datetime.now(timezone.utc)
                sections = {
                    "trade_license": req.trade_license_doc_id,
                    "facility_license": req.facility_license_doc_id,
                    "advertising_permit": req.advertising_permit_doc_id,
                }
                for section, values in data.items():
                    candidate_doc_id = sections.get(section)
                    source_doc_id = candidate_doc_id if candidate_doc_id in doc_map else None
                    if isinstance(values, dict):
                        for key, value in values.items():
                            session.add(AIExtractedField(scan_job_id=scan_job_id, document_id=source_doc_id, field_key=f"{section}.{key}", extracted_value=value, review_status="NEEDS_REVIEW"))
                persisted_docs = (await session.scalars(select(ClinicApplicationDocument).where(ClinicApplicationDocument.document_id.in_(ids), ClinicApplicationDocument.clinic_id == req.clinic_id))).all()
                for doc in persisted_docs:
                    doc.scan_status = "COMPLETED"
        response = FastExtractResponse(clinic_id=req.clinic_id, status=ClinicStatus.READY_FOR_REVIEW, extracted_data=extracted, prefilled_fields_count=26, latency_ms=latency_ms, ai_model_used=self.ai.model_name, storage_backend=self.storage.backend)
        if idempotency_key:
            await self.idempotency.mark_completed(idempotency_key, response.model_dump(mode="json"))
        return response

    async def submit_registration(self, req: SubmitRegistrationRequest, idempotency_key: Optional[str] = None) -> SubmitRegistrationResponse:
        if idempotency_key:
            is_new, cached = await self.idempotency.lock_or_retrieve(idempotency_key)
            if not is_new and cached:
                return SubmitRegistrationResponse(**cached)
        async with SessionLocal() as session:
            async with session.begin():
                clinic = await self._get_or_create(session, req.clinic_id)
                old_status = clinic.status
                clinic.status = ClinicStateMachine.transition(ClinicStatus(clinic.status), ClinicStatus.SUBMITTED).value
                clinic.application_status = clinic.status
                clinic.contact_phone = req.contact_phone
                clinic.company_email = req.company_email
                # AI checks help reviewers; a human admin makes every approval decision.
                clinic.status = ClinicStateMachine.transition(ClinicStatus(clinic.status), ClinicStatus.UNDER_REVIEW).value
                clinic.application_status = clinic.status
                clinic.is_approved = False
                clinic.submitted_at = datetime.now(timezone.utc)
                msg = "Application submitted for manual review. Dashboard access remains locked until an authorized admin approves it."
                queue_id = f"QUEUE-{clinic.clinic_id[:8]}"
                session.add(ApplicationHistory(clinic_id=req.clinic_id, old_status=old_status, new_status=clinic.status, reason="Clinic submitted registration"))
                response = SubmitRegistrationResponse(clinic_id=clinic.clinic_id, status=ClinicStatus(clinic.status), message=msg, dashboard_unlocked=clinic.is_approved, review_queue_id=queue_id)
        if idempotency_key:
            await self.idempotency.mark_completed(idempotency_key, response.model_dump(mode="json"))
        return response

    async def check_dashboard_access(self, clinic_id: str) -> DashboardGateCheckResponse:
        async with SessionLocal() as session:
            clinic = await self._get_or_create(session, clinic_id)
            await session.commit()
            status_value = ClinicStatus(clinic.status)
        try:
            ClinicStateMachine.assert_dashboard_access(status_value)
            return DashboardGateCheckResponse(clinic_id=clinic_id, status=status_value, access_granted=True, dashboard_url="/dashboard/overview")
        except DashboardAccessDeniedError as exc:
            return DashboardGateCheckResponse(clinic_id=clinic_id, status=status_value, access_granted=False, lock_reason=str(exc))


clinic_service = ClinicService()
