from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.config import settings
from app.db.database import engine
from app.api.v1.auth import router as auth_router
from app.api.v1.platform_admin import router as platform_admin_router
from app.api.v1.clinic_accounts import router as clinic_accounts_router
from app.api.v1.clinic_profile import router as clinic_profile_router
from app.api.v1.clinic_doctors import router as clinic_doctors_router
from app.api.v1.clinic_services import router as clinic_services_router
from app.api.v1.clinic_compliance import router as clinic_compliance_router

@asynccontextmanager
async def lifespan(_app: FastAPI):
    async with engine.connect() as connection:
        rows = await connection.execute(text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """))
        present = set(rows.scalars().all())
    required = {
        "users", "roles", "permissions", "role_permissions", "user_roles",
        "clinic_applications", "clinic_application_documents", "clinic_memberships",
    }
    missing = sorted(required - present)
    if missing:
        raise RuntimeError(
            "The required database schema is incomplete. For a new empty database, run "
            "app/db/standalone_schema.sql. Missing tables: "
            + ", ".join(missing)
        )
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description="ONSTA Clinic Partner Portal Backend API - Fast Onboarding & Ingestion Engine",
        lifespan=lifespan,
    )

    # CORS configuration for Clinic Portal and Consumer Web
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API Routers
    app.include_router(auth_router, prefix=settings.API_V1_STR)
    app.include_router(platform_admin_router, prefix=settings.API_V1_STR)
    app.include_router(clinic_accounts_router, prefix=settings.API_V1_STR)
    app.include_router(clinic_profile_router, prefix=settings.API_V1_STR)
    app.include_router(clinic_doctors_router, prefix=settings.API_V1_STR)
    app.include_router(clinic_services_router, prefix=settings.API_V1_STR)
    app.include_router(clinic_compliance_router, prefix=settings.API_V1_STR)

    # Static uploads mounting for images and media
    upload_dir = Path(settings.LOCAL_UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    @app.get("/health", tags=["Health"])
    def health_check():
        return {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "ai_model": settings.AI_MODEL_NAME
        }

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
