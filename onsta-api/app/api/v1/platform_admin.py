import json
from pathlib import Path
from typing import Optional
from uuid import UUID
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.api.v1.auth import Actor, get_current_actor
from app.config import settings
from app.db.database import SessionLocal

router = APIRouter(prefix="/platform-admin", tags=["Super Admin"])


async def require_super_admin(actor: Actor = Depends(get_current_actor)) -> Actor:
    async with SessionLocal() as session:
        is_admin = (await session.execute(text("""
            SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = CAST(:id AS uuid) AND r.name = 'SUPER_ADMIN' AND r.scope = 'PLATFORM'
        """), {"id": actor["id"]})).first()
    if not is_admin:
        raise HTTPException(status_code=403, detail="Super Admin access is required.")
    return actor


class DecisionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=4000)


class InfoRequest(BaseModel):
    requested_fields: list[str] = Field(min_length=1)
    message: str = Field(min_length=3, max_length=4000)
    due_at: Optional[str] = None


@router.get("/applications")
async def list_applications(status_filter: Optional[str] = Query(None, alias="status"), actor: Actor = Depends(require_super_admin)):
    normalized_status = status_filter.strip().upper() if status_filter and status_filter.strip().upper() != "ALL" else None
    async with SessionLocal() as session:
        query = """
            SELECT a.id::text AS application_id, a.application_reference,
                a.legal_entity_name AS legal_name, a.trading_name AS display_name,
                a.main_phone AS contact_phone, a.official_email AS company_email,
                a.emirate, a.facility_type, a.contact_person_name,
                a.application_status AS status, a.created_at,
                count(d.id)::integer AS documents_count
            FROM clinic_applications a
            LEFT JOIN clinic_application_documents d ON d.application_id = a.id
        """
        params = {}
        if normalized_status:
            query += " WHERE a.application_status = :status"
            params["status"] = normalized_status
        query += " GROUP BY a.id ORDER BY a.created_at DESC"
        rows = (await session.execute(text(query), params)).mappings().all()
    return [dict(row) for row in rows]


@router.get("/users/roles")
async def list_user_roles(actor: Actor = Depends(require_super_admin)):
    async with SessionLocal() as session:
        rows = (await session.execute(text("""
            SELECT name, scope FROM roles ORDER BY scope, name
        """))).mappings().all()
    return [dict(row) for row in rows]


