"""
KROVA — Intelligence Worker (Phase 1)
Runs after the main analysis worker. Extracts deep business intelligence
from all message data — not just lead signals.

Extracts:
  - Commitments made across all channels
  - Revenue leaks (scope creep, forgotten invoices, ghost invoices)
  - Competitor mentions
  - Relationship trajectory + churn probability updates
  - Growth blocker report (after 90 days of data)

This worker processes one business at a time, called from analysis_worker.py
after the main nightly analysis completes.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.claude.client import claude_client
from shared.database.models.business import Business
from shared.database.models.commitment import Commitment
from shared.database.models.competitor import CompetitorMention
from shared.database.models.customer import Customer
from shared.database.models.dna import BusinessDNA
from shared.database.models.growth_report import GrowthReport
from shared.database.models.intelligence import CustomerIntelligence
from shared.database.models.message import Message
from shared.database.models.revenue import RevenueEntry
from shared.database.models.revenue_signal import RevenueSignal
from shared.prompts.commitment_extraction import CommitmentExtractionContext, build_commitment_extraction_prompt
from shared.prompts.competitor_extraction import CompetitorExtractionContext, build_competitor_extraction_prompt
from shared.prompts.context_brief import ContextBriefContext, build_context_brief_prompt
from shared.prompts.growth_blockers import GrowthBlockerContext, build_growth_blockers_prompt
from shared.prompts.revenue_leak import RevenueLeakContext, build_revenue_leak_prompt
from shared.utils.logging import get_logger

import json

logger = get_logger(__name__)


def _parse(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(cleaned)


async def run_intelligence_extraction(business_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Master function called after nightly analysis.
    Runs all Phase 1 intelligence extraction for one business.
    Non-fatal — each step wrapped in try/except.
    """
    logger.info("Intelligence extraction starting", extra={"business_id": str(business_id)})

    # Get all active customers
    customers_result = await db.execute(
        select(Customer).where(
            Customer.business_id == business_id,
            Customer.status.notin_(["lost"]),
        ).order_by(Customer.last_contact_at.desc().nullslast()).limit(50)
    )
    customers = customers_result.scalars().all()

    if not customers:
        return

    # Get business for context
    biz_result = await db.execute(select(Business).where(Business.id == business_id))
    business = biz_result.scalar_one_or_none()
    if not business:
        return

    # ── Step 1: Commitments ───────────────────────────────────────────────────
    try:
        await _extract_commitments(business_id, customers, db)
    except Exception as exc:
        logger.error("Commitment extraction failed", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Step 2: Revenue Leaks ─────────────────────────────────────────────────
    try:
        await _extract_revenue_leaks(business_id, business.business_type, customers, db)
    except Exception as exc:
        logger.error("Revenue leak extraction failed", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Step 3: Competitor Mentions ───────────────────────────────────────────
    try:
        await _extract_competitor_mentions(business_id, customers, db)
    except Exception as exc:
        logger.error("Competitor extraction failed", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Step 4: Relationship Trajectory ──────────────────────────────────────
    try:
        await _update_relationship_trajectories(business_id, customers, db)
    except Exception as exc:
        logger.error("Relationship trajectory update failed", extra={"business_id": str(business_id), "error": str(exc)})

    # ── Step 5: Growth Blockers (after 90 days) ───────────────────────────────
    try:
        await _generate_growth_blockers(business_id, business, db)
    except Exception as exc:
        logger.error("Growth blocker report failed", extra={"business_id": str(business_id), "error": str(exc)})

    await db.flush()
    logger.info("Intelligence extraction complete", extra={"business_id": str(business_id)})


# ── Step 1: Commitment Extraction ─────────────────────────────────────────────

async def _extract_commitments(
    business_id: uuid.UUID,
    customers: list[Customer],
    db: AsyncSession,
) -> None:
    """Extract unfulfilled commitments from recent messages for each customer."""

    # Only process hot/warm customers and recently active ones
    priority = [c for c in customers if c.status in ("hot", "warm", "new")][:15]

    for customer in priority:
        msgs_result = await db.execute(
            select(Message)
            .where(Message.customer_id == customer.id)
            .order_by(Message.created_at.desc())
            .limit(40)
        )
        messages = msgs_result.scalars().all()
        if not messages:
            continue

        messages_list = [
            {
                "direction": m.direction,
                "content": m.content or "",
                "channel": m.channel,
                "sent_at": str(m.sent_at or m.created_at)[:16],
            }
            for m in reversed(messages)
            if m.content
        ]

        if not messages_list:
            continue

        ctx = CommitmentExtractionContext(
            business_id=str(business_id),
            customer_name=customer.name,
            customer_id=str(customer.id),
            messages=messages_list,
        )

        try:
            response = await claude_client.complete(build_commitment_extraction_prompt(ctx), max_tokens=512)
            data = _parse(response)
        except Exception:
            continue

        for c in data.get("commitments", []):
            if c.get("is_likely_fulfilled"):
                continue

            # Avoid duplicates — check if this commitment text already exists
            existing = await db.execute(
                select(Commitment).where(
                    Commitment.business_id == business_id,
                    Commitment.customer_id == customer.id,
                    Commitment.commitment_text == c["commitment_text"],
                    Commitment.is_fulfilled == False,  # noqa: E712
                )
            )
            if existing.scalar_one_or_none():
                continue

            due_date = None
            if c.get("due_date"):
                try:
                    due_date = date.fromisoformat(c["due_date"])
                except ValueError:
                    pass

            commitment = Commitment(
                business_id=business_id,
                customer_id=customer.id,
                commitment_text=c["commitment_text"],
                due_date=due_date,
                source_channel=messages_list[-1]["channel"] if messages_list else None,
            )
            db.add(commitment)

    await db.flush()
    logger.info("Commitments extracted", extra={"business_id": str(business_id)})


# ── Step 2: Revenue Leak Detection ───────────────────────────────────────────

async def _extract_revenue_leaks(
    business_id: uuid.UUID,
    business_type: str,
    customers: list[Customer],
    db: AsyncSession,
) -> None:
    """Detect unbilled work, forgotten invoices, ghost invoices."""

    # Only check active paying customers
    for customer in customers[:20]:
        msgs_result = await db.execute(
            select(Message)
            .where(Message.customer_id == customer.id)
            .order_by(Message.created_at.desc())
            .limit(50)
        )
        messages = msgs_result.scalars().all()

        revenue_result = await db.execute(
            select(RevenueEntry)
            .where(RevenueEntry.customer_id == customer.id)
            .order_by(RevenueEntry.created_at.desc())
            .limit(10)
        )
        revenue_entries = revenue_result.scalars().all()

        messages_list = [
            {"direction": m.direction, "content": m.content or "", "channel": m.channel, "sent_at": str(m.created_at)[:16]}
            for m in reversed(messages) if m.content
        ]
        revenue_list = [
            {"status": r.status, "amount": float(r.amount), "payment_date": r.payment_date, "due_date": r.due_date, "description": r.description}
            for r in revenue_entries
        ]

        if not messages_list:
            continue

        ctx = RevenueLeakContext(
            business_id=str(business_id),
            customer_name=customer.name,
            customer_id=str(customer.id),
            messages=messages_list,
            revenue_entries=revenue_list,
            business_type=business_type,
        )

        try:
            response = await claude_client.complete(build_revenue_leak_prompt(ctx), max_tokens=512)
            data = _parse(response)
        except Exception:
            continue

        for signal in data.get("revenue_signals", []):
            # Avoid duplicate signals
            existing = await db.execute(
                select(RevenueSignal).where(
                    RevenueSignal.business_id == business_id,
                    RevenueSignal.customer_id == customer.id,
                    RevenueSignal.signal_type == signal["signal_type"],
                    RevenueSignal.is_resolved == False,  # noqa: E712
                )
            )
            if existing.scalar_one_or_none():
                continue

            rs = RevenueSignal(
                business_id=business_id,
                customer_id=customer.id,
                signal_type=signal["signal_type"],
                estimated_amount=signal.get("estimated_amount"),
                description=signal.get("description"),
                evidence={"text": signal.get("evidence", "")},
            )
            db.add(rs)

    await db.flush()
    logger.info("Revenue leaks extracted", extra={"business_id": str(business_id)})


# ── Step 3: Competitor Mention Extraction ────────────────────────────────────

async def _extract_competitor_mentions(
    business_id: uuid.UUID,
    customers: list[Customer],
    db: AsyncSession,
) -> None:
    """Extract competitor mentions from recent messages."""

    for customer in customers[:30]:
        # Only look at messages from the last 30 days
        msgs_result = await db.execute(
            select(Message)
            .where(Message.customer_id == customer.id)
            .order_by(Message.created_at.desc())
            .limit(30)
        )
        messages = msgs_result.scalars().all()

        # Quick pre-filter — skip if no inbound messages
        inbound = [m for m in messages if m.direction == "inbound" and m.content]
        if not inbound:
            continue

        messages_list = [
            {"direction": m.direction, "content": m.content or "", "channel": m.channel, "sent_at": str(m.created_at)[:16]}
            for m in reversed(messages) if m.content
        ]

        ctx = CompetitorExtractionContext(
            business_id=str(business_id),
            customer_name=customer.name,
            customer_id=str(customer.id),
            messages=messages_list,
        )

        try:
            response = await claude_client.complete(build_competitor_extraction_prompt(ctx), max_tokens=512)
            data = _parse(response)
        except Exception:
            continue

        for mention in data.get("competitor_mentions", []):
            cm = CompetitorMention(
                business_id=business_id,
                customer_id=customer.id,
                competitor_name=mention["competitor_name"],
                channel=mention.get("channel"),
                context=mention.get("context"),
                sentiment=mention.get("sentiment"),
            )
            db.add(cm)

    await db.flush()
    logger.info("Competitor mentions extracted", extra={"business_id": str(business_id)})


# ── Step 4: Relationship Trajectory ──────────────────────────────────────────

async def _update_relationship_trajectories(
    business_id: uuid.UUID,
    customers: list[Customer],
    db: AsyncSession,
) -> None:
    """
    Update relationship_trajectory and churn_probability on CustomerIntelligence.
    Uses heuristics from message patterns — no Claude call needed here.
    """
    now = datetime.now(timezone.utc)

    for customer in customers:
        # Get last 20 inbound messages with timestamps
        msgs_result = await db.execute(
            select(Message)
            .where(
                Message.customer_id == customer.id,
                Message.direction == "inbound",
            )
            .order_by(Message.created_at.desc())
            .limit(20)
        )
        messages = msgs_result.scalars().all()

        if len(messages) < 3:
            continue

        # Calculate response time trend — are they taking longer to reply?
        recent_gap = (now - messages[0].created_at.replace(tzinfo=timezone.utc)).days if messages else 0
        older_gap = (now - messages[min(5, len(messages)-1)].created_at.replace(tzinfo=timezone.utc)).days if len(messages) > 5 else recent_gap

        # Count competitor mentions in last 30 days
        comp_result = await db.execute(
            select(func.count(CompetitorMention.id)).where(
                CompetitorMention.customer_id == customer.id,
                CompetitorMention.mentioned_at >= datetime(now.year, now.month, 1, tzinfo=timezone.utc),
            )
        )
        competitor_mentions_count = comp_result.scalar() or 0

        # Determine trajectory
        if recent_gap > 14 and customer.status in ("hot", "warm"):
            trajectory = "declining"
            churn_prob = 0.6
        elif competitor_mentions_count >= 2:
            trajectory = "critical"
            churn_prob = 0.75
        elif recent_gap > 30:
            trajectory = "critical"
            churn_prob = 0.8
        elif recent_gap < older_gap and customer.status in ("hot", "warm"):
            trajectory = "improving"
            churn_prob = 0.1
        elif customer.status == "converted":
            trajectory = "stable"
            churn_prob = 0.15
        else:
            trajectory = "stable"
            churn_prob = 0.25

        # Update or create CustomerIntelligence record
        intel_result = await db.execute(
            select(CustomerIntelligence).where(CustomerIntelligence.customer_id == customer.id)
        )
        intel = intel_result.scalar_one_or_none()

        if intel:
            intel.relationship_trajectory = trajectory
            intel.churn_probability = churn_prob
            intel.monthly_message_count = len(messages)
        else:
            intel = CustomerIntelligence(
                business_id=business_id,
                customer_id=customer.id,
                profile={},
                relationship_trajectory=trajectory,
                churn_probability=churn_prob,
                monthly_message_count=len(messages),
                confidence=0.0,
                interaction_count=len(messages),
            )
            db.add(intel)

    await db.flush()
    logger.info("Relationship trajectories updated", extra={"business_id": str(business_id)})


# ── Step 5: Growth Blocker Report ────────────────────────────────────────────

async def _generate_growth_blockers(
    business_id: uuid.UUID,
    business: Business,
    db: AsyncSession,
) -> None:
    """
    Generate growth blocker report. Only runs after 90 days of data.
    Only generates once per month.
    """
    today = date.today()

    # Check if report already exists this month
    month_start = today.replace(day=1)
    existing = await db.execute(
        select(GrowthReport).where(
            GrowthReport.business_id == business_id,
            GrowthReport.report_date >= month_start,
        )
    )
    if existing.scalar_one_or_none():
        return

    # Check how many days of data we have
    first_message_result = await db.execute(
        select(func.min(Message.created_at)).where(
            Message.business_id == business_id
        )
    )
    first_message = first_message_result.scalar()
    if not first_message:
        return

    days_of_data = (datetime.now(timezone.utc) - first_message.replace(tzinfo=timezone.utc)).days
    if days_of_data < 90:
        logger.info(
            "Not enough data for growth blockers",
            extra={"business_id": str(business_id), "days": days_of_data}
        )
        return

    # Gather stats
    from shared.database.models.analysis import AnalysisResult

    customer_count_result = await db.execute(
        select(func.count(Customer.id)).where(Customer.business_id == business_id)
    )
    total_customers = customer_count_result.scalar() or 0

    converted_result = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.business_id == business_id,
            Customer.status == "converted",
        )
    )
    converted_count = converted_result.scalar() or 0

    lost_result = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.business_id == business_id,
            Customer.status == "lost",
        )
    )
    lost_count = lost_result.scalar() or 0

    scope_creep_result = await db.execute(
        select(
            func.count(RevenueSignal.id),
            func.sum(RevenueSignal.estimated_amount)
        ).where(
            RevenueSignal.business_id == business_id,
            RevenueSignal.signal_type == "scope_creep",
        )
    )
    scope_row = scope_creep_result.one()
    scope_count = scope_row[0] or 0
    scope_total = float(scope_row[1] or 0)

    forgotten_result = await db.execute(
        select(
            func.count(RevenueSignal.id),
            func.sum(RevenueSignal.estimated_amount)
        ).where(
            RevenueSignal.business_id == business_id,
            RevenueSignal.signal_type == "forgotten_invoice",
        )
    )
    forgotten_row = forgotten_result.one()
    forgotten_count = forgotten_row[0] or 0
    forgotten_total = float(forgotten_row[1] or 0)

    dna_result = await db.execute(select(BusinessDNA).where(BusinessDNA.business_id == business_id))
    dna = dna_result.scalar_one_or_none()

    ctx = GrowthBlockerContext(
        business_id=str(business_id),
        business_name=business.name,
        business_type=business.business_type,
        total_customers=total_customers,
        converted_count=converted_count,
        lost_count=lost_count,
        avg_first_response_hours=4.0,  # TODO: compute from message timestamps
        avg_days_to_convert=14.0,       # TODO: compute from analysis results
        scope_creep_count=scope_count,
        scope_creep_total_estimate=scope_total,
        forgotten_invoice_count=forgotten_count,
        forgotten_invoice_total=forgotten_total,
        avg_invoice_collection_days=21.0,  # TODO: compute from revenue entries
        monthly_message_counts={},
        monthly_revenue_per_customer={},
        dna_narrative=dna.narrative if dna else None,
        analysis_days=days_of_data,
    )

    try:
        response = await claude_client.complete(build_growth_blockers_prompt(ctx), max_tokens=1024)
        data = _parse(response)
    except Exception as exc:
        logger.warning("Growth blocker Claude call failed", extra={"error": str(exc)})
        return

    report = GrowthReport(
        business_id=business_id,
        report_date=today,
        blockers=data.get("blockers", []),
        total_revenue_leakage_estimate=data.get("total_revenue_leakage_estimate"),
        top_blocker=data.get("top_blocker"),
    )
    db.add(report)
    await db.flush()
    logger.info("Growth blocker report generated", extra={"business_id": str(business_id)})


