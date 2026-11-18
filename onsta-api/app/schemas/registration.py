from typing import Optional, List, Any, Dict

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
