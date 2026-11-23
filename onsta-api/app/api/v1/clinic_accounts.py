import hashlib
import io
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.api.v1.auth import Actor, get_current_actor
from app.config import settings
from app.core.security import create_access_token, hash_password
from app.db.database import SessionLocal
from app.services.document_verifier import classify_document as verifier_classify

router = APIRouter(prefix="/registration", tags=["Clinic Registration"])
MAX_FILE_SIZE = 15 * 1024 * 1024
REQUIRED_DOCUMENTS = {"TRADE_LICENSE", "FACILITY_LICENSE", "MOHAP_ADVERTISING"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png"}


def _extract_text(content: bytes, mime_type: str) -> str:
    """Read embedded PDF text first, then use Tesseract OCR for scans and images."""
    try:
        import pymupdf as fitz
        from PIL import Image
        import pytesseract
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="OCR dependencies are missing. Install requirements.txt to analyze clinic documents.") from exc
    import os
    import shutil
    candidates = [
        os.getenv("TESSERACT_CMD"),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
        shutil.which("tesseract"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            pytesseract.pytesseract.tesseract_cmd = c
            break
    try:
        if mime_type == "application/pdf":
            pdf = fitz.open(stream=content, filetype="pdf")
            chunks = []
            for page in pdf:
                page_text = page.get_text()
                if len(page_text.strip()) > 40:
                    chunks.append(page_text)
                else:
                    image = Image.open(io.BytesIO(page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png")))
                    chunks.append(pytesseract.image_to_string(image, lang=os.getenv("TESSERACT_LANGS", "eng")))
            return "\n".join(chunks)
        return pytesseract.image_to_string(Image.open(io.BytesIO(content)), lang=os.getenv("TESSERACT_LANGS", "eng"))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not read this document. Check that Tesseract OCR is installed and the file is a readable PDF, JPEG, or PNG. ({exc})") from exc


def _label_value(text_value: str, labels: str) -> str | None:
    match = re.search(rf"(?:{labels})\s*[:#\-]?\s*([^\n|;]{{2,180}})", text_value, re.I)
    return re.sub(r"\s{2,}", " ", match.group(1)).strip(" :#\t") if match else None


def _classify_document(text_value: str) -> str | None:
    doc_type, confidence, _ = verifier_classify(text_value)
    return doc_type


def _fields_from_text(text_value: str, doc_type: str | None) -> dict:
    fields = {}

    # Extract license numbers strictly based on document type
    if doc_type == "TRADE_LICENSE":
        val = _label_value(text_value, r"(?:trade|commercial|economic|ded|professional)?\s*licen[cs]e(?:\s+(?:no\.?|number|#|id)|(?=[\s]*[:#]))")
        if not val:
            val = _label_value(text_value, r"licen[cs]e\s+(?:no\.?|number|#)")
        if val:
            fields["trade_license_number"] = val
    elif doc_type == "FACILITY_LICENSE":
        val = _label_value(text_value, r"(?:facility|health(?:care)?|medical|dha|doh|mohap)\s*(?:facility\s+)?licen[cs]e(?:\s+(?:no\.?|number|#|id)|(?=[\s]*[:#]))")
        if not val:
            val = _label_value(text_value, r"facility\s+licen[cs]e\s*(?:no\.?|number|#)?")
        if val:
            fields["facility_license_number"] = val
        linked_tl_match = re.search(r"(?:linked\s+trade\s+licen[cs]e|trade\s+licen[cs]e)\s*(?:no\.?|number|#)?\s*[:\n\r]+\s*([A-Za-z0-9\-]{4,40})", text_value, re.I)
        if linked_tl_match:
            fields["trade_license_number"] = linked_tl_match.group(1).strip()
    elif doc_type == "MOHAP_ADVERTISING":
        ap_match = re.search(r"(?:advertising\s+)?permit\s+(?:no\.?|number|#)\s*[:\n\r]+\s*([A-Za-z0-9\-]{4,40})", text_value, re.I)
        if ap_match:
            fields["advertising_permit_number"] = ap_match.group(1).strip()

    patterns = {
        "full_name": r"(?:manager|owner|licensee|license holder|authorized person|contact person|director name|signatory|authorized signatory)",
        "legal_entity_name": r"(?:legal (?:entity )?name|company name|licensee name|licensed to|owner name)",
        "trading_name": r"(?:trade name|trading name|clinic name|facility name)",
        "official_email": r"(?:email|e-mail)",
        "main_phone": r"(?:phone|telephone|mobile|tel)",
        "street_building": r"(?:address|location|premises)",
        "city_area": r"(?:area|district|community)",
        "facility_type": r"(?:facility type|activity|activities|profession)",
    }
    for key, label in patterns.items():
        value = _label_value(text_value, label)
        if value:
            fields[key] = value

    email = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text_value)
    phone = re.search(r"(?:\+?\d[\d ()-]{7,}\d)", text_value)
    if email and "official_email" not in fields:
        fields["official_email"] = email.group(0)
    if phone and "main_phone" not in fields:
        fields["main_phone"] = phone.group(0).strip()
    if "official_email" in fields and "email" not in fields:
        fields["email"] = fields["official_email"]

    for emirate in ("Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"):
        if re.search(rf"\b{re.escape(emirate)}\b", text_value, re.I):
            fields["emirate"] = emirate
            break

    if doc_type == "TRADE_LICENSE" and "trade_license_number" in fields:
        fields.setdefault("legal_entity_name", _label_value(text_value, r"(?:company|establishment|owner) name"))
    if doc_type == "FACILITY_LICENSE" and "facility_license_number" in fields:
        fields.setdefault("facility_type", "Medical Clinic")

    return {k: v for k, v in fields.items() if v}


@router.post("/analyze-documents")
async def analyze_registration_documents(
    files: list[UploadFile] = File(...),
    current_application_id: Optional[str] = Query(None)
):
    if not files or len(files) > 8:
        raise HTTPException(status_code=400, detail="Upload between 1 and 8 clinic documents.")
    documents, combined = [], {}
    for file_index, file in enumerate(files):
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"{file.filename}: upload a PDF, JPEG, or PNG file.")
        content = await file.read(MAX_FILE_SIZE + 1)
        if not content or len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"{file.filename}: empty file or larger than 15 MB.")
        text_value = _extract_text(content, file.content_type)
        kind = _classify_document(text_value)
        fields = _fields_from_text(text_value, kind)
        for key, value in fields.items():
            combined.setdefault(key, value)
        doc_label = {
            "TRADE_LICENSE": "Trade license",
            "FACILITY_LICENSE": "Healthcare facility license",
            "MOHAP_ADVERTISING": "MOHAP Healthcare advertising permit",
            "DOCTOR_LICENSE": "Doctor / Practitioner License (Not valid for clinic registration)",
            "EMIRATES_ID": "Emirates ID card",
        }.get(kind, "Unrecognized document")
        warning = None
        if kind == "DOCTOR_LICENSE":
            warning = "This file is an individual Doctor / Practitioner License. Clinic registration requires a Commercial Trade License, Healthcare Facility License, and MOHAP Advertising Permit."

        doc_entry = {
            "file_index": file_index,
            "file_name": Path(file.filename or "document").name,
            "document_type": kind,
            "document_label": doc_label,
            "ocr_status": "TEXT_FOUND" if text_value.strip() else "NO_TEXT_FOUND",
            "extracted_fields": fields,
            "text_preview": text_value[:400]
        }
        if warning:
            doc_entry["warning"] = warning
        documents.append(doc_entry)

    # Check for duplicate license in DB right at parse time
    trade_no = combined.get("trade_license_number")
    fac_no = combined.get("facility_license_number")
    if trade_no or fac_no:
        async with SessionLocal() as session:
            conditions = []
            params = {}
            if trade_no:
                conditions.append("lower(trade_license_number) = lower(:trade_no)")
                params["trade_no"] = trade_no.strip()
            if fac_no:
                conditions.append("lower(facility_license_number) = lower(:fac_no)")
                params["fac_no"] = fac_no.strip()
            
            dup_query = f"""
                SELECT id::text AS id, legal_entity_name, trade_license_number, facility_license_number
                FROM clinic_applications
                WHERE application_status != 'REJECTED' AND ({' OR '.join(conditions)})
            """
            if current_application_id:
                dup_query += " AND id != CAST(:current_id AS uuid)"
                params["current_id"] = current_application_id
                
            existing_dup = (await session.execute(text(dup_query), params)).mappings().first()
            if existing_dup:
                dup_trade = (existing_dup.get("trade_license_number") or "").lower()
                dup_fac = (existing_dup.get("facility_license_number") or "").lower()
                if trade_no and dup_trade == trade_no.strip().lower():
                    dup_target = f"Trade License '{trade_no}'"
                elif fac_no and dup_fac == fac_no.strip().lower():
                    dup_target = f"Healthcare Facility License '{fac_no}'"
                else:
                    dup_target = f"License '{trade_no or fac_no}'"
                raise HTTPException(
                    status_code=409,
                    detail=f"Duplicate license detected: {dup_target} is already registered by another clinic ({existing_dup.get('legal_entity_name') or 'Registered Entity'})."
                )

    found = {d["document_type"] for d in documents if d["document_type"]}
    return {"documents": documents, "extracted_fields": combined, "missing_document_types": sorted(REQUIRED_DOCUMENTS - found)}


class ClinicAccountRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=180)
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    password: str = Field(min_length=8, max_length=256)
    legal_entity_name: str = Field(min_length=2, max_length=220)
    trading_name: str = Field(min_length=2, max_length=220)
    facility_type: str = Field(min_length=2, max_length=100)
    official_email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    main_phone: str | None = Field(default=None, max_length=32)
    emirate: str = Field(min_length=2, max_length=60)
    city_area: str | None = Field(default=None, max_length=160)
    street_building: str = Field(min_length=2, max_length=2000)
    trade_license_number: str | None = Field(default=None, max_length=100)
    facility_license_number: str | None = Field(default=None, max_length=100)
    contact_person_title: str | None = Field(default=None, max_length=120)
    number_of_branches: int = Field(default=1, ge=1)
    invitation_token: str | None = None


