from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.core.security import create_access_token, decode_access_token, verify_password
from app.db.database import SessionLocal

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    password: str = Field(min_length=1, max_length=256)


class Actor(dict):
    pass


async def get_current_actor(authorization: str | None = Header(default=None)) -> Actor:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    try:
        claims = decode_access_token(authorization.split(" ", 1)[1].strip())
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    async with SessionLocal() as session:
        row = (await session.execute(text("""
            SELECT id::text AS id, email, full_name, status
            FROM users WHERE id = CAST(:user_id AS uuid)
        """), {"user_id": claims["sub"]})).mappings().first()
    if not row or row["status"] != "ACTIVE":
        raise HTTPException(status_code=401, detail="This account is not active.")
    return Actor(row)


async def resolve_workspace(session: Any, user_id: str) -> dict[str, Any]:
    platform = (await session.execute(text("""
        SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = CAST(:user_id AS uuid)
          AND r.name = 'SUPER_ADMIN' AND r.scope = 'PLATFORM'
        LIMIT 1
    """), {"user_id": user_id})).first()
    if platform:
        return {
            "workspace": "SUPER_ADMIN",
            "role": platform[0],
            "application": None,
        }
    membership = (await session.execute(text("""
        SELECT r.name, t.id::text AS tenant_id, c.id::text AS clinic_id,
            c.legal_name, c.trading_name, c.facility_type,
            c.primary_email, c.primary_phone
        FROM clinic_memberships m JOIN roles r ON r.id = m.role_id
        JOIN tenants t ON t.id = m.tenant_id
        JOIN clinics c ON c.tenant_id = t.id
        WHERE m.user_id = CAST(:user_id AS uuid) AND m.status = 'ACTIVE' AND t.status = 'ACTIVE'
        LIMIT 1
    """), {"user_id": user_id})).mappings().first()
    if membership:
        clinic = {key: membership[key] for key in ("clinic_id", "legal_name", "trading_name", "facility_type", "primary_email", "primary_phone")}
        return {"workspace": "CLINIC", "role": membership["name"], "tenant_id": membership["tenant_id"], "clinic": clinic, "application": None}
    application = (await session.execute(text("""
        SELECT id::text AS id, application_reference, application_status
        FROM clinic_applications WHERE submitted_by_user_id = CAST(:user_id AS uuid)
        ORDER BY created_at DESC LIMIT 1
    """), {"user_id": user_id})).mappings().first()
    if application:
        open_requests = (await session.execute(text("""
            SELECT requested_fields, request_message, due_at, created_at
            FROM clinic_application_info_requests
            WHERE application_id = CAST(:application_id AS uuid) AND status = 'OPEN'
            ORDER BY created_at DESC
        """), {"application_id": application["id"]})).mappings().all()
        latest_review = (await session.execute(text("""
            SELECT decision, rejection_reason, review_notes, created_at
            FROM clinic_application_reviews
            WHERE application_id = CAST(:application_id AS uuid)
            ORDER BY created_at DESC LIMIT 1
        """), {"application_id": application["id"]})).mappings().first()
        application_data = dict(application)
        application_data["open_requests"] = [dict(item) for item in open_requests]
        if latest_review:
            application_data["rejection_reason"] = latest_review["rejection_reason"]
            application_data["review_notes"] = latest_review["review_notes"]
            application_data["review_decision"] = latest_review["decision"]
        return {"workspace": "CLINIC", "role": "CLINIC_APPLICANT", "application": application_data}
    raise HTTPException(status_code=403, detail="This account has no assigned workspace.")


@router.post("/login")
async def login(payload: LoginRequest):
    async with SessionLocal() as session:
        row = (await session.execute(text("""
            SELECT id::text AS id, email, password_hash, full_name, status
            FROM users WHERE email_normalized = lower(trim(:email))
        """), {"email": str(payload.email)})).mappings().first()
        if not row or row["status"] != "ACTIVE" or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Email or password is incorrect.")
        workspace = await resolve_workspace(session, row["id"])
        await session.execute(text("UPDATE users SET last_login_at = now() WHERE id = CAST(:id AS uuid)"), {"id": row["id"]})
        await session.commit()
    return {
        "access_token": create_access_token(row["id"]),
        "token_type": "bearer",
        "user": {"id": row["id"], "email": row["email"], "full_name": row["full_name"], "role": workspace["role"], "workspace": workspace["workspace"]},
        "application": workspace.get("application"),
        "tenant_id": workspace.get("tenant_id"),
        "clinic": workspace.get("clinic"),
    }


@router.get("/me")
async def get_me(actor: Actor = Depends(get_current_actor)):
    async with SessionLocal() as session:
        workspace = await resolve_workspace(session, actor["id"])
    return {"user": {"id": actor["id"], "email": actor["email"], "full_name": actor["full_name"], "role": workspace["role"], "workspace": workspace["workspace"]}, "application": workspace.get("application"), "tenant_id": workspace.get("tenant_id"), "clinic": workspace.get("clinic")}
