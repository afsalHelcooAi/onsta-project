from fastapi import APIRouter, HTTPException, Query, status
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import func, select
from app.config import ClinicStatus
from app.db.database import SessionLocal
from app.db.models import (AIExtractedField, AIScanJob, ApplicationHistory, ClinicApplication,
                           ClinicApplicationDocument, ClinicApplicationInfoRequest, ClinicApplicationReview)
from app.services.clinic_service import clinic_service
from app.core.state_machine import ClinicStateMachine
from app.schemas.registration import ClinicInvitationCreateRequest, ClinicInvitationCreateResponse

router = APIRouter(prefix="/admin", tags=["Software Admin - Clinic Compliance & Approvals"])


@router.post("/invitations", response_model=ClinicInvitationCreateResponse, status_code=201)
async def create_clinic_invitation(payload: ClinicInvitationCreateRequest):
    """Create a single-use, expiring clinic onboarding link. The raw token is returned only once."""
    invitation, token = await clinic_service.create_invitation(payload)
    return ClinicInvitationCreateResponse(
        invitation_id=invitation.id,
        onboarding_url=f"/api/v1/registration/invitations/{token}",
        expires_at=invitation.expires_at,
        status=invitation.status,
    )

class AdminClinicListItem(BaseModel):
    clinic_id: str
    legal_name: Optional[str]
    display_name: Optional[str]
    contact_phone: Optional[str]
    company_email: Optional[str]
    status: ClinicStatus
    is_approved: bool
    documents_count: int

class AdminActionRequest(BaseModel):
    reason: Optional[str] = "Approved by compliance review"

class AdminInfoRequest(BaseModel):
    requested_fields: List[str]
    message: str
    due_at: Optional[datetime] = None

class AdminActionResponse(BaseModel):
    clinic_id: str
    status: ClinicStatus
    is_approved: bool
    message: str

@router.get("/clinics", response_model=List[AdminClinicListItem])
async def list_clinics_for_admin(status_filter: Optional[str] = Query(None, alias="status")):
    """
    Endpoint for Software Admin:
    List all registered clinics and their approval status.
    Filter by status: UNDER_REVIEW, SUBMITTED, APPROVED, etc.
    """
    async with SessionLocal() as session:
        query = select(ClinicApplication, func.count(ClinicApplicationDocument.document_id)).outerjoin(
            ClinicApplicationDocument, ClinicApplicationDocument.clinic_id == ClinicApplication.clinic_id
        ).group_by(ClinicApplication.clinic_id).order_by(ClinicApplication.created_at.desc())
        if status_filter and status_filter.upper() != "ALL":
            query = query.where(ClinicApplication.application_status == status_filter.upper())
        rows = (await session.execute(query)).all()
        return [AdminClinicListItem(
            clinic_id=c.clinic_id, legal_name=c.legal_name or "Pending Document Scan",
            display_name=c.display_name or "Pending Document Scan", contact_phone=c.contact_phone or "Not provided",
            company_email=c.company_email or "Not provided", status=ClinicStatus(c.status),
            is_approved=c.is_approved, documents_count=count
        ) for c, count in rows]

@router.get("/clinics/{clinic_id}")
async def get_clinic_details_for_admin(clinic_id: str):
    """
    Endpoint for Software Admin:
    Retrieve full application package: Trade License, Facility License, MOHAP Permit, and extracted AI data.
    """
    from fastapi import HTTPException
    async with SessionLocal() as session:
        clinic = await session.get(ClinicApplication, clinic_id)
        if clinic is None:
            raise HTTPException(status_code=404, detail="Clinic application not found")
        docs = (await session.scalars(select(ClinicApplicationDocument).where(ClinicApplicationDocument.clinic_id == clinic_id))).all()
        jobs = (await session.scalars(select(AIScanJob).where(AIScanJob.clinic_id == clinic_id).order_by(AIScanJob.created_at.desc()))).all()
        job_ids = [job.id for job in jobs]
        extracted_fields = (await session.scalars(select(AIExtractedField).where(AIExtractedField.scan_job_id.in_(job_ids)))).all() if job_ids else []
        reviews = (await session.scalars(select(ClinicApplicationReview).where(ClinicApplicationReview.clinic_id == clinic_id).order_by(ClinicApplicationReview.created_at.desc()))).all()
        history = (await session.scalars(select(ApplicationHistory).where(ApplicationHistory.clinic_id == clinic_id).order_by(ApplicationHistory.created_at.desc()))).all()
        return {
            "clinic_id": clinic.clinic_id, "application_reference": clinic.application_reference,
            "status": clinic.application_status, "is_approved": clinic.is_approved,
            "legal_name": clinic.legal_name, "display_name": clinic.display_name,
            "contact_phone": clinic.contact_phone, "company_email": clinic.company_email,
            "documents": {d.document_id: {"type": d.document_type, "storage_key": d.storage_key, "file_name": d.file_name, "backend": d.storage_backend} for d in docs},
            "extracted_data": clinic.extracted_data,
            "ai_fields": [{"field_key": f.field_key, "value": f.extracted_value, "confidence": float(f.confidence_score) if f.confidence_score is not None else None, "review_status": f.review_status} for f in extracted_fields],
            "reviews": [{"decision": r.decision, "reviewer": r.reviewer, "notes": r.review_notes, "created_at": r.created_at} for r in reviews],
            "history": [{"old_status": h.old_status, "new_status": h.new_status, "reason": h.reason, "created_at": h.created_at} for h in history],
        }