class ClinicAccountUpdateRequest(BaseModel):
    legal_entity_name: str = Field(min_length=2, max_length=220)
    trading_name: str = Field(min_length=2, max_length=220)
    facility_type: str = Field(min_length=2, max_length=100)
    official_email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    main_phone: str | None = Field(default=None, max_length=32)
    emirate: str = Field(min_length=2, max_length=60)
    city_area: str | None = Field(default=None, max_length=160)
    street_building: str = Field(min_length=2, max_length=2000)
    trade_license_number: str | None = Field(default=None, max_length=100)
    facility_license_number: str | None = Field(default=None, max_length=100)
    number_of_branches: int = Field(default=1, ge=1)


@router.post("/applications", status_code=201)
async def register_clinic(payload: ClinicAccountRequest):
    normalized_email = payload.email.strip().lower()
    app_id = str(uuid4())
    application_reference = f"ONSTA-CL-{secrets.token_hex(5).upper()}"
    async with SessionLocal() as session:
        async with session.begin():
            existing = (await session.execute(text("SELECT 1 FROM users WHERE email_normalized = :email"), {"email": normalized_email})).first()
            if existing:
                raise HTTPException(status_code=409, detail="An account already exists for this email.")

            # Validate duplicate clinic registration by license numbers and official email
            dup_conditions = []
            dup_params = {}
            if payload.trade_license_number:
                dup_conditions.append("lower(trade_license_number) = lower(:trade_no)")
                dup_params["trade_no"] = payload.trade_license_number.strip()
            if payload.facility_license_number:
                dup_conditions.append("lower(facility_license_number) = lower(:fac_no)")
                dup_params["fac_no"] = payload.facility_license_number.strip()
            if payload.official_email:
                dup_conditions.append("lower(official_email) = lower(:official_email)")
                dup_params["official_email"] = payload.official_email.strip()

            if dup_conditions:
                dup_sql = f"""
                    SELECT legal_entity_name, trade_license_number, facility_license_number, official_email
                    FROM clinic_applications
                    WHERE application_status != 'REJECTED' AND ({' OR '.join(dup_conditions)})
                """
                dup_clinic = (await session.execute(text(dup_sql), dup_params)).mappings().first()
                if dup_clinic:
                    dup_trade = (dup_clinic.get("trade_license_number") or "").lower()
                    dup_fac = (dup_clinic.get("facility_license_number") or "").lower()
                    if payload.trade_license_number and dup_trade == payload.trade_license_number.strip().lower():
                        raise HTTPException(status_code=409, detail=f"Duplicate registration: Trade License '{payload.trade_license_number}' is already registered in ONSTA.")
                    if payload.facility_license_number and dup_fac == payload.facility_license_number.strip().lower():
                        raise HTTPException(status_code=409, detail=f"Duplicate registration: Facility License '{payload.facility_license_number}' is already registered in ONSTA.")
                    raise HTTPException(status_code=409, detail=f"A clinic with official email '{payload.official_email}' is already registered in ONSTA.")

            invitation_id = None
            source = "PUBLIC_PAGE"
            if payload.invitation_token:
                token_hash = hashlib.sha256(payload.invitation_token.encode()).hexdigest()
                invitation = (await session.execute(text("""
                    SELECT id::text AS id, source, status, expires_at
                    FROM clinic_invitations WHERE token_hash = :token_hash FOR UPDATE
                """), {"token_hash": token_hash})).mappings().first()
                if not invitation or invitation["status"] in {"EXPIRED", "REVOKED", "ACCEPTED"} or (invitation["expires_at"] and invitation["expires_at"] <= datetime.now(timezone.utc)):
                    raise HTTPException(status_code=400, detail="The invitation is invalid, expired, or already used.")
                invitation_id, source = invitation["id"], invitation["source"]
            user = (await session.execute(text("""
                INSERT INTO users(email, password_hash, full_name, status)
                VALUES (:email, :password_hash, :full_name, 'ACTIVE') RETURNING id::text AS id
            """), {"email": payload.email.strip(), "password_hash": hash_password(payload.password), "full_name": payload.full_name.strip()})).mappings().one()
            await session.execute(text("""
                INSERT INTO clinic_applications(
                    id, application_reference, invitation_id, submitted_by_user_id, source,
                    legal_entity_name, trading_name, facility_type, official_email, main_phone,
                    contact_person_name, contact_person_title, number_of_branches,
                    emirate, city_area, street_building, trade_license_number, facility_license_number, application_status
                ) VALUES (
                    CAST(:id AS uuid), :reference, CAST(:invitation_id AS uuid), CAST(:user_id AS uuid), :source,
                    :legal_name, :trading_name, :facility_type, :official_email, :phone,
                    :full_name, :title, :branches, :emirate, :area, :address, :trade_license_number, :facility_license_number, 'IN_PROGRESS'
                )
            """), {"id": app_id, "reference": application_reference, "invitation_id": invitation_id,
                    "user_id": user["id"], "source": source, "legal_name": payload.legal_entity_name.strip(),
                    "trading_name": payload.trading_name.strip(), "facility_type": payload.facility_type,
                    "official_email": payload.official_email.strip(), "phone": payload.main_phone,
                    "full_name": payload.full_name.strip(), "title": payload.contact_person_title,
                    "branches": payload.number_of_branches, "emirate": payload.emirate,
                    "area": payload.city_area, "address": payload.street_building,
                    "trade_license_number": payload.trade_license_number, "facility_license_number": payload.facility_license_number})
            if invitation_id:
                await session.execute(text("UPDATE clinic_invitations SET status = 'ACCEPTED' WHERE id = CAST(:id AS uuid)"), {"id": invitation_id})
    return {
        "access_token": create_access_token(user["id"]), "token_type": "bearer",
        "user": {"id": user["id"], "email": payload.email.strip(), "full_name": payload.full_name.strip(), "role": "CLINIC_APPLICANT", "workspace": "CLINIC"},
        "application": {"id": app_id, "application_reference": application_reference, "application_status": "IN_PROGRESS"},
    }


