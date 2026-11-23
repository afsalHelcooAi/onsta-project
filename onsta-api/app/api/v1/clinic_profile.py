import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.api.v1.auth import Actor, get_current_actor
from app.config import settings
from app.db.database import SessionLocal

router = APIRouter(prefix="/clinic", tags=["Clinic Profile & Media"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 15 * 1024 * 1024  # 15 MB

# MOHAP Compliance: Prohibited Promotional Superlatives under UAE Healthcare Advertising Law
PROHIBITED_PATTERNS = [
    (r"\bbest\b", "'best'"),
    (r"(?:#\s*1\b|\bno\.?\s*1\b|\bnumber\s*(?:one|1)\b)", "'#1 / Number 1'"),
    (r"\bcheapest\b", "'cheapest'"),
    (r"\b100%\b", "'100%'"),
    (r"\bguarantee[ds]?\b", "'guarantee / guaranteed'"),
    (r"\bonly\b", "'only'"),
    (r"\bunbeatable\b", "'unbeatable'"),
    (r"\blowest\s+price\b", "'lowest price'"),
    (r"\bmost\s+advanced\b", "'most advanced'"),
]


def check_mohap_compliance(text_content: str, field_name: str):
    if not text_content:
        return
    for pattern, label in PROHIBITED_PATTERNS:
        if re.search(pattern, text_content, re.IGNORECASE):
            raise HTTPException(
                status_code=422,
                detail=f"MOHAP Compliance Violation in {field_name}: Promoted superlatives like {label} are strictly prohibited under UAE Healthcare Advertising regulations (Rule V08). Use factual, non-exaggerated medical descriptions."
            )


async def resolve_clinic_context(session, user_id: str):
    """Resolve the active clinic and tenant for the authenticated clinic user."""
    # 1. From clinic_memberships
    membership = (await session.execute(text("""
        SELECT c.id::text AS clinic_id, c.tenant_id::text AS tenant_id,
               c.legal_name, c.trading_name, c.facility_type,
               c.primary_email, c.primary_phone, c.public_description,
               c.logo_storage_key, c.cover_image_storage_key,
               c.website, c.opening_hours, c.rating, c.review_count,
               c.verification_status, c.visibility_status
        FROM clinic_memberships m
        JOIN tenants t ON t.id = m.tenant_id
        JOIN clinics c ON c.tenant_id = t.id
        WHERE m.user_id = CAST(:user_id AS uuid) AND m.status = 'ACTIVE' AND t.status = 'ACTIVE'
        LIMIT 1
    """), {"user_id": user_id})).mappings().first()

    if membership:
        return dict(membership)

    # 2. Check if user has an approved clinic_application
    app = (await session.execute(text("""
        SELECT id::text AS id, legal_entity_name, trading_name, facility_type,
               official_email, main_phone, emirate, city_area, street_building
        FROM clinic_applications
        WHERE submitted_by_user_id = CAST(:user_id AS uuid) AND application_status = 'APPROVED'
        ORDER BY updated_at DESC LIMIT 1
    """), {"user_id": user_id})).mappings().first()

    if not app:
        raise HTTPException(status_code=403, detail="Clinic portal access is only available for approved clinics.")

    # Auto-initialize tenant and clinic row if application was approved directly
    tenant_code = f"ONSTA-{uuid4().hex[:8].upper()}"
    tenant = (await session.execute(text("""
        INSERT INTO tenants (tenant_code, name, status, activated_at)
        VALUES (:code, :name, 'ACTIVE', now())
        RETURNING id::text AS id
    """), {"code": tenant_code, "name": app["trading_name"]})).mappings().one()

    clinic = (await session.execute(text("""
        INSERT INTO clinics (tenant_id, approved_application_id, legal_name, trading_name,
                             facility_type, primary_email, primary_phone, verification_status, visibility_status)
        VALUES (CAST(:tenant_id AS uuid), CAST(:app_id AS uuid), :legal_name, :trading_name,
                :facility_type, :email, :phone, 'VERIFIED', 'DRAFT')
        RETURNING id::text AS clinic_id, tenant_id::text AS tenant_id,
                  legal_name, trading_name, facility_type, primary_email, primary_phone,
                  public_description, logo_storage_key, cover_image_storage_key,
                  website, opening_hours, rating, review_count, verification_status, visibility_status
    """), {
        "tenant_id": tenant["id"],
        "app_id": app["id"],
        "legal_name": app["legal_entity_name"],
        "trading_name": app["trading_name"],
        "facility_type": app["facility_type"],
        "email": app["official_email"],
        "phone": app["main_phone"] or "+971 50 123 4567"
    })).mappings().one()

    # Create primary branch
    await session.execute(text("""
        INSERT INTO clinic_branches (tenant_id, clinic_id, branch_code, branch_name,
                                     emirate, area, street_address, phone, email, status)
        VALUES (CAST(:tenant_id AS uuid), CAST(:clinic_id AS uuid), 'MAIN', :bname,
                :emirate, :area, :address, :phone, :email, 'ACTIVE')
        ON CONFLICT DO NOTHING
    """), {
        "tenant_id": tenant["id"],
        "clinic_id": clinic["clinic_id"],
        "bname": f"{app['trading_name']} - Main Branch",
        "emirate": app["emirate"] or "Dubai",
        "area": app["city_area"] or "",
        "address": app["street_building"] or "",
        "phone": app["main_phone"] or "",
        "email": app["official_email"] or ""
    })

    # Add owner membership
    owner_role = (await session.execute(text("SELECT id::text FROM roles WHERE name = 'CLINIC_OWNER' AND scope = 'CLINIC'"))).scalar_one_or_none()
    if owner_role:
        await session.execute(text("""
            INSERT INTO clinic_memberships (tenant_id, user_id, role_id, status, joined_at)
            VALUES (CAST(:tenant_id AS uuid), CAST(:user_id AS uuid), CAST(:role_id AS uuid), 'ACTIVE', now())
            ON CONFLICT (tenant_id, user_id) DO NOTHING
        """), {"tenant_id": tenant["id"], "user_id": user_id, "role_id": owner_role})

    return dict(clinic)


class ClinicProfileUpdateRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=220)
    public_description: str | None = Field(default=None, max_length=4000)
    contact_phone: str = Field(min_length=5, max_length=32)
    company_email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    website: str | None = Field(default=None, max_length=255)
    city_area: str | None = Field(default=None, max_length=160)
    address: str = Field(min_length=2, max_length=2000)
    opening_hours: str | None = Field(default=None, max_length=255)


@router.get("/profile")
async def get_clinic_profile(actor: Actor = Depends(get_current_actor)):
    async with SessionLocal() as session:
        clinic = await resolve_clinic_context(session, actor["id"])
        clinic_id = clinic["clinic_id"]
        tenant_id = clinic["tenant_id"]

        # Fetch branch details
        branch = (await session.execute(text("""
            SELECT emirate, area, street_address, phone, email
            FROM clinic_branches
            WHERE clinic_id = CAST(:clinic_id AS uuid)
            ORDER BY created_at ASC LIMIT 1
        """), {"clinic_id": clinic_id})).mappings().first()

        # Fetch gallery media
        media_rows = (await session.execute(text("""
            SELECT id::text AS id, category, caption, storage_key, file_url, is_active, is_cover, created_at
            FROM clinic_media
            WHERE clinic_id = CAST(:clinic_id AS uuid)
            ORDER BY is_cover DESC, created_at DESC
        """), {"clinic_id": clinic_id})).mappings().all()

        gallery = [
            {
                "id": row["id"],
                "url": row["file_url"],
                "caption": row["caption"] or "",
                "category": row["category"],
                "isActive": row["is_active"],
                "isCover": row["is_cover"],
                "createdAt": row["created_at"].isoformat() if row["created_at"] else None
            }
            for row in media_rows
        ]

        return {
            "id": clinic_id,
            "tenant_id": tenant_id,
            "legalName": clinic["legal_name"],
            "displayName": clinic["trading_name"],
            "category": clinic["facility_type"],
            "description": clinic["public_description"] or "",
            "contactPhone": clinic["primary_phone"],
            "companyEmail": clinic["primary_email"],
            "website": clinic["website"] or "",
            "openingHours": clinic["opening_hours"] or "Mon - Sat: 9:00 AM - 8:00 PM | Sun: Closed",
            "emirate": branch["emirate"] if branch else "Dubai",
            "cityArea": branch["area"] if branch and branch["area"] else "",
            "address": branch["street_address"] if branch else "",
            "logo": clinic["logo_storage_key"] or "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80",
            "coverImage": clinic["cover_image_storage_key"] or "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1200&auto=format&fit=crop&q=80",
            "rating": float(clinic["rating"] or 4.9),
            "reviewCount": int(clinic["review_count"] or 142),
            "verificationStatus": clinic["verification_status"],
            "gallery": gallery
        }


@router.put("/profile")
async def update_clinic_profile(payload: ClinicProfileUpdateRequest, actor: Actor = Depends(get_current_actor)):
    # 1. Enforce MOHAP Compliance Check
    check_mohap_compliance(payload.display_name, "Display Name")
    check_mohap_compliance(payload.public_description or "", "About Clinic Description")

    async with SessionLocal() as session:
        async with session.begin():
            clinic = await resolve_clinic_context(session, actor["id"])
            clinic_id = clinic["clinic_id"]
            tenant_id = clinic["tenant_id"]

            # Update clinics table
            await session.execute(text("""
                UPDATE clinics SET
                    trading_name = :trading_name,
                    public_description = :description,
                    primary_phone = :phone,
                    primary_email = :email,
                    website = :website,
                    opening_hours = :hours,
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
            """), {
                "id": clinic_id,
                "trading_name": payload.display_name.strip(),
                "description": (payload.public_description or "").strip(),
                "phone": payload.contact_phone.strip(),
                "email": payload.company_email.strip().lower(),
                "website": (payload.website or "").strip(),
                "hours": (payload.opening_hours or "").strip()
            })

            # Update or insert branch address
            existing_branch = (await session.execute(text("""
                SELECT id FROM clinic_branches WHERE clinic_id = CAST(:id AS uuid) LIMIT 1
            """), {"id": clinic_id})).first()

            if existing_branch:
                await session.execute(text("""
                    UPDATE clinic_branches SET
                        area = :area,
                        street_address = :address,
                        phone = :phone,
                        email = :email
                    WHERE clinic_id = CAST(:id AS uuid)
                """), {
                    "id": clinic_id,
                    "area": (payload.city_area or "").strip(),
                    "address": payload.address.strip(),
                    "phone": payload.contact_phone.strip(),
                    "email": payload.company_email.strip().lower()
                })
            else:
                await session.execute(text("""
                    INSERT INTO clinic_branches (tenant_id, clinic_id, branch_code, branch_name,
                                                 emirate, area, street_address, phone, email, status)
                    VALUES (CAST(:tenant_id AS uuid), CAST(:clinic_id AS uuid), 'MAIN', :bname,
                            'Dubai', :area, :address, :phone, :email, 'ACTIVE')
                """), {
                    "tenant_id": tenant_id,
                    "clinic_id": clinic_id,
                    "bname": f"{payload.display_name.strip()} - Main Branch",
                    "area": (payload.city_area or "").strip(),
                    "address": payload.address.strip(),
                    "phone": payload.contact_phone.strip(),
                    "email": payload.company_email.strip().lower()
                })

    return {"message": "Clinic profile updated successfully."}


@router.post("/media", status_code=201)
async def upload_clinic_media(
    file: UploadFile = File(...),
    caption: str = Form(...),
    category: str = Form("Interior"),
    is_cover: bool = Form(False),
    actor: Actor = Depends(get_current_actor)
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")

    content = await file.read(MAX_IMAGE_SIZE + 1)
    if not content or len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image exceeds the 15 MB limit.")

    # MOHAP Compliance for media caption
    check_mohap_compliance(caption, "Photo Caption")

    async with SessionLocal() as session:
        async with session.begin():
            clinic = await resolve_clinic_context(session, actor["id"])
            clinic_id = clinic["clinic_id"]
            tenant_id = clinic["tenant_id"]

            media_id = str(uuid4())
            safe_name = Path(file.filename or "photo.jpg").name
            storage_key = f"clinics/{clinic_id}/media/{media_id}-{safe_name}"
            dest = Path(settings.LOCAL_UPLOAD_DIR) / storage_key
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(content)

            file_url = f"/uploads/{storage_key}"

            if is_cover:
                # Clear previous cover flag
                await session.execute(text("""
                    UPDATE clinic_media SET is_cover = FALSE WHERE clinic_id = CAST(:id AS uuid)
                """), {"id": clinic_id})
                await session.execute(text("""
                    UPDATE clinics SET cover_image_storage_key = :url WHERE id = CAST(:id AS uuid)
                """), {"url": file_url, "id": clinic_id})

            await session.execute(text("""
                INSERT INTO clinic_media (id, tenant_id, clinic_id, category, caption, storage_key, file_url, is_active, is_cover)
                VALUES (CAST(:id AS uuid), CAST(:tenant_id AS uuid), CAST(:clinic_id AS uuid),
                        :category, :caption, :storage_key, :file_url, TRUE, :is_cover)
            """), {
                "id": media_id,
                "tenant_id": tenant_id,
                "clinic_id": clinic_id,
                "category": category,
                "caption": caption.strip(),
                "storage_key": storage_key,
                "file_url": file_url,
                "is_cover": is_cover
            })

    return {
        "id": media_id,
        "url": file_url,
        "caption": caption.strip(),
        "category": category,
        "isActive": True,
        "isCover": is_cover
    }


@router.delete("/media/{media_id}")
async def delete_clinic_media(media_id: str, actor: Actor = Depends(get_current_actor)):
    async with SessionLocal() as session:
        async with session.begin():
            clinic = await resolve_clinic_context(session, actor["id"])
            clinic_id = clinic["clinic_id"]

            row = (await session.execute(text("""
                SELECT storage_key FROM clinic_media
                WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:clinic_id AS uuid)
            """), {"id": media_id, "clinic_id": clinic_id})).mappings().first()

            if not row:
                raise HTTPException(status_code=404, detail="Media item not found.")

            await session.execute(text("""
                DELETE FROM clinic_media WHERE id = CAST(:id AS uuid)
            """), {"id": media_id})

            # Remove file locally if it exists
            target = Path(settings.LOCAL_UPLOAD_DIR) / row["storage_key"]
            target.unlink(missing_ok=True)

    return {"message": "Media deleted successfully."}


class MediaPatchRequest(BaseModel):
    is_active: bool | None = None
    is_cover: bool | None = None
    caption: str | None = None
    category: str | None = None


@router.patch("/media/{media_id}")
async def patch_clinic_media(media_id: str, payload: MediaPatchRequest, actor: Actor = Depends(get_current_actor)):
    if payload.caption:
        check_mohap_compliance(payload.caption, "Photo Caption")

    async with SessionLocal() as session:
        async with session.begin():
            clinic = await resolve_clinic_context(session, actor["id"])
            clinic_id = clinic["clinic_id"]

            row = (await session.execute(text("""
                SELECT file_url FROM clinic_media
                WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:clinic_id AS uuid)
            """), {"id": media_id, "clinic_id": clinic_id})).mappings().first()

            if not row:
                raise HTTPException(status_code=404, detail="Media item not found.")

            updates = []
            params = {"id": media_id, "clinic_id": clinic_id}

            if payload.is_active is not None:
                updates.append("is_active = :active")
                params["active"] = payload.is_active

            if payload.caption is not None:
                updates.append("caption = :caption")
                params["caption"] = payload.caption.strip()

            if payload.category is not None:
                updates.append("category = :category")
                params["category"] = payload.category.strip()

            if payload.is_cover:
                await session.execute(text("""
                    UPDATE clinic_media SET is_cover = FALSE WHERE clinic_id = CAST(:clinic_id AS uuid)
                """), {"clinic_id": clinic_id})
                await session.execute(text("""
                    UPDATE clinics SET cover_image_storage_key = :url WHERE id = CAST(:clinic_id AS uuid)
                """), {"url": row["file_url"], "clinic_id": clinic_id})
                updates.append("is_cover = TRUE")

            if updates:
                await session.execute(text(f"""
                    UPDATE clinic_media SET {', '.join(updates)} WHERE id = CAST(:id AS uuid)
                """), params)

    return {"message": "Media item updated successfully."}


@router.post("/brand-assets/{asset_type}")
async def upload_brand_asset(
    asset_type: str,
    file: UploadFile = File(...),
    actor: Actor = Depends(get_current_actor)
):
    if asset_type not in {"logo", "cover"}:
        raise HTTPException(status_code=400, detail="Asset type must be 'logo' or 'cover'.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")

    content = await file.read(MAX_IMAGE_SIZE + 1)
    if not content or len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image exceeds the 15 MB limit.")

    async with SessionLocal() as session:
        async with session.begin():
            clinic = await resolve_clinic_context(session, actor["id"])
            clinic_id = clinic["clinic_id"]

            safe_name = Path(file.filename or f"{asset_type}.jpg").name
            storage_key = f"clinics/{clinic_id}/brand/{asset_type}-{uuid4().hex[:6]}-{safe_name}"
            dest = Path(settings.LOCAL_UPLOAD_DIR) / storage_key
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(content)

            file_url = f"/uploads/{storage_key}"
            col_name = "logo_storage_key" if asset_type == "logo" else "cover_image_storage_key"

            await session.execute(text(f"""
                UPDATE clinics SET {col_name} = :url WHERE id = CAST(:id AS uuid)
            """), {"url": file_url, "id": clinic_id})

    return {"asset_type": asset_type, "url": file_url}
