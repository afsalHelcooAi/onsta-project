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


class UserStatusRequest(BaseModel):
    status: str
    reason: str = Field(min_length=3, max_length=4000)


@router.get("/overview")
async def get_platform_overview(actor: Actor = Depends(require_super_admin)):
    async with SessionLocal() as session:
        user_status_rows = (await session.execute(text("""
            SELECT status, count(*)::integer AS count
            FROM users
            GROUP BY status
        """), {})).mappings().all()
        application_status_rows = (await session.execute(text("""
            SELECT application_status AS status, count(*)::integer AS count
            FROM clinic_applications
            GROUP BY application_status
        """), {})).mappings().all()
        clinic_count = (await session.execute(text("""
            SELECT count(*)::integer FROM clinics
        """), {})).scalar_one()
        ai_scan_status_rows = (await session.execute(text("""
            SELECT status, count(*)::integer AS count
            FROM ai_scan_jobs
            GROUP BY status
        """), {})).mappings().all()
        open_info_request_count = (await session.execute(text("""
            SELECT count(*)::integer
            FROM clinic_application_info_requests
            WHERE status = 'OPEN'
        """), {})).scalar_one()
        clinics_awaiting_activation = (await session.execute(text("""
            SELECT count(*)::integer
            FROM clinics c
            JOIN tenants t ON t.id = c.tenant_id
            WHERE t.status = 'PENDING_ACTIVATION'
        """), {})).scalar_one()
        new_clinics_this_month = (await session.execute(text("""
            SELECT count(*)::integer
            FROM clinics
            WHERE created_at >= date_trunc('month', now())
        """), {})).scalar_one()
        expiring_licenses_total = (await session.execute(text("""
            SELECT count(*)::integer
            FROM clinics c
            JOIN tenants t ON t.id = c.tenant_id
            JOIN clinic_applications a ON a.id = c.approved_application_id
            WHERE a.application_status = 'APPROVED'
              AND (
                (a.trade_license_expiry_date IS NOT NULL AND a.trade_license_expiry_date <= CURRENT_DATE + INTERVAL '30 days')
                OR (a.facility_license_expiry_date IS NOT NULL AND a.facility_license_expiry_date <= CURRENT_DATE + INTERVAL '30 days')
              )
        """), {})).scalar_one()
        expiring_licenses_rows = (await session.execute(text("""
            SELECT
                c.id::text AS clinic_id,
                c.trading_name,
                a.trade_license_expiry_date::text AS trade_license_expiry_date,
                a.facility_license_expiry_date::text AS facility_license_expiry_date
            FROM clinics c
            JOIN tenants t ON t.id = c.tenant_id
            JOIN clinic_applications a ON a.id = c.approved_application_id
            WHERE a.application_status = 'APPROVED'
              AND (
                (a.trade_license_expiry_date IS NOT NULL AND a.trade_license_expiry_date <= CURRENT_DATE + INTERVAL '30 days')
                OR (a.facility_license_expiry_date IS NOT NULL AND a.facility_license_expiry_date <= CURRENT_DATE + INTERVAL '30 days')
              )
            ORDER BY
                LEAST(
                    COALESCE(a.trade_license_expiry_date, '9999-12-31'),
                    COALESCE(a.facility_license_expiry_date, '9999-12-31')
                ) ASC,
                c.trading_name ASC
            LIMIT 5
        """), {})).mappings().all()

        # --- Option C Additions: Catalog, AI Taxonomy, Offers, and Clinic Readiness ---
        master_treatments_count = (await session.execute(text("""
            SELECT count(*)::integer FROM master_treatments WHERE is_active = TRUE
        """), {})).scalar_one()

        categories_count = (await session.execute(text("""
            SELECT count(*)::integer FROM treatment_categories WHERE is_active = TRUE
        """), {})).scalar_one()

        target_concerns_count = (await session.execute(text("""
            SELECT count(*)::integer FROM target_concerns WHERE is_active = TRUE
        """), {})).scalar_one()

        active_offers_count = (await session.execute(text("""
            SELECT count(*)::integer FROM clinic_offers WHERE is_active = TRUE
        """), {})).scalar_one()

        avg_discount = (await session.execute(text("""
            SELECT COALESCE(ROUND(AVG(discount_percentage)), 0)::integer 
            FROM clinic_offers 
            WHERE is_active = TRUE AND discount_percentage > 0
        """), {})).scalar_one()

        # Clinic catalog readiness
        clinics_with_services = (await session.execute(text("""
            SELECT count(DISTINCT clinic_id)::integer FROM services WHERE status = 'ACTIVE'
        """), {})).scalar_one()

        clinics_with_offers = (await session.execute(text("""
            SELECT count(DISTINCT clinic_id)::integer FROM clinic_offers WHERE is_active = TRUE
        """), {})).scalar_one()

        # Recent Platform Activity Feed (Latest 6 events across audit logs)
        recent_activity_rows = (await session.execute(text("""
            SELECT 
                al.id::text,
                al.action,
                al.entity_type,
                al.details,
                al.created_at,
                COALESCE(u.full_name, u.email, 'System') AS actor_name,
                COALESCE(t.name, 'Platform') AS tenant_name
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.actor_user_id
            LEFT JOIN tenants t ON t.id = al.tenant_id
            ORDER BY al.created_at DESC
            LIMIT 6
        """), {})).mappings().all()

    def status_counts(rows):
        return {row["status"]: row["count"] for row in rows}

    return {
        "system_health": {
            "api": "HEALTHY",
            "database": "HEALTHY",
            "storage": {
                "backend": settings.STORAGE_BACKEND.upper(),
                "status": "CONFIGURED",
            },
        },
        "ai": {
            "configured": bool(settings.GEMINI_API_KEY),
            "model": settings.AI_MODEL_NAME,
            "scan_jobs": status_counts(ai_scan_status_rows),
        },
        "users": status_counts(user_status_rows),
        "applications": status_counts(application_status_rows),
        "registered_clinics": clinic_count,
        "open_info_requests": open_info_request_count,
        "clinics_awaiting_activation": clinics_awaiting_activation,
        "new_clinics_this_month": new_clinics_this_month,
        "expiring_licenses_total": expiring_licenses_total,
        "expiring_licenses": [dict(r) for r in expiring_licenses_rows],
        "catalog_summary": {
            "master_treatments": master_treatments_count,
            "categories": categories_count,
            "target_concerns": target_concerns_count,
            "active_offers": active_offers_count,
            "avg_discount_percent": avg_discount,
            "clinics_with_services": clinics_with_services,
            "clinics_with_offers": clinics_with_offers,
            "total_clinics": clinic_count,
        },
        "recent_activity": [dict(r) for r in recent_activity_rows],
    }


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