@router.get("/users")
async def list_users(
    search: Optional[str] = Query(None, max_length=200),
    account_type: Optional[str] = Query(None, max_length=32),
    status_filter: Optional[str] = Query(None, alias="status", max_length=24),
    role: Optional[str] = Query(None, max_length=80),
    clinic: Optional[str] = Query(None, max_length=200),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    actor: Actor = Depends(require_super_admin),
):
    normalized_type = account_type.strip().upper() if account_type and account_type.strip() else None
    valid_types = {"PLATFORM_ADMIN", "CLINIC_USER", "CLINIC_APPLICANT", "UNASSIGNED"}
    if normalized_type and normalized_type not in valid_types:
        raise HTTPException(status_code=400, detail="Unsupported account type filter.")

    account_type_expression = """
        CASE
            WHEN EXISTS (
                SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = u.id AND r.scope = 'PLATFORM' AND r.name = 'SUPER_ADMIN'
            ) THEN 'PLATFORM_ADMIN'
            WHEN EXISTS (
                SELECT 1 FROM clinic_memberships m WHERE m.user_id = u.id
            ) THEN 'CLINIC_USER'
            WHEN EXISTS (
                SELECT 1 FROM clinic_applications a WHERE a.submitted_by_user_id = u.id
            ) THEN 'CLINIC_APPLICANT'
            ELSE 'UNASSIGNED'
        END
    """
    filters = []
    params = {"limit": limit, "offset": offset}
    if search and search.strip():
        filters.append("(u.full_name ILIKE :search OR u.email ILIKE :search OR u.id::text ILIKE :search)")
        params["search"] = f"%{search.strip()}%"
    if normalized_type:
        filters.append(f"({account_type_expression}) = :account_type")
        params["account_type"] = normalized_type
    if status_filter and status_filter.strip():
        filters.append("u.status = :status")
        params["status"] = status_filter.strip().upper()
    if role and role.strip():
        filters.append("""
            (
                EXISTS (
                    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.name = :role
                )
                OR EXISTS (
                    SELECT 1 FROM clinic_memberships m JOIN roles r ON r.id = m.role_id
                    WHERE m.user_id = u.id AND r.name = :role
                )
                OR (:role = 'CLINIC_APPLICANT' AND EXISTS (
                    SELECT 1 FROM clinic_applications a WHERE a.submitted_by_user_id = u.id
                ))
            )
        """)
        params["role"] = role.strip().upper()
    if clinic and clinic.strip():
        filters.append("""
            (
                EXISTS (
                    SELECT 1 FROM clinic_memberships m
                    JOIN clinics c ON c.tenant_id = m.tenant_id
                    WHERE m.user_id = u.id
                      AND (c.trading_name ILIKE :clinic OR c.legal_name ILIKE :clinic
                           OR c.id::text ILIKE :clinic)
                )
                OR EXISTS (
                    SELECT 1 FROM clinic_applications a
                    WHERE a.submitted_by_user_id = u.id
                      AND (a.trading_name ILIKE :clinic OR a.legal_entity_name ILIKE :clinic
                           OR a.application_reference ILIKE :clinic OR a.id::text ILIKE :clinic)
                )
            )
        """)
        params["clinic"] = f"%{clinic.strip()}%"
    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    filter_params = {key: value for key, value in params.items() if key not in {"limit", "offset"}}

    async with SessionLocal() as session:
        total = (await session.execute(text(f"""
            SELECT count(*) FROM users u {where_clause}
        """), filter_params)).scalar_one()
        rows = (await session.execute(text(f"""
            SELECT u.id::text AS user_id, u.email, u.full_name, u.status,
                u.last_login_at, u.created_at,
                {account_type_expression} AS account_type,
                COALESCE((
                    SELECT array_agg(role_name ORDER BY role_name)
                    FROM (
                        SELECT DISTINCT r.name::text AS role_name
                        FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                        WHERE ur.user_id = u.id
                        UNION
                        SELECT DISTINCT r.name::text AS role_name
                        FROM clinic_memberships m JOIN roles r ON r.id = m.role_id
                        WHERE m.user_id = u.id
                        UNION
                        SELECT 'CLINIC_APPLICANT'
                        WHERE EXISTS (
                            SELECT 1 FROM clinic_applications a WHERE a.submitted_by_user_id = u.id
                        )
                    ) user_roles
                ), ARRAY[]::text[]) AS roles,
                COALESCE((
                    SELECT array_agg(DISTINCT clinic_name ORDER BY clinic_name)
                    FROM (
                        SELECT c.trading_name::text AS clinic_name
                        FROM clinic_memberships m JOIN clinics c ON c.tenant_id = m.tenant_id
                        WHERE m.user_id = u.id
                        UNION
                        SELECT a.trading_name::text AS clinic_name
                        FROM clinic_applications a WHERE a.submitted_by_user_id = u.id
                    ) user_clinics
                ), ARRAY[]::text[]) AS clinics
            FROM users u
            {where_clause}
            ORDER BY u.created_at DESC, u.full_name, u.id
            LIMIT :limit OFFSET :offset
        """), params)).mappings().all()
    return {"items": [dict(row) for row in rows], "total": total, "limit": limit, "offset": offset}