@router.get("/applications/{application_id}")
async def get_application_details(application_id: str, actor: Actor = Depends(get_current_actor)):
    async with SessionLocal() as session:
        row = (await session.execute(text("""
            SELECT id::text AS id, application_reference, application_status,
                   legal_entity_name, trading_name, facility_type, official_email,
                   main_phone, emirate, city_area, street_building, number_of_branches,
                   trade_license_number, facility_license_number, contact_person_name, contact_person_title
            FROM clinic_applications
            WHERE id = CAST(:id AS uuid) AND submitted_by_user_id = CAST(:user_id AS uuid)
        """), {"id": application_id, "user_id": actor["id"]})).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Application not found.")
        
        review = (await session.execute(text("""
            SELECT decision, rejection_reason, review_notes, created_at
            FROM clinic_application_reviews
            WHERE application_id = CAST(:id AS uuid)
            ORDER BY created_at DESC LIMIT 1
        """), {"id": application_id})).mappings().first()
        
        result = dict(row)
        if review:
            result["rejection_reason"] = review["rejection_reason"]
            result["review_notes"] = review["review_notes"]
            result["latest_decision"] = review["decision"]
        return result


@router.put("/applications/{application_id}")
async def update_application_details(
    application_id: str,
    payload: ClinicAccountUpdateRequest,
    actor: Actor = Depends(get_current_actor)
):
    async with SessionLocal() as session:
        async with session.begin():
            app = (await session.execute(text("""
                SELECT id::text AS id, application_status FROM clinic_applications
                WHERE id = CAST(:id AS uuid) AND submitted_by_user_id = CAST(:user_id AS uuid) FOR UPDATE
            """), {"id": application_id, "user_id": actor["id"]})).mappings().first()
            if not app:
                raise HTTPException(status_code=404, detail="Application not found.")
            if app["application_status"] == "APPROVED":
                raise HTTPException(status_code=409, detail="Approved applications cannot be modified.")
            
            # Duplication check: skip this clinic's own application (id != application_id)
            dup_conditions = []
            dup_params = {"app_id": application_id}
            if payload.trade_license_number:
                dup_conditions.append("lower(trade_license_number) = lower(:trade_no)")
                dup_params["trade_no"] = payload.trade_license_number.strip()
            if payload.facility_license_number:
                dup_conditions.append("lower(facility_license_number) = lower(:fac_no)")
                dup_params["fac_no"] = payload.facility_license_number.strip()
            if payload.official_email:
                dup_conditions.append("lower(official_email) = lower(:official_email)")
                dup_params["official_email"] = payload.official_email.strip().lower()

            if dup_conditions:
                dup_sql = f"""
                    SELECT legal_entity_name, trade_license_number, facility_license_number
                    FROM clinic_applications
                    WHERE application_status != 'REJECTED'
                      AND id != CAST(:app_id AS uuid)
                      AND ({' OR '.join(dup_conditions)})
                """
                dup_clinic = (await session.execute(text(dup_sql), dup_params)).mappings().first()
                if dup_clinic:
                    raise HTTPException(
                        status_code=409,
                        detail="Another clinic with this Trade License, Facility License, or email is already registered."
                    )

            await session.execute(text("""
                UPDATE clinic_applications SET
                    legal_entity_name = :legal_name,
                    trading_name = :trading_name,
                    facility_type = :facility_type,
                    official_email = :official_email,
                    main_phone = :phone,
                    emirate = :emirate,
                    city_area = :area,
                    street_building = :address,
                    trade_license_number = :trade_no,
                    facility_license_number = :fac_no,
                    number_of_branches = :branches,
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
            """), {
                "id": application_id,
                "legal_name": payload.legal_entity_name.strip(),
                "trading_name": payload.trading_name.strip(),
                "facility_type": payload.facility_type,
                "official_email": payload.official_email.strip(),
                "phone": payload.main_phone,
                "emirate": payload.emirate,
                "area": payload.city_area,
                "address": payload.street_building,
                "trade_no": payload.trade_license_number,
                "fac_no": payload.facility_license_number,
                "branches": payload.number_of_branches
            })
    return {"message": "Application details updated successfully.", "application_id": application_id}


