from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from pydantic import BaseModel
from app.config import ClinicStatus
from app.services.clinic_service import clinic_service
from app.core.state_machine import ClinicStateMachine

router = APIRouter(prefix="/admin", tags=["Software Admin - Clinic Compliance & Approvals"])

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

class AdminActionResponse(BaseModel):
    clinic_id: str
    status: ClinicStatus
    is_approved: bool
    message: str

@router.get("/clinics", response_model=List[AdminClinicListItem])
def list_clinics_for_admin(status_filter: Optional[str] = Query(None, alias="status")):
    """
    Endpoint for Software Admin:
    List all registered clinics and their approval status.
    Filter by status: UNDER_REVIEW, SUBMITTED, APPROVED, etc.
    """
    items = []
    for c_id, c in clinic_service.clinics.items():
        if status_filter and status_filter.upper() != "ALL":
            if c.status.value != status_filter.upper():
                continue
        items.append(AdminClinicListItem(
            clinic_id=c.clinic_id,
            legal_name=c.legal_name or "Pending Document Scan",
            display_name=c.display_name or "Pending Document Scan",
            contact_phone=c.contact_phone or "Not provided",
            company_email=c.company_email or "Not provided",
            status=c.status,
            is_approved=c.is_approved,
            documents_count=len(c.documents)
        ))
    return items

@router.get("/clinics/{clinic_id}")
def get_clinic_details_for_admin(clinic_id: str):
    """
    Endpoint for Software Admin:
    Retrieve full application package: Trade License, Facility License, MOHAP Permit, and extracted AI data.
    """
    clinic = clinic_service.get_or_create_clinic(clinic_id)
    return {
        "clinic_id": clinic.clinic_id,
        "status": clinic.status,
        "is_approved": clinic.is_approved,
        "legal_name": clinic.legal_name,
        "display_name": clinic.display_name,
        "contact_phone": clinic.contact_phone,
        "company_email": clinic.company_email,
        "documents": clinic.documents,
        "extracted_data": clinic.extracted_data
    }

@router.post("/clinics/{clinic_id}/approve", response_model=AdminActionResponse)
def approve_clinic(clinic_id: str, payload: AdminActionRequest):
    """
    Endpoint for Software Admin:
    Approve clinic application. Transitions status to APPROVED and unlocks Clinic Partner Dashboard!
    """
    clinic = clinic_service.get_or_create_clinic(clinic_id)
    
    clinic.status = ClinicStatus.APPROVED
    clinic.is_approved = True
    
    return AdminActionResponse(
        clinic_id=clinic.clinic_id,
        status=clinic.status,
        is_approved=clinic.is_approved,
        message=f"Clinic approved successfully. Reason: {payload.reason}. Dashboard access is now LIVE."
    )

@router.post("/clinics/{clinic_id}/reject", response_model=AdminActionResponse)
def reject_clinic(clinic_id: str, payload: AdminActionRequest):
    """
    Endpoint for Software Admin:
    Reject or request modification from clinic with specific compliance reason.
    """
    clinic = clinic_service.get_or_create_clinic(clinic_id)
    clinic.status = ClinicStatus.REJECTED
    clinic.is_approved = False
    
    return AdminActionResponse(
        clinic_id=clinic.clinic_id,
        status=clinic.status,
        is_approved=clinic.is_approved,
        message=f"Clinic application rejected. Reason: {payload.reason}"
    )