# ── Context Brief (called on-demand from API) ─────────────────────────────────

async def generate_context_brief(
    customer_id: uuid.UUID,
    business_id: uuid.UUID,
    business_type: str,
    db: AsyncSession,
) -> dict | None:
    """
    Generate a pre-call context brief for a specific customer.
    Called on-demand from the API when owner opens a customer profile.
    """
    customer_result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.business_id == business_id)
    )
    customer = customer_result.scalar_one_or_none()
    if not customer:
        return None

    msgs_result = await db.execute(
        select(Message).where(Message.customer_id == customer_id)
        .order_by(Message.created_at.desc()).limit(25)
    )
    messages = msgs_result.scalars().all()

    revenue_result = await db.execute(
        select(RevenueEntry).where(RevenueEntry.customer_id == customer_id)
        .order_by(RevenueEntry.created_at.desc()).limit(5)
    )
    revenues = revenue_result.scalars().all()

    commitments_result = await db.execute(
        select(Commitment).where(
            Commitment.customer_id == customer_id,
            Commitment.is_fulfilled == False,  # noqa: E712
        )
    )
    commitments = commitments_result.scalars().all()

    intel_result = await db.execute(
        select(CustomerIntelligence).where(CustomerIntelligence.customer_id == customer_id)
    )
    intel = intel_result.scalar_one_or_none()

    messages_list = [
        {"direction": m.direction, "content": m.content or "", "channel": m.channel, "sent_at": str(m.created_at)[:16]}
        for m in reversed(messages) if m.content
    ]
    revenue_list = [
        {"status": r.status, "amount": float(r.amount), "payment_date": r.payment_date, "description": r.description}
        for r in revenues
    ]
    commitments_list = [
        {"commitment_text": c.commitment_text, "due_date": str(c.due_date) if c.due_date else None, "is_fulfilled": c.is_fulfilled}
        for c in commitments
    ]

    ctx = ContextBriefContext(
        customer_name=customer.name,
        customer_id=str(customer_id),
        business_type=business_type,
        messages=messages_list,
        revenue_entries=revenue_list,
        commitments=commitments_list,
        intelligence_profile=intel.profile if intel else {},
        current_status=customer.status,
        health_score=customer.health_score,
        relationship_trajectory=intel.relationship_trajectory if intel else None,
        churn_probability=intel.churn_probability if intel else None,
    )

    try:
        response = await claude_client.complete(build_context_brief_prompt(ctx), max_tokens=512)
        return _parse(response)
    except Exception as exc:
        logger.warning("Context brief Claude call failed", extra={"error": str(exc)})
        return None
