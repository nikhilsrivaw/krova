"""
KROVA — Analytics Router
Pre-computed aggregate statistics for the web dashboard.
All reads from DB — no live Claude calls. Data is already there from nightly analysis.

Endpoints:
  GET /analytics/overview  — headline stats: customer counts, message volume, actions
  GET /analytics/channels  — messages received per channel (last 30 days)
  GET /analytics/pipeline  — customer counts grouped by status (for kanban header counts)
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.database.models.action import Action, ActionOutcome, ActionStatus
from shared.database.models.business import Business
from shared.database.models.customer import Customer
from shared.database.models.message import Message, MessageDirection
from shared.database.models.commitment import Commitment
from shared.database.models.intelligence import CustomerIntelligence
from shared.database.models.prediction import Prediction, PredictionStatus
from shared.database.models.revenue_signal import RevenueSignal
from shared.database.models.competitor import CompetitorMention
from shared.database.models.team_member import TeamMember
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class OverviewStats(BaseModel):
    # Customer health
    total_customers: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    converted_this_month: int
    at_risk_count: int

    # Activity
    messages_this_week: int
    messages_this_month: int
    pending_approvals: int
    actions_sent_this_month: int

    # Outcome quality
    reply_rate_percent: float  # % of sent actions that got a reply


class ChannelStat(BaseModel):
    channel: str
    message_count: int
    percentage: float


class ChannelStatsResponse(BaseModel):
    channels: list[ChannelStat]
    total_messages: int
    period_days: int


class PipelineCount(BaseModel):
    status: str
    count: int


class PipelineResponse(BaseModel):
    counts: list[PipelineCount]
    total: int


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

@router.get("/overview", response_model=OverviewStats)
@limiter.limit(API_LIMIT)
async def get_overview(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> OverviewStats:
    """
    Headline KPIs for the dashboard overview page.
    Computed fresh on each call — fast because all are indexed queries.
    """
    business_id = await _get_business_id(current_user, db)

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Customer counts by status ─────────────────────────────────────────────
    status_counts_result = await db.execute(
        select(Customer.status, func.count(Customer.id))
        .where(Customer.business_id == business_id)
        .group_by(Customer.status)
    )
    status_map: dict[str, int] = {
        s: c for s, c in status_counts_result.all()
    }

    total_customers = sum(status_map.values())
    hot_leads = status_map.get("hot", 0)
    warm_leads = status_map.get("warm", 0)
    cold_leads = status_map.get("cold", 0)
    at_risk = cold_leads  # At-risk = cold customers needing follow-up

    # Customers converted this calendar month
    converted_month_result = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.business_id == business_id,
            Customer.status == "converted",
            Customer.updated_at >= month_start,
        )
    )
    converted_this_month = converted_month_result.scalar() or 0

    # ── Message volume ────────────────────────────────────────────────────────
    messages_week_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.business_id == business_id,
            Message.direction == MessageDirection.inbound,
            Message.created_at >= week_ago,
        )
    )
    messages_this_week = messages_week_result.scalar() or 0

    messages_month_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.business_id == business_id,
            Message.direction == MessageDirection.inbound,
            Message.created_at >= month_ago,
        )
    )
    messages_this_month = messages_month_result.scalar() or 0

    # ── Actions ───────────────────────────────────────────────────────────────
    pending_result = await db.execute(
        select(func.count(Action.id)).where(
            Action.business_id == business_id,
            Action.status == ActionStatus.pending,
        )
    )
    pending_approvals = pending_result.scalar() or 0

    sent_month_result = await db.execute(
        select(func.count(Action.id)).where(
            Action.business_id == business_id,
            Action.status.in_([ActionStatus.sent, ActionStatus.auto_sent]),
            Action.created_at >= month_start,
        )
    )
    actions_sent_this_month = sent_month_result.scalar() or 0

    # Reply rate: sent actions that got a "replied" or "converted" outcome
    replied_result = await db.execute(
        select(func.count(Action.id)).where(
            Action.business_id == business_id,
            Action.outcome.in_([ActionOutcome.replied, ActionOutcome.converted]),
            Action.created_at >= month_ago,
        )
    )
    replied_count = replied_result.scalar() or 0

    total_sent_result = await db.execute(
        select(func.count(Action.id)).where(
            Action.business_id == business_id,
            Action.status.in_([ActionStatus.sent, ActionStatus.auto_sent]),
            Action.created_at >= month_ago,
        )
    )
    total_sent = total_sent_result.scalar() or 0

    reply_rate = round((replied_count / total_sent * 100) if total_sent > 0 else 0.0, 1)

    return OverviewStats(
        total_customers=total_customers,
        hot_leads=hot_leads,
        warm_leads=warm_leads,
        cold_leads=cold_leads,
        converted_this_month=converted_this_month,
        at_risk_count=at_risk,
        messages_this_week=messages_this_week,
        messages_this_month=messages_this_month,
        pending_approvals=pending_approvals,
        actions_sent_this_month=actions_sent_this_month,
        reply_rate_percent=reply_rate,
    )


@router.get("/channels", response_model=ChannelStatsResponse)
@limiter.limit(API_LIMIT)
async def get_channel_stats(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> ChannelStatsResponse:
    """
    Inbound messages received per channel in the last 30 days.
    Tells the owner which channel their leads use most.
    Used for the bar/pie chart on the analytics page.
    """
    business_id = await _get_business_id(current_user, db)

    period_days = 30
    since = datetime.now(timezone.utc) - timedelta(days=period_days)

    result = await db.execute(
        select(Message.channel, func.count(Message.id))
        .where(
            Message.business_id == business_id,
            Message.direction == MessageDirection.inbound,
            Message.created_at >= since,
        )
        .group_by(Message.channel)
        .order_by(func.count(Message.id).desc())
    )
    rows = result.all()

    total = sum(count for _, count in rows)

    channels = [
        ChannelStat(
            channel=channel,
            message_count=count,
            percentage=round((count / total * 100) if total > 0 else 0.0, 1),
        )
        for channel, count in rows
    ]

    return ChannelStatsResponse(
        channels=channels,
        total_messages=total,
        period_days=period_days,
    )


@router.get("/pipeline", response_model=PipelineResponse)
@limiter.limit(API_LIMIT)
async def get_pipeline_counts(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> PipelineResponse:
    """
    Customer counts per status — drives the header counts on the kanban pipeline page.
    """
    business_id = await _get_business_id(current_user, db)

    result = await db.execute(
        select(Customer.status, func.count(Customer.id))
        .where(Customer.business_id == business_id)
        .group_by(Customer.status)
        .order_by(func.count(Customer.id).desc())
    )
    rows = result.all()

    total = sum(c for _, c in rows)

    # Ensure all statuses appear in the response even if count is 0
    status_order = ["new", "hot", "warm", "cold", "converted", "lost"]
    count_map = {s: c for s, c in rows}

    counts = [
        PipelineCount(status=s, count=count_map.get(s, 0))
        for s in status_order
    ]

    return PipelineResponse(counts=counts, total=total)


# ── Priority Brief ─────────────────────────────────────────────────────────────

class PriorityItem(BaseModel):
    id: str
    area: str          # sales, money, relationship, commitment, competitor
    urgency: str       # critical, high, medium
    title: str
    description: str
    action_label: str
    action_href: str
    customer_name: str | None = None
    amount: float | None = None


class PriorityBriefResponse(BaseModel):
    items: list[PriorityItem]
    business_health_score: int
    greeting: str


@router.get("/priority-brief", response_model=PriorityBriefResponse)
@limiter.limit(API_LIMIT)
async def get_priority_brief(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> PriorityBriefResponse:
    """
    The owner's ranked list of what matters most today.
    Pulls from all 5 business areas — not just leads.
    Ordered by: critical first, then high, then medium.
    """
    from datetime import date
    business_id = await _get_business_id(current_user, db)
    today = date.today().isoformat()
    items: list[PriorityItem] = []

    # ── 1. Overdue commitments ────────────────────────────────────────────────
    overdue_commitments = await db.execute(
        select(Commitment, Customer)
        .outerjoin(Customer, Commitment.customer_id == Customer.id)
        .where(
            Commitment.business_id == business_id,
            Commitment.is_fulfilled == False,  # noqa: E712
            Commitment.is_dismissed == False,  # noqa: E712
            Commitment.due_date < today,
        )
        .order_by(Commitment.due_date.asc())
        .limit(3)
    )
    for commitment, customer in overdue_commitments.all():
        items.append(PriorityItem(
            id=f"commitment-{commitment.id}",
            area="commitment",
            urgency="critical",
            title=f"Overdue promise to {customer.name if customer else 'a customer'}",
            description=commitment.commitment_text,
            action_label="View Commitments",
            action_href="/dashboard/intelligence",
            customer_name=customer.name if customer else None,
        ))

    # ── 2. Critical / declining relationships ─────────────────────────────────
    at_risk = await db.execute(
        select(CustomerIntelligence, Customer)
        .join(Customer, CustomerIntelligence.customer_id == Customer.id)
        .where(
            CustomerIntelligence.business_id == business_id,
            CustomerIntelligence.relationship_trajectory.in_(["critical", "declining"]),
            CustomerIntelligence.churn_probability >= 0.5,
        )
        .order_by(CustomerIntelligence.churn_probability.desc())
        .limit(3)
    )
    for intel, customer in at_risk.all():
        urgency = "critical" if intel.relationship_trajectory == "critical" else "high"
        churn_pct = round((intel.churn_probability or 0) * 100)
        items.append(PriorityItem(
            id=f"relationship-{customer.id}",
            area="relationship",
            urgency=urgency,
            title=f"{customer.name or 'A client'}'s relationship is {intel.relationship_trajectory}",
            description=f"{churn_pct}% churn probability. Reach out today before this becomes unrecoverable.",
            action_label="View Customer",
            action_href="/dashboard/customers",
            customer_name=customer.name,
        ))

    # ── 3. High-impact predictions ────────────────────────────────────────────
    predictions = await db.execute(
        select(Prediction, Customer)
        .outerjoin(Customer, Prediction.customer_id == Customer.id)
        .where(
            Prediction.business_id == business_id,
            Prediction.status == PredictionStatus.active,
            (Prediction.probability * Prediction.confidence) >= 0.4,
            Prediction.prediction_type.in_(["churn_risk", "conversion_window", "revenue_at_risk"]),
        )
        .order_by((Prediction.probability * Prediction.confidence).desc())
        .limit(2)
    )
    for pred, customer in predictions.all():
        items.append(PriorityItem(
            id=f"prediction-{pred.id}",
            area="sales",
            urgency="high" if pred.prediction_type == "conversion_window" else "critical",
            title=pred.prediction_text[:80] + ("..." if len(pred.prediction_text) > 80 else ""),
            description=pred.recommended_action or "Act on this prediction today.",
            action_label="View Intelligence",
            action_href="/dashboard/intelligence",
            customer_name=customer.name if customer else None,
        ))

    # ── 4. Revenue leaks ──────────────────────────────────────────────────────
    leaks = await db.execute(
        select(RevenueSignal, Customer)
        .outerjoin(Customer, RevenueSignal.customer_id == Customer.id)
        .where(
            RevenueSignal.business_id == business_id,
            RevenueSignal.is_resolved == False,  # noqa: E712
        )
        .order_by(RevenueSignal.estimated_amount.desc().nullslast())
        .limit(2)
    )
    for signal, customer in leaks.all():
        label_map = {
            "scope_creep": "Unbilled scope creep",
            "forgotten_invoice": "Forgotten invoice",
            "ghost_invoice": "Ghost invoice — client avoiding payment",
            "retainer_mismatch": "Retainer undercharge",
        }
        items.append(PriorityItem(
            id=f"revenue-{signal.id}",
            area="money",
            urgency="high",
            title=label_map.get(signal.signal_type, "Revenue leak detected"),
            description=signal.description or f"Estimated ₹{signal.estimated_amount:,.0f} at risk." if signal.estimated_amount else "Review and bill accordingly.",
            action_label="View Revenue Leaks",
            action_href="/dashboard/intelligence",
            customer_name=customer.name if customer else None,
            amount=float(signal.estimated_amount) if signal.estimated_amount else None,
        ))

    # ── 5. Pending approvals ──────────────────────────────────────────────────
    pending_count_result = await db.execute(
        select(func.count(Action.id)).where(
            Action.business_id == business_id,
            Action.status == ActionStatus.pending,
        )
    )
    pending_count = pending_count_result.scalar() or 0
    if pending_count > 0:
        items.append(PriorityItem(
            id="approvals",
            area="sales",
            urgency="medium",
            title=f"{pending_count} AI draft{'' if pending_count == 1 else 's'} waiting for approval",
            description=f"Approve them in ~{max(1, pending_count // 3)} minutes. Every hour of delay reduces reply rate.",
            action_label="Review Approvals",
            action_href="/dashboard/approvals",
        ))

    # ── 6. Competitor alert — customer mentioned competitor and went quiet ─────
    from datetime import datetime, timedelta
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_competitor = await db.execute(
        select(CompetitorMention, Customer)
        .join(Customer, CompetitorMention.customer_id == Customer.id)
        .where(
            CompetitorMention.business_id == business_id,
            CompetitorMention.sentiment.in_(["comparing", "switched"]),
            CompetitorMention.mentioned_at >= seven_days_ago,
        )
        .order_by(CompetitorMention.mentioned_at.desc())
        .limit(1)
    )
    for mention, customer in recent_competitor.all():
        items.append(PriorityItem(
            id=f"competitor-{mention.id}",
            area="competitor",
            urgency="high",
            title=f"{customer.name or 'A client'} mentioned {mention.competitor_name}",
            description=f"Sentiment: {mention.sentiment}. You have a 72-hour window before this becomes hard to reverse.",
            action_label="View Competitors",
            action_href="/dashboard/intelligence",
            customer_name=customer.name,
        ))

    # ── Sort: critical first, then high, then medium ──────────────────────────
    urgency_order = {"critical": 0, "high": 1, "medium": 2}
    items.sort(key=lambda x: urgency_order.get(x.urgency, 3))

    # ── Business health score (simple heuristic) ──────────────────────────────
    critical_count = sum(1 for i in items if i.urgency == "critical")
    high_count = sum(1 for i in items if i.urgency == "high")
    health_score = max(10, 100 - (critical_count * 20) - (high_count * 10))

    # ── Greeting based on time ────────────────────────────────────────────────
    hour = datetime.now(timezone.utc).hour + 5  # IST offset
    if hour < 12:
        greeting = "Good morning."
    elif hour < 17:
        greeting = "Good afternoon."
    else:
        greeting = "Good evening."

    return PriorityBriefResponse(
        items=items[:7],  # Max 7 items — anything more is overwhelming
        business_health_score=health_score,
        greeting=greeting,
    )


# ── Team Performance Analytics ────────────────────────────────────────────────

class TeamMemberStats(BaseModel):
    member_id: str
    name: str
    email: str
    role: str
    assigned_customers: int
    hot_leads: int
    converted_this_month: int
    overdue_commitments: int
    has_accepted: bool


@router.get("/team", response_model=list[TeamMemberStats])
@limiter.limit(API_LIMIT)
async def get_team_analytics(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[TeamMemberStats]:
    """Per-team-member performance. Owner and manager only."""
    from services.api.dependencies.auth import require_business
    from datetime import date

    if not current_user.is_manager_or_above:
        raise HTTPException(status_code=403, detail="Manager access required")

    business_id = require_business(current_user)

    members_result = await db.execute(
        select(TeamMember).where(
            TeamMember.business_id == business_id,
            TeamMember.is_active == True,  # noqa: E712
        )
    )
    members = members_result.scalars().all()

    if not members:
        return []

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today = date.today().isoformat()

    stats = []
    for m in members:
        uid = m.supabase_user_id

        if uid:
            # Assigned customers
            assigned_count_r = await db.execute(
                select(func.count(Customer.id)).where(
                    Customer.business_id == business_id,
                    Customer.assigned_to == uid,
                )
            )
            assigned_count = assigned_count_r.scalar() or 0

            # Hot leads
            hot_r = await db.execute(
                select(func.count(Customer.id)).where(
                    Customer.business_id == business_id,
                    Customer.assigned_to == uid,
                    Customer.status == "hot",
                )
            )
            hot_count = hot_r.scalar() or 0

            # Converted this month
            conv_r = await db.execute(
                select(func.count(Customer.id)).where(
                    Customer.business_id == business_id,
                    Customer.assigned_to == uid,
                    Customer.status == "converted",
                    Customer.last_contact_at >= month_start.isoformat(),
                )
            )
            conv_count = conv_r.scalar() or 0

            # Overdue commitments for their customers
            overdue_r = await db.execute(
                select(func.count(Commitment.id))
                .join(Customer, Commitment.customer_id == Customer.id)
                .where(
                    Commitment.business_id == business_id,
                    Customer.assigned_to == uid,
                    Commitment.is_fulfilled == False,  # noqa: E712
                    Commitment.is_dismissed == False,  # noqa: E712
                    Commitment.due_date < today,
                )
            )
            overdue_count = overdue_r.scalar() or 0
        else:
            assigned_count = hot_count = conv_count = overdue_count = 0

        stats.append(TeamMemberStats(
            member_id=str(m.id),
            name=m.name,
            email=m.email,
            role=m.role,
            assigned_customers=assigned_count,
            hot_leads=hot_count,
            converted_this_month=conv_count,
            overdue_commitments=overdue_count,
            has_accepted=m.accepted_at is not None,
        ))

    return stats


# ── Time Machine ───────────────────────────────────────────────────────────────

class TimeMachineScenario(BaseModel):
    scenario: str
    description: str
    leads_affected: int
    estimated_revenue_lost: float
    current_stat: str
    ideal_stat: str
    improvement_possible: str


class TimeMachineResponse(BaseModel):
    period_days: int
    total_leads_analyzed: int
    total_lost_leads: int
    current_conversion_rate: float
    scenarios: list[TimeMachineScenario]
    total_estimated_annual_loss: float
    top_lever: str
    generated_at: str


@router.get("/time-machine", response_model=TimeMachineResponse)
@limiter.limit(API_LIMIT)
async def get_time_machine(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> TimeMachineResponse:
    """
    'What if I had replied within 1 hour to every lead?'
    Runs on actual data. Gives a rupee number.
    '₹4.8L lost to response time — not price.'
    """
    from shared.database.models.message import Message, MessageDirection
    from datetime import datetime, timedelta

    business_id = await _get_business_id(current_user, db)
    now = datetime.now(timezone.utc)
    six_months_ago = now - timedelta(days=180)

    # All leads in last 6 months
    total_leads_result = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.business_id == business_id,
            Customer.created_at >= six_months_ago,
        )
    )
    total_leads = total_leads_result.scalar() or 0

    # Lost leads
    lost_result = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.business_id == business_id,
            Customer.status == "lost",
            Customer.created_at >= six_months_ago,
        )
    )
    lost_leads = lost_result.scalar() or 0

    # Converted leads (for baseline)
    converted_result = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.business_id == business_id,
            Customer.status == "converted",
            Customer.created_at >= six_months_ago,
        )
    )
    converted_leads = converted_result.scalar() or 0

    current_conv_rate = round(converted_leads / total_leads, 3) if total_leads > 0 else 0.0

    # Average deal size from revenue entries (if available)
    from shared.database.models.revenue import RevenueEntry, RevenueStatus
    avg_deal_result = await db.execute(
        select(func.avg(RevenueEntry.amount)).where(
            RevenueEntry.business_id == business_id,
            RevenueEntry.status == RevenueStatus.received,
        )
    )
    avg_deal = float(avg_deal_result.scalar() or 0) or 15000.0  # fallback to ₹15k

    # Scenario 1: Response time — leads with first reply > 4 hours
    slow_response_count = 0
    response_times = []

    lost_customers_result = await db.execute(
        select(Customer)
        .where(
            Customer.business_id == business_id,
            Customer.status == "lost",
            Customer.created_at >= six_months_ago,
        )
        .limit(100)
    )
    lost_customers = lost_customers_result.scalars().all()

    for lc in lost_customers:
        first_inbound_r = await db.execute(
            select(Message)
            .where(
                Message.business_id == business_id,
                Message.customer_id == lc.id,
                Message.direction == MessageDirection.inbound,
            )
            .order_by(Message.created_at.asc())
            .limit(1)
        )
        first_in = first_inbound_r.scalar_one_or_none()
        if not first_in:
            continue

        first_outbound_r = await db.execute(
            select(Message)
            .where(
                Message.business_id == business_id,
                Message.customer_id == lc.id,
                Message.direction == MessageDirection.outbound,
                Message.created_at >= first_in.created_at,
            )
            .order_by(Message.created_at.asc())
            .limit(1)
        )
        first_out = first_outbound_r.scalar_one_or_none()

        if first_out:
            diff_h = (first_out.created_at - first_in.created_at).total_seconds() / 3600
            response_times.append(diff_h)
            if diff_h > 4:
                slow_response_count += 1
        else:
            slow_response_count += 1  # Never replied

    avg_response_h = round(sum(response_times) / len(response_times), 1) if response_times else 0.0

    # Assume 30% of slow-response lost leads would have converted with fast response
    slow_response_recoverable = round(slow_response_count * 0.30)
    slow_response_revenue = round(slow_response_recoverable * avg_deal)

    scenarios = []

    if slow_response_count > 0:
        scenarios.append(TimeMachineScenario(
            scenario="1-hour response rule",
            description=f"If you had replied to every lead within 1 hour instead of your current average of {avg_response_h}h",
            leads_affected=slow_response_count,
            estimated_revenue_lost=slow_response_revenue,
            current_stat=f"Avg first response: {avg_response_h}h",
            ideal_stat="First response: < 1 hour",
            improvement_possible=f"~{slow_response_recoverable} more conversions",
        ))

    # Scenario 2: No follow-up at all
    no_followup_count = len(lost_customers) - len(response_times)
    if no_followup_count > 0:
        no_followup_revenue = round(no_followup_count * 0.20 * avg_deal)
        scenarios.append(TimeMachineScenario(
            scenario="Follow up on every lead",
            description=f"{no_followup_count} lost leads never received any reply from you",
            leads_affected=no_followup_count,
            estimated_revenue_lost=no_followup_revenue,
            current_stat=f"{no_followup_count} leads got no response",
            ideal_stat="Every lead gets at least one reply",
            improvement_possible=f"~{round(no_followup_count * 0.20)} more conversions",
        ))

    # Scenario 3: Consistent follow-up within 3 days
    single_touch_count = max(0, lost_leads - slow_response_count - no_followup_count)
    if single_touch_count > 2:
        single_touch_revenue = round(single_touch_count * 0.15 * avg_deal)
        scenarios.append(TimeMachineScenario(
            scenario="3-day follow-up rule",
            description="Leads that received only one touch and then went cold",
            leads_affected=single_touch_count,
            estimated_revenue_lost=single_touch_revenue,
            current_stat="1-2 touches per lead on average",
            ideal_stat="Follow up every 3 days until clear decision",
            improvement_possible=f"~{round(single_touch_count * 0.15)} more conversions",
        ))

    total_annual_loss = sum(s.estimated_revenue_lost for s in scenarios) * 2  # 6-month → annual
    top_lever = scenarios[0].scenario if scenarios else "Respond faster"

    return TimeMachineResponse(
        period_days=180,
        total_leads_analyzed=total_leads,
        total_lost_leads=lost_leads,
        current_conversion_rate=current_conv_rate,
        scenarios=scenarios,
        total_estimated_annual_loss=round(total_annual_loss),
        top_lever=top_lever,
        generated_at=str(now.date()),
    )
