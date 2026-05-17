"""
KROVA — Actions Router
Owner approves or rejects suggested follow-ups from the mobile app.
Approve → high-priority job enqueued → customer receives message within ~5 seconds.
Reject → marks action rejected — feeds into next night's analysis as feedback.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.cache.keys import CacheKeys
from shared.cache.redis_client import get_cached, invalidate, set_cached
from shared.database.models.action import Action, ActionStatus
from shared.database.models.business import Business
from shared.database.models.customer import Customer
from shared.queue.bullmq_client import Queues, enqueue
from shared.queue.job_types import ExecuteActionJob
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/actions", tags=["actions"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ActionResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: str | None
    customer_phone: str | None
    customer_instagram_id: str | None
    action_type: str
    status: str
    channel: str
    message_content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PendingActionsResponse(BaseModel):
    actions: list[ActionResponse]
    count: int


# ── Business lookup helper ────────────────────────────────────────────────────

async def _get_business_id(current_user, db: AsyncSession) -> uuid.UUID:
    """Get the authenticated user's business ID. Raises 404 if not found."""
    result = await db.execute(
        select(Business.id).where(
            Business.owner_user_id == current_user.supabase_user_id,
            Business.is_active == True,  # noqa: E712
        )
    )
    business_id = result.scalar_one_or_none()
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )
    return business_id


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/pending", response_model=PendingActionsResponse)
@limiter.limit(API_LIMIT)
async def get_pending_actions(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> PendingActionsResponse:
    """
    Returns all actions waiting for the owner's approval.
    Cached for 30 seconds — must stay near real-time.
    Invalidated immediately when owner approves or rejects.
    """
    business_id = await _get_business_id(current_user, db)

    cache_key = CacheKeys.pending_actions(business_id)
    cached = await get_cached(cache_key)
    if cached:
        return PendingActionsResponse(**cached)

    result = await db.execute(
        select(Action, Customer)
        .join(Customer, Customer.id == Action.customer_id)
        .where(
            Action.business_id == business_id,
            Action.status == ActionStatus.pending,
        )
        .order_by(Action.created_at.desc())
        .limit(50)
    )
    rows = result.all()

    actions = [
        ActionResponse(
            id=str(action.id),
            customer_id=str(action.customer_id),
            customer_name=customer.name,
            customer_phone=customer.phone,
            customer_instagram_id=customer.instagram_id,
            action_type=action.action_type,
            status=action.status,
            channel=action.channel,
            message_content=action.message_content,
            created_at=action.created_at,
        )
        for action, customer in rows
    ]

    response = PendingActionsResponse(actions=actions, count=len(actions))
    await set_cached(cache_key, response.model_dump(mode="json"), ttl_seconds=30)

    return response


@router.post("/{action_id}/approve", status_code=status.HTTP_200_OK)
@limiter.limit(API_LIMIT)
async def approve_action(
    request: Request,
    action_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Owner approves a suggested follow-up.
    Immediately enqueues a high-priority ExecuteActionJob.
    Customer receives the message within ~5 seconds of this tap.
    """
    business_id = await _get_business_id(current_user, db)

    result = await db.execute(
        select(Action, Customer)
        .join(Customer, Customer.id == Action.customer_id)
        .where(
            Action.id == action_id,
            Action.business_id == business_id,
        )
    )
    row = result.one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action not found",
        )

    action, customer = row

    if action.status != ActionStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Action cannot be approved — current status: {action.status}",
        )

    # Mark approved before enqueuing — prevents double-send on any race condition
    action.status = ActionStatus.approved
    await db.flush()

    job = ExecuteActionJob(
        action_id=action.id,
        business_id=business_id,
        customer_id=action.customer_id,
        channel=action.channel,
        message_content=action.message_content,
        recipient_phone=customer.phone if action.channel == "whatsapp" else None,
        recipient_instagram_id=customer.instagram_id if action.channel == "instagram" else None,
    )
    await enqueue(Queues.ACTIONS, job)

    await invalidate(CacheKeys.pending_actions(business_id))

    logger.info(
        "Action approved",
        extra={
            "action_id": str(action_id),
            "business_id": str(business_id),
            "customer_id": str(action.customer_id),
            "channel": action.channel,
        },
    )

    return {"status": "approved", "action_id": str(action_id)}


@router.post("/{action_id}/reject", status_code=status.HTTP_200_OK)
@limiter.limit(API_LIMIT)
async def reject_action(
    request: Request,
    action_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Owner dismissed a suggested follow-up.
    Marks rejected — the analysis worker reads this as negative feedback
    so Claude stops suggesting this type of action for this customer.
    """
    business_id = await _get_business_id(current_user, db)

    result = await db.execute(
        select(Action).where(
            Action.id == action_id,
            Action.business_id == business_id,
        )
    )
    action = result.scalar_one_or_none()

    if action is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action not found",
        )

    if action.status != ActionStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Action cannot be rejected — current status: {action.status}",
        )

    action.status = ActionStatus.rejected
    await db.flush()

    await invalidate(CacheKeys.pending_actions(business_id))

    logger.info(
        "Action rejected",
        extra={"action_id": str(action_id), "business_id": str(business_id)},
    )

    return {"status": "rejected", "action_id": str(action_id)}