@router.post("/clinics/{clinic_id}/approve", response_model=AdminActionResponse)
async def approve_clinic(clinic_id: str, payload: AdminActionRequest):
    """
    Endpoint for Software Admin:
    Approve clinic application. Transitions status to APPROVED and unlocks Clinic Partner Dashboard!
    """
    from fastapi import HTTPException
    async with SessionLocal() as session:
        async with session.begin():
            clinic = await session.get(ClinicApplication, clinic_id)
            if clinic is None:
                raise HTTPException(status_code=404, detail="Clinic application not found")
            old_status = clinic.status
            clinic.status = ClinicStatus.APPROVED.value
            clinic.application_status = clinic.status
            clinic.is_approved = True
            session.add(ApplicationHistory(clinic_id=clinic_id, old_status=old_status, new_status=clinic.status, reason=payload.reason, changed_by="admin"))
            session.add(ClinicApplicationReview(clinic_id=clinic_id, reviewer="admin", decision="APPROVED", review_notes=payload.reason))
        return AdminActionResponse(clinic_id=clinic.clinic_id, status=ClinicStatus(clinic.status), is_approved=True, message=f"Clinic approved successfully. Reason: {payload.reason}. Dashboard access is now LIVE.")

@router.post("/clinics/{clinic_id}/reject", response_model=AdminActionResponse)
async def reject_clinic(clinic_id: str, payload: AdminActionRequest):
    """
    Endpoint for Software Admin:
    Reject or request modification from clinic with specific compliance reason.
    """
    from fastapi import HTTPException
    async with SessionLocal() as session:
        async with session.begin():
            clinic = await session.get(ClinicApplication, clinic_id)
            if clinic is None:
                raise HTTPException(status_code=404, detail="Clinic application not found")
            old_status = clinic.status
            clinic.status = ClinicStatus.REJECTED.value
            clinic.application_status = clinic.status
            clinic.is_approved = False
            session.add(ApplicationHistory(clinic_id=clinic_id, old_status=old_status, new_status=clinic.status, reason=payload.reason, changed_by="admin"))
            session.add(ClinicApplicationReview(clinic_id=clinic_id, reviewer="admin", decision="REJECTED", rejection_reason=payload.reason))
        return AdminActionResponse(clinic_id=clinic.clinic_id, status=ClinicStatus(clinic.status), is_approved=False, message=f"Clinic application rejected. Reason: {payload.reason}")


@router.post("/clinics/{clinic_id}/request-info")
async def request_application_information(clinic_id: str, payload: AdminInfoRequest):
    if not payload.requested_fields:
        raise HTTPException(status_code=400, detail="Select at least one field or document to request.")
    async with SessionLocal() as session:
        async with session.begin():
            clinic = await session.get(ClinicApplication, clinic_id)
            if clinic is None:
                raise HTTPException(status_code=404, detail="Clinic application not found")
            old_status = clinic.status
            clinic.status = ClinicStatus.ADDITIONAL_INFO_REQUESTED.value
            clinic.application_status = clinic.status
            session.add(ClinicApplicationInfoRequest(
                clinic_id=clinic_id, requested_fields=payload.requested_fields,
                request_message=payload.message, due_at=payload.due_at, status="OPEN", requested_by="admin",
            ))
            session.add(ClinicApplicationReview(
                clinic_id=clinic_id, reviewer="admin", decision="REQUESTED_INFO", review_notes=payload.message,
            ))
            session.add(ApplicationHistory(
                clinic_id=clinic_id, old_status=old_status, new_status=clinic.status,
                reason=payload.message, changed_by="admin",
            ))
        return {"clinic_id": clinic_id, "status": clinic.status, "requested_fields": payload.requested_fields}
