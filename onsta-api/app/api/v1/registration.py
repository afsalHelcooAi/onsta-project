from fastapi import APIRouter, Header, HTTPException, status, UploadFile, File, Query
from typing import Optional
from app.services.clinic_service import clinic_service
from app.schemas.registration import (
    PresignedUrlRequest,
    PresignedUrlResponse,
    FastExtractRequest,
    FastExtractResponse,
    SubmitRegistrationRequest,
    SubmitRegistrationResponse,
    DashboardGateCheckResponse
)

router = APIRouter(prefix="/registration", tags=["Clinic Onboarding & Ingestion"])

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
    Step 3: Submit Registration & Automated Compliance Evaluation.
    If 100% compliant, status transitions to APPROVED and unlocks the dashboard.
    If discrepancies are detected, routes to UNDER_REVIEW for admin sign-off.
    """
    return await clinic_service.submit_registration(payload, idempotency_key=idempotency_key)

@router.get("/dashboard-gate/{clinic_id}", response_model=DashboardGateCheckResponse)
def check_dashboard_access_gate(clinic_id: str):
    """
    Dashboard Gatekeeper:
    Checks whether clinic status is APPROVED. If not, access is locked.
    """
    return clinic_service.check_dashboard_access(clinic_id)
