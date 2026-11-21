from typing import Optional, List, Any, Dict
from enum import Enum
from datetime import date, datetime

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for attr in dir(self.__class__):
                if not attr.startswith("_"):
                    val = getattr(self.__class__, attr)
                    if not callable(val):
                        setattr(self, attr, val)
            for k, v in kwargs.items():
                setattr(self, k, v)
        def model_dump(self) -> Dict[str, Any]:
            res = {}
            for k, v in self.__dict__.items():
                if hasattr(v, "model_dump"):
                    res[k] = v.model_dump()
                elif isinstance(v, list):
                    res[k] = [(item.model_dump() if hasattr(item, "model_dump") else item) for item in v]
                else:
                    res[k] = v
            return res
    def Field(default=None, default_factory=None, **kwargs):
        return default_factory() if default_factory else default
from app.config import ClinicStatus, DocumentType
from app.schemas.ai_extraction import ThreeDocumentExtractionOutput

class PresignedUrlRequest(BaseModel):
    file_name: str
    file_size_bytes: int = Field(gt=0, le=25 * 1024 * 1024) # max 25MB
    mime_type: str = Field(pattern=r"^(application/pdf|image/jpeg|image/png)$")
    document_type: DocumentType

class PresignedUrlResponse(BaseModel):
    document_id: str
    upload_url: str
    s3_key: str
    expires_in_seconds: int

class FastExtractRequest(BaseModel):
    clinic_id: str
    trade_license_doc_id: str
    facility_license_doc_id: str
    advertising_permit_doc_id: str

class FastExtractResponse(BaseModel):
    clinic_id: str
    status: ClinicStatus
    extracted_data: ThreeDocumentExtractionOutput
    prefilled_fields_count: int
    latency_ms: Optional[float] = None
    ai_model_used: Optional[str] = "gemini-2.0-flash"
    storage_backend: Optional[str] = "local"

class SubmitRegistrationRequest(BaseModel):
    clinic_id: str
    contact_phone: str = Field(pattern=r"^\+971[0-9]{8,9}$", description="UAE phone starting with +971")
    company_email: str
    declarations_accepted: bool = Field(default=True)

class SubmitRegistrationResponse(BaseModel):
    clinic_id: str
    status: ClinicStatus
    message: str
    dashboard_unlocked: bool
    review_queue_id: Optional[str] = None

class DashboardGateCheckResponse(BaseModel):
    clinic_id: str
    status: ClinicStatus
    access_granted: bool
    dashboard_url: Optional[str] = None
    lock_reason: Optional[str] = None


class OnboardingSource(str, Enum):
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"
    QR_CODE = "QR_CODE"
    SALES = "SALES"
    PARTNER_REFERRAL = "PARTNER_REFERRAL"
    PUBLIC_PAGE = "PUBLIC_PAGE"


class ClinicInvitationCreateRequest(BaseModel):
    clinic_name: str = Field(min_length=2, max_length=200)
    contact_name: Optional[str] = Field(default=None, max_length=180)
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    phone: Optional[str] = Field(default=None, max_length=32)
    emirate: Optional[str] = Field(default=None, max_length=60)
    facility_type: Optional[str] = Field(default=None, max_length=100)
    source: OnboardingSource = OnboardingSource.EMAIL
    sales_representative: Optional[str] = Field(default=None, max_length=180)
    referral_partner: Optional[str] = Field(default=None, max_length=180)
    internal_notes: Optional[str] = None


class ClinicInvitationCreateResponse(BaseModel):
    invitation_id: str
    onboarding_url: str
    expires_at: datetime
    status: str


class OnboardingApplicationRequest(BaseModel):
    legal_name: str = Field(min_length=2, max_length=255)
    trading_name: str = Field(min_length=2, max_length=255)
    official_email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    contact_name: str = Field(min_length=2, max_length=180)
    contact_title: Optional[str] = Field(default=None, max_length=120)
    phone: str = Field(pattern=r"^\+971[0-9]{8,9}$", description="UAE phone starting with +971")
    facility_type: str = Field(min_length=2, max_length=100)
    company_registration_number: Optional[str] = Field(default=None, max_length=100)
    trade_license_number: Optional[str] = Field(default=None, max_length=100)
    trade_license_authority: Optional[str] = Field(default=None, max_length=100)
    trade_license_issue_date: Optional[date] = None
    trade_license_expiry_date: Optional[date] = None
    facility_license_number: Optional[str] = Field(default=None, max_length=100)
    facility_license_authority: Optional[str] = Field(default=None, max_length=100)
    facility_license_issue_date: Optional[date] = None
    facility_license_expiry_date: Optional[date] = None
    emirate: str = Field(min_length=2, max_length=60)
    city_area: str = Field(min_length=2, max_length=160)
    street_building: str = Field(min_length=2)
    office_unit: Optional[str] = Field(default=None, max_length=80)
    po_box: Optional[str] = Field(default=None, max_length=40)
    number_of_branches: Optional[int] = Field(default=1, ge=1)
    authorized_representative_name: Optional[str] = Field(default=None, max_length=180)
    representative_email: Optional[str] = Field(default=None, max_length=255)
    representative_phone: Optional[str] = Field(default=None, max_length=40)


class OnboardingApplicationResponse(BaseModel):
    clinic_id: str
    application_reference: str
    application_status: str
    message: str