@router.get("/compliance")
async def list_compliance_audit(
    search: Optional[str] = Query(None, max_length=200),
    emirate: Optional[str] = Query(None, max_length=60),
    compliance_filter: Optional[str] = Query(None, max_length=24),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    actor: Actor = Depends(require_super_admin),
):
    valid_filters = {None, "ALL", "EXPIRED", "EXPIRING_30", "EXPIRING_90", "COMPLIANT"}
    normalized_filter = compliance_filter.strip().upper() if compliance_filter and compliance_filter.strip() else None
    if normalized_filter not in valid_filters:
        raise HTTPException(status_code=400, detail="Unsupported compliance_filter value.")
    if normalized_filter == "ALL":
        normalized_filter = None

    filters = ["a.application_status = 'APPROVED'"]
    params: dict = {"limit": limit, "offset": offset}

    if search and search.strip():
        filters.append("""
            (c.trading_name ILIKE :search OR c.legal_name ILIKE :search
             OR t.tenant_code ILIKE :search OR a.application_reference ILIKE :search)
        """)
        params["search"] = f"%{search.strip()}%"

    if emirate and emirate.strip():
        filters.append("a.emirate = :emirate")
        params["emirate"] = emirate.strip()

    if normalized_filter == "EXPIRED":
        filters.append("""
            (a.trade_license_expiry_date < CURRENT_DATE
             OR a.facility_license_expiry_date < CURRENT_DATE
             OR EXISTS (SELECT 1 FROM practitioners p JOIN practitioner_licenses pl ON pl.practitioner_id = p.id WHERE p.clinic_id = c.id AND pl.expiry_date < CURRENT_DATE))
        """)
    elif normalized_filter == "EXPIRING_30":
        filters.append("""
            (
                (a.trade_license_expiry_date >= CURRENT_DATE AND a.trade_license_expiry_date <= CURRENT_DATE + INTERVAL '30 days')
                OR (a.facility_license_expiry_date >= CURRENT_DATE AND a.facility_license_expiry_date <= CURRENT_DATE + INTERVAL '30 days')
                OR EXISTS (SELECT 1 FROM practitioners p JOIN practitioner_licenses pl ON pl.practitioner_id = p.id WHERE p.clinic_id = c.id AND pl.expiry_date >= CURRENT_DATE AND pl.expiry_date <= CURRENT_DATE + INTERVAL '30 days')
            )
            AND (a.trade_license_expiry_date >= CURRENT_DATE OR a.trade_license_expiry_date IS NULL)
            AND (a.facility_license_expiry_date >= CURRENT_DATE OR a.facility_license_expiry_date IS NULL)
        """)
    elif normalized_filter == "EXPIRING_90":
        filters.append("""
            (
                (a.trade_license_expiry_date >= CURRENT_DATE AND a.trade_license_expiry_date <= CURRENT_DATE + INTERVAL '90 days')
                OR (a.facility_license_expiry_date >= CURRENT_DATE AND a.facility_license_expiry_date <= CURRENT_DATE + INTERVAL '90 days')
                OR EXISTS (SELECT 1 FROM practitioners p JOIN practitioner_licenses pl ON pl.practitioner_id = p.id WHERE p.clinic_id = c.id AND pl.expiry_date >= CURRENT_DATE AND pl.expiry_date <= CURRENT_DATE + INTERVAL '90 days')
            )
            AND (a.trade_license_expiry_date >= CURRENT_DATE OR a.trade_license_expiry_date IS NULL)
            AND (a.facility_license_expiry_date >= CURRENT_DATE OR a.facility_license_expiry_date IS NULL)
        """)
    elif normalized_filter == "COMPLIANT":
        filters.append("""
            (a.trade_license_expiry_date IS NULL OR a.trade_license_expiry_date > CURRENT_DATE + INTERVAL '90 days')
            AND (a.facility_license_expiry_date IS NULL OR a.facility_license_expiry_date > CURRENT_DATE + INTERVAL '90 days')
            AND NOT EXISTS (SELECT 1 FROM practitioners p JOIN practitioner_licenses pl ON pl.practitioner_id = p.id WHERE p.clinic_id = c.id AND pl.expiry_date <= CURRENT_DATE + INTERVAL '90 days')
        """)

    where_clause = " AND ".join(filters)
    filter_params = {k: v for k, v in params.items() if k not in {"limit", "offset"}}

    async with SessionLocal() as session:
        total = (await session.execute(text(f"""
            SELECT count(*)
            FROM clinics c
            JOIN tenants t ON t.id = c.tenant_id
            JOIN clinic_applications a ON a.id = c.approved_application_id
            WHERE {where_clause}
        """), filter_params)).scalar_one()

        rows = (await session.execute(text(f"""
            SELECT
                c.id::text AS clinic_id,
                c.tenant_id::text AS tenant_id,
                a.id::text AS application_id,
                a.application_reference,
                t.tenant_code,
                t.status AS tenant_status,
                c.legal_name,
                c.trading_name,
                c.facility_type,
                c.verification_status,
                a.emirate,
                a.company_registration_number,
                a.trade_license_number,
                a.trade_license_authority,
                a.trade_license_issue_date,
                a.trade_license_expiry_date,
                a.facility_license_number,
                a.facility_license_authority,
                a.facility_license_issue_date,
                a.facility_license_expiry_date,
                COALESCE(
                    (SELECT jsonb_agg(jsonb_build_object(
                        'id', p.id::text,
                        'full_name', p.full_name,
                        'specialty', COALESCE(p.specialty, 'Medical Specialist'),
                        'professional_title', p.professional_title,
                        'license_number', COALESCE(pl.license_number, 'PENDING'),
                        'authority', COALESCE(pl.authority, 'DHA'),
                        'expiry_date', pl.expiry_date::text,
                        'days_remaining', (pl.expiry_date - CURRENT_DATE),
                        'status', p.status
                    ) ORDER BY pl.expiry_date ASC)
                     FROM practitioners p
                     LEFT JOIN practitioner_licenses pl ON pl.practitioner_id = p.id
                     WHERE p.clinic_id = c.id),
                    '[]'::jsonb
                ) AS practitioners,
                (SELECT count(*)::integer FROM practitioners p
                 JOIN practitioner_licenses pl ON pl.practitioner_id = p.id
                 WHERE p.clinic_id = c.id AND pl.expiry_date < CURRENT_DATE) AS expired_doctors_count,
                (SELECT count(*)::integer FROM practitioners p
                 JOIN practitioner_licenses pl ON pl.practitioner_id = p.id
                 WHERE p.clinic_id = c.id AND pl.expiry_date >= CURRENT_DATE AND pl.expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS expiring_doctors_count,
                COALESCE(
                    (SELECT jsonb_agg(jsonb_build_object(
                        'id', r.id::text,
                        'request_type', r.request_type,
                        'target_id', r.target_id::text,
                        'target_name', r.target_name,
                        'document_code', r.document_code,
                        'document_number', r.document_number,
                        'authority', r.authority,
                        'old_expiry_date', r.old_expiry_date::text,
                        'new_expiry_date', r.new_expiry_date::text,
                        'file_name', r.file_name,
                        'status', r.status,
                        'admin_notes', r.admin_notes,
                        'created_at', r.created_at::text
                    ) ORDER BY r.created_at DESC)
                     FROM compliance_renewal_requests r
                     WHERE r.clinic_id = c.id AND r.status IN ('PENDING_REVIEW', 'REJECTED')),
                    '[]'::jsonb
                ) AS renewal_requests,
                (SELECT count(*)::integer FROM compliance_renewal_requests r WHERE r.clinic_id = c.id AND r.status = 'PENDING_REVIEW') AS pending_renewals_count
            FROM clinics c
            JOIN tenants t ON t.id = c.tenant_id
            JOIN clinic_applications a ON a.id = c.approved_application_id
            WHERE {where_clause}
            ORDER BY
                LEAST(
                    COALESCE(a.trade_license_expiry_date, '9999-12-31'),
                    COALESCE(a.facility_license_expiry_date, '9999-12-31'),
                    COALESCE((SELECT min(pl.expiry_date) FROM practitioners p JOIN practitioner_licenses pl ON pl.practitioner_id = p.id WHERE p.clinic_id = c.id), '9999-12-31')
                ) ASC,
                c.trading_name ASC
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


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: UUID,
    payload: UserStatusRequest,
    actor: Actor = Depends(require_super_admin),
):
    new_status = payload.status.strip().upper()
    if new_status not in {"ACTIVE", "SUSPENDED", "DISABLED"}:
        raise HTTPException(status_code=400, detail="Unsupported user status.")
    reason = payload.reason.strip()
    if len(reason) < 3:
        raise HTTPException(status_code=400, detail="A reason of at least 3 characters is required.")
    if str(user_id) == str(actor["id"]) and new_status != "ACTIVE":
        raise HTTPException(status_code=400, detail="You cannot suspend or disable your own account.")

    async with SessionLocal() as session:
        user = (await session.execute(text("""
            SELECT u.status,
                EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.name = 'SUPER_ADMIN' AND r.scope = 'PLATFORM'
                ) AS is_platform_admin
            FROM users u
            WHERE u.id = CAST(:user_id AS uuid)
            FOR UPDATE
        """), {"user_id": str(user_id)})).mappings().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        old_status = user["status"]
        allowed_transitions = {
            "ACTIVE": {"SUSPENDED", "DISABLED"},
            "INVITED": {"DISABLED"},
            "SUSPENDED": {"ACTIVE", "DISABLED"},
            "DISABLED": {"ACTIVE"},
        }
        if new_status not in allowed_transitions.get(old_status, set()):
            raise HTTPException(
                status_code=409,
                detail=f"Cannot change a {old_status.lower()} account to {new_status.lower()}.",
            )

        if old_status == "ACTIVE" and new_status != "ACTIVE" and user["is_platform_admin"]:
            active_admin_count = (await session.execute(text("""
                SELECT count(*)
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE u.status = 'ACTIVE' AND r.name = 'SUPER_ADMIN' AND r.scope = 'PLATFORM'
            """), {})).scalar_one()
            if active_admin_count <= 1:
                raise HTTPException(
                    status_code=409,
                    detail="The last active Super Admin cannot be suspended or disabled.",
                )

        await session.execute(text("""
            UPDATE users
            SET status = :status, updated_at = now()
            WHERE id = CAST(:user_id AS uuid)
        """), {"status": new_status, "user_id": str(user_id)})
        details_json = json.dumps({
            "old_status": old_status,
            "new_status": new_status,
            "reason": reason,
        })
        await session.execute(text("""
            INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
            VALUES (
                CAST(:actor_id AS uuid), 'USER_STATUS_CHANGED', 'USER', CAST(:user_id AS uuid),
                CAST(:details AS jsonb)
            )
        """), {
            "actor_id": str(actor["id"]),
            "user_id": str(user_id),
            "details": details_json,
        })
        await session.commit()

    return {"user_id": str(user_id), "status": new_status}


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
            approve_details = json.dumps({
                "trading_name": app["trading_name"],
                "legal_name": app["legal_entity_name"],
                "reason": payload.reason,
                "tenant_id": tenant["id"],
                "clinic_id": clinic["id"],
            })
            await session.execute(text("""
                INSERT INTO audit_logs (actor_user_id, tenant_id, action, entity_type, entity_id, details)
                VALUES (
                    CAST(:actor_id AS uuid), CAST(:tenant_id AS uuid), 'CLINIC_APPROVED', 'CLINIC_APPLICATION', CAST(:id AS uuid),
                    CAST(:details AS jsonb)
                )
            """), {"actor_id": str(actor["id"]), "tenant_id": tenant["id"], "id": application_id, "details": approve_details})
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
            reject_details = json.dumps({"reason": payload.reason})
            await session.execute(text("""
                INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
                VALUES (
                    CAST(:actor_id AS uuid), 'CLINIC_REJECTED', 'CLINIC_APPLICATION', CAST(:id AS uuid),
                    CAST(:details AS jsonb)
                )
            """), {"actor_id": str(actor["id"]), "id": application_id, "details": reject_details})
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
            info_details = json.dumps({
                "requested_fields": payload.requested_fields,
                "message": payload.message,
            })
            await session.execute(text("""
                INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
                VALUES (
                    CAST(:actor_id AS uuid), 'INFO_REQUESTED', 'CLINIC_APPLICATION', CAST(:id AS uuid),
                    CAST(:details AS jsonb)
                )
            """), {"actor_id": str(actor["id"]), "id": application_id, "details": info_details})
    return {"application_id": application_id, "application_status": "ADDITIONAL_INFO_REQUESTED"}


@router.get("/audit-logs")
async def list_audit_logs(
    search: Optional[str] = Query(None, max_length=200),
    action: Optional[str] = Query(None, max_length=120),
    entity_type: Optional[str] = Query(None, max_length=80),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    actor: Actor = Depends(require_super_admin),
):
    filters = []
    params: dict = {"limit": limit, "offset": offset}

    if search and search.strip():
        filters.append("""
            (u.full_name ILIKE :search OR u.email ILIKE :search
             OR al.action ILIKE :search OR al.details::text ILIKE :search
             OR al.id::text ILIKE :search)
        """)
        params["search"] = f"%{search.strip()}%"

    if action and action.strip() and action.strip().upper() != "ALL":
        filters.append("al.action = :action")
        params["action"] = action.strip().upper()

    if entity_type and entity_type.strip() and entity_type.strip().upper() != "ALL":
        filters.append("al.entity_type = :entity_type")
        params["entity_type"] = entity_type.strip().upper()

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    filter_params = {k: v for k, v in params.items() if k not in {"limit", "offset"}}

    async with SessionLocal() as session:
        total = (await session.execute(text(f"""
            SELECT count(*)
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.actor_user_id
            {where_clause}
        """), filter_params)).scalar_one()

        rows = (await session.execute(text(f"""
            SELECT
                al.id::text AS id,
                al.actor_user_id::text AS actor_user_id,
                u.full_name AS actor_name,
                u.email AS actor_email,
                al.tenant_id::text AS tenant_id,
                t.name AS tenant_name,
                al.action,
                al.entity_type,
                al.entity_id::text AS entity_id,
                al.details,
                al.ip_address::text AS ip_address,
                al.created_at
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.actor_user_id
            LEFT JOIN tenants t ON t.id = al.tenant_id
            {where_clause}
            ORDER BY al.created_at DESC
            LIMIT :limit OFFSET :offset
        """), params)).mappings().all()

    return {"items": [dict(row) for row in rows], "total": total, "limit": limit, "offset": offset}


@router.post("/compliance/renewals/{request_id}/approve")
async def approve_compliance_renewal(
    request_id: str,
    payload: Optional[DecisionRequest] = None,
    actor: Actor = Depends(require_super_admin),
):
    """
    Approve a pending document or practitioner license renewal request.
    Applies new expiry date and details directly to live database records, restoring onsta.ae listing.
    """
    async with SessionLocal() as session:
        async with session.begin():
            req = (await session.execute(text("""
                SELECT * FROM compliance_renewal_requests
                WHERE id = CAST(:id AS uuid) FOR UPDATE
            """), {"id": request_id})).mappings().first()
            if not req:
                raise HTTPException(status_code=404, detail="Renewal request not found.")
            if req["status"] == "APPROVED":
                return {"status": "APPROVED", "message": "Renewal already approved."}

            # 1. Update compliance_renewal_requests status
            await session.execute(text("""
                UPDATE compliance_renewal_requests
                SET status = 'APPROVED',
                    reviewed_by = CAST(:admin_id AS uuid),
                    reviewed_at = now(),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
            """), {"admin_id": str(actor["id"]), "id": request_id})

            # Supersede any prior requests for the same target
            if req.get("target_id"):
                await session.execute(text("""
                    UPDATE compliance_renewal_requests
                    SET status = 'SUPERSEDED', updated_at = now()
                    WHERE clinic_id = CAST(:cid AS uuid)
                      AND target_id = CAST(:tid AS uuid)
                      AND id != CAST(:rid AS uuid)
                      AND status IN ('PENDING_REVIEW', 'REJECTED')
                """), {"cid": str(req["clinic_id"]), "tid": str(req["target_id"]), "rid": str(req["id"])})
            elif req.get("document_code"):
                await session.execute(text("""
                    UPDATE compliance_renewal_requests
                    SET status = 'SUPERSEDED', updated_at = now()
                    WHERE clinic_id = CAST(:cid AS uuid)
                      AND document_code = :dcode
                      AND id != CAST(:rid AS uuid)
                      AND status IN ('PENDING_REVIEW', 'REJECTED')
                """), {"cid": str(req["clinic_id"]), "dcode": req["document_code"], "rid": str(req["id"])})

            # 2. Apply updates to the live entities
            if req["request_type"] == "DOCTOR_LICENSE" and req["target_id"]:
                await session.execute(text("""
                    UPDATE practitioner_licenses
                    SET expiry_date = :exp,
                        license_number = COALESCE(:lic_num, license_number),
                        authority = COALESCE(:auth, authority),
                        verification_status = 'VERIFIED'
                    WHERE practitioner_id = CAST(:pid AS uuid)
                """), {
                    "exp": req["new_expiry_date"],
                    "lic_num": req["document_number"],
                    "auth": req["authority"],
                    "pid": str(req["target_id"])
                })
                # Reactivate practitioner
                await session.execute(text("""
                    UPDATE practitioners
                    SET status = 'ACTIVE'
                    WHERE id = CAST(:pid AS uuid)
                """), {"pid": str(req["target_id"])})

            elif req["request_type"] == "INSTITUTIONAL_DOCUMENT":
                if req["document_code"] == "FACILITY_LICENSE":
                    await session.execute(text("""
                        UPDATE clinic_applications
                        SET facility_license_expiry_date = :exp,
                            facility_license_number = COALESCE(:lic_num, facility_license_number),
                            facility_license_authority = COALESCE(:auth, facility_license_authority),
                            updated_at = now()
                        WHERE id IN (
                            SELECT c.approved_application_id FROM clinics c
                            WHERE c.id = CAST(:cid AS uuid) AND c.approved_application_id IS NOT NULL
                        )
                    """), {
                        "exp": req["new_expiry_date"],
                        "lic_num": req["document_number"],
                        "auth": req["authority"],
                        "cid": str(req["clinic_id"])
                    })
                elif req["document_code"] == "TRADE_LICENSE":
                    await session.execute(text("""
                        UPDATE clinic_applications
                        SET trade_license_expiry_date = :exp,
                            trade_license_number = COALESCE(:lic_num, trade_license_number),
                            trade_license_authority = COALESCE(:auth, trade_license_authority),
                            updated_at = now()
                        WHERE id IN (
                            SELECT c.approved_application_id FROM clinics c
                            WHERE c.id = CAST(:cid AS uuid) AND c.approved_application_id IS NOT NULL
                        )
                    """), {
                        "exp": req["new_expiry_date"],
                        "lic_num": req["document_number"],
                        "auth": req["authority"],
                        "cid": str(req["clinic_id"])
                    })

            # Audit log
            audit_details = json.dumps({
                "request_id": request_id,
                "target_name": req["target_name"],
                "document_code": req["document_code"],
                "new_expiry_date": str(req["new_expiry_date"]),
                "clinic_id": str(req["clinic_id"]),
            })
            await session.execute(text("""
                INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
                VALUES (
                    CAST(:actor_id AS uuid), 'COMPLIANCE_RENEWAL_APPROVED', 'COMPLIANCE_RENEWAL', CAST(:req_id AS uuid),
                    CAST(:details AS jsonb)
                )
            """), {"actor_id": str(actor["id"]), "req_id": request_id, "details": audit_details})

    return {
        "status": "APPROVED",
        "requestId": request_id,
        "message": f"Renewal for {req['target_name']} approved successfully. Live status restored on onsta.ae."
    }


@router.post("/compliance/renewals/{request_id}/reject")
async def reject_compliance_renewal(
    request_id: str,
    payload: DecisionRequest,
    actor: Actor = Depends(require_super_admin),
):
    """
    Reject or request modification for a document or practitioner license renewal request.
    Stores the feedback reason and signals the clinic portal to allow re-uploading.
    """
    async with SessionLocal() as session:
        async with session.begin():
            req = (await session.execute(text("""
                SELECT * FROM compliance_renewal_requests
                WHERE id = CAST(:id AS uuid) FOR UPDATE
            """), {"id": request_id})).mappings().first()
            if not req:
                raise HTTPException(status_code=404, detail="Renewal request not found.")

            await session.execute(text("""
                UPDATE compliance_renewal_requests
                SET status = 'REJECTED',
                    admin_notes = :reason,
                    reviewed_by = CAST(:admin_id AS uuid),
                    reviewed_at = now(),
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
            """), {
                "reason": payload.reason,
                "admin_id": str(actor["id"]),
                "id": request_id
            })

            audit_details = json.dumps({
                "request_id": request_id,
                "target_name": req["target_name"],
                "reason": payload.reason,
                "clinic_id": str(req["clinic_id"]),
            })
            await session.execute(text("""
                INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
                VALUES (
                    CAST(:actor_id AS uuid), 'COMPLIANCE_RENEWAL_REJECTED', 'COMPLIANCE_RENEWAL', CAST(:req_id AS uuid),
                    CAST(:details AS jsonb)
                )
            """), {"actor_id": str(actor["id"]), "req_id": request_id, "details": audit_details})

    return {
        "status": "REJECTED",
        "requestId": request_id,
        "adminNotes": payload.reason,
        "message": f"Renewal for {req['target_name']} rejected with modification request: '{payload.reason}'"
    }


# ---------------------------------------------------------------------------
# Master Treatments & Target Concerns (Aesthetic AI Taxonomy)
# ---------------------------------------------------------------------------

class TreatmentCategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: Optional[str] = None
    description: Optional[str] = None
    icon_name: Optional[str] = "Sparkles"
    display_order: Optional[int] = 0


class MasterTreatmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    category: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    medical_specialty: Optional[str] = "Aesthetic Medicine"
    standard_duration_minutes: Optional[int] = 45
    reference_price_min: Optional[float] = None
    reference_price_max: Optional[float] = None
    concern_ids: list[str] = []


class MasterTreatmentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    medical_specialty: Optional[str] = None
    standard_duration_minutes: Optional[int] = None
    reference_price_min: Optional[float] = None
    reference_price_max: Optional[float] = None
    is_active: Optional[bool] = None
    concern_ids: Optional[list[str]] = None


class TargetConcernCreate(BaseModel):
    code: str = Field(min_length=2, max_length=60)
    name: str = Field(min_length=2, max_length=120)
    category: str = "SKIN"
    description: Optional[str] = None


@router.get("/master-catalog")
async def get_master_catalog(actor: Actor = Depends(require_super_admin)):
    """Fetch categories, master treatments with their mapped target concerns, and the full list of concerns."""
    async with SessionLocal() as session:
        categories_rows = (await session.execute(text("""
            SELECT id::text, code, name, description, icon_name, display_order, is_active, created_at,
                   (SELECT count(*)::integer FROM master_treatments mt WHERE mt.category_id = tc.id) AS treatments_count
            FROM treatment_categories tc
            WHERE is_active = TRUE
            ORDER BY display_order, name
        """))).mappings().all()

        concerns_rows = (await session.execute(text("""
            SELECT id::text, code, name, category, description, severity_levels, is_active, created_at
            FROM target_concerns
            ORDER BY category, name
        """))).mappings().all()

        treatments_rows = (await session.execute(text("""
            SELECT 
                t.id::text,
                t.name,
                COALESCE(tc.name, t.category) AS category,
                t.category_id::text AS category_id,
                t.description,
                t.medical_specialty,
                t.standard_duration_minutes,
                t.reference_price_min::float,
                t.reference_price_max::float,
                t.is_active,
                t.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', c.id::text,
                            'code', c.code,
                            'name', c.name,
                            'efficacy_score', m.efficacy_score
                        )
                    ) FILTER (WHERE c.id IS NOT NULL),
                    '[]'::json
                ) AS mapped_concerns,
                (SELECT count(*)::integer FROM services s WHERE s.master_treatment_id = t.id) AS clinic_services_count
            FROM master_treatments t
            LEFT JOIN treatment_categories tc ON tc.id = t.category_id
            LEFT JOIN treatment_concern_mappings m ON m.treatment_id = t.id
            LEFT JOIN target_concerns c ON c.id = m.concern_id
            GROUP BY t.id, tc.name
            ORDER BY category, t.name
        """))).mappings().all()

    return {
        "categories": [dict(r) for r in categories_rows],
        "concerns": [dict(r) for r in concerns_rows],
        "treatments": [dict(r) for r in treatments_rows]
    }


@router.post("/master-catalog/categories")
async def create_treatment_category(
    payload: TreatmentCategoryCreate,
    actor: Actor = Depends(require_super_admin)
):
    """Add a new dynamic treatment category."""
    category_id = uuid4()
    code = (payload.code or payload.name.strip().upper().replace(" ", "_").replace("&", "AND"))[:80]
    async with SessionLocal() as session:
        existing = (await session.execute(
            text("SELECT 1 FROM treatment_categories WHERE lower(name) = lower(:name) OR code = :code"),
            {"name": payload.name.strip(), "code": code}
        )).first()
        if existing:
            raise HTTPException(status_code=409, detail="A category with this name or code already exists.")

        await session.execute(text("""
            INSERT INTO treatment_categories (id, code, name, description, icon_name, display_order)
            VALUES (:id, :code, :name, :description, :icon, :order)
        """), {
            "id": category_id,
            "code": code,
            "name": payload.name.strip(),
            "description": payload.description,
            "icon": payload.icon_name or "Sparkles",
            "order": payload.display_order or 0
        })
        await session.commit()

    return {"id": str(category_id), "status": "CREATED", "message": "Treatment category created successfully."}


@router.post("/master-catalog/treatments")
async def create_master_treatment(
    payload: MasterTreatmentCreate,
    actor: Actor = Depends(require_super_admin)
):
    """Create a new master clinical treatment and map it to target concerns and category."""
    treatment_id = uuid4()
    async with SessionLocal() as session:
        # Check duplicate name
        existing = (await session.execute(
            text("SELECT 1 FROM master_treatments WHERE lower(name) = lower(:name)"),
            {"name": payload.name.strip()}
        )).first()
        if existing:
            raise HTTPException(status_code=409, detail="A master treatment with this name already exists.")

        # Determine category and category_id
        cat_id = None
        cat_name = payload.category.strip() if payload.category else "Facial & Skin Health"
        if payload.category_id:
            cat_row = (await session.execute(
                text("SELECT id, name FROM treatment_categories WHERE id = CAST(:id AS uuid)"),
                {"id": payload.category_id}
            )).first()
            if cat_row:
                cat_id = cat_row.id
                cat_name = cat_row.name
        else:
            # Look up or auto-assign by name
            cat_row = (await session.execute(
                text("SELECT id, name FROM treatment_categories WHERE lower(name) = lower(:name)"),
                {"name": cat_name}
            )).first()
            if cat_row:
                cat_id = cat_row.id

        await session.execute(text("""
            INSERT INTO master_treatments (
                id, name, category, category_id, description, medical_specialty,
                standard_duration_minutes, reference_price_min, reference_price_max
            ) VALUES (
                :id, :name, :category, :category_id, :description, :medical_specialty,
                :duration, :price_min, :price_max
            )
        """), {
            "id": treatment_id,
            "name": payload.name.strip(),
            "category": cat_name,
            "category_id": cat_id,
            "description": payload.description,
            "medical_specialty": payload.medical_specialty,
            "duration": payload.standard_duration_minutes,
            "price_min": payload.reference_price_min,
            "price_max": payload.reference_price_max,
        })

        for cid in payload.concern_ids:
            try:
                await session.execute(text("""
                    INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
                    VALUES (:tid, CAST(:cid AS uuid), 5)
                    ON CONFLICT DO NOTHING
                """), {"tid": treatment_id, "cid": cid})
            except Exception:
                pass

        await session.commit()

    return {"id": str(treatment_id), "status": "CREATED", "message": "Master treatment created successfully."}



@router.patch("/master-catalog/treatments/{treatment_id}")
async def update_master_treatment(
    treatment_id: UUID,
    payload: MasterTreatmentUpdate,
    actor: Actor = Depends(require_super_admin)
):
    """Update a master treatment and its concern mappings."""
    async with SessionLocal() as session:
        treatment = (await session.execute(
            text("SELECT id FROM master_treatments WHERE id = CAST(:id AS uuid)"),
            {"id": treatment_id}
        )).first()
        if not treatment:
            raise HTTPException(status_code=404, detail="Master treatment not found.")

        updates = []
        params = {"id": treatment_id}

        if payload.name is not None:
            updates.append("name = :name")
            params["name"] = payload.name.strip()
        if payload.category is not None:
            updates.append("category = :category")
            params["category"] = payload.category.strip()
        if payload.description is not None:
            updates.append("description = :description")
            params["description"] = payload.description
        if payload.medical_specialty is not None:
            updates.append("medical_specialty = :specialty")
            params["specialty"] = payload.medical_specialty
        if payload.standard_duration_minutes is not None:
            updates.append("standard_duration_minutes = :duration")
            params["duration"] = payload.standard_duration_minutes
        if payload.reference_price_min is not None:
            updates.append("reference_price_min = :pmin")
            params["pmin"] = payload.reference_price_min
        if payload.reference_price_max is not None:
            updates.append("reference_price_max = :pmax")
            params["pmax"] = payload.reference_price_max
        if payload.is_active is not None:
            updates.append("is_active = :active")
            params["active"] = payload.is_active

        if updates:
            await session.execute(
                text(f"UPDATE master_treatments SET {', '.join(updates)} WHERE id = CAST(:id AS uuid)"),
                params
            )

        if payload.concern_ids is not None:
            await session.execute(
                text("DELETE FROM treatment_concern_mappings WHERE treatment_id = CAST(:id AS uuid)"),
                {"id": treatment_id}
            )
            for cid in payload.concern_ids:
                try:
                    await session.execute(text("""
                        INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
                        VALUES (CAST(:tid AS uuid), CAST(:cid AS uuid), 5)
                        ON CONFLICT DO NOTHING
                    """), {"tid": treatment_id, "cid": cid})
                except Exception:
                    pass

        await session.commit()

    return {"status": "UPDATED", "message": "Master treatment updated successfully."}


@router.post("/master-catalog/concerns")
async def create_target_concern(
    payload: TargetConcernCreate,
    actor: Actor = Depends(require_super_admin)
):
    """Add a new detectable facial or skin target concern."""
    concern_id = uuid4()
    async with SessionLocal() as session:
        existing = (await session.execute(
            text("SELECT 1 FROM target_concerns WHERE code = :code"),
            {"code": payload.code.strip().upper()}
        )).first()
        if existing:
            raise HTTPException(status_code=409, detail="A concern with this code already exists.")

        await session.execute(text("""
            INSERT INTO target_concerns (id, code, name, category, description)
            VALUES (:id, :code, :name, :category, :description)
        """), {
            "id": concern_id,
            "code": payload.code.strip().upper(),
            "name": payload.name.strip(),
            "category": payload.category.strip().upper(),
            "description": payload.description
        })
        await session.commit()

    return {"id": str(concern_id), "status": "CREATED", "message": "Target concern added successfully."}

