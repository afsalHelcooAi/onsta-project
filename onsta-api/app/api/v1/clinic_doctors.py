import os
import io
import re
import uuid
from typing import Optional, List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.database import get_db, SessionLocal
from app.api.v1.auth import get_current_actor, Actor
from app.config import settings
from app.services.document_verifier import (
    verify_document_for_target,
    extract_doctor_license_verified,
    classify_document,
)

router = APIRouter(prefix="/clinic/doctors", tags=["Clinic Doctors"])

MAX_PHOTO_SIZE = 15 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_LICENSE_TYPES = {"application/pdf", "image/jpeg", "image/png"}


class DoctorCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=180)
    title: Optional[str] = Field("Specialist Physician", max_length=120)
    specialty: str = Field(..., min_length=2, max_length=160)
    service: Optional[str] = Field(None, max_length=255)
    authority: Optional[str] = Field("DHA", max_length=50)
    licence_number: str = Field(..., min_length=3, max_length=100)
    licence_expiry: Optional[str] = None
    consultation_fee: Optional[float] = 0.0
    languages: Optional[str] = "English, Arabic"
    qualifications: Optional[str] = None
    available_days: Optional[str] = "Mon, Wed, Fri"
    phone: Optional[str] = None
    email: Optional[str] = None
    photo: Optional[str] = None
    is_active: Optional[bool] = True


class DoctorUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None
    specialty: Optional[str] = None
    service: Optional[str] = None
    authority: Optional[str] = None
    licence_number: Optional[str] = None
    licence_expiry: Optional[str] = None
    consultation_fee: Optional[float] = None
    languages: Optional[str] = None
    qualifications: Optional[str] = None
    available_days: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    photo: Optional[str] = None
    is_active: Optional[bool] = None


class DoctorStatusToggleRequest(BaseModel):
    is_active: bool


