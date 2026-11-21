import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Header, HTTPException, status, UploadFile, File, Query
from typing import Optional
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import ClinicInvitation
from app.services.clinic_service import clinic_service
from app.schemas.registration import (
    PresignedUrlRequest,
    PresignedUrlResponse,
    FastExtractRequest,
    FastExtractResponse,
    SubmitRegistrationRequest,
    SubmitRegistrationResponse,
    DashboardGateCheckResponse,
    OnboardingApplicationRequest,
    OnboardingApplicationResponse,
)

router = APIRouter(prefix="/registration", tags=["Clinic Onboarding & Ingestion"])


@router.get("/invitations/{token}")
async def get_onboarding_invitation(token: str):
    """Validate an invitation token without exposing the stored token hash."""
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    async with SessionLocal() as session:
        invitation = await session.scalar(select(ClinicInvitation).where(ClinicInvitation.token_hash == token_hash))
        if invitation is None or invitation.status in {"EXPIRED", "REVOKED"} or invitation.expires_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=404, detail="Invitation is invalid or expired.")
        return {
            "clinic_name": invitation.clinic_name,
            "contact_name": invitation.contact_name,
            "email": invitation.email,
            "emirate": invitation.emirate,
            "facility_type": invitation.facility_type,
            "expires_at": invitation.expires_at,
            "status": invitation.status,
        }


@router.post("/invitations/{token}/application", response_model=OnboardingApplicationResponse, status_code=201)
async def submit_onboarding_application(token: str, payload: OnboardingApplicationRequest):
    try:
        application = await clinic_service.create_application_from_invitation(token, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return OnboardingApplicationResponse(
        clinic_id=application.clinic_id,
        application_reference=application.application_reference,
        application_status=application.application_status,
        message="Application started. Upload the required documents to continue.",
    )

@router.post("/upload-url/{clinic_id}", response_model=PresignedUrlResponse)
async def get_upload_url(clinic_id: str, payload: PresignedUrlRequest):
    """
    Step 1: Get upload destination URL.
    - In Local Mode: Generates a local upload endpoint path.
    - In S3 Mode (AWS): Generates presigned S3 PUT URL.
    """
    return await clinic_service.get_upload_url(clinic_id, payload)

@router.post("/local-upload/{clinic_id}")
async def upload_document_locally(
    clinic_id: str,
    document_id: str = Query(...),
    document_type: str = Query(...),
    file: UploadFile = File(...)
):
    """
    Local storage upload target for testing without AWS S3.
    Saves document directly to ./uploads/clinics/{clinic_id}/documents/{file_name}.
    """
    import os
    from app.config import settings
    
    clinic_dir = os.path.join(settings.LOCAL_UPLOAD_DIR, f"clinics/{clinic_id}/documents")
    os.makedirs(clinic_dir, exist_ok=True)
    
    file_path = os.path.join(clinic_dir, f"{document_type.lower()}_{document_id}_{file.filename}")
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    return {
        "status": "UPLOADED_LOCALLY",
        "document_id": document_id,
        "saved_path": file_path,
        "size_bytes": len(content)
    }

@router.post("/fast-extract-3doc", response_model=FastExtractResponse)
async def fast_extract_three_docs(
    payload: FastExtractRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Step 2: AI Ingestion & Multimodal Parsing Pipeline (Gemini 2.0 Flash).
    Parses Trade License, Facility License, and MOHAP permit simultaneously.
    Pre-fills 25+ fields and returns precision latency benchmarking metrics.
    """
    return await clinic_service.fast_extract_3doc(payload, idempotency_key=idempotency_key)

@router.get("/ai-speed-benchmark")
def get_ai_speed_benchmarks():
    """
    Speed Analysis Endpoint:
    Returns the real millisecond latency logs and confidence levels of Gemini extractions.
    """
    return {
        "model": clinic_service.ai.model_name,
        "total_scans_logged": len(clinic_service.ai.latency_log),
        "recent_benchmarks": clinic_service.ai.latency_log[-20:]
    }

@router.post("/submit", response_model=SubmitRegistrationResponse)
async def submit_clinic_registration(
    payload: SubmitRegistrationRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Step 3: Submit registration for authorized human review.
    AI extraction supports review; it never approves an application.
    """
    return await clinic_service.submit_registration(payload, idempotency_key=idempotency_key)

@router.get("/dashboard-gate/{clinic_id}", response_model=DashboardGateCheckResponse)
async def check_dashboard_access_gate(clinic_id: str):
    """
    Dashboard Gatekeeper:
    Checks whether clinic status is APPROVED. If not, access is locked.
    """
    return await clinic_service.check_dashboard_access(clinic_id)
