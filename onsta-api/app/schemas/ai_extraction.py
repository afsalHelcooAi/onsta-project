from typing import List, Optional, Any, Dict

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            # assign defaults from class annotations / attributes
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

class TradeLicenseExtraction(BaseModel):
    legal_name: str = Field(description="Official legal commercial entity name in English/Arabic")
    trade_name: Optional[str] = Field(default=None, description="Commercial display brand name")
    license_number: str = Field(description="Commercial Trade License register number")
    issuing_authority: str = Field(default="DED", description="e.g., DED Dubai, Abu Dhabi DED")
    issue_date: str = Field(description="Issue date in YYYY-MM-DD")
    expiry_date: str = Field(description="License expiration date in YYYY-MM-DD")
    emirate: str = Field(default="Dubai", description="Emirate where registered")
    license_holder_name: Optional[str] = Field(default=None, description="License owner / managing partner name")
    confidence_score: float = Field(default=0.95, ge=0.0, le=1.0)

class FacilityLicenseExtraction(BaseModel):
    facility_name: str = Field(description="Registered Health Facility Name")
    facility_license_number: str = Field(description="Facility code e.g. DHA-F-0012345")
    authority: str = Field(default="DHA", description="DHA, DOH, or MOHAP")
    facility_category: str = Field(default="Medical Clinic", description="e.g. Polyclinic, Dental Clinic")
    expiry_date: str = Field(description="Facility license expiration date in YYYY-MM-DD")
    medical_director_name: Optional[str] = Field(default=None, description="Name of licensed medical director")
    medical_director_license_number: Optional[str] = Field(default=None, description="DHA-P-xxxx physician license")
    permitted_specialties: List[str] = Field(default_factory=list, description="Approved healthcare specialties")
    confidence_score: float = Field(default=0.95, ge=0.0, le=1.0)

class AdvertisingPermitExtraction(BaseModel):
    mohap_permit_number: str = Field(description="MOHAP advertising permit number e.g. MOHAP-ADV-2024-8831")
    approved_channels: List[str] = Field(default_factory=list, description="Permitted channels e.g. Website, Listing")
    expiry_date: str = Field(description="Permit expiry date in YYYY-MM-DD")
    confidence_score: float = Field(default=0.95, ge=0.0, le=1.0)

class CrossValidationResult(BaseModel):
    legal_name_match: bool
    director_found: bool
    is_expired: bool
    flags: List[str] = Field(default_factory=list)
    overall_confidence: float = Field(default=0.95)

class ThreeDocumentExtractionOutput(BaseModel):
    trade_license: TradeLicenseExtraction
    facility_license: FacilityLicenseExtraction
    advertising_permit: AdvertisingPermitExtraction
    cross_validation: CrossValidationResult
