import asyncio

from sqlalchemy import text

from app.config import settings
from app.core.security import hash_password
from app.db.database import engine

ROLE_SEEDS = [
    ("SUPER_ADMIN", "PLATFORM", "Full platform administration"),
    ("CLINIC_OWNER", "CLINIC", "Owner of an approved clinic tenant"),
]

DOCUMENT_SEEDS = [
    ("TRADE_LICENSE", "Trade license", "APPLICATION"),
    ("FACILITY_LICENSE", "Healthcare facility license", "APPLICATION"),
    ("MOHAP_ADVERTISING", "Healthcare advertising permit", "APPLICATION"),
    ("COMPANY_REGISTRATION", "Company registration document", "APPLICATION"),
    ("AUTHORIZED_REP_ID", "Authorized representative identity document", "APPLICATION"),
    ("AUTHORIZATION_LETTER", "Authorization letter", "APPLICATION"),
    ("BRANCH_LICENSE", "Branch license", "BRANCH"),
    ("DOCTOR_LICENSE", "Practitioner professional license", "PRACTITIONER"),
    ("QUALIFICATION_CERTIFICATE", "Practitioner qualification certificate", "PRACTITIONER"),
]


async def main() -> None:
    if not settings.SUPER_ADMIN_EMAIL or not settings.SUPER_ADMIN_PASSWORD:
        raise SystemExit("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in onsta-api/.env before seeding.")
    if len(settings.SUPER_ADMIN_PASSWORD) < 12:
        raise SystemExit("SUPER_ADMIN_PASSWORD must be at least 12 characters.")
    async with engine.begin() as conn:
        for name, scope, description in ROLE_SEEDS:
            await conn.execute(text("""
                INSERT INTO roles(name, scope, description) VALUES (:name, :scope, :description)
                ON CONFLICT(name, scope) DO UPDATE SET description = EXCLUDED.description
            """), {"name": name, "scope": scope, "description": description})
        for code, name, scope in DOCUMENT_SEEDS:
            await conn.execute(text("""
                INSERT INTO document_types(code, name, scope) VALUES (:code, :name, :scope)
                ON CONFLICT(code) DO UPDATE SET name = EXCLUDED.name, scope = EXCLUDED.scope
            """), {"code": code, "name": name, "scope": scope})
        user = (await conn.execute(text("""
            INSERT INTO users(email, password_hash, full_name, status)
            VALUES (:email, :password_hash, :full_name, 'ACTIVE')
            ON CONFLICT(email_normalized) DO UPDATE SET password_hash = EXCLUDED.password_hash,
                full_name = EXCLUDED.full_name, status = 'ACTIVE', updated_at = now()
            RETURNING id::text AS id
        """), {"email": settings.SUPER_ADMIN_EMAIL.strip(), "password_hash": hash_password(settings.SUPER_ADMIN_PASSWORD), "full_name": settings.SUPER_ADMIN_NAME})).mappings().one()
        role_id = (await conn.execute(text("SELECT id::text FROM roles WHERE name = 'SUPER_ADMIN' AND scope = 'PLATFORM'"))).scalar_one()
        await conn.execute(text("""
            INSERT INTO user_roles(user_id, role_id) VALUES (CAST(:user_id AS uuid), CAST(:role_id AS uuid))
            ON CONFLICT(user_id, role_id) DO NOTHING
        """), {"user_id": user["id"], "role_id": role_id})
    await engine.dispose()
    print(f"Seeded Super Admin {settings.SUPER_ADMIN_EMAIL.strip()} and required roles/document types.")


if __name__ == "__main__":
    asyncio.run(main())
