"""
KROVA — Businesses Router
Business profile CRUD — onboarding setup and settings management.
One user = one business in KROVA's current model.

Endpoints:
  POST /businesses         — create business during onboarding
  GET  /businesses/me      — get my business profile
  PATCH /businesses/me     — update business settings
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.database.models.business import Business, BusinessType, SubscriptionPlan
from shared.database.models.user import User
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/businesses", tags=["businesses"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateBusinessRequest(BaseModel):
    name: str
    business_type: BusinessType = BusinessType.other
    context: str | None = None
    good_lead_description: str | None = None
    lost_customer_description: str | None = None
    briefing_phone: str | None = None  # WhatsApp number for 8 AM briefing


class UpdateBusinessRequest(BaseModel):
    name: str | None = None
    business_type: BusinessType | None = None
    context: str | None = None
    good_lead_description: str | None = None
    lost_customer_description: str | None = None
    briefing_phone: str | None = None


class BusinessResponse(BaseModel):
    id: str
    name: str
    business_type: str
    plan: str
    is_active: bool
    briefing_phone: str | None
    context: str | None
    good_lead_description: str | None
    lost_customer_description: str | None

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(API_LIMIT)
async def create_business(
    request: Request,
    body: CreateBusinessRequest,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> BusinessResponse:
    """
    Called at the end of the mobile app onboarding flow.
    Creates the business profile and marks the user as onboarded.
    Idempotent — returns existing business if one already exists for this user.
    """
    # Check if already onboarded
    existing_result = await db.execute(
        select(Business).where(
            Business.owner_user_id == current_user.supabase_user_id,
            Business.is_active == True,  # noqa: E712
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return BusinessResponse(
            id=str(existing.id),
            name=existing.name,
            business_type=existing.business_type,
            plan=existing.plan,
            is_active=existing.is_active,
            briefing_phone=existing.briefing_phone,
            context=existing.context,
            good_lead_description=existing.good_lead_description,
            lost_customer_description=existing.lost_customer_description,
        )

    business = Business(
        owner_user_id=current_user.supabase_user_id,
        name=body.name,
        business_type=body.business_type,
        context=body.context,
        good_lead_description=body.good_lead_description,
        lost_customer_description=body.lost_customer_description,
        briefing_phone=body.briefing_phone,
        plan=SubscriptionPlan.trial,
        is_active=True,
        extra_data={},
    )
    db.add(business)
    await db.flush()

    # Mark user as onboarded so the app skips onboarding next time
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(is_onboarded=True)
    )
    await db.flush()

    logger.info(
        "Business created",
        extra={
            "business_id": str(business.id),
            "user_id": str(current_user.id),
            "business_type": body.business_type,
        },
    )

    return BusinessResponse(
        id=str(business.id),
        name=business.name,
        business_type=business.business_type,
        plan=business.plan,
        is_active=business.is_active,
        briefing_phone=business.briefing_phone,
        context=business.context,
        good_lead_description=business.good_lead_description,
        lost_customer_description=business.lost_customer_description,
    )


@router.get("/me", response_model=BusinessResponse)
@limiter.limit(API_LIMIT)
async def get_my_business(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> BusinessResponse:
    """
    Returns the authenticated user's business profile.
    Mobile app calls this on every launch to restore state.
    """
    result = await db.execute(
        select(Business).where(
            Business.owner_user_id == current_user.supabase_user_id,
            Business.is_active == True,  # noqa: E712
        )
    )
    business = result.scalar_one_or_none()

    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found — please complete onboarding",
        )

    return BusinessResponse(
        id=str(business.id),
        name=business.name,
        business_type=business.business_type,
        plan=business.plan,
        is_active=business.is_active,
        briefing_phone=business.briefing_phone,
        context=business.context,
        good_lead_description=business.good_lead_description,
        lost_customer_description=business.lost_customer_description,
    )


@router.patch("/me", response_model=BusinessResponse)
@limiter.limit(API_LIMIT)
async def update_my_business(
    request: Request,
    body: UpdateBusinessRequest,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> BusinessResponse:
    """
    Updates business settings — called from the Settings screen.
    Only updates fields that are provided (partial update).
    """
    result = await db.execute(
        select(Business).where(
            Business.owner_user_id == current_user.supabase_user_id,
            Business.is_active == True,  # noqa: E712
        )
    )
    business = result.scalar_one_or_none()

    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    # Apply only provided fields
    if body.name is not None:
        business.name = body.name
    if body.business_type is not None:
        business.business_type = body.business_type
    if body.context is not None:
        business.context = body.context
    if body.good_lead_description is not None:
        business.good_lead_description = body.good_lead_description
    if body.lost_customer_description is not None:
        business.lost_customer_description = body.lost_customer_description
    if body.briefing_phone is not None:
        business.briefing_phone = body.briefing_phone

    await db.flush()

    logger.info(
        "Business updated",
        extra={"business_id": str(business.id), "user_id": str(current_user.id)},
    )

    return BusinessResponse(
        id=str(business.id),
        name=business.name,
        business_type=business.business_type,
        plan=business.plan,
        is_active=business.is_active,
        briefing_phone=business.briefing_phone,
        context=business.context,
        good_lead_description=business.good_lead_description,
        lost_customer_description=business.lost_customer_description,
    )