@router.get("/clinics")
async def list_registered_clinics(
    search: Optional[str] = Query(None, max_length=200),
    emirate: Optional[str] = Query(None, max_length=60),
    tenant_status: Optional[str] = Query(None, max_length=24),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    actor: Actor = Depends(require_super_admin),
):
    filters = ["a.application_status = 'APPROVED'"]
    params = {"limit": limit, "offset": offset}
    if search and search.strip():
        filters.append("""
            (c.trading_name ILIKE :search OR c.legal_name ILIKE :search
             OR t.tenant_code ILIKE :search OR a.application_reference ILIKE :search)
        """)
        params["search"] = f"%{search.strip()}%"
    if emirate and emirate.strip():
        filters.append("a.emirate = :emirate")
        params["emirate"] = emirate.strip()
    if tenant_status and tenant_status.strip():
        filters.append("t.status = :tenant_status")
        params["tenant_status"] = tenant_status.strip().upper()
    where_clause = " AND ".join(filters)
    filter_params = {key: value for key, value in params.items() if key not in {"limit", "offset"}}

    async with SessionLocal() as session:
        total = (await session.execute(text(f"""
            SELECT count(*)
            FROM clinics c
            JOIN tenants t ON t.id = c.tenant_id
            JOIN clinic_applications a ON a.id = c.approved_application_id
            WHERE {where_clause}
        """), filter_params)).scalar_one()
        rows = (await session.execute(text(f"""
            SELECT c.id::text AS clinic_id, c.tenant_id::text AS tenant_id,
                a.id::text AS application_id, a.application_reference,
                t.tenant_code, t.name AS tenant_name, t.status AS tenant_status,
                c.legal_name, c.trading_name, c.facility_type, c.primary_email,
                c.primary_phone, a.emirate, a.city_area,
                c.verification_status, c.visibility_status,
                COALESCE(
                    (SELECT max(r.created_at) FROM clinic_application_reviews r
                     WHERE r.application_id = a.id AND r.decision = 'APPROVED'),
                    a.updated_at
                ) AS approved_at,
                (SELECT count(*)::integer FROM clinic_branches b WHERE b.clinic_id = c.id) AS branch_count,
                (SELECT count(*)::integer FROM practitioners p WHERE p.clinic_id = c.id) AS practitioner_count,
                (SELECT count(*)::integer FROM services s WHERE s.clinic_id = c.id) AS service_count,
                (SELECT count(*)::integer FROM clinic_memberships m WHERE m.tenant_id = t.id) AS member_count
            FROM clinics c
            JOIN tenants t ON t.id = c.tenant_id
            JOIN clinic_applications a ON a.id = c.approved_application_id
            WHERE {where_clause}
            ORDER BY approved_at DESC, c.trading_name ASC
            LIMIT :limit OFFSET :offset
        """), params)).mappings().all()
    return {"items": [dict(row) for row in rows], "total": total, "limit": limit, "offset": offset}


