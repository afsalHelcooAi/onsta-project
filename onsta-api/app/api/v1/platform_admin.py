import json
from pathlib import Path
from typing import Optional
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
