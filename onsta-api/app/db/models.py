import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def new_id() -> str:
    return str(uuid.uuid4())


def new_application_reference() -> str:
    return f"ONSTA-CL-{uuid.uuid4().hex[:10].upper()}"


class ClinicInvitation(Base):
    __tablename__ = "clinic_invitations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    clinic_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(180))
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    emirate: Mapped[str | None] = mapped_column(String(60))
    facility_type: Mapped[str | None] = mapped_column(String(100))
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="EMAIL")
    sales_representative: Mapped[str | None] = mapped_column(String(180))
    referral_partner: Mapped[str | None] = mapped_column(String(180))
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="SENT", index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(180))
    internal_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    applications: Mapped[list["ClinicApplication"]] = relationship(back_populates="invitation")


class DocumentType(Base):
    __tablename__ = "document_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(60), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    scope: Mapped[str] = mapped_column(String(24), nullable=False, default="APPLICATION")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class FacilityDocumentRequirement(Base):
    __tablename__ = "facility_document_requirements"
    __table_args__ = (
        UniqueConstraint("emirate", "authority", "facility_type", "document_code", "version", name="uq_facility_doc_requirement_version"),
        CheckConstraint("valid_until IS NULL OR valid_until >= valid_from", name="ck_document_requirement_dates"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    emirate: Mapped[str] = mapped_column(String(60), nullable=False)
    authority: Mapped[str] = mapped_column(String(100), nullable=False)
    facility_type: Mapped[str] = mapped_column(String(100), nullable=False)
    document_code: Mapped[str] = mapped_column(ForeignKey("document_types.code", ondelete="RESTRICT"), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    valid_until: Mapped[date | None] = mapped_column(Date)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class ClinicApplication(Base):
    __tablename__ = "clinic_applications"

    # clinic_id is retained as the existing API key for compatibility; it identifies the application until approval.
    clinic_id: Mapped[str] = mapped_column(String(80), primary_key=True, default=new_id)
    application_reference: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, default=new_application_reference)
    invitation_id: Mapped[str | None] = mapped_column(ForeignKey("clinic_invitations.id", ondelete="SET NULL"), index=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="PUBLIC_PAGE")
    application_status: Mapped[str] = mapped_column(String(32), nullable=False, default="DRAFT", index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="DRAFT", index=True)  # legacy API alias
    legal_name: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(40))
    company_email: Mapped[str | None] = mapped_column(String(255), index=True)
    contact_name: Mapped[str | None] = mapped_column(String(180))
    contact_title: Mapped[str | None] = mapped_column(String(120))
    facility_type: Mapped[str | None] = mapped_column(String(100))
    company_registration_number: Mapped[str | None] = mapped_column(String(100))
    trade_license_number: Mapped[str | None] = mapped_column(String(100))
    trade_license_authority: Mapped[str | None] = mapped_column(String(100))
    trade_license_issue_date: Mapped[date | None] = mapped_column(Date)
    trade_license_expiry_date: Mapped[date | None] = mapped_column(Date)
    facility_license_number: Mapped[str | None] = mapped_column(String(100))
    facility_license_authority: Mapped[str | None] = mapped_column(String(100))
    facility_license_issue_date: Mapped[date | None] = mapped_column(Date)
    facility_license_expiry_date: Mapped[date | None] = mapped_column(Date)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, default="AE")
    emirate: Mapped[str | None] = mapped_column(String(60))
    city_area: Mapped[str | None] = mapped_column(String(160))
    street_building: Mapped[str | None] = mapped_column(Text)
    office_unit: Mapped[str | None] = mapped_column(String(80))
    po_box: Mapped[str | None] = mapped_column(String(40))
    number_of_branches: Mapped[int | None] = mapped_column(Integer)
    authorized_representative_name: Mapped[str | None] = mapped_column(String(180))
    representative_email: Mapped[str | None] = mapped_column(String(255))
    representative_phone: Mapped[str | None] = mapped_column(String(40))
    assigned_reviewer: Mapped[str | None] = mapped_column(String(180))
    is_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    extracted_data: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    invitation: Mapped[ClinicInvitation | None] = relationship(back_populates="applications")
    documents: Mapped[list["ClinicApplicationDocument"]] = relationship(back_populates="clinic", cascade="all, delete-orphan")
    history: Mapped[list["ApplicationHistory"]] = relationship(back_populates="clinic", cascade="all, delete-orphan")
    scan_jobs: Mapped[list["AIScanJob"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    reviews: Mapped[list["ClinicApplicationReview"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    info_requests: Mapped[list["ClinicApplicationInfoRequest"]] = relationship(back_populates="application", cascade="all, delete-orphan")


class ClinicApplicationDocument(Base):
    __tablename__ = "clinic_application_documents"
    __table_args__ = (UniqueConstraint("clinic_id", "document_type", "version", name="uq_application_document_version"),)

    document_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    clinic_id: Mapped[str] = mapped_column(ForeignKey("clinic_applications.clinic_id", ondelete="CASCADE"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(ForeignKey("document_types.code", ondelete="RESTRICT"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    storage_backend: Mapped[str] = mapped_column(String(20), nullable=False, default="local")
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    scan_status: Mapped[str] = mapped_column(String(24), nullable=False, default="PENDING")
    verification_status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    expiry_date: Mapped[date | None] = mapped_column(Date)
    uploaded_by: Mapped[str | None] = mapped_column(String(180))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    clinic: Mapped[ClinicApplication] = relationship(back_populates="documents")


class AIScanJob(Base):
    __tablename__ = "ai_scan_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    clinic_id: Mapped[str] = mapped_column(ForeignKey("clinic_applications.clinic_id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(80), nullable=False, default="local")
    model_name: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="QUEUED")
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application: Mapped[ClinicApplication] = relationship(back_populates="scan_jobs")
    fields: Mapped[list["AIExtractedField"]] = relationship(back_populates="scan_job", cascade="all, delete-orphan")


class AIExtractedField(Base):
    __tablename__ = "ai_extracted_fields"
    __table_args__ = (UniqueConstraint("scan_job_id", "field_key", name="uq_ai_field_per_scan"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    scan_job_id: Mapped[str] = mapped_column(ForeignKey("ai_scan_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("clinic_application_documents.document_id", ondelete="SET NULL"))
    field_key: Mapped[str] = mapped_column(String(120), nullable=False)
    extracted_value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSON)
    normalized_value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSON)
    confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    source_page: Mapped[int | None] = mapped_column(Integer)
    review_status: Mapped[str] = mapped_column(String(24), nullable=False, default="NEEDS_REVIEW")
    confirmed_value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSON)
    reviewed_by: Mapped[str | None] = mapped_column(String(180))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    scan_job: Mapped[AIScanJob] = relationship(back_populates="fields")


class ClinicApplicationReview(Base):
    __tablename__ = "clinic_application_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    clinic_id: Mapped[str] = mapped_column(ForeignKey("clinic_applications.clinic_id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer: Mapped[str | None] = mapped_column(String(180))
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    review_notes: Mapped[str | None] = mapped_column(Text)
    rejection_category: Mapped[str | None] = mapped_column(String(100))
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    resubmission_allowed: Mapped[bool | None] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application: Mapped[ClinicApplication] = relationship(back_populates="reviews")


class ClinicApplicationInfoRequest(Base):
    __tablename__ = "clinic_application_info_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    clinic_id: Mapped[str] = mapped_column(ForeignKey("clinic_applications.clinic_id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by: Mapped[str | None] = mapped_column(String(180))
    requested_fields: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    request_message: Mapped[str] = mapped_column(Text, nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="OPEN")
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application: Mapped[ClinicApplication] = relationship(back_populates="info_requests")


class ApplicationHistory(Base):
    __tablename__ = "application_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    clinic_id: Mapped[str] = mapped_column(ForeignKey("clinic_applications.clinic_id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[str | None] = mapped_column(String(32))
    new_status: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    changed_by: Mapped[str | None] = mapped_column(String(120), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    clinic: Mapped[ClinicApplication] = relationship(back_populates="history")