@router.get("/clinics/{clinic_id}")
async def get_registered_clinic(clinic_id: UUID, actor: Actor = Depends(require_super_admin)):
    async with SessionLocal() as session:
        clinic = (await session.execute(text("""
            SELECT c.id::text AS clinic_id, c.tenant_id::text AS tenant_id,
                a.id::text AS application_id, a.application_reference,
                a.application_status, a.source, a.created_at AS application_created_at,
                a.submitted_at, a.legal_entity_name, a.trading_name AS application_trading_name,
                a.company_registration_number, a.trade_license_number,
                a.trade_license_authority, a.trade_license_issue_date, a.trade_license_expiry_date,
                a.facility_license_number, a.facility_license_authority,
                a.facility_license_issue_date, a.facility_license_expiry_date,
                a.official_email AS application_email, a.main_phone AS application_phone,
                a.contact_person_name, a.contact_person_title, a.authorized_representative_name,
                a.representative_email, a.representative_phone, a.emirate, a.city_area,
                a.street_building, a.office_unit, a.po_box, a.number_of_branches,
                t.tenant_code, t.name AS tenant_name, t.status AS tenant_status,
                t.created_at AS tenant_created_at, t.activated_at,
                c.legal_name, c.trading_name, c.facility_type, c.primary_email,
                c.primary_phone, c.public_description, c.verification_status,
                c.visibility_status, c.created_at AS clinic_created_at, c.updated_at AS clinic_updated_at
            FROM clinics c
            JOIN tenants t ON t.id = c.tenant_id
            JOIN clinic_applications a ON a.id = c.approved_application_id
            WHERE c.id = :clinic_id AND a.application_status = 'APPROVED'
        """), {"clinic_id": clinic_id})).mappings().first()
        if not clinic:
            raise HTTPException(status_code=404, detail="Approved clinic not found.")

        tenant_id = UUID(clinic["tenant_id"])
        application_id = UUID(clinic["application_id"])
        branches = (await session.execute(text("""
            SELECT id::text AS id, branch_code, branch_name, emirate, area,
                street_address, phone, email, status, created_at
            FROM clinic_branches WHERE clinic_id = :clinic_id
            ORDER BY branch_name
        """), {"clinic_id": clinic_id})).mappings().all()
        clinic_documents = (await session.execute(text("""
            SELECT d.id::text AS id, dt.code AS document_type, dt.name AS document_name,
                d.branch_id::text AS branch_id, d.original_file_name, d.mime_type,
                d.file_size_bytes, d.version, d.verification_status, d.expiry_date,
                d.uploaded_at
            FROM clinic_documents d
            JOIN document_types dt ON dt.id = d.document_type_id
            WHERE d.tenant_id = :tenant_id
            ORDER BY d.expiry_date NULLS LAST, d.uploaded_at DESC
        """), {"tenant_id": tenant_id})).mappings().all()
        application_documents = (await session.execute(text("""
            SELECT d.id::text AS id, dt.code AS document_type, dt.name AS document_name,
                d.original_file_name, d.mime_type, d.file_size_bytes, d.version,
                d.verification_status, d.expiry_date, d.uploaded_at
            FROM clinic_application_documents d
            JOIN document_types dt ON dt.id = d.document_type_id
            WHERE d.application_id = :application_id
            ORDER BY d.uploaded_at DESC
        """), {"application_id": application_id})).mappings().all()
        practitioners = (await session.execute(text("""
            SELECT p.id::text AS id, p.full_name, p.professional_title, p.gender,
                p.years_experience, p.status,
                COALESCE(
                    (SELECT jsonb_agg(jsonb_build_object(
                        'authority', pl.authority,
                        'license_number', pl.license_number,
                        'expiry_date', pl.expiry_date,
                        'verification_status', pl.verification_status
                    ) ORDER BY pl.expiry_date NULLS LAST)
                     FROM practitioner_licenses pl
                     WHERE pl.practitioner_id = p.id AND pl.tenant_id = p.tenant_id),
                    '[]'::jsonb
                ) AS licenses
            FROM practitioners p
            WHERE p.clinic_id = :clinic_id AND p.tenant_id = :tenant_id
            ORDER BY p.full_name
        """), {"clinic_id": clinic_id, "tenant_id": tenant_id})).mappings().all()
        services = (await session.execute(text("""
            SELECT s.id::text AS id, s.name, s.description, s.price, s.currency,
                s.duration_minutes, s.status, s.visibility_status,
                sp.name AS specialty
            FROM services s
            LEFT JOIN specialties sp ON sp.id = s.specialty_id
            WHERE s.clinic_id = :clinic_id AND s.tenant_id = :tenant_id
            ORDER BY s.name
        """), {"clinic_id": clinic_id, "tenant_id": tenant_id})).mappings().all()
        memberships = (await session.execute(text("""
            SELECT u.id::text AS user_id, u.full_name, u.email, r.name AS role,
                m.status, m.joined_at
            FROM clinic_memberships m
            JOIN users u ON u.id = m.user_id
            JOIN roles r ON r.id = m.role_id
            WHERE m.tenant_id = :tenant_id
            ORDER BY u.full_name
        """), {"tenant_id": tenant_id})).mappings().all()
        application_history = (await session.execute(text("""
            SELECT h.old_status, h.new_status, h.reason, h.created_at,
                u.full_name AS changed_by
            FROM clinic_application_history h
            LEFT JOIN users u ON u.id = h.changed_by
            WHERE h.application_id = :application_id
            ORDER BY h.created_at DESC
        """), {"application_id": application_id})).mappings().all()
        reviews = (await session.execute(text("""
            SELECT r.decision, r.review_notes, r.rejection_reason, r.created_at,
                u.full_name AS reviewer
            FROM clinic_application_reviews r
            LEFT JOIN users u ON u.id = r.reviewer_id
            WHERE r.application_id = :application_id
            ORDER BY r.created_at DESC
        """), {"application_id": application_id})).mappings().all()

    result = dict(clinic)
    result.update({
        "branches": [dict(row) for row in branches],
        "clinic_documents": [dict(row) for row in clinic_documents],
        "application_documents": [dict(row) for row in application_documents],
        "practitioners": [dict(row) for row in practitioners],
        "services": [dict(row) for row in services],
        "memberships": [dict(row) for row in memberships],
        "application_history": [dict(row) for row in application_history],
        "reviews": [dict(row) for row in reviews],
    })
    return result


@router.get("/applications/{application_id}")
async def get_application(application_id: str, actor: Actor = Depends(require_super_admin)):
    async with SessionLocal() as session:
        application = (await session.execute(text("""
            SELECT a.*, a.id::text AS application_id_text
            FROM clinic_applications a WHERE a.id = CAST(:id AS uuid)
        """), {"id": application_id})).mappings().first()
        if not application:
            raise HTTPException(status_code=404, detail="Clinic application not found.")
        docs = (await session.execute(text("""
            SELECT d.id::text AS id, dt.code AS document_type, d.original_file_name,
                d.storage_key, d.mime_type, d.file_size_bytes, d.verification_status, d.uploaded_at
            FROM clinic_application_documents d JOIN document_types dt ON dt.id = d.document_type_id
            WHERE d.application_id = CAST(:id AS uuid) ORDER BY d.uploaded_at DESC
        """), {"id": application_id})).mappings().all()
        history = (await session.execute(text("""
            SELECT old_status, new_status, reason, created_at
            FROM clinic_application_history WHERE application_id = CAST(:id AS uuid)
            ORDER BY created_at DESC
        """), {"id": application_id})).mappings().all()
    result = dict(application)
    result["application_id"] = result.pop("application_id_text")
    result["documents"] = [dict(row) for row in docs]
    result["history"] = [dict(row) for row in history]
    return result