@router.post("/applications/{application_id}/documents/{document_code}", status_code=201)
async def upload_application_document(application_id: str, document_code: str, file: UploadFile = File(...), actor: Actor = Depends(get_current_actor)):
    code = document_code.upper()
    if code not in REQUIRED_DOCUMENTS:
        raise HTTPException(status_code=400, detail="Unsupported onboarding document type.")
    if file.content_type not in {"application/pdf", "image/jpeg", "image/png"}:
        raise HTTPException(status_code=415, detail="Upload a PDF, JPEG, or PNG file.")
    content = await file.read(MAX_FILE_SIZE + 1)
    if not content or len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File is empty or exceeds the 15 MB limit.")
    safe_name = Path(file.filename or "document").name
    storage_key = f"applications/{application_id}/{uuid4()}-{safe_name}"
    destination = Path(settings.LOCAL_UPLOAD_DIR) / storage_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    async with SessionLocal() as session:
        async with session.begin():
            application = (await session.execute(text("""
                SELECT id::text AS id FROM clinic_applications
                WHERE id = CAST(:id AS uuid) AND submitted_by_user_id = CAST(:user_id AS uuid)
                  AND application_status IN ('IN_PROGRESS','DOCUMENTS_PENDING','ADDITIONAL_INFO_REQUESTED','REJECTED')
            """), {"id": application_id, "user_id": actor["id"]})).first()
            if not application:
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=404, detail="Application not found or no longer accepts documents.")
            document_type = (await session.execute(text("SELECT id::text AS id FROM document_types WHERE code = :code AND is_active"), {"code": code})).mappings().first()
            if not document_type:
                raise HTTPException(status_code=500, detail=f"Document type {code} is missing from the full schema seed.")
            await session.execute(text("""
                INSERT INTO clinic_application_documents(
                    application_id, document_type_id, original_file_name, storage_key,
                    storage_backend, mime_type, file_size_bytes, uploaded_by
                ) VALUES (CAST(:application_id AS uuid), CAST(:document_type_id AS uuid), :name,
                    :storage_key, 'LOCAL', :mime_type, :size, CAST(:user_id AS uuid))
                ON CONFLICT(application_id, document_type_id, version)
                DO UPDATE SET original_file_name = EXCLUDED.original_file_name,
                    storage_key = EXCLUDED.storage_key, mime_type = EXCLUDED.mime_type,
                    file_size_bytes = EXCLUDED.file_size_bytes, uploaded_at = now()
            """), {"application_id": application_id, "document_type_id": document_type["id"],
                    "name": safe_name, "storage_key": storage_key, "mime_type": file.content_type,
                    "size": len(content), "user_id": actor["id"]})
    return {"document_type": code, "file_name": safe_name, "status": "UPLOADED"}


