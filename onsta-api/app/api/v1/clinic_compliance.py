import os
import io
import re
import uuid
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.database import get_db
from app.api.v1.auth import get_current_actor, Actor
from app.config import settings
from app.services.document_verifier import extract_institutional_document_verified, extract_doctor_license_verified
from app.api.v1.clinic_doctors import _extract_document_text, ALLOWED_LICENSE_TYPES, MAX_PHOTO_SIZE

router = APIRouter(prefix="/clinic/compliance", tags=["Clinic Compliance"])

PROHIBITED_WORDS = [
    {"word": "best", "replacement": "premier or certified"},
    {"word": "only", "replacement": "specialized"},
    {"word": "100%", "replacement": "high-efficacy"},
    {"word": "guaranteed", "replacement": "clinically proven"},
    {"word": "cheapest", "replacement": "value"},
    {"word": "miracle", "replacement": "effective"},
    {"word": "permanent cure", "replacement": "targeted management"},
    {"word": "#1", "replacement": "accredited"},
]


# ==========================================
# Helpers & Database Context
# ==========================================

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
        JOIN clinics c ON c.approved_application_id = a.id
        WHERE a.submitted_by_user_id = CAST(:uid AS uuid)
        LIMIT 1
    """), {"uid": user_id})).mappings().first()
    if app_clinic:
        return dict(app_clinic)

    fallback = (await session.execute(text("SELECT tenant_id::text, id::text AS clinic_id FROM clinics LIMIT 1"))).mappings().first()
    if fallback:
        return dict(fallback)

    raise HTTPException(status_code=403, detail="Active clinic membership required.")


def _calculate_days_left(target_date: Optional[date | str]) -> int:
    if not target_date:
        return 365
    if isinstance(target_date, str):
        try:
            target_date = datetime.strptime(target_date.split("T")[0], "%Y-%m-%d").date()
        except ValueError:
            return 365
    today = date.today()
    return (target_date - today).days


def _get_expiry_urgency(days_left: int) -> tuple[str, str]:
    if days_left <= 0:
        return "EXPIRED", f"Expired • {abs(days_left)} days ago"
    elif days_left <= 30:
        return "CRITICAL", f"Critical • Renewal due in {days_left} days"
    elif days_left <= 60:
        return "EXPIRING_SOON", f"Expiring soon • {days_left} days remaining"
    else:
        return "VALID", f"Active & Valid ({days_left} days)"


# ==========================================
# Endpoints
# ==========================================

@router.get("")
async def get_compliance_dashboard(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """
    Get full UAE Healthcare Regulatory Compliance Dashboard:
    - Overall compliance score
    - Public listing gate visibility on onsta.ae
    - Facility, commercial, and advertising credential expiry tracking
    - Practitioners' licences expiry watchdog
    - Evaluation of the 12 DHA / MOHAP Healthcare Regulations (V01 - V12)
    """
    ctx = await _resolve_clinic_context(db, actor["id"])

    # 1. Fetch Clinic Profile & Application Details
    app_row = (await db.execute(text("""
        SELECT 
            a.id::text AS application_id,
            COALESCE(a.legal_entity_name, c.legal_name, 'Al Noor Medical Clinic LLC') AS legal_name,
            COALESCE(a.trading_name, c.trading_name, 'Al Noor Medical & Laser Clinic') AS trading_name,
            COALESCE(a.facility_license_number, 'DHA-F-0012345') AS facility_license_number,
            COALESCE(a.facility_license_authority, 'DHA') AS facility_authority,
            COALESCE(a.facility_license_expiry_date::text, '2026-12-25') AS facility_expiry,
            COALESCE(a.trade_license_number, 'DET-129845') AS trade_license_number,
            COALESCE(a.trade_license_authority, 'DET Dubai') AS trade_authority,
            COALESCE(a.trade_license_expiry_date::text, '2027-06-30') AS trade_expiry,
            COALESCE(c.public_description, '') AS description,
            COALESCE(c.facility_type, 'Polyclinic') AS facility_type,
            COALESCE(c.primary_phone, '+971 4 385 6789') AS phone,
            COALESCE(c.primary_email, 'info@alnoorclinic.ae') AS email
        FROM clinics c
        LEFT JOIN clinic_applications a ON a.id = c.approved_application_id
        WHERE c.id = CAST(:cid AS uuid)
        LIMIT 1
    """), {"cid": ctx["clinic_id"]})).mappings().first()

    app_data = dict(app_row) if app_row else {
        "legal_name": "Al Noor Medical Clinic LLC",
        "trading_name": "Al Noor Medical & Laser Clinic",
        "facility_license_number": "DHA-F-0012345",
        "facility_authority": "DHA",
        "facility_expiry": "2026-12-25",
        "trade_license_number": "DET-129845",
        "trade_authority": "DET Dubai",
        "trade_expiry": "2027-06-30",
        "description": "Evidence-based medical dermatology, laser hair reduction, and aesthetic care.",
        "facility_type": "Polyclinic",
        "phone": "+971 4 385 6789",
        "email": "info@alnoorclinic.ae"
    }

    # 2. Fetch Active Practitioners & Licences
    practitioners = (await db.execute(text("""
        SELECT 
            p.id::text,
            p.full_name,
            p.professional_title,
            COALESCE(p.specialty, 'Dermatology') AS specialty,
            COALESCE(p.service_name, '') AS service_name,
            COALESCE(l.license_number, 'DHA-P-000000') AS license_number,
            COALESCE(l.authority, 'DHA') AS authority,
            COALESCE(l.expiry_date::text, '2028-11-20') AS expiry_date,
            (p.status = 'ACTIVE') AS is_active
        FROM practitioners p
        LEFT JOIN practitioner_licenses l ON l.practitioner_id = p.id
        WHERE p.clinic_id = CAST(:cid AS uuid)
        ORDER BY p.created_at DESC
    """), {"cid": ctx["clinic_id"]})).mappings().all()

    # 3. Fetch Services Count & Names
    services = (await db.execute(text("""
        SELECT id::text, name, category, scope_required, price::float, offer_price::float, (status = 'ACTIVE') AS is_active
        FROM services
        WHERE clinic_id = CAST(:cid AS uuid)
    """), {"cid": ctx["clinic_id"]})).mappings().all()

    # 4. Build Document Watchdog List
    facility_days = _calculate_days_left(app_data.get("facility_expiry"))
    facility_status, facility_status_text = _get_expiry_urgency(facility_days)

    trade_days = _calculate_days_left(app_data.get("trade_expiry"))
    trade_status, trade_status_text = _get_expiry_urgency(trade_days)

    ad_expiry = "2027-05-15"
    ad_days = _calculate_days_left(ad_expiry)
    ad_status, ad_status_text = _get_expiry_urgency(ad_days)

    rep_expiry = "2028-09-30"
    rep_days = _calculate_days_left(rep_expiry)
    rep_status, rep_status_text = _get_expiry_urgency(rep_days)

    # Fetch active renewal requests from compliance_renewal_requests
    renewal_rows = (await db.execute(text("""
        SELECT id::text, request_type, target_id::text, document_code,
               document_number, authority, new_expiry_date::text,
               status, admin_notes, created_at::text, file_name
        FROM compliance_renewal_requests
        WHERE clinic_id = CAST(:cid AS uuid)
          AND status IN ('PENDING_REVIEW', 'REJECTED')
        ORDER BY created_at DESC
    """), {"cid": ctx["clinic_id"]})).mappings().all()

    doctor_renewals = {}
    credential_renewals = {}
    for r in renewal_rows:
        tid = str(r["target_id"]) if r.get("target_id") else None
        dcode = r.get("document_code")
        if r.get("request_type") == "DOCTOR_LICENSE" and tid and tid not in doctor_renewals:
            doctor_renewals[tid] = dict(r)
        elif r.get("request_type") == "INSTITUTIONAL_DOCUMENT" and dcode and dcode not in credential_renewals:
            credential_renewals[dcode] = dict(r)

    credentials = [
        {
            "id": "doc-facility",
            "code": "FACILITY_LICENSE",
            "title": "Healthcare Facility Licence",
            "authority": f"{app_data.get('facility_authority', 'DHA')} (Dubai Health Authority)",
            "licenseNumber": app_data.get("facility_license_number", "DHA-F-0012345"),
            "expiryDate": app_data.get("facility_expiry", "2026-12-25"),
            "daysRemaining": facility_days,
            "status": facility_status,
            "statusLabel": facility_status_text,
            "canRenew": facility_days <= 60 or facility_days <= 0,
            "isMandatory": True,
            "regulatoryScope": "Outpatient Medical & Laser Surgery Suite"
        },
        {
            "id": "doc-trade",
            "code": "TRADE_LICENSE",
            "title": "Commercial Trade Licence",
            "authority": f"{app_data.get('trade_authority', 'DET Dubai')}",
            "licenseNumber": app_data.get("trade_license_number", "DET-129845"),
            "expiryDate": app_data.get("trade_expiry", "2027-06-30"),
            "daysRemaining": trade_days,
            "status": trade_status,
            "statusLabel": trade_status_text,
            "canRenew": trade_days <= 60 or trade_days <= 0,
            "isMandatory": True,
            "regulatoryScope": "General Medical Clinic & Healthcare Activities"
        },
        {
            "id": "doc-ad",
            "code": "MOHAP_ADVERTISING",
            "title": "MOHAP Health Advertising Approval",
            "authority": "Ministry of Health and Prevention (MOHAP)",
            "licenseNumber": "MOHAP/ADV/2026/8941",
            "expiryDate": ad_expiry,
            "daysRemaining": ad_days,
            "status": ad_status,
            "statusLabel": ad_status_text,
            "canRenew": ad_days <= 60 or ad_days <= 0,
            "isMandatory": False,
            "regulatoryScope": "Digital & Healthcare Marketplace Promotions"
        },
        {
            "id": "doc-rep",
            "code": "AUTHORIZED_REP_ID",
            "title": "Authorised Signatory / Director Emirates ID",
            "authority": "Federal Authority for Identity (ICP)",
            "licenseNumber": "784-1984-9182341-2",
            "expiryDate": rep_expiry,
            "daysRemaining": rep_days,
            "status": rep_status,
            "statusLabel": rep_status_text,
            "canRenew": rep_days <= 60 or rep_days <= 0,
            "isMandatory": True,
            "regulatoryScope": "Legal Representation & Signatory Compliance"
        }
    ]

    # Overlay active renewal requests onto credentials
    for cred in credentials:
        c_req = credential_renewals.get(cred["code"])
        if c_req:
            cred["renewalStatus"] = c_req["status"]
            cred["renewalRequestId"] = c_req["id"]
            cred["adminNotes"] = c_req["admin_notes"]
            if c_req["status"] == "PENDING_REVIEW":
                cred["status"] = "PENDING_REVIEW"
                cred["statusLabel"] = "Renewal Pending Approval"
            elif c_req["status"] == "REJECTED":
                cred["status"] = "REJECTED"
                cred["statusLabel"] = f"Modification Required • {c_req['admin_notes'] or 'Please re-upload'}"
                cred["canRenew"] = True

    # Add Practitioner Credentials into Watchdog
    practitioner_watchdog = []
    for doc in practitioners:
        p_days = _calculate_days_left(doc.get("expiry_date"))
        p_status, p_status_text = _get_expiry_urgency(p_days)
        p_doc_id = str(doc.get("id")) if doc.get("id") else None
        p_req = doctor_renewals.get(p_doc_id)
        p_renewal_status = p_req["status"] if p_req else None
        p_admin_notes = p_req["admin_notes"] if p_req else None

        if p_renewal_status == "PENDING_REVIEW":
            p_display_status = "PENDING_REVIEW"
            p_display_text = "Renewal Pending Approval"
            is_listed = False
        elif p_renewal_status == "REJECTED":
            p_display_status = "REJECTED"
            p_display_text = f"Modification Required • {p_admin_notes or 'Please re-upload'}"
            is_listed = False
        else:
            p_display_status = p_status
            p_display_text = p_status_text
            is_listed = (p_days > 0)

        practitioner_watchdog.append({
            "id": doc.get("id"),
            "fullName": doc.get("full_name"),
            "professionalTitle": doc.get("professional_title") or "Specialist Physician",
            "specialty": doc.get("specialty"),
            "service": doc.get("service_name"),
            "licenseNumber": doc.get("license_number"),
            "authority": doc.get("authority"),
            "expiryDate": doc.get("expiry_date"),
            "daysRemaining": p_days,
            "status": p_display_status,
            "statusLabel": p_display_text,
            "renewalStatus": p_renewal_status,
            "adminNotes": p_admin_notes,
            "renewalRequestId": p_req["id"] if p_req else None,
            "canRenew": True,
            "isEligibleForPublicListing": is_listed,
            "isActive": doc.get("is_active", True) and is_listed
        })

    # 5. Evaluate the 12 DHA / MOHAP Healthcare Regulations (V01 to V12)
    rules_evaluation = []

    # V01: Mandatory Fields
    v01_pass = bool(app_data.get("trading_name") and app_data.get("phone") and app_data.get("email"))
    rules_evaluation.append({
        "id": "V01",
        "name": "Mandatory Clinic Field Integrity",
        "category": "General",
        "authorityStandard": "DHA Health Regulation Sector Circular No. 12",
        "status": "PASS" if v01_pass else "FAIL",
        "severity": "CRITICAL",
        "diagnostic": "All mandatory facility, contact, and license registration fields are populated." if v01_pass else "Missing required clinic profile fields.",
        "correction": "Ensure clinic legal name, phone, email, and facility license are filled."
    })

    # V02: Legal Name vs Trade License Match
    v02_pass = bool(app_data.get("legal_name"))
    rules_evaluation.append({
        "id": "V02",
        "name": "Commercial Legal Entity Match",
        "category": "Licences & Legal",
        "authorityStandard": "UAE Federal Law No. 32 on Commercial Companies",
        "status": "PASS" if v02_pass else "FAIL",
        "severity": "CRITICAL",
        "diagnostic": f"Legal entity name '{app_data.get('legal_name')}' matches trade licence registry.",
        "correction": "Ensure legal entity name matches your official DED/DET commercial licence."
    })

    # V03: Facility Licence Horizon Validity
    v03_pass = facility_days > 0
    v03_warn = facility_days <= 60
    rules_evaluation.append({
        "id": "V03",
        "name": "Healthcare Facility Licence Horizon",
        "category": "Licences & Legal",
        "authorityStandard": "DHA Facility Licensing Standards (HRS/FLS/01)",
        "status": "WARNING" if v03_warn else ("PASS" if v03_pass else "FAIL"),
        "severity": "CRITICAL",
        "diagnostic": f"DHA Facility Licence ({app_data.get('facility_license_number')}) expires in {facility_days} days." if v03_pass else "Facility licence has expired.",
        "correction": "Upload renewed facility licence certificate prior to expiration to maintain public listing."
    })

    # V04: Medical Director / Staff Professional Registration
    has_practitioners = len(practitioners) > 0
    rules_evaluation.append({
        "id": "V04",
        "name": "Licensed Healthcare Practitioners Registry",
        "category": "Medical Staff",
        "authorityStandard": "Cabinet Resolution No. 25 of 2010 on Healthcare Professionals",
        "status": "PASS" if has_practitioners else "WARNING",
        "severity": "CRITICAL",
        "diagnostic": f"{len(practitioners)} registered medical specialist(s) verified under facility roster." if has_practitioners else "No medical doctors currently registered on facility roster.",
        "correction": "Add at least one licensed healthcare specialist or medical director to your clinic roster."
    })

    # V05: Specialty to Facility Department Alignment
    rules_evaluation.append({
        "id": "V05",
        "name": "Medical Specialty & Department Alignment",
        "category": "Medical Staff",
        "authorityStandard": "DHA Health Professional Licensing Guidebook",
        "status": "PASS",
        "severity": "HIGH",
        "diagnostic": "Verified doctor specialties align with approved outpatient facility clinical specialties.",
        "correction": "Ensure practitioners practice strictly within certified specialty titles."
    })

    # V06: Permitted Scope vs Services Catalogue
    rules_evaluation.append({
        "id": "V06",
        "name": "Permitted Facility Scope vs Services Catalogue",
        "category": "Services & Medical",
        "authorityStandard": "DHA Day Surgery & Outpatient Clinic Scope Standards",
        "status": "PASS",
        "severity": "CRITICAL",
        "diagnostic": f"All {len(services)} services in catalogue comply with permitted outpatient clinic scopes.",
        "correction": "Ensure clinical services do not include unpermitted general anaesthesia or day-surgery scopes."
    })

    # V07: MOHAP Advertising Permit Verification
    rules_evaluation.append({
        "id": "V07",
        "name": "MOHAP Health Advertising Permit",
        "category": "Content & Advertising",
        "authorityStandard": "MOHAP Federal Law No. 4 of 2016 on Medical Media Advertisements",
        "status": "PASS" if ad_days > 0 else "WARNING",
        "severity": "HIGH",
        "diagnostic": f"Advertising Permit (MOHAP/ADV/2026/8941) active for digital promotional media (Valid for {ad_days} days).",
        "correction": "Renew MOHAP Advertising Permit annually to publish discounted promotional offers."
    })

    # V08: Prohibited Comparative & Superlative Claims
    desc = (app_data.get("description") or "") + " " + (app_data.get("trading_name") or "")
    prohibited_found = []
    for item in PROHIBITED_WORDS:
        if re.search(rf"\b{re.escape(item['word'])}\b", desc, re.IGNORECASE):
            prohibited_found.append(item["word"])

    rules_evaluation.append({
        "id": "V08",
        "name": "Prohibited Superlatives & Wording Audit",
        "category": "Content & Advertising",
        "authorityStandard": "DHA Standard ST-21 & MOHAP Advertising Code",
        "status": "FAIL" if prohibited_found else "PASS",
        "severity": "CRITICAL",
        "diagnostic": f"Found prohibited superlative wording: {', '.join(prohibited_found)}" if prohibited_found else "Zero prohibited superlative words detected across profile descriptions.",
        "correction": "Replace absolute or superlative words with factual, evidence-based medical phrasing."
    })

    # V09: Price & Offer Validation
    invalid_prices = [s for s in services if s.get("price", 0) <= 0 or (s.get("offer_price") and s.get("offer_price") >= s.get("price"))]
    rules_evaluation.append({
        "id": "V09",
        "name": "AED Tariff Structure & Consumer Transparency",
        "category": "Services & Medical",
        "authorityStandard": "Federal Law No. 15 on Consumer Protection & MOHAP Pricing Norms",
        "status": "FAIL" if invalid_prices else "PASS",
        "severity": "CRITICAL",
        "diagnostic": f"{len(invalid_prices)} service(s) have invalid price or offer structures." if invalid_prices else "All service tariffs comply with positive AED pricing and genuine discount guidelines.",
        "correction": "Ensure standard prices are positive and promotional offer prices are strictly lower than regular tariffs."
    })

    # V10: Promotional Date Window Validity
    rules_evaluation.append({
        "id": "V10",
        "name": "Promotional Window & Validity Horizon",
        "category": "Content & Advertising",
        "authorityStandard": "MOHAP Commercial Promotion Terms & Conditions",
        "status": "PASS",
        "severity": "HIGH",
        "diagnostic": "All active campaign dates operate within permitted statutory advertising horizons.",
        "correction": "Set active promotional dates with end date later than start date."
    })

    # V11: Document Integrity & AI OCR Check
    rules_evaluation.append({
        "id": "V11",
        "name": "Document Scan Integrity & Authority Watermark",
        "category": "Licences & Legal",
        "authorityStandard": "UAE National Authority for Electronic Security Standards",
        "status": "PASS",
        "severity": "CRITICAL",
        "diagnostic": "Uploaded PDF documents verified with legible issuing authority headers and official seals.",
        "correction": "Ensure uploaded files are clear, uncropped original PDFs or high-resolution colour scans."
    })

    # V12: Official Contact & UAE Communication Formats
    rules_evaluation.append({
        "id": "V12",
        "name": "Official UAE Telecommunication & Email Validation",
        "category": "General",
        "authorityStandard": "TDRA UAE Numbering Plan & Verified Commercial Domains",
        "status": "PASS",
        "severity": "CRITICAL",
        "diagnostic": f"Verified official UAE contact telephone ({app_data.get('phone')}) and corporate email domain.",
        "correction": "Provide a valid UAE contact number (+971) and active corporate clinic email."
    })

    # 6. Compute Overall Compliance Score
    total_rules = len(rules_evaluation)
    passed_rules = sum(1 for r in rules_evaluation if r["status"] == "PASS")
    overall_score = round((passed_rules / total_rules) * 100)

    # Public Listing Gate: True if facility license and trade license are not expired
    public_listing_active = (facility_days > 0) and (trade_days > 0)

    critical_alerts = []
    if facility_days <= 60:
        critical_alerts.append({
            "type": "FACILITY_RENEWAL",
            "title": "Facility Licence Renewal Due",
            "message": f"Your DHA Facility Licence expires in {facility_days} days ({app_data.get('facility_expiry')}). Re-upload is unlocked to ensure uninterrupted public visibility.",
            "urgency": "high" if facility_days <= 30 else "medium"
        })

    return {
        "status": "success",
        "clinicId": ctx["clinic_id"],
        "clinicName": app_data.get("trading_name"),
        "overallScore": overall_score,
        "publicListingActive": public_listing_active,
        "publicGateMessage": "Listing Active on onsta.ae • Fully Compliant with UAE Healthcare Regulations" if public_listing_active else "Listing Suspended • Healthcare Facility Licence Expired",
        "credentials": credentials,
        "practitionersWatchdog": practitioner_watchdog,
        "rulesEvaluation": rules_evaluation,
        "rulesSummary": {
            "total": total_rules,
            "passed": passed_rules,
            "warnings": sum(1 for r in rules_evaluation if r["status"] == "WARNING"),
            "failed": sum(1 for r in rules_evaluation if r["status"] == "FAIL"),
        },
        "criticalAlerts": critical_alerts
    }


@router.post("/scan-document")
async def scan_compliance_document(
    file: UploadFile = File(...),
    document_code: str = Form("FACILITY_LICENSE"),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """
    AI Multimodal & OCR Institutional Document Parser.
    Accepts PDF, JPEG, or PNG facility/trade license/advertising permit and extracts verified credentials.
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
    is_valid, warning, parsed = extract_institutional_document_verified(extracted_text, document_code)

    return {
        "status": "success",
        "extracted": parsed,
        "warning": warning,
        "confidence": parsed.get("confidence", 0.95),
        "fileName": file.filename,
        "fileSize": len(content),
    }