@router.get("/applications/{application_id}/documents/{document_id}")
async def get_application_document(application_id: str, document_id: str, actor: Actor = Depends(require_super_admin)):
    async with SessionLocal() as session:
        doc = (await session.execute(text("""
            SELECT storage_key, original_file_name, mime_type
            FROM clinic_application_documents
            WHERE application_id = CAST(:application_id AS uuid) AND id = CAST(:document_id AS uuid)
        """), {"application_id": application_id, "document_id": document_id})).mappings().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Application document not found.")
    base = Path(settings.LOCAL_UPLOAD_DIR).resolve()
    path = (base / doc["storage_key"]).resolve()
    if not path.is_relative_to(base) or not path.is_file():
        raise HTTPException(status_code=404, detail="Stored document file not found.")
    return FileResponse(path, media_type=doc["mime_type"], filename=doc["original_file_name"])


@router.post("/applications/{application_id}/approve")
async def approve_application(application_id: str, payload: DecisionRequest, actor: Actor = Depends(require_super_admin)):
    async with SessionLocal() as session:
        async with session.begin():
            app = (await session.execute(text("""
                SELECT id::text AS id, application_reference, legal_entity_name, trading_name,
                    facility_type, official_email, main_phone, submitted_by_user_id::text AS user_id,
                    application_status
                FROM clinic_applications WHERE id = CAST(:id AS uuid) FOR UPDATE
            """), {"id": application_id})).mappings().first()
            if not app:
                raise HTTPException(status_code=404, detail="Clinic application not found.")
            if app["application_status"] == "APPROVED":
                return {"application_id": app["id"], "application_status": "APPROVED", "message": "This application is already approved."}
            if app["application_status"] not in {"SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUESTED", "READY_FOR_REVIEW"}:
                raise HTTPException(status_code=409, detail="The clinic must submit its application before approval.")
            uploaded = set((await session.execute(text("""
                SELECT dt.code FROM clinic_application_documents d
                JOIN document_types dt ON dt.id = d.document_type_id
                WHERE d.application_id = CAST(:id AS uuid)
            """), {"id": application_id})).scalars().all())
            missing = sorted({"TRADE_LICENSE", "FACILITY_LICENSE", "MOHAP_ADVERTISING"} - uploaded)
            if missing:
                raise HTTPException(status_code=409, detail={"message": "Required documents are missing.", "missing_documents": missing})
            old_status = app["application_status"]
            tenant = (await session.execute(text("""
                INSERT INTO tenants(tenant_code, name, status, activated_at)
                VALUES (:code, :name, 'ACTIVE', now()) RETURNING id::text AS id
            """), {"code": f"ONSTA-{uuid4().hex[:10].upper()}", "name": app["trading_name"]})).mappings().one()
            clinic = (await session.execute(text("""
                INSERT INTO clinics(tenant_id, approved_application_id, legal_name, trading_name,
                    facility_type, primary_email, primary_phone, verification_status, visibility_status)
                VALUES (CAST(:tenant_id AS uuid), CAST(:application_id AS uuid), :legal_name, :trading_name,
                    :facility_type, :email, :phone, 'VERIFIED', 'DRAFT') RETURNING id::text AS id
            """), {"tenant_id": tenant["id"], "application_id": application_id,
                    "legal_name": app["legal_entity_name"], "trading_name": app["trading_name"],
                    "facility_type": app["facility_type"], "email": app["official_email"], "phone": app["main_phone"]})).mappings().one()
            owner_role = (await session.execute(text("SELECT id::text FROM roles WHERE name = 'CLINIC_OWNER' AND scope = 'CLINIC'"))).scalar_one()
            if app["user_id"]:
                await session.execute(text("""
                    INSERT INTO clinic_memberships(tenant_id, user_id, role_id, status, invited_by, joined_at)
                    VALUES (CAST(:tenant AS uuid), CAST(:user AS uuid), CAST(:role AS uuid), 'ACTIVE', CAST(:admin AS uuid), now())
                    ON CONFLICT(tenant_id, user_id) DO NOTHING
                """), {"tenant": tenant["id"], "user": app["user_id"], "role": owner_role, "admin": actor["id"]})
            await session.execute(text("UPDATE clinic_applications SET application_status = 'APPROVED', updated_at = now() WHERE id = CAST(:id AS uuid)"), {"id": application_id})
            await session.execute(text("""
                INSERT INTO clinic_application_reviews(application_id, reviewer_id, decision, review_notes)
                VALUES (CAST(:id AS uuid), CAST(:admin AS uuid), 'APPROVED', :reason)
            """), {"id": application_id, "admin": actor["id"], "reason": payload.reason})
            await session.execute(text("""
                INSERT INTO clinic_application_history(application_id, old_status, new_status, changed_by, reason)
                VALUES (CAST(:id AS uuid), :old, 'APPROVED', CAST(:admin AS uuid), :reason)
            """), {"id": application_id, "old": old_status, "admin": actor["id"], "reason": payload.reason})
    return {"application_id": application_id, "clinic_id": clinic["id"], "tenant_id": tenant["id"], "application_status": "APPROVED", "message": "Clinic approved; clinic workspace access is active."}


