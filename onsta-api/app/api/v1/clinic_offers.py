import uuid
from typing import Optional, List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.database import get_db
from app.api.v1.auth import get_current_actor, Actor
from app.api.v1.clinic_services import _resolve_clinic_context

router = APIRouter(prefix="/clinic/offers", tags=["Clinic Offers"])


class OfferCreateRequest(BaseModel):
    service_id: str
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    normal_price: float = Field(..., ge=0)
    offer_price: float = Field(..., ge=0)
    start_date: Optional[date] = None
    end_date: date
    terms: Optional[str] = None
    is_active: Optional[bool] = True
    image_url: Optional[str] = None


class OfferUpdateRequest(BaseModel):
    service_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    normal_price: Optional[float] = None
    offer_price: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    terms: Optional[str] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None


class OfferStatusToggleRequest(BaseModel):
    is_active: bool


@router.get("")
async def get_clinic_offers(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """List all promotional offers created by the authenticated clinic."""
    ctx = await _resolve_clinic_context(db, actor["id"])

    rows = (await db.execute(text("""
        SELECT 
            o.id::text,
            o.service_id::text AS "linkedServiceId",
            s.name AS "linkedServiceName",
            o.title,
            COALESCE(o.description, '') AS "description",
            o.normal_price::float AS "normalPrice",
            o.offer_price::float AS "offerPrice",
            o.discount_percentage AS "discountPercent",
            o.currency,
            o.start_date::text AS "startDate",
            o.end_date::text AS "endDate",
            COALESCE(o.terms_and_conditions, '') AS "terms",
            o.is_active AS "isActive",
            o.verification_status AS "verificationStatus",
            o.image_url AS "imageUrl",
            o.created_at AS "createdAt",
            o.updated_at AS "updatedAt"
        FROM clinic_offers o
        JOIN services s ON s.id = o.service_id
        WHERE o.clinic_id = CAST(:clinic_id AS uuid)
        ORDER BY o.created_at DESC
    """), {"clinic_id": ctx["clinic_id"]})).mappings().all()

    return [dict(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_clinic_offer(
    payload: OfferCreateRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Create a new promotional offer tied to a valid clinic service."""
    ctx = await _resolve_clinic_context(db, actor["id"])

    # Verify that the service belongs strictly to this clinic
    service = (await db.execute(text("""
        SELECT id, name, price 
        FROM services 
        WHERE id = CAST(:sid AS uuid) AND clinic_id = CAST(:cid AS uuid)
    """), {"sid": payload.service_id, "cid": ctx["clinic_id"]})).mappings().first()

    if not service:
        raise HTTPException(
            status_code=400,
            detail="The selected service does not exist in your clinic directory."
        )

    offer_id = str(uuid.uuid4())
    start_dt = payload.start_date or date.today()

    await db.execute(text("""
        INSERT INTO clinic_offers (
            id, tenant_id, clinic_id, service_id, title, description,
            normal_price, offer_price, currency, start_date, end_date,
            terms_and_conditions, is_active, verification_status, image_url
        ) VALUES (
            CAST(:id AS uuid), CAST(:tenant_id AS uuid), CAST(:clinic_id AS uuid),
            CAST(:service_id AS uuid), :title, :description,
            :normal_price, :offer_price, 'AED', :start_date, :end_date,
            :terms, :is_active, 'VERIFIED', :image_url
        )
    """), {
        "id": offer_id,
        "tenant_id": ctx["tenant_id"],
        "clinic_id": ctx["clinic_id"],
        "service_id": payload.service_id,
        "title": payload.title.strip(),
        "description": payload.description or "",
        "normal_price": payload.normal_price,
        "offer_price": payload.offer_price,
        "start_date": start_dt,
        "end_date": payload.end_date,
        "terms": payload.terms or "",
        "is_active": payload.is_active,
        "image_url": payload.image_url
    })
    await db.commit()

    return {
        "status": "success",
        "id": offer_id,
        "title": payload.title.strip(),
        "linkedServiceName": service["name"],
        "message": "Offer created successfully in database."
    }


@router.patch("/{offer_id}")
async def update_clinic_offer(
    offer_id: str,
    payload: OfferUpdateRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing offer belonging to the clinic."""
    ctx = await _resolve_clinic_context(db, actor["id"])

    existing = (await db.execute(text("""
        SELECT id FROM clinic_offers 
        WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:cid AS uuid)
    """), {"id": offer_id, "cid": ctx["clinic_id"]})).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Offer not found.")

    updates = []
    params = {"id": offer_id, "cid": ctx["clinic_id"]}

    if payload.title is not None:
        updates.append("title = :title")
        params["title"] = payload.title.strip()
    if payload.description is not None:
        updates.append("description = :description")
        params["description"] = payload.description
    if payload.normal_price is not None:
        updates.append("normal_price = :normal_price")
        params["normal_price"] = payload.normal_price
    if payload.offer_price is not None:
        updates.append("offer_price = :offer_price")
        params["offer_price"] = payload.offer_price
    if payload.start_date is not None:
        updates.append("start_date = :start_date")
        params["start_date"] = payload.start_date
    if payload.end_date is not None:
        updates.append("end_date = :end_date")
        params["end_date"] = payload.end_date
    if payload.terms is not None:
        updates.append("terms_and_conditions = :terms")
        params["terms"] = payload.terms
    if payload.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = payload.is_active
    if payload.image_url is not None:
        updates.append("image_url = :image_url")
        params["image_url"] = payload.image_url

    updates.append("updated_at = now()")

    if updates:
        await db.execute(text(f"""
            UPDATE clinic_offers 
            SET {', '.join(updates)}
            WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:cid AS uuid)
        """), params)
        await db.commit()

    return {"status": "success", "message": "Offer updated successfully."}


@router.delete("/{offer_id}")
async def delete_clinic_offer(
    offer_id: str,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Delete an offer from the database."""
    ctx = await _resolve_clinic_context(db, actor["id"])

    result = await db.execute(text("""
        DELETE FROM clinic_offers 
        WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:cid AS uuid)
    """), {"id": offer_id, "cid": ctx["clinic_id"]})
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Offer not found.")

    return {"status": "success", "message": "Offer deleted successfully."}


@router.patch("/{offer_id}/toggle-status")
async def toggle_clinic_offer_status(
    offer_id: str,
    payload: OfferStatusToggleRequest,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    """Toggle active visibility of an offer in the database."""
    ctx = await _resolve_clinic_context(db, actor["id"])

    await db.execute(text("""
        UPDATE clinic_offers 
        SET is_active = :is_active, updated_at = now()
        WHERE id = CAST(:id AS uuid) AND clinic_id = CAST(:cid AS uuid)
    """), {"id": offer_id, "cid": ctx["clinic_id"], "is_active": payload.is_active})
    await db.commit()

    return {"status": "success", "is_active": payload.is_active}
