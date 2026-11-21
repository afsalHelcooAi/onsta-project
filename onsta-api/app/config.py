import os
from enum import Enum
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

class ClinicStatus(str, Enum):
    DRAFT = "DRAFT"
    DOCUMENTS_UPLOADED = "DOCUMENTS_UPLOADED"
    PROCESSING = "PROCESSING"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ADDITIONAL_INFO_REQUESTED = "ADDITIONAL_INFO_REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class DocumentType(str, Enum):
    TRADE_LICENSE = "TRADE_LICENSE"
    FACILITY_LICENSE = "FACILITY_LICENSE"
    MOHAP_ADVERTISING = "MOHAP_ADVERTISING"
    DOCTOR_LICENSE = "DOCTOR_LICENSE"

class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    FLAGGED = "FLAGGED"
    REJECTED = "REJECTED"

class Settings:
    PROJECT_NAME: str = "ONSTA Clinic Partner API"
    API_V1_STR: str = "/api/v1"
    
    # -------------------------------------------------------------
    # 1. DATABASE CONFIGURATION (Local Postgres First)
    # -------------------------------------------------------------
    # Local Postgres (Development & Local Testing):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://postgres:12345@localhost:5432/onsta_platform_db"
    )
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-this-development-secret-before-use")
    SUPER_ADMIN_EMAIL: Optional[str] = os.getenv("SUPER_ADMIN_EMAIL")
    SUPER_ADMIN_PASSWORD: Optional[str] = os.getenv("SUPER_ADMIN_PASSWORD")
    SUPER_ADMIN_NAME: str = os.getenv("SUPER_ADMIN_NAME", "ONSTA Super Admin")
    # AWS RDS Postgres (Production Configuration - Keep for future AWS deployment):
    # DATABASE_URL: str = "postgresql+asyncpg://onsta_admin:SECURE_PASSWORD@onsta-rds.c12345.me-central-1.rds.amazonaws.com:5432/onsta_clinic_prod"
    
    # SQLite local fallback (for zero-dependency testing without running Postgres service)
    SQLITE_LOCAL_URL: str = "sqlite+aiosqlite:///./local_test.db"

    # -------------------------------------------------------------
    # 2. CACHING & TASK QUEUE (Local Redis / In-Memory Fallback)
    # -------------------------------------------------------------
    # Local Redis (can be run via Docker `docker run -p 6379:6379 redis:alpine` or locally)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    # Auto-fallback to In-Memory store if Redis service is not detected locally
    USE_IN_MEMORY_FALLBACK: bool = True
    
    # -------------------------------------------------------------
    # 3. OBJECT STORAGE CONFIGURATION (Local Storage First)
    # -------------------------------------------------------------
    # Storage Backend: "local" (default for development) | "s3" (for AWS production)
    STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local")
    
    # Local Storage Directory
    LOCAL_UPLOAD_DIR: str = os.getenv("LOCAL_UPLOAD_DIR", "./uploads")
    LOCAL_STATIC_URL_PREFIX: str = "/uploads"
    
    # AWS S3 Storage (Keep commented for future AWS deployment):
    # AWS_REGION: str = "me-central-1" # UAE Central
    # S3_BUCKET_NAME: str = "onsta-clinic-regulatory-docs"
    # S3_PRESIGNED_EXPIRATION: int = 300 # 5 minutes
    
    # -------------------------------------------------------------
    # 4. AI GATEWAY (Gemini 2.0 Flash - Speed & Latency Analysis)
    # -------------------------------------------------------------
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    AI_MODEL_NAME: str = "gemini-2.0-flash"
    ENABLE_LATENCY_METRICS: bool = True
    
    # Idempotency TTL
    IDEMPOTENCY_TTL_SECONDS: int = 86400 # 24 hours

settings = Settings()
