"""
KROVA — Business Context Builder
Fetches everything Claude needs about a business from the database
and packages it into structured objects for the prompt templates.

Used by:
  - analysis_worker.py (nightly analysis)
  - conversations router (mobile app chat)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database.models.analysis import AnalysisResult
from shared.database.models.business import Business
from shared.database.models.customer import Customer
from shared.database.models.dna import BusinessDNA
from shared.database.models.message import Message, MessageDirection
from shared.prompts.nightly_analysis import BusinessContext, CustomerContext
from shared.utils.logging import get_logger

logger = get_logger(__name__)

# How many recent messages to include per customer in nightly prompt
_MESSAGES_PER_CUSTOMER = 10

# Only include customers active in last N days
_ACTIVE_CUSTOMER_DAYS = 90


async def build_business_context(
    business_id: uuid.UUID,
    db: AsyncSession,
) -> BusinessContext | None:
    """
    Build the complete context object for one business's nightly analysis.
    Returns None if business not found.
    """
    # ── Fetch business ──────────────────────────────────────────────────────
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.is_active == True)  # noqa: E712
    )
    business = result.scalar_one_or_none()
    if not business:
        logger.warning("Business not found for context build", extra={"business_id": str(business_id)})
        return None

    # ── Fetch active customers ──────────────────────────────────────────────
    cutoff = datetime.now(timezone.utc) - timedelta(days=_ACTIVE_CUSTOMER_DAYS)
    customers_result = await db.execute(
        select(Customer).where(
            Customer.business_id == business_id,
            Customer.status != "lost",  # Skip permanently lost customers
        ).order_by(Customer.last_contact_at.desc().nullslast())
        .limit(100)  # Cap at 100 customers per batch to control prompt size
    )
    customers = customers_result.scalars().all()

    if not customers:
        logger.info("No active customers found", extra={"business_id": str(business_id)})

    # ── Fetch recent messages per customer ──────────────────────────────────
    customer_contexts: list[CustomerContext] = []

    for customer in customers:
        messages_result = await db.execute(
            select(Message)
            .where(
                Message.business_id == business_id,
                Message.customer_id == customer.id,
            )
            .order_by(Message.created_at.desc())
            .limit(_MESSAGES_PER_CUSTOMER)
        )
        messages = messages_result.scalars().all()

        # Reverse so oldest first (chronological reading order)
        messages_list = [
            {
                "direction": m.direction,
                "content": m.content,
                "message_type": m.message_type,
                "sent_at": m.sent_at or str(m.created_at),
                "channel": m.channel,
            }
            for m in reversed(messages)
        ]

        customer_contexts.append(
            CustomerContext(
                customer_id=str(customer.id),
                name=customer.name,
                phone=customer.phone,
                email=customer.email,
                status=customer.status,
                health_score=customer.health_score,
                last_contact=customer.last_contact_at,
                ai_notes=customer.ai_notes,
                recent_messages=messages_list,
            )
        )

    # ── Fetch DNA narrative (Layer 1) ──────────────────────────────────────
    dna_result = await db.execute(
        select(BusinessDNA).where(BusinessDNA.business_id == business_id)
    )
    dna = dna_result.scalar_one_or_none()
    dna_narrative = dna.narrative if dna else None

    logger.info(
        "Business context built",
        extra={
            "business_id": str(business_id),
            "customer_count": len(customer_contexts),
            "total_messages": sum(len(c.recent_messages) for c in customer_contexts),
            "has_dna": dna is not None,
        },
    )

    return BusinessContext(
        business_id=str(business_id),
        name=business.name,
        business_type=business.business_type,
        context=business.context,
        good_lead_description=business.good_lead_description,
        lost_customer_description=business.lost_customer_description,
        customers=customer_contexts,
        dna_narrative=dna_narrative,
    )


async def build_conversation_context(
    business_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """
    Build the lightweight context for a mobile app conversation.
    Reads from last night's analysis — no heavy computation.
    Returns a dict the conversations router passes to the prompt builder.
    """
    business_result = await db.execute(
        select(Business).where(Business.id == business_id)
    )
    business = business_result.scalar_one_or_none()
    if not business:
        return {}

    # Get latest analysis results
    today = datetime.now(timezone.utc).date().isoformat()
    analysis_result = await db.execute(
        select(AnalysisResult)
        .where(
            AnalysisResult.business_id == business_id,
            AnalysisResult.customer_id == None,  # Business-level summary row  # noqa: E711
        )
        .order_by(AnalysisResult.analysis_date.desc())
        .limit(1)
    )
    latest_analysis = analysis_result.scalar_one_or_none()

    # Get hot leads from individual customer rows
    hot_leads_result = await db.execute(
        select(Customer, AnalysisResult)
        .join(AnalysisResult, AnalysisResult.customer_id == Customer.id)
        .where(
            Customer.business_id == business_id,
            AnalysisResult.customer_status == "hot",
        )
        .order_by(AnalysisResult.analysis_date.desc())
        .limit(5)
    )
    hot_leads = [
        {
            "name": c.name,
            "phone": c.phone,
            "reasoning": a.reasoning,
            "suggested_message": a.suggested_message,
        }
        for c, a in hot_leads_result.all()
    ]

    # Get at-risk customers
    at_risk_result = await db.execute(
        select(Customer, AnalysisResult)
        .join(AnalysisResult, AnalysisResult.customer_id == Customer.id)
        .where(
            Customer.business_id == business_id,
            AnalysisResult.urgency == "high",
            AnalysisResult.customer_status.in_(["cold", "warm"]),
        )
        .order_by(AnalysisResult.analysis_date.desc())
        .limit(5)
    )
    at_risk = [
        {"name": c.name, "phone": c.phone, "reasoning": a.reasoning}
        for c, a in at_risk_result.all()
    ]

    return {
        "business_name": business.name,
        "business_type": business.business_type,
        "business_context": business.context,
        "analysis_summary": latest_analysis.morning_briefing if latest_analysis else None,
        "hot_leads": hot_leads,
        "at_risk_customers": at_risk,
    }