@router.post("/applications/{application_id}/reject")
async def reject_application(application_id: str, payload: DecisionRequest, actor: Actor = Depends(require_super_admin)):
    async with SessionLocal() as session:
        async with session.begin():
            row = (await session.execute(text("SELECT application_status FROM clinic_applications WHERE id = CAST(:id AS uuid) FOR UPDATE"), {"id": application_id})).first()
            if not row:
                raise HTTPException(status_code=404, detail="Clinic application not found.")
            if row[0] == "APPROVED":
                raise HTTPException(status_code=409, detail="An approved application cannot be rejected.")
            await session.execute(text("UPDATE clinic_applications SET application_status = 'REJECTED', updated_at = now() WHERE id = CAST(:id AS uuid)"), {"id": application_id})
            await session.execute(text("INSERT INTO clinic_application_reviews(application_id, reviewer_id, decision, rejection_reason, review_notes) VALUES (CAST(:id AS uuid), CAST(:admin AS uuid), 'REJECTED', :reason, :reason)"), {"id": application_id, "admin": actor["id"], "reason": payload.reason})
            await session.execute(text("INSERT INTO clinic_application_history(application_id, old_status, new_status, changed_by, reason) VALUES (CAST(:id AS uuid), :old, 'REJECTED', CAST(:admin AS uuid), :reason)"), {"id": application_id, "old": row[0], "admin": actor["id"], "reason": payload.reason})
    return {"application_id": application_id, "application_status": "REJECTED"}


@router.post("/applications/{application_id}/request-info")
async def request_application_info(application_id: str, payload: InfoRequest, actor: Actor = Depends(require_super_admin)):
    async with SessionLocal() as session:
        async with session.begin():
            row = (await session.execute(text("SELECT application_status FROM clinic_applications WHERE id = CAST(:id AS uuid) FOR UPDATE"), {"id": application_id})).first()
            if not row:
                raise HTTPException(status_code=404, detail="Clinic application not found.")
            if row[0] == "APPROVED":
                raise HTTPException(status_code=409, detail="An approved application cannot be changed.")
            await session.execute(text("UPDATE clinic_applications SET application_status = 'ADDITIONAL_INFO_REQUESTED', updated_at = now() WHERE id = CAST(:id AS uuid)"), {"id": application_id})
            await session.execute(text("""
                INSERT INTO clinic_application_info_requests(application_id, requested_by, requested_fields, request_message)
                VALUES (CAST(:id AS uuid), CAST(:admin AS uuid), CAST(:fields AS jsonb), :message)
            """), {"id": application_id, "admin": actor["id"], "fields": json.dumps(payload.requested_fields), "message": payload.message})
            await session.execute(text("INSERT INTO clinic_application_reviews(application_id, reviewer_id, decision, review_notes) VALUES (CAST(:id AS uuid), CAST(:admin AS uuid), 'REQUESTED_INFO', :message)"), {"id": application_id, "admin": actor["id"], "message": payload.message})
            await session.execute(text("INSERT INTO clinic_application_history(application_id, old_status, new_status, changed_by, reason) VALUES (CAST(:id AS uuid), :old, 'ADDITIONAL_INFO_REQUESTED', CAST(:admin AS uuid), :message)"), {"id": application_id, "old": row[0], "admin": actor["id"], "message": payload.message})
    return {"application_id": application_id, "application_status": "ADDITIONAL_INFO_REQUESTED"}