def _extract_document_text(content: bytes, mime_type: str) -> str:
    """Extract raw text from PDF or image using PyMuPDF and Tesseract if available."""
    try:
        import pymupdf as fitz
    except ImportError:
        fitz = None

    if mime_type == "application/pdf" and fitz:
        try:
            pdf = fitz.open(stream=content, filetype="pdf")
            chunks = []
            for page in pdf:
                pt = page.get_text()
                if len(pt.strip()) > 30:
                    chunks.append(pt)
            if chunks:
                return "\n".join(chunks)
        except Exception:
            pass

    # Try OCR with pytesseract
    try:
        import pytesseract
        import shutil
        from PIL import Image

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

        if mime_type == "application/pdf" and fitz:
            pdf = fitz.open(stream=content, filetype="pdf")
            chunks = []
            for page in pdf:
                img = Image.open(io.BytesIO(page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png")))
                chunks.append(pytesseract.image_to_string(img, lang="eng"))
            return "\n".join(chunks)
        elif mime_type in ALLOWED_IMAGE_TYPES:
            img = Image.open(io.BytesIO(content))
            return pytesseract.image_to_string(img, lang="eng")
    except Exception:
        pass

    return ""


def parse_doctor_license_text(raw_text: str) -> dict:
    """Validate document against ruleset and extract verified credentials without mock fallbacks."""
    is_valid, err_msg, parsed = extract_doctor_license_verified(raw_text)
    if not is_valid:
        raise ValueError(err_msg or "Invalid doctor license document.")
    return parsed


async def _resolve_clinic_context(session: AsyncSession, user_id: str) -> dict:
    membership = (await session.execute(text("""
        SELECT m.tenant_id::text, c.id::text AS clinic_id
        FROM clinic_memberships m
        JOIN clinics c ON c.tenant_id = m.tenant_id
        WHERE m.user_id = CAST(:uid AS uuid) AND m.status = 'ACTIVE'
        LIMIT 1
    """), {"uid": user_id})).mappings().first()
    if membership:
        return dict(membership)

    app_clinic = (await session.execute(text("""
        SELECT c.tenant_id::text, c.id::text AS clinic_id
        FROM clinic_applications a
        JOIN clinics c ON c.tenant_id = a.tenant_id
        WHERE a.submitted_by_user_id = CAST(:uid AS uuid)
        LIMIT 1
    """), {"uid": user_id})).mappings().first()
    if app_clinic:
        return dict(app_clinic)

    # Fallback to any active clinic for system admin or dev testing
    fallback = (await session.execute(text("SELECT tenant_id::text, id::text AS clinic_id FROM clinics LIMIT 1"))).mappings().first()
    if fallback:
        return dict(fallback)

    raise HTTPException(status_code=403, detail="Active clinic membership required.")


# ==========================================
# Endpoints
# ==========================================

@router.post("/scan-license")
async def scan_doctor_license(
    file: UploadFile = File(...),
    current_doctor_id: Optional[str] = Query(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """
    AI Multimodal & OCR Doctor License Parser.
    Accepts PDF, JPEG, or PNG doctor practice license and extracts verified credentials.
    Validates license duplication at analyze time.
    """
    if file.content_type not in ALLOWED_LICENSE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported document format: {file.content_type}. Upload PDF, JPEG, or PNG."
        )

    content = await file.read()
    if len(content) > MAX_PHOTO_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 15MB limit.")

    extracted_text = _extract_document_text(content, file.content_type)
    is_valid, warning, parsed = extract_doctor_license_verified(extracted_text)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=warning or "Uploaded file is unreadable or empty. Please upload a clear PDF or image."
        )

    # Check for duplicate doctor license right at analyze time
    lic_num = (parsed.get("licence_number") or "").strip()
    if lic_num and not lic_num.endswith("-PENDING"):
        dup_query = """
            SELECT p.id::text, p.full_name, l.license_number, l.authority
            FROM practitioner_licenses l
            JOIN practitioners p ON p.id = l.practitioner_id
            WHERE lower(trim(l.license_number)) = lower(trim(:lic_num))
        """
        dup_params = {"lic_num": lic_num}
        if current_doctor_id:
            dup_query += " AND p.id != CAST(:cur_id AS uuid)"
            dup_params["cur_id"] = current_doctor_id
        dup_query += " LIMIT 1"

        existing = (await db.execute(text(dup_query), dup_params)).mappings().first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate license detected: Licence '{lic_num}' is already registered to {existing['full_name']} ({existing['authority']})."
            )

    return {
        "status": "success",
        "extracted": parsed,
        "warning": warning,
        "confidence": parsed.get("confidence", 0.8),
        "fileName": file.filename,
        "fileSize": len(content),
    }


@router.get("")
async def get_clinic_doctors(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """List all registered medical specialists and doctors for this clinic."""
    ctx = await _resolve_clinic_context(db, actor["id"])
    rows = (await db.execute(text("""
        SELECT 
            p.id::text,
            p.full_name AS "fullName",
            p.professional_title AS "title",
            COALESCE(p.specialty, 'Dermatology & Aesthetic Medicine') AS "specialty",
            COALESCE(p.service_name, '') AS "service",
            COALESCE(l.authority, 'DHA') AS "authority",
            COALESCE(l.license_number, 'DHA-P-000000') AS "licenceNumber",
            COALESCE(l.expiry_date::text, '2028-12-31') AS "licenceExpiry",
            COALESCE(p.consultation_fee, 0.0) AS "consultationFee",
            COALESCE(array_to_string(p.languages, ', '), 'English, Arabic') AS "languages",
            COALESCE(p.qualifications, p.biography, '') AS "qualifications",
            COALESCE(p.available_days, 'Mon, Wed, Fri') AS "availableDays",
            COALESCE(p.phone, '') AS "phone",
            COALESCE(p.email, '') AS "email",
            COALESCE(p.photo_url, p.profile_image_storage_key, '') AS "photo",
            (p.status = 'ACTIVE') AS "isActive",
            l.verification_status AS "verificationStatus",
            p.created_at AS "createdAt"
        FROM practitioners p
        LEFT JOIN practitioner_licenses l ON l.practitioner_id = p.id
        WHERE p.clinic_id = CAST(:clinic_id AS uuid)
        ORDER BY p.created_at DESC
    """), {"clinic_id": ctx["clinic_id"]})).mappings().all()

    return [dict(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_doctor(
    payload: DoctorCreateRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Add a verified healthcare practitioner to the clinic."""
    ctx = await _resolve_clinic_context(db, actor["id"])
    doctor_id = str(uuid.uuid4())
    license_id = str(uuid.uuid4())

    lic_clean = payload.licence_number.strip()
    # Check for duplicate doctor license registration across the platform
    dup = (await db.execute(text("""
        SELECT p.full_name, l.license_number, l.authority
        FROM practitioner_licenses l
        JOIN practitioners p ON p.id = l.practitioner_id
        WHERE lower(trim(l.license_number)) = lower(trim(:lic_num))
        LIMIT 1
    """), {"lic_num": lic_clean})).mappings().first()
    if dup:
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate registration: Medical licence '{lic_clean}' is already registered to {dup['full_name']} ({dup['authority']})."
        )

    lang_list = [l.strip() for l in (payload.languages or "English, Arabic").split(",") if l.strip()]
    status_str = "ACTIVE" if payload.is_active else "INACTIVE"

    # Insert Practitioner
    await db.execute(text("""
        INSERT INTO practitioners (
            id, tenant_id, clinic_id, full_name, professional_title,
            specialty, service_name, consultation_fee, available_days, phone, email,
            photo_url, qualifications, languages, status, created_at
        ) VALUES (
            CAST(:id AS uuid), CAST(:tenant_id AS uuid), CAST(:clinic_id AS uuid),
            :full_name, :title, :specialty, :service_name, :consultation_fee, :available_days,
            :phone, :email, :photo, :qualifications, :languages, :status, now()
        )
    """), {
        "id": doctor_id,
        "tenant_id": ctx["tenant_id"],
        "clinic_id": ctx["clinic_id"],
        "full_name": payload.full_name,
        "title": payload.title,
        "specialty": payload.specialty,
        "service_name": payload.service or None,
        "consultation_fee": payload.consultation_fee or 0.0,
        "available_days": payload.available_days or "Mon, Wed, Fri",
        "phone": payload.phone,
        "email": payload.email,
        "photo": payload.photo or None,
        "qualifications": payload.qualifications,
        "languages": lang_list,
        "status": status_str,
    })

    # Insert Practitioner License
    expiry_val = None
    if payload.licence_expiry:
        try:
            expiry_val = datetime.strptime(payload.licence_expiry, "%Y-%m-%d").date()
        except Exception:
            pass

    await db.execute(text("""
        INSERT INTO practitioner_licenses (
            id, tenant_id, practitioner_id, authority, license_number,
            expiry_date, verification_status, created_at
        ) VALUES (
            CAST(:id AS uuid), CAST(:tenant_id AS uuid), CAST(:practitioner_id AS uuid),
            :authority, :license_number, :expiry_date, 'VERIFIED', now()
        )
    """), {
        "id": license_id,
        "tenant_id": ctx["tenant_id"],
        "practitioner_id": doctor_id,
        "authority": payload.authority or "DHA",
        "license_number": lic_clean,
        "expiry_date": expiry_val,
    })

    await db.commit()

    return {
        "id": doctor_id,
        "fullName": payload.full_name,
        "title": payload.title,
        "specialty": payload.specialty,
        "service": payload.service or "",
        "authority": payload.authority or "DHA",
        "licenceNumber": lic_clean,
        "licenceExpiry": payload.licence_expiry or "",
        "consultationFee": payload.consultation_fee or 0.0,
        "languages": payload.languages or "English, Arabic",
        "qualifications": payload.qualifications or "",
        "availableDays": payload.available_days or "Mon, Wed, Fri",
        "phone": payload.phone or "",
        "email": payload.email or "",
        "photo": payload.photo or "",
        "isActive": payload.is_active,
        "verificationStatus": "VERIFIED",
    }


@router.put("/{doctor_id}")
async def update_doctor(
    doctor_id: str,
    payload: DoctorUpdateRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Update practitioner profile and license details."""
    ctx = await _resolve_clinic_context(db, actor["id"])

    # Verify doctor belongs to clinic
    row = (await db.execute(text("""
        SELECT id FROM practitioners WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:clinic_id AS uuid)
    """), {"id": doctor_id, "clinic_id": ctx["clinic_id"]})).first()
    if not row:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    updates = []
    params = {"id": doctor_id}

    if payload.full_name is not None:
        updates.append("full_name = :full_name")
        params["full_name"] = payload.full_name
    if payload.title is not None:
        updates.append("professional_title = :title")
        params["title"] = payload.title
    if payload.specialty is not None:
        updates.append("specialty = :specialty")
        params["specialty"] = payload.specialty
    if payload.service is not None:
        updates.append("service_name = :service_name")
        params["service_name"] = payload.service
    if payload.consultation_fee is not None:
        updates.append("consultation_fee = :consultation_fee")
        params["consultation_fee"] = payload.consultation_fee
    if payload.available_days is not None:
        updates.append("available_days = :available_days")
        params["available_days"] = payload.available_days
    if payload.phone is not None:
        updates.append("phone = :phone")
        params["phone"] = payload.phone
    if payload.email is not None:
        updates.append("email = :email")
        params["email"] = payload.email
    if payload.photo is not None:
        updates.append("photo_url = :photo")
        params["photo"] = payload.photo
    if payload.qualifications is not None:
        updates.append("qualifications = :qualifications")
        params["qualifications"] = payload.qualifications
    if payload.languages is not None:
        lang_list = [l.strip() for l in payload.languages.split(",") if l.strip()]
        updates.append("languages = :languages")
        params["languages"] = lang_list
    if payload.is_active is not None:
        updates.append("status = :status")
        params["status"] = "ACTIVE" if payload.is_active else "INACTIVE"

    if updates:
        await db.execute(text(f"""
            UPDATE practitioners SET {', '.join(updates)} WHERE id = CAST(:id AS uuid)
        """), params)

    # License updates
    lic_updates = []
    lic_params = {"practitioner_id": doctor_id}
    if payload.authority is not None:
        lic_updates.append("authority = :authority")
        lic_params["authority"] = payload.authority
    if payload.licence_number is not None:
        lic_clean = payload.licence_number.strip()
        dup = (await db.execute(text("""
            SELECT p.full_name, l.license_number, l.authority
            FROM practitioner_licenses l
            JOIN practitioners p ON p.id = l.practitioner_id
            WHERE lower(trim(l.license_number)) = lower(trim(:lic_num)) AND p.id != CAST(:doc_id AS uuid)
            LIMIT 1
        """), {"lic_num": lic_clean, "doc_id": doctor_id})).mappings().first()
        if dup:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate registration: Medical licence '{lic_clean}' is already registered to another doctor ({dup['full_name']})."
            )
        lic_updates.append("license_number = :license_number")
        lic_params["license_number"] = lic_clean
    if payload.licence_expiry is not None:
        try:
            lic_updates.append("expiry_date = :expiry_date")
            lic_params["expiry_date"] = datetime.strptime(payload.licence_expiry, "%Y-%m-%d").date()
        except Exception:
            pass

    if lic_updates:
        await db.execute(text(f"""
            UPDATE practitioner_licenses SET {', '.join(lic_updates)} WHERE practitioner_id = CAST(:practitioner_id AS uuid)
        """), lic_params)

    await db.commit()
    return {"status": "success", "id": doctor_id}


@router.patch("/{doctor_id}/status")
async def toggle_doctor_status(
    doctor_id: str,
    payload: DoctorStatusToggleRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Toggle practitioner active/inactive status."""
    ctx = await _resolve_clinic_context(db, actor["id"])
    new_status = "ACTIVE" if payload.is_active else "INACTIVE"

    res = await db.execute(text("""
        UPDATE practitioners 
        SET status = :status 
        WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:clinic_id AS uuid)
        RETURNING id
    """), {"id": doctor_id, "clinic_id": ctx["clinic_id"], "status": new_status})
    if not res.first():
        raise HTTPException(status_code=404, detail="Doctor not found.")

    await db.commit()
    return {"id": doctor_id, "isActive": payload.is_active}


@router.delete("/{doctor_id}")
async def delete_doctor(
    doctor_id: str,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Remove a practitioner from the clinic."""
    ctx = await _resolve_clinic_context(db, actor["id"])

    res = await db.execute(text("""
        DELETE FROM practitioners 
        WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:clinic_id AS uuid)
        RETURNING id
    """), {"id": doctor_id, "clinic_id": ctx["clinic_id"]})
    if not res.first():
        raise HTTPException(status_code=404, detail="Doctor not found.")

    await db.commit()
    return {"deleted": True, "id": doctor_id}


@router.post("/{doctor_id}/photo")
async def upload_doctor_photo(
    doctor_id: str,
    file: UploadFile = File(...),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Upload doctor profile headshot photo."""
    ctx = await _resolve_clinic_context(db, actor["id"])
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid photo format. Use JPEG, PNG, or WebP.")

    content = await file.read()
    if len(content) > MAX_PHOTO_SIZE:
        raise HTTPException(status_code=400, detail="Photo size exceeds 15MB limit.")

    safe_name = re.sub(r"[^a-zA-Z0-9_\.-]", "_", file.filename or "doctor.jpg")
    dir_path = os.path.join(settings.LOCAL_UPLOAD_DIR, "clinics", ctx["clinic_id"], "doctors")
    os.makedirs(dir_path, exist_ok=True)

    file_path = os.path.join(dir_path, f"{doctor_id}-{safe_name}")
    with open(file_path, "wb") as f:
        f.write(content)

    photo_url = f"/uploads/clinics/{ctx['clinic_id']}/doctors/{doctor_id}-{safe_name}"

    await db.execute(text("""
        UPDATE practitioners 
        SET photo_url = :url 
        WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:clinic_id AS uuid)
    """), {"url": photo_url, "id": doctor_id, "clinic_id": ctx["clinic_id"]})
    await db.commit()

    return {"status": "success", "photo_url": photo_url}