@router.post("/applications/{application_id}/submit")
async def submit_clinic_application(application_id: str, actor: Actor = Depends(get_current_actor)):
    async with SessionLocal() as session:
        async with session.begin():
            row = (await session.execute(text("""
                SELECT id::text AS id, application_status FROM clinic_applications
                WHERE id = CAST(:id AS uuid) AND submitted_by_user_id = CAST(:user_id AS uuid) FOR UPDATE
            """), {"id": application_id, "user_id": actor["id"]})).mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="Application not found.")
            if row["application_status"] == "APPROVED":
                raise HTTPException(status_code=409, detail="This application is already approved.")
            if row["application_status"] == "SUBMITTED":
                return {"application_id": application_id, "application_status": "SUBMITTED", "message": "Application is already awaiting Super Admin review."}
            uploaded = set((await session.execute(text("""
                SELECT dt.code FROM clinic_application_documents d
                JOIN document_types dt ON dt.id = d.document_type_id
                WHERE d.application_id = CAST(:id AS uuid)
            """), {"id": application_id})).scalars().all())
            missing = sorted(REQUIRED_DOCUMENTS - uploaded)
            if missing:
                raise HTTPException(status_code=400, detail={"message": "Upload all three required documents before submitting.", "missing_documents": missing})
            old_status = row["application_status"]
            await session.execute(text("""
                UPDATE clinic_applications SET application_status = 'SUBMITTED', submitted_at = now(), updated_at = now()
                WHERE id = CAST(:id AS uuid)
            """), {"id": application_id})
            await session.execute(text("""
                INSERT INTO clinic_application_history(application_id, old_status, new_status, changed_by, reason)
                VALUES (CAST(:id AS uuid), :old_status, 'SUBMITTED', CAST(:user_id AS uuid), 'Clinic submitted required registration documents')
            """), {"id": application_id, "old_status": old_status, "user_id": actor["id"]})
            await session.execute(text("""
                UPDATE clinic_application_info_requests SET status = 'ANSWERED', resolved_at = now()
                WHERE application_id = CAST(:id AS uuid) AND status = 'OPEN'
            """), {"id": application_id})
    return {"application_id": application_id, "application_status": "SUBMITTED", "message": "Application submitted for Super Admin review. Clinic dashboard access remains locked."}
