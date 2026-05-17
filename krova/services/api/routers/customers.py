"""
KROVA — Customers Router
Customers are created automatically by the ingestion workers — never manually.

Endpoints:
  GET   /customers              — paginated list with optional status/channel filter
  GET   /customers/{id}         — full customer profile + latest analysis + intelligence
  PATCH /customers/{id}         — update customer status (move stage)
  GET   /customers/{id}/messages — paginated message history for one customer
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.database.models.analysis import AnalysisResult
from shared.database.models.business import Business
from shared.database.models.customer import Customer
from shared.database.models.intelligence import CustomerIntelligence
from shared.database.models.message import Message
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/customers", tags=["customers"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class LatestAnalysis(BaseModel):
    urgency: str | None
    suggested_action: str | None
    suggested_message: str | None
    reasoning: str | None
    analysis_date: str | None


class CustomerSummary(BaseModel):
    id: str
    name: str | None
    phone: str | None
    email: str | None
    instagram_id: str | None
    primary_channel: str
    status: str
    health_score: int
    last_contact_at: str | None
    created_at: datetime


class CustomerIntelligenceSummary(BaseModel):
    relationship_trajectory: str | None
    churn_probability: float | None
    energy_score: float | None
    current_recommendation: str | None
    message_template: str | None
    confidence: float


class CustomerDetail(CustomerSummary):
    ai_notes: str | None
    latest_analysis: LatestAnalysis | None
    intelligence: CustomerIntelligenceSummary | None


class CustomerStatusUpdate(BaseModel):
    status: str


class CustomerListResponse(BaseModel):
    customers: list[CustomerSummary]
    total: int
    page: int
    limit: int
    has_more: bool


class MessageResponse(BaseModel):
    id: str
    channel: str
    direction: str
    message_type: str
    content: str | None
    subject: str | None
    sent_at: str | None
    created_at: datetime


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    has_more: bool


# ── Business lookup helper ────────────────────────────────────────────────────

async def _get_business_id(current_user, db: AsyncSession) -> uuid.UUID:
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

@router.get("", response_model=CustomerListResponse)
@limiter.limit(API_LIMIT)
async def list_customers(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
    customer_status: str | None = Query(None, alias="status"),
    channel: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> CustomerListResponse:
    """
    Returns a paginated list of all customers for this business.
    Filterable by status (hot, warm, cold, etc.) and primary channel.
    Ordered by last_contact_at descending — most recently active first.
    """
    business_id = await _get_business_id(current_user, db)

    query = select(Customer).where(Customer.business_id == business_id)

    if customer_status:
        query = query.where(Customer.status == customer_status)

    if channel:
        query = query.where(Customer.primary_channel == channel)

    from sqlalchemy import func
    count_q = select(func.count(Customer.id)).where(Customer.business_id == business_id)
    if customer_status:
        count_q = count_q.where(Customer.status == customer_status)
    if channel:
        count_q = count_q.where(Customer.primary_channel == channel)
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * limit
    query = (
        query.order_by(Customer.last_contact_at.desc().nullslast())
        .offset(offset)
        .limit(limit + 1)  # Fetch one extra to detect has_more
    )

    result = await db.execute(query)
    rows = result.scalars().all()

    has_more = len(rows) > limit
    customers = rows[:limit]

    return CustomerListResponse(
        customers=[
            CustomerSummary(
                id=str(c.id),
                name=c.name,
                phone=c.phone,
                email=c.email,
                instagram_id=c.instagram_id,
                primary_channel=c.primary_channel,
                status=c.status,
                health_score=c.health_score,
                last_contact_at=c.last_contact_at,
                created_at=c.created_at,
            )
            for c in customers
        ],
        total=total,
        page=page,
        limit=limit,
        has_more=has_more,
    )


@router.get("/{customer_id}", response_model=CustomerDetail)
@limiter.limit(API_LIMIT)
async def get_customer(
    request: Request,
    customer_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> CustomerDetail:
    """
    Full customer profile including their latest nightly analysis result.
    The dashboard uses this for the customer detail panel.
    """
    business_id = await _get_business_id(current_user, db)

    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business_id,
        )
    )
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Latest analysis for this customer
    analysis_result = await db.execute(
        select(AnalysisResult)
        .where(
            AnalysisResult.business_id == business_id,
            AnalysisResult.customer_id == customer_id,
        )
        .order_by(AnalysisResult.analysis_date.desc())
        .limit(1)
    )
    analysis = analysis_result.scalar_one_or_none()

    latest = None
    if analysis:
        latest = LatestAnalysis(
            urgency=analysis.urgency,
            suggested_action=analysis.suggested_action,
            suggested_message=analysis.suggested_message,
            reasoning=analysis.reasoning,
            analysis_date=str(analysis.analysis_date),
        )

    # Customer intelligence (trajectory, churn probability, energy score)
    intel_result = await db.execute(
        select(CustomerIntelligence).where(
            CustomerIntelligence.customer_id == customer_id,
            CustomerIntelligence.business_id == business_id,
        )
    )
    intel = intel_result.scalar_one_or_none()
    intelligence = None
    if intel:
        intelligence = CustomerIntelligenceSummary(
            relationship_trajectory=getattr(intel, "relationship_trajectory", None),
            churn_probability=float(intel.churn_probability) if getattr(intel, "churn_probability", None) is not None else None,
            energy_score=float(intel.energy_score) if getattr(intel, "energy_score", None) is not None else None,
            current_recommendation=intel.current_recommendation,
            message_template=intel.message_template,
            confidence=float(intel.confidence),
        )

    return CustomerDetail(
        id=str(customer.id),
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        instagram_id=customer.instagram_id,
        primary_channel=customer.primary_channel,
        status=customer.status,
        health_score=customer.health_score,
        last_contact_at=customer.last_contact_at,
        created_at=customer.created_at,
        ai_notes=customer.ai_notes,
        latest_analysis=latest,
        intelligence=intelligence,
    )


VALID_STATUSES = {"new", "hot", "warm", "cold", "converted", "lost"}


@router.patch("/{customer_id}", response_model=CustomerSummary)
@limiter.limit(API_LIMIT)
async def update_customer_status(
    request: Request,
    customer_id: uuid.UUID,
    body: CustomerStatusUpdate,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> CustomerSummary:
    """Move a customer to a different pipeline stage."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")

    business_id = await _get_business_id(current_user, db)

    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business_id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    previous_status = customer.status
    customer.status = body.status
    await db.commit()
    await db.refresh(customer)

    # Trigger loss post-mortem in background when lead moves to "lost"
    if body.status == "lost" and previous_status != "lost":
        import asyncio
        asyncio.create_task(
            _run_loss_postmortem(customer_id, business_id, customer.name, db)
        )

    return CustomerSummary(
        id=str(customer.id),
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        instagram_id=customer.instagram_id,
        primary_channel=customer.primary_channel,
        status=customer.status,
        health_score=customer.health_score,
        last_contact_at=customer.last_contact_at,
        created_at=customer.created_at,
    )