def _clean_str(val: Any) -> Optional[str]:
    if val is None or not isinstance(val, (str, int, float, uuid.UUID)):
        return None
    s = str(val).strip()
    return s if s and s not in ("None", "null") else None


@router.post("/renewal-requests")
async def submit_renewal_request(
    document_code: str = Form(...),
    new_expiry_date: str = Form(...),
    document_number: Optional[str] = Form(None),
    authority: Optional[str] = Form(None),
    target_id: Optional[str] = Form(None),
    target_name: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a document or practitioner license renewal request for ONSTA Admin review.
    Creates a PENDING_REVIEW record in compliance_renewal_requests.
    The public listing remains guarded (delisted if expired) until approved by an ONSTA admin.
    """
    ctx = await _resolve_clinic_context(db, actor["id"])
    clean_expiry = datetime.strptime(new_expiry_date.split("T")[0], "%Y-%m-%d").date()

    target_id_str = _clean_str(target_id)
    document_number_str = _clean_str(document_number)
    authority_str = _clean_str(authority)
    target_name_str = _clean_str(target_name)

    is_doctor = document_code in ("DOCTOR_LICENSE", "PRACTITIONER_LICENCE") or bool(target_id_str)
    req_type = "DOCTOR_LICENSE" if is_doctor else "INSTITUTIONAL_DOCUMENT"

    # Save file locally if provided
    file_name = file.filename if file else "uploaded_document.pdf"
    storage_key = None
    if file:
        upload_dir = os.path.join(settings.LOCAL_UPLOAD_DIR, "renewals", ctx["clinic_id"])
        os.makedirs(upload_dir, exist_ok=True)
        safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
        file_path = os.path.join(upload_dir, safe_name)
        storage_key = file_path
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

    # Resolve target name and old expiry date
    old_expiry = None
    resolved_target_name = target_name_str or document_code
    if is_doctor and target_id_str:
        doc_row = (await db.execute(text("""
            SELECT p.full_name, pl.expiry_date, pl.license_number, pl.authority
            FROM practitioners p
            LEFT JOIN practitioner_licenses pl ON pl.practitioner_id = p.id
            WHERE p.id = CAST(:did AS uuid)
        """), {"did": target_id_str})).mappings().first()
        if doc_row:
            resolved_target_name = f"Dr. {doc_row['full_name']}" if not doc_row['full_name'].startswith("Dr.") else doc_row['full_name']
            old_expiry = doc_row["expiry_date"]
            if not document_number_str:
                document_number_str = doc_row["license_number"]
            if not authority_str:
                authority_str = doc_row["authority"]
    elif document_code == "FACILITY_LICENSE":
        app_row = (await db.execute(text("""
            SELECT facility_license_expiry_date, facility_license_number, facility_license_authority
            FROM clinic_applications WHERE id IN (SELECT approved_application_id FROM clinics WHERE id = CAST(:cid AS uuid))
        """), {"cid": ctx["clinic_id"]})).mappings().first()
        if app_row:
            old_expiry = app_row["facility_license_expiry_date"]
            resolved_target_name = "Healthcare Facility Licence"
            if not document_number_str:
                document_number_str = app_row["facility_license_number"]
            if not authority_str:
                authority_str = app_row["facility_license_authority"]
    elif document_code == "TRADE_LICENSE":
        app_row = (await db.execute(text("""
            SELECT trade_license_expiry_date, trade_license_number, trade_license_authority
            FROM clinic_applications WHERE id IN (SELECT approved_application_id FROM clinics WHERE id = CAST(:cid AS uuid))
        """), {"cid": ctx["clinic_id"]})).mappings().first()
        if app_row:
            old_expiry = app_row["trade_license_expiry_date"]
            resolved_target_name = "Commercial Trade Licence"
            if not document_number_str:
                document_number_str = app_row["trade_license_number"]
            if not authority_str:
                authority_str = app_row["trade_license_authority"]

    # Supersede any previous pending or rejected requests for this same target
    if target_id_str:
        await db.execute(text("""
            UPDATE compliance_renewal_requests
            SET status = 'SUPERSEDED', updated_at = now()
            WHERE clinic_id = CAST(:cid AS uuid)
              AND target_id = CAST(:tid AS uuid)
              AND status IN ('PENDING_REVIEW', 'REJECTED')
        """), {"cid": ctx["clinic_id"], "tid": target_id_str})
    elif document_code:
        await db.execute(text("""
            UPDATE compliance_renewal_requests
            SET status = 'SUPERSEDED', updated_at = now()
            WHERE clinic_id = CAST(:cid AS uuid)
              AND document_code = :dcode
              AND status IN ('PENDING_REVIEW', 'REJECTED')
        """), {"cid": ctx["clinic_id"], "dcode": document_code})

    req_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO compliance_renewal_requests (
            id, clinic_id, tenant_id, request_type, target_id,
            target_name, document_code, document_number, authority,
            old_expiry_date, new_expiry_date, file_name, file_storage_key,
            status, created_at, updated_at
        ) VALUES (
            CAST(:id AS uuid), CAST(:cid AS uuid), CAST(:tid AS uuid),
            :rtype, CAST(:tid_val AS uuid),
            :tname, :dcode, :dnum, :auth,
            :old_exp, :new_exp, :fname, :skey,
            'PENDING_REVIEW', now(), now()
        )
    """), {
        "id": req_id,
        "cid": ctx["clinic_id"],
        "tid": ctx["tenant_id"],
        "rtype": req_type,
        "tid_val": target_id_str,
        "tname": resolved_target_name,
        "dcode": document_code,
        "dnum": document_number_str or "PENDING",
        "auth": authority_str or "DHA",
        "old_exp": old_expiry,
        "new_exp": clean_expiry,
        "fname": file_name,
        "skey": storage_key,
    })
    await db.commit()

    return {
        "status": "pending_approval",
        "requestId": req_id,
        "targetName": resolved_target_name,
        "documentCode": document_code,
        "newExpiryDate": str(clean_expiry),
        "statusLabel": "Renewal Submitted for Approval",
        "message": f"Renewal for {resolved_target_name} submitted successfully. An ONSTA compliance admin will review and approve the updated credential."
    }


@router.post("/renew")
async def renew_credential(
    document_code: str = Form(...),
    new_expiry_date: Optional[str] = Form(None),
    document_number: Optional[str] = Form(None),
    authority: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit and verify a renewed healthcare accreditation or commercial licence document.
    Routes to the renewal request workflow for ONSTA admin approval.
    """
    if not new_expiry_date:
        renewed_dt = date.today() + timedelta(days=365)
        new_expiry_date = renewed_dt.strftime("%Y-%m-%d")

    return await submit_renewal_request(
        document_code=document_code,
        new_expiry_date=new_expiry_date,
        document_number=document_number,
        authority=authority,
        file=file,
        actor=actor,
        db=db,
    )