async def _run_loss_postmortem(
    customer_id: uuid.UUID,
    business_id: uuid.UUID,
    customer_name: str | None,
    _: object,  # original db session is closed — open a fresh one
) -> None:
    """
    Background task: run Claude loss post-mortem on the customer's conversation.
    Stores the result in customer.ai_notes (appended).
    Fires after the HTTP response is already returned — never blocks the API.
    """
    from datetime import date
    from shared.database.connection import AsyncSessionLocal
    from shared.database.models.business import Business
    from shared.database.models.commitment import Commitment
    from shared.database.models.message import Message, MessageDirection
    from shared.prompts.loss_postmortem import PostmortemContext, build_loss_postmortem_prompt, parse_postmortem_response
    from shared.claude.client import claude_client

    try:
        async with AsyncSessionLocal() as db:
            # Load business type
            biz = (await db.execute(select(Business).where(Business.id == business_id))).scalar_one_or_none()
            if not biz:
                return

            # Load recent messages (last 40)
            msgs = (await db.execute(
                select(Message)
                .where(Message.business_id == business_id, Message.customer_id == customer_id)
                .order_by(Message.created_at.desc())
                .limit(40)
            )).scalars().all()
            msgs = list(reversed(msgs))

            if not msgs:
                return

            # Build conversation summary
            lines = []
            for m in msgs:
                direction = "Customer" if m.direction == MessageDirection.inbound else "Owner"
                content = (m.content or "")[:300]
                lines.append(f"[{direction}]: {content}")
            conversation_summary = "\n".join(lines)

            # Load unfulfilled commitments
            comms = (await db.execute(
                select(Commitment)
                .where(
                    Commitment.business_id == business_id,
                    Commitment.customer_id == customer_id,
                    Commitment.is_fulfilled == False,  # noqa: E712
                )
            )).scalars().all()

            # Load customer for health score and days in pipeline
            cust = (await db.execute(
                select(Customer).where(Customer.id == customer_id)
            )).scalar_one_or_none()
            if not cust:
                return

            days_in_pipeline = (date.today() - cust.created_at.date()).days if cust.created_at else 0

            ctx = PostmortemContext(
                customer_name=customer_name,
                business_type=biz.business_type,
                conversation_summary=conversation_summary,
                final_status="lost",
                health_score_at_loss=cust.health_score,
                commitments_missed=[c.commitment_text for c in comms],
                days_in_pipeline=days_in_pipeline,
            )

            prompt = build_loss_postmortem_prompt(ctx)
            response = await claude_client.complete(prompt, max_tokens=600)
            result = parse_postmortem_response(response)

            # Append to customer ai_notes
            note = (
                f"\n\n── LOSS POST-MORTEM ({date.today()}) ──\n"
                f"Reason: {result.get('primary_reason', 'Unknown')}\n"
                f"Category: {result.get('category', 'other')}\n"
                f"What we missed: {result.get('what_we_missed', '')}\n"
                f"Do differently: {result.get('what_to_do_differently', '')}\n"
                f"Recovery possible: {'Yes — ' + result.get('recovery_action', '') if result.get('recovery_possible') else 'No'}\n"
            )

            existing_notes = cust.ai_notes or ""
            cust.ai_notes = (existing_notes + note).strip()
            await db.commit()

            logger.info(
                "Loss post-mortem complete",
                extra={"customer_id": str(customer_id), "category": result.get("category")},
            )
    except Exception as exc:
        logger.warning("Loss post-mortem failed (non-fatal)", extra={"customer_id": str(customer_id), "error": str(exc)})


@router.get("/{customer_id}/messages", response_model=MessageListResponse)
@limiter.limit(API_LIMIT)
async def get_customer_messages(
    request: Request,
    customer_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
) -> MessageListResponse:
    """
    Paginated message history for a specific customer.
    Newest messages first. Used in the customer detail panel.
    """
    business_id = await _get_business_id(current_user, db)

    # Verify customer belongs to this business
    exists = await db.execute(
        select(Customer.id).where(
            Customer.id == customer_id,
            Customer.business_id == business_id,
        )
    )
    if not exists.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    offset = (page - 1) * limit
    msg_result = await db.execute(
        select(Message)
        .where(
            Message.business_id == business_id,
            Message.customer_id == customer_id,
        )
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit + 1)
    )
    rows = msg_result.scalars().all()

    has_more = len(rows) > limit
    messages = rows[:limit]

    return MessageListResponse(
        messages=[
            MessageResponse(
                id=str(m.id),
                channel=m.channel,
                direction=m.direction,
                message_type=m.message_type,
                content=m.content,
                subject=m.subject,
                sent_at=m.sent_at,
                created_at=m.created_at,
            )
            for m in messages
        ],
        has_more=has_more,
    )
