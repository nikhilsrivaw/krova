"""
KROVA — Intelligence Router
Serves all 13 intelligence layer data to the dashboard and mobile app.

Endpoints:
  GET /intelligence/dna                    — Layer 1: Business DNA profile
  GET /intelligence/predictions            — Layer 2: Active predictions
  GET /intelligence/customers/{id}         — Layer 3: Customer relationship intelligence
  GET /intelligence/benchmarks             — Layer 4: Industry benchmarks
  GET /intelligence/weekly-insight         — Layer 12: This week's learning
  GET /intelligence/financial              — Layer 10: Financial overview
  GET /intelligence/reputation             — Layer 11: Reputation events
  GET /intelligence/autopilot             — Layer 9: Autopilot rules
  POST /intelligence/autopilot            — Layer 9: Create autopilot rule
  PATCH /intelligence/autopilot/{id}      — Layer 9: Update autopilot rule
  DELETE /intelligence/autopilot/{id}     — Layer 9: Delete autopilot rule
  POST /intelligence/revenue              — Layer 10: Log revenue entry
  PATCH /intelligence/weekly-insight/{id}/read — Mark insight as read
  PATCH /intelligence/predictions/{id}/acknowledge — Acknowledge prediction
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.database.models.autopilot import AutopilotAction, AutopilotRule, AutopilotTrigger
from shared.database.models.benchmark import Benchmark
from shared.database.models.business import Business
from shared.database.models.customer import Customer
from shared.database.models.dna import BusinessDNA
from shared.database.models.intelligence import CustomerIntelligence
from shared.database.models.prediction import Prediction, PredictionStatus
from shared.database.models.reputation import ReputationEvent, ReputationSentiment
from shared.database.models.revenue import RevenueEntry, RevenueStatus
from shared.database.models.weekly_insight import WeeklyInsight
from shared.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/intelligence", tags=["intelligence"])


# ── Business lookup helper ────────────────────────────────────────────────────

async def _get_business(current_user: AuthDep, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(
            Business.owner_user_id == current_user.supabase_user_id,
            Business.is_active == True,  # noqa: E712
        )
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


# ── Layer 1: Business DNA ─────────────────────────────────────────────────────

class DNAResponse(BaseModel):
    business_id: str
    profile: dict
    narrative: str | None
    analysis_count: int
    last_updated: str | None


@router.get("/dna", response_model=DNAResponse)
@limiter.limit(API_LIMIT)
async def get_business_dna(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> DNAResponse:
    """
    Returns the living Business DNA profile.
    Gets richer with every nightly analysis run. After 90 days it knows
    this business better than the owner consciously does.
    """
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(BusinessDNA).where(BusinessDNA.business_id == business.id)
    )
    dna = result.scalar_one_or_none()

    if not dna:
        return DNAResponse(
            business_id=str(business.id),
            profile={},
            narrative=None,
            analysis_count=0,
            last_updated=None,
        )

    return DNAResponse(
        business_id=str(business.id),
        profile=dna.profile,
        narrative=dna.narrative,
        analysis_count=dna.analysis_count,
        last_updated=str(dna.updated_at.date()) if dna.updated_at else None,
    )


# ── Layer 2: Predictions ──────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    id: str
    customer_id: str | None
    customer_name: str | None
    prediction_type: str
    probability: float
    confidence: float
    prediction_text: str
    recommended_action: str | None
    predicted_for_date: str | None
    evidence: dict
    created_at: str


class PredictionAccuracy(BaseModel):
    total_resolved: int       # correct + incorrect
    correct: int
    incorrect: int
    accuracy_percent: float   # 0–100, -1 if no resolved predictions yet


class PredictionsListResponse(BaseModel):
    predictions: list[PredictionResponse]
    count: int
    revenue_at_risk_estimate: float
    accuracy: PredictionAccuracy


@router.get("/predictions", response_model=PredictionsListResponse)
@limiter.limit(API_LIMIT)
async def get_predictions(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> PredictionsListResponse:
    """
    Active predictions ordered by probability × confidence (impact score).
    Includes accuracy stats so owner can see how reliable KROVA's predictions are.
    """
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(Prediction, Customer)
        .outerjoin(Customer, Prediction.customer_id == Customer.id)
        .where(
            Prediction.business_id == business.id,
            Prediction.status == PredictionStatus.active,
        )
        .order_by(
            (Prediction.probability * Prediction.confidence).desc()
        )
        .limit(20)
    )
    rows = result.all()

    predictions = [
        PredictionResponse(
            id=str(p.id),
            customer_id=str(p.customer_id) if p.customer_id else None,
            customer_name=c.name if c else None,
            prediction_type=p.prediction_type,
            probability=p.probability,
            confidence=p.confidence,
            prediction_text=p.prediction_text,
            recommended_action=p.recommended_action,
            predicted_for_date=p.predicted_for_date,
            evidence=p.evidence,
            created_at=str(p.created_at.date()),
        )
        for p, c in rows
    ]

    # Accuracy stats from all resolved predictions
    resolved_result = await db.execute(
        select(Prediction.status)
        .where(
            Prediction.business_id == business.id,
            Prediction.status.in_([PredictionStatus.correct, PredictionStatus.incorrect]),
        )
    )
    resolved_statuses = [row[0] for row in resolved_result.all()]
    total_resolved = len(resolved_statuses)
    correct_count = sum(1 for s in resolved_statuses if s == PredictionStatus.correct)
    incorrect_count = total_resolved - correct_count
    accuracy_pct = round((correct_count / total_resolved) * 100, 1) if total_resolved > 0 else -1.0

    return PredictionsListResponse(
        predictions=predictions,
        count=len(predictions),
        revenue_at_risk_estimate=0.0,
        accuracy=PredictionAccuracy(
            total_resolved=total_resolved,
            correct=correct_count,
            incorrect=incorrect_count,
            accuracy_percent=accuracy_pct,
        ),
    )


@router.patch("/predictions/{prediction_id}/acknowledge")
@limiter.limit(API_LIMIT)
async def acknowledge_prediction(
    request: Request,
    prediction_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a prediction as acknowledged (owner has seen and is acting on it)."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(Prediction).where(
            Prediction.id == prediction_id,
            Prediction.business_id == business.id,
        )
    )
    pred = result.scalar_one_or_none()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    pred.is_acknowledged = True
    await db.commit()
    return {"acknowledged": True}


class PredictionOutcomeBody(BaseModel):
    outcome: str  # "correct" or "incorrect"


@router.patch("/predictions/{prediction_id}/outcome")
@limiter.limit(API_LIMIT)
async def record_prediction_outcome(
    request: Request,
    prediction_id: uuid.UUID,
    body: PredictionOutcomeBody,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Owner marks a prediction correct or incorrect.
    Closes the feedback loop — accuracy % updates immediately.
    """
    if body.outcome not in ("correct", "incorrect"):
        raise HTTPException(status_code=400, detail="outcome must be 'correct' or 'incorrect'")

    business = await _get_business(current_user, db)

    result = await db.execute(
        select(Prediction).where(
            Prediction.id == prediction_id,
            Prediction.business_id == business.id,
        )
    )
    pred = result.scalar_one_or_none()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    pred.status = PredictionStatus.correct if body.outcome == "correct" else PredictionStatus.incorrect
    pred.is_acknowledged = True
    await db.commit()
    return {"outcome": body.outcome}


# ── Layer 3: Customer Relationship Intelligence ───────────────────────────────

class CustomerIntelligenceResponse(BaseModel):
    customer_id: str
    customer_name: str | None
    profile: dict
    current_recommendation: str | None
    message_template: str | None
    confidence: float
    interaction_count: int
    last_updated: str | None


@router.get("/customers/{customer_id}", response_model=CustomerIntelligenceResponse)
@limiter.limit(API_LIMIT)
async def get_customer_intelligence(
    request: Request,
    customer_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> CustomerIntelligenceResponse:
    """
    Deep relationship intelligence for one customer.
    Answers: "What should I say to this person right now?"
    Gets more accurate with every interaction stored in KROVA.
    """
    business = await _get_business(current_user, db)

    # Verify customer belongs to this business
    customer_result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business.id,
        )
    )
    customer = customer_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    intel_result = await db.execute(
        select(CustomerIntelligence).where(
            CustomerIntelligence.customer_id == customer_id
        )
    )
    intel = intel_result.scalar_one_or_none()

    if not intel:
        return CustomerIntelligenceResponse(
            customer_id=str(customer_id),
            customer_name=customer.name,
            profile={},
            current_recommendation=None,
            message_template=None,
            confidence=0.0,
            interaction_count=0,
            last_updated=None,
        )

    return CustomerIntelligenceResponse(
        customer_id=str(customer_id),
        customer_name=customer.name,
        profile=intel.profile,
        current_recommendation=intel.current_recommendation,
        message_template=intel.message_template,
        confidence=intel.confidence,
        interaction_count=intel.interaction_count,
        last_updated=str(intel.updated_at.date()) if intel.updated_at else None,
    )


# ── Layer 4: Benchmarks ───────────────────────────────────────────────────────

class BenchmarkResponse(BaseModel):
    business_type: str
    period_date: str
    metrics: dict
    sample_size: int
    your_stats: dict  # Business's own stats for comparison


@router.get("/benchmarks", response_model=BenchmarkResponse | None)
@limiter.limit(API_LIMIT)
async def get_benchmarks(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> BenchmarkResponse | None:
    """
    Industry benchmarks vs this business's actual performance.
    More accurate with more businesses on KROVA — the network moat.
    """
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(Benchmark)
        .where(Benchmark.business_type == business.business_type)
        .order_by(Benchmark.period_date.desc())
        .limit(1)
    )
    benchmark = result.scalar_one_or_none()

    if not benchmark:
        return None

    # Get business's own stats for comparison
    customer_result = await db.execute(
        select(Customer.status, func.count(Customer.id))
        .where(Customer.business_id == business.id)
        .group_by(Customer.status)
    )
    status_counts = {s: c for s, c in customer_result.all()}
    total = sum(status_counts.values()) or 1

    your_stats = {
        "conversion_rate": round(status_counts.get("converted", 0) / total, 3),
        "hot_lead_rate": round(status_counts.get("hot", 0) / total, 3),
        "cold_lead_rate": round(status_counts.get("cold", 0) / total, 3),
        "total_customers": total,
    }

    return BenchmarkResponse(
        business_type=benchmark.business_type,
        period_date=benchmark.period_date,
        metrics=benchmark.metrics,
        sample_size=benchmark.sample_size,
        your_stats=your_stats,
    )


# ── Layer 9: Autopilot Rules ──────────────────────────────────────────────────

class AutopilotRuleCreate(BaseModel):
    name: str
    trigger_type: str
    trigger_config: dict
    action_type: str
    message_template: str | None = None
    channel: str | None = None
    requires_approval: bool = True
    cooldown_days: int = 7
    applies_to_status: str | None = None


class AutopilotRuleResponse(BaseModel):
    id: str
    name: str
    trigger_type: str
    trigger_config: dict
    action_type: str
    message_template: str | None
    channel: str | None
    requires_approval: bool
    is_active: bool
    execution_count: int
    cooldown_days: int
    applies_to_status: str | None
    created_at: str


@router.get("/autopilot", response_model=list[AutopilotRuleResponse])
@limiter.limit(API_LIMIT)
async def get_autopilot_rules(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[AutopilotRuleResponse]:
    """Returns all autopilot rules for this business."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(AutopilotRule)
        .where(AutopilotRule.business_id == business.id)
        .order_by(AutopilotRule.created_at.desc())
    )
    rules = result.scalars().all()

    return [
        AutopilotRuleResponse(
            id=str(r.id),
            name=r.name,
            trigger_type=r.trigger_type,
            trigger_config=r.trigger_config,
            action_type=r.action_type,
            message_template=r.message_template,
            channel=r.channel,
            requires_approval=r.requires_approval,
            is_active=r.is_active,
            execution_count=r.execution_count,
            cooldown_days=r.cooldown_days,
            applies_to_status=r.applies_to_status,
            created_at=str(r.created_at.date()),
        )
        for r in rules
    ]


@router.post("/autopilot", response_model=AutopilotRuleResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(API_LIMIT)
async def create_autopilot_rule(
    request: Request,
    body: AutopilotRuleCreate,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> AutopilotRuleResponse:
    """Create a new autopilot rule. Set it once, KROVA runs it forever."""
    business = await _get_business(current_user, db)

    rule = AutopilotRule(
        business_id=business.id,
        name=body.name,
        trigger_type=body.trigger_type,
        trigger_config=body.trigger_config,
        action_type=body.action_type,
        message_template=body.message_template,
        channel=body.channel,
        requires_approval=body.requires_approval,
        cooldown_days=body.cooldown_days,
        applies_to_status=body.applies_to_status,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    return AutopilotRuleResponse(
        id=str(rule.id),
        name=rule.name,
        trigger_type=rule.trigger_type,
        trigger_config=rule.trigger_config,
        action_type=rule.action_type,
        message_template=rule.message_template,
        channel=rule.channel,
        requires_approval=rule.requires_approval,
        is_active=rule.is_active,
        execution_count=rule.execution_count,
        cooldown_days=rule.cooldown_days,
        applies_to_status=rule.applies_to_status,
        created_at=str(rule.created_at.date()),
    )


@router.patch("/autopilot/{rule_id}")
@limiter.limit(API_LIMIT)
async def update_autopilot_rule(
    request: Request,
    rule_id: uuid.UUID,
    body: dict,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Toggle a rule on/off or update its message template."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(AutopilotRule).where(
            AutopilotRule.id == rule_id,
            AutopilotRule.business_id == business.id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    if "is_active" in body:
        rule.is_active = body["is_active"]
    if "message_template" in body:
        rule.message_template = body["message_template"]
    if "requires_approval" in body:
        rule.requires_approval = body["requires_approval"]

    await db.commit()
    return {"updated": True}


@router.delete("/autopilot/{rule_id}")
@limiter.limit(API_LIMIT)
async def delete_autopilot_rule(
    request: Request,
    rule_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(AutopilotRule).where(
            AutopilotRule.id == rule_id,
            AutopilotRule.business_id == business.id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    await db.delete(rule)
    await db.commit()
    return {"deleted": True}


# ── Layer 10: Financial Intelligence ─────────────────────────────────────────

class RevenueEntryCreate(BaseModel):
    customer_id: str | None = None
    amount: float
    status: str = "expected"
    payment_method: str | None = None
    payment_date: str | None = None
    due_date: str | None = None
    description: str | None = None


class FinancialOverview(BaseModel):
    total_received_this_month: float
    total_expected_this_month: float
    total_overdue: float
    overdue_count: int
    overdue_clients: list[dict]  # [{customer_name, amount, days_overdue}]
    avg_payment_days: float
    slow_payers: list[dict]
    recent_entries: list[dict]


@router.get("/financial", response_model=FinancialOverview)
@limiter.limit(API_LIMIT)
async def get_financial_overview(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> FinancialOverview:
    """
    Financial intelligence — tells owners what their money means in plain language.
    Connects payment data with relationship data for complete picture.
    """
    business = await _get_business(current_user, db)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()[:10]

    # Received this month
    received_result = await db.execute(
        select(func.sum(RevenueEntry.amount))
        .where(
            RevenueEntry.business_id == business.id,
            RevenueEntry.status == RevenueStatus.received,
            RevenueEntry.payment_date >= month_start,
        )
    )
    total_received = received_result.scalar() or 0.0

    # Expected this month
    expected_result = await db.execute(
        select(func.sum(RevenueEntry.amount))
        .where(
            RevenueEntry.business_id == business.id,
            RevenueEntry.status == RevenueStatus.expected,
            RevenueEntry.due_date >= month_start,
        )
    )
    total_expected = expected_result.scalar() or 0.0

    # Overdue
    today = now.date().isoformat()
    overdue_result = await db.execute(
        select(RevenueEntry, Customer)
        .outerjoin(Customer, RevenueEntry.customer_id == Customer.id)
        .where(
            RevenueEntry.business_id == business.id,
            RevenueEntry.status == RevenueStatus.expected,
            RevenueEntry.due_date < today,
        )
        .order_by(RevenueEntry.due_date.asc())
    )
    overdue_rows = overdue_result.all()

    total_overdue = sum(r.amount for r, _ in overdue_rows)
    overdue_clients = []
    for r, c in overdue_rows[:10]:
        due = r.due_date or ""
        try:
            from datetime import date as date_type
            days_overdue = (date_type.fromisoformat(today) - date_type.fromisoformat(due)).days if due else 0
        except Exception:
            days_overdue = 0
        overdue_clients.append({
            "customer_name": c.name if c else "Unknown",
            "amount": r.amount,
            "days_overdue": days_overdue,
            "description": r.description,
        })

    # Recent entries
    recent_result = await db.execute(
        select(RevenueEntry, Customer)
        .outerjoin(Customer, RevenueEntry.customer_id == Customer.id)
        .where(RevenueEntry.business_id == business.id)
        .order_by(RevenueEntry.created_at.desc())
        .limit(5)
    )
    recent_entries = [
        {
            "id": str(r.id),
            "customer_name": c.name if c else "General",
            "amount": r.amount,
            "status": r.status,
            "description": r.description,
            "payment_date": r.payment_date,
        }
        for r, c in recent_result.all()
    ]

    return FinancialOverview(
        total_received_this_month=total_received,
        total_expected_this_month=total_expected,
        total_overdue=total_overdue,
        overdue_count=len(overdue_rows),
        overdue_clients=overdue_clients,
        avg_payment_days=18.0,  # TODO: compute from actual data
        slow_payers=[],
        recent_entries=recent_entries,
    )


@router.post("/revenue", status_code=status.HTTP_201_CREATED)
@limiter.limit(API_LIMIT)
async def log_revenue(
    request: Request,
    body: RevenueEntryCreate,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Log a revenue entry — invoice, payment, or expected income."""
    business = await _get_business(current_user, db)

    customer_id = None
    if body.customer_id:
        try:
            customer_id = uuid.UUID(body.customer_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid customer_id")

    entry = RevenueEntry(
        business_id=business.id,
        customer_id=customer_id,
        amount=body.amount,
        status=body.status,
        payment_method=body.payment_method,
        payment_date=body.payment_date,
        due_date=body.due_date,
        description=body.description,
    )
    db.add(entry)
    await db.commit()
    return {"id": str(entry.id), "created": True}


# ── Layer 11: Reputation ──────────────────────────────────────────────────────

class ReputationOverview(BaseModel):
    avg_rating: float | None
    total_reviews: int
    positive_count: int
    neutral_count: int
    negative_count: int
    unresponded_negative: int
    recent_events: list[dict]
    review_requests_sent: int


@router.get("/reputation", response_model=ReputationOverview)
@limiter.limit(API_LIMIT)
async def get_reputation(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> ReputationOverview:
    """Reputation overview — reviews, mentions, and proactive review request tracking."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(ReputationEvent)
        .where(ReputationEvent.business_id == business.id)
        .order_by(ReputationEvent.created_at.desc())
        .limit(50)
    )
    events = result.scalars().all()

    reviews = [e for e in events if e.event_type == "google_review"]
    positive = sum(1 for e in events if e.sentiment == ReputationSentiment.positive)
    neutral = sum(1 for e in events if e.sentiment == ReputationSentiment.neutral)
    negative = sum(1 for e in events if e.sentiment == ReputationSentiment.negative)
    unresponded_negative = sum(1 for e in events if e.sentiment == ReputationSentiment.negative and not e.is_responded)

    avg_rating = None
    rated = [r.rating for r in reviews if r.rating is not None]
    if rated:
        avg_rating = round(sum(rated) / len(rated), 1)

    review_requests = sum(1 for e in events if e.event_type == "review_requested")

    recent = [
        {
            "id": str(e.id),
            "type": e.event_type,
            "sentiment": e.sentiment,
            "rating": e.rating,
            "content": (e.content or "")[:200],
            "suggested_response": e.suggested_response,
            "is_responded": e.is_responded,
            "created_at": str(e.created_at.date()),
        }
        for e in events[:10]
    ]

    return ReputationOverview(
        avg_rating=avg_rating,
        total_reviews=len(reviews),
        positive_count=positive,
        neutral_count=neutral,
        negative_count=negative,
        unresponded_negative=unresponded_negative,
        recent_events=recent,
        review_requests_sent=review_requests,
    )


# ── Layer 12: Weekly Insight ──────────────────────────────────────────────────

class WeeklyInsightResponse(BaseModel):
    id: str
    week: str
    category: str
    headline: str
    body: str
    action_item: str
    estimated_impact: str | None
    benchmark_comparison: str | None
    confidence: float
    is_read: bool
    owner_committed: bool
    created_at: str


@router.get("/weekly-insight", response_model=WeeklyInsightResponse | None)
@limiter.limit(API_LIMIT)
async def get_weekly_insight(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> WeeklyInsightResponse | None:
    """This week's learning insight — one specific thing to improve."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(WeeklyInsight)
        .where(WeeklyInsight.business_id == business.id)
        .order_by(WeeklyInsight.created_at.desc())
        .limit(1)
    )
    insight = result.scalar_one_or_none()

    if not insight:
        return None

    return WeeklyInsightResponse(
        id=str(insight.id),
        week=insight.week,
        category=insight.category,
        headline=insight.headline,
        body=insight.body,
        action_item=insight.action_item,
        estimated_impact=insight.estimated_impact,
        benchmark_comparison=insight.benchmark_comparison,
        confidence=insight.confidence,
        is_read=insight.is_read,
        owner_committed=insight.owner_committed,
        created_at=str(insight.created_at.date()),
    )


@router.patch("/weekly-insight/{insight_id}/read")
@limiter.limit(API_LIMIT)
async def mark_insight_read(
    request: Request,
    insight_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(WeeklyInsight).where(
            WeeklyInsight.id == insight_id,
            WeeklyInsight.business_id == business.id,
        )
    )
    insight = result.scalar_one_or_none()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_read = True
    await db.commit()
    return {"read": True}


@router.patch("/weekly-insight/{insight_id}/commit")
@limiter.limit(API_LIMIT)
async def commit_to_insight(
    request: Request,
    insight_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Owner commits to acting on this week's insight."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(WeeklyInsight).where(
            WeeklyInsight.id == insight_id,
            WeeklyInsight.business_id == business.id,
        )
    )
    insight = result.scalar_one_or_none()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.owner_committed = True
    await db.commit()
    return {"committed": True}


# ── Phase 1: Commitments ──────────────────────────────────────────────────────

from shared.database.models.commitment import Commitment
from shared.database.models.competitor import CompetitorMention
from shared.database.models.revenue_signal import RevenueSignal
from shared.database.models.growth_report import GrowthReport


class CommitmentResponse(BaseModel):
    id: str
    customer_id: str | None
    customer_name: str | None
    commitment_text: str
    due_date: str | None
    source_channel: str | None
    is_fulfilled: bool
    is_dismissed: bool
    created_at: str


@router.get("/commitments", response_model=list[CommitmentResponse])
@limiter.limit(API_LIMIT)
async def get_commitments(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
    customer_id: uuid.UUID | None = Query(None),
    include_fulfilled: bool = Query(False),
) -> list[CommitmentResponse]:
    """All outstanding commitments — optionally filtered by customer_id."""
    business = await _get_business(current_user, db)

    filters = [Commitment.business_id == business.id]
    if not include_fulfilled:
        filters += [
            Commitment.is_fulfilled == False,  # noqa: E712
            Commitment.is_dismissed == False,  # noqa: E712
        ]
    if customer_id:
        filters.append(Commitment.customer_id == customer_id)

    result = await db.execute(
        select(Commitment, Customer)
        .outerjoin(Customer, Commitment.customer_id == Customer.id)
        .where(*filters)
        .order_by(Commitment.due_date.asc().nullslast(), Commitment.created_at.asc())
    )
    rows = result.all()

    return [
        CommitmentResponse(
            id=str(c.id),
            customer_id=str(c.customer_id) if c.customer_id else None,
            customer_name=cust.name if cust else None,
            commitment_text=c.commitment_text,
            due_date=str(c.due_date) if c.due_date else None,
            source_channel=c.source_channel,
            is_fulfilled=c.is_fulfilled,
            is_dismissed=c.is_dismissed,
            created_at=str(c.created_at.date()),
        )
        for c, cust in rows
    ]


@router.patch("/commitments/{commitment_id}/fulfill")
@limiter.limit(API_LIMIT)
async def fulfill_commitment(
    request: Request,
    commitment_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a commitment as fulfilled."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(Commitment).where(
            Commitment.id == commitment_id,
            Commitment.business_id == business.id,
        )
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Commitment not found")

    c.is_fulfilled = True
    await db.commit()
    return {"fulfilled": True}


@router.patch("/commitments/{commitment_id}/dismiss")
@limiter.limit(API_LIMIT)
async def dismiss_commitment(
    request: Request,
    commitment_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dismiss a commitment (not relevant or already handled outside KROVA)."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(Commitment).where(
            Commitment.id == commitment_id,
            Commitment.business_id == business.id,
        )
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Commitment not found")

    c.is_dismissed = True
    await db.commit()
    return {"dismissed": True}


# ── Phase 1: Revenue Signals ──────────────────────────────────────────────────

class RevenueSignalResponse(BaseModel):
    id: str
    customer_id: str | None
    customer_name: str | None
    signal_type: str
    estimated_amount: float | None
    description: str | None
    is_resolved: bool
    created_at: str


@router.get("/revenue-signals", response_model=list[RevenueSignalResponse])
@limiter.limit(API_LIMIT)
async def get_revenue_signals(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
    customer_id: uuid.UUID | None = Query(None),
) -> list[RevenueSignalResponse]:
    """All unresolved revenue leaks — optionally filtered by customer_id."""
    business = await _get_business(current_user, db)

    filters = [
        RevenueSignal.business_id == business.id,
        RevenueSignal.is_resolved == False,  # noqa: E712
    ]
    if customer_id:
        filters.append(RevenueSignal.customer_id == customer_id)

    result = await db.execute(
        select(RevenueSignal, Customer)
        .outerjoin(Customer, RevenueSignal.customer_id == Customer.id)
        .where(*filters)
        .order_by(RevenueSignal.estimated_amount.desc().nullslast())
    )
    rows = result.all()

    return [
        RevenueSignalResponse(
            id=str(s.id),
            customer_id=str(s.customer_id) if s.customer_id else None,
            customer_name=c.name if c else None,
            signal_type=s.signal_type,
            estimated_amount=float(s.estimated_amount) if s.estimated_amount else None,
            description=s.description,
            is_resolved=s.is_resolved,
            created_at=str(s.created_at.date()),
        )
        for s, c in rows
    ]


@router.patch("/revenue-signals/{signal_id}/resolve")
@limiter.limit(API_LIMIT)
async def resolve_revenue_signal(
    request: Request,
    signal_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(RevenueSignal).where(
            RevenueSignal.id == signal_id,
            RevenueSignal.business_id == business.id,
        )
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")

    s.is_resolved = True
    await db.commit()
    return {"resolved": True}


# ── Phase 1: Competitor Mentions ──────────────────────────────────────────────

class CompetitorSummary(BaseModel):
    competitor_name: str
    mention_count: int
    last_mentioned: str
    sentiments: list[str]
    customers_mentioning: list[str]


@router.get("/competitors", response_model=list[CompetitorSummary])
@limiter.limit(API_LIMIT)
async def get_competitor_intelligence(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[CompetitorSummary]:
    """Aggregated competitor intelligence — who is being mentioned and by whom."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(CompetitorMention, Customer)
        .outerjoin(Customer, CompetitorMention.customer_id == Customer.id)
        .where(CompetitorMention.business_id == business.id)
        .order_by(CompetitorMention.mentioned_at.desc())
    )
    rows = result.all()

    # Aggregate by competitor name
    aggregated: dict[str, dict] = {}
    for mention, customer in rows:
        name = mention.competitor_name
        if name not in aggregated:
            aggregated[name] = {
                "competitor_name": name,
                "mention_count": 0,
                "last_mentioned": str(mention.mentioned_at.date()),
                "sentiments": [],
                "customers_mentioning": [],
            }
        aggregated[name]["mention_count"] += 1
        if mention.sentiment and mention.sentiment not in aggregated[name]["sentiments"]:
            aggregated[name]["sentiments"].append(mention.sentiment)
        if customer and customer.name and customer.name not in aggregated[name]["customers_mentioning"]:
            aggregated[name]["customers_mentioning"].append(customer.name)

    return [CompetitorSummary(**v) for v in sorted(aggregated.values(), key=lambda x: x["mention_count"], reverse=True)]


# ── Phase 1: Growth Blockers ──────────────────────────────────────────────────

class GrowthBlockerResponse(BaseModel):
    id: str
    report_date: str
    blockers: list[dict]
    total_revenue_leakage_estimate: float | None
    top_blocker: str | None
    is_read: bool


@router.get("/growth-blockers", response_model=GrowthBlockerResponse | None)
@limiter.limit(API_LIMIT)
async def get_growth_blockers(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> GrowthBlockerResponse | None:
    """Latest growth blocker report. Available after 90 days of data."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(GrowthReport)
        .where(GrowthReport.business_id == business.id)
        .order_by(GrowthReport.report_date.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()
    if not report:
        return None

    return GrowthBlockerResponse(
        id=str(report.id),
        report_date=str(report.report_date),
        blockers=report.blockers,
        total_revenue_leakage_estimate=float(report.total_revenue_leakage_estimate) if report.total_revenue_leakage_estimate else None,
        top_blocker=report.top_blocker,
        is_read=report.is_read,
    )


# ── Phase 1: Context Brief (on-demand) ───────────────────────────────────────

@router.get("/customers/{customer_id}/brief")
@limiter.limit(API_LIMIT)
async def get_customer_context_brief(
    request: Request,
    customer_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Pre-call context brief for a specific customer.
    Generated on-demand — owner reads this before calling or messaging.
    """
    business = await _get_business(current_user, db)

    from services.workers.intelligence_worker import generate_context_brief
    brief = await generate_context_brief(customer_id, business.id, business.business_type, db)

    if not brief:
        raise HTTPException(status_code=404, detail="Could not generate brief — insufficient conversation data")

    return brief


# ── Conversation Coach ────────────────────────────────────────────────────────

class CoachOption(BaseModel):
    rank: int
    message: str
    tone: str           # formal, casual, empathetic, direct
    rationale: str      # why this works for THIS customer
    best_channel: str


class ConversationCoachResponse(BaseModel):
    customer_id: str
    customer_name: str | None
    options: list[CoachOption]
    context_summary: str    # One line: why now, what history matters
    urgency: str            # now | this_week | no_rush


@router.get("/customers/{customer_id}/coach", response_model=ConversationCoachResponse)
@limiter.limit(API_LIMIT)
async def get_conversation_coach(
    request: Request,
    customer_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> ConversationCoachResponse:
    """
    'What should I say to this customer right now?'
    Returns 3 ranked message options based on this customer's actual history and personality.
    Not generic templates — specific to this relationship.
    """
    from shared.database.models.message import Message, MessageDirection
    from shared.claude.client import claude_client
    import json, re

    business = await _get_business(current_user, db)

    customer_result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.business_id == business.id)
    )
    customer = customer_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    intel_result = await db.execute(
        select(CustomerIntelligence).where(CustomerIntelligence.customer_id == customer_id)
    )
    intel = intel_result.scalar_one_or_none()

    msgs_result = await db.execute(
        select(Message)
        .where(Message.business_id == business.id, Message.customer_id == customer_id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    recent_msgs = list(reversed(msgs_result.scalars().all()))

    if not recent_msgs:
        raise HTTPException(status_code=400, detail="No conversation history — need messages to coach")

    conversation = "\n".join(
        f"[{'Customer' if m.direction == MessageDirection.inbound else 'You'}]: {(m.content or '')[:200]}"
        for m in recent_msgs
    )

    profile_summary = ""
    if intel and intel.profile:
        p = intel.profile
        comms = p.get("communication_style", {})
        profile_summary = (
            f"Communication style: {comms.get('preferred_style', 'unknown')}, "
            f"Formality: {comms.get('formality', 'unknown')}, "
            f"Language: {comms.get('language', 'unknown')}. "
            f"Trajectory: {getattr(intel, 'relationship_trajectory', 'unknown')}. "
            f"Churn risk: {round((getattr(intel, 'churn_probability', 0) or 0) * 100)}%."
        )

    prompt = f"""You are KROVA's conversation coach. Based on this customer's history and personality, suggest 3 message options the business owner could send right now.

Business type: {business.business_type}
Customer: {customer.name or "Unknown"}, Status: {customer.status}, Health: {customer.health_score}/100
{f"Customer profile: {profile_summary}" if profile_summary else ""}

Recent conversation:
{conversation}

Return JSON:
{{
  "context_summary": "one sentence: why this moment matters and what to know",
  "urgency": "now | this_week | no_rush",
  "options": [
    {{
      "rank": 1,
      "message": "exact message text to send",
      "tone": "formal | casual | empathetic | direct",
      "rationale": "why this works for THIS specific customer",
      "best_channel": "whatsapp | email | instagram"
    }}
  ]
}}

Respond only with valid JSON."""

    raw = await claude_client.complete(prompt, max_tokens=800)

    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(match.group()) if match else {}
    except Exception:
        data = {}

    options = [
        CoachOption(
            rank=o.get("rank", i + 1),
            message=o.get("message", ""),
            tone=o.get("tone", "direct"),
            rationale=o.get("rationale", ""),
            best_channel=o.get("best_channel", customer.primary_channel),
        )
        for i, o in enumerate(data.get("options", []))
    ]

    return ConversationCoachResponse(
        customer_id=str(customer_id),
        customer_name=customer.name,
        options=options[:3],
        context_summary=data.get("context_summary", ""),
        urgency=data.get("urgency", "this_week"),
    )


# ── Gratitude Engine ──────────────────────────────────────────────────────────

class GratitudeCandidate(BaseModel):
    customer_id: str
    customer_name: str | None
    gratitude_reason: str
    last_contact_at: str | None
    status: str
    health_score: int
    suggested_message: str
    channel: str


@router.get("/gratitude", response_model=list[GratitudeCandidate])
@limiter.limit(API_LIMIT)
async def get_gratitude_candidates(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[GratitudeCandidate]:
    """
    Identify customers who deserve genuine appreciation but haven't received it.
    Converted clients who've been with you a while, referred others, or been exceptionally patient.
    Not generic 'thank you for your business' — personal gratitude based on actual history.
    """
    from shared.database.models.message import Message, MessageDirection
    from datetime import datetime, timedelta, date

    business = await _get_business(current_user, db)
    now = datetime.now(timezone.utc)
    ninety_days_ago = (now - timedelta(days=90)).date()

    # Converted customers who haven't heard from you in 15–60 days (not too recent, not forgotten)
    result = await db.execute(
        select(Customer)
        .where(
            Customer.business_id == business.id,
            Customer.status.in_(["converted", "warm"]),
            Customer.health_score >= 50,
        )
        .order_by(Customer.health_score.desc())
        .limit(30)
    )
    customers = result.scalars().all()

    candidates = []
    for c in customers:
        # Check last outbound message to this customer
        last_outbound_result = await db.execute(
            select(Message)
            .where(
                Message.business_id == business.id,
                Message.customer_id == c.id,
                Message.direction == MessageDirection.outbound,
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_outbound = last_outbound_result.scalar_one_or_none()

        if last_outbound:
            days_since_outbound = (now.date() - last_outbound.created_at.date()).days
            # Only if we haven't reached out in 15–90 days
            if days_since_outbound < 15 or days_since_outbound > 90:
                continue
        else:
            days_since_outbound = 999

        # Count their inbound messages (relationship depth)
        msg_count_result = await db.execute(
            select(func.count(Message.id)).where(
                Message.business_id == business.id,
                Message.customer_id == c.id,
                Message.direction == MessageDirection.inbound,
            )
        )
        msg_count = msg_count_result.scalar() or 0

        # Build gratitude reason
        if c.status == "converted" and msg_count >= 10:
            reason = f"Loyal converted client with {msg_count} interactions — deserves genuine appreciation"
        elif c.status == "converted":
            reason = f"Converted client you haven't personally thanked in {days_since_outbound} days"
        else:
            reason = f"Strong warm lead — {msg_count} conversations, relationship maintained {days_since_outbound} days"

        # Simple suggested message (no Claude call to keep this fast)
        name = c.name or "there"
        suggested = (
            f"Hey {name}, just wanted to take a moment to genuinely thank you — "
            f"it means a lot to have clients like you. "
            f"Hope everything's going well on your end. Let me know if there's anything I can help with."
        )

        candidates.append(GratitudeCandidate(
            customer_id=str(c.id),
            customer_name=c.name,
            gratitude_reason=reason,
            last_contact_at=str(c.last_contact_at) if c.last_contact_at else None,
            status=c.status,
            health_score=c.health_score,
            suggested_message=suggested,
            channel=c.primary_channel,
        ))

        if len(candidates) >= 10:
            break

    return candidates


# ── Anti-Spam Guardian ────────────────────────────────────────────────────────

class AntiSpamAlert(BaseModel):
    customer_id: str
    customer_name: str | None
    outbound_count: int         # messages sent in last 14 days
    days_since_last_reply: int  # days without a customer reply
    status: str
    channel: str
    recommendation: str
    pause_days: int             # how many days to wait before messaging again


@router.get("/anti-spam", response_model=list[AntiSpamAlert])
@limiter.limit(API_LIMIT)
async def get_anti_spam_alerts(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[AntiSpamAlert]:
    """
    Detect customers you're over-messaging with no response.
    Tells the owner to STOP and wait — protects the relationship.
    '4 messages in 6 days, no reply. Pause for 12 days.'
    """
    from shared.database.models.message import Message, MessageDirection
    from datetime import datetime, timedelta

    business = await _get_business(current_user, db)
    now = datetime.now(timezone.utc)
    fourteen_days_ago = now - timedelta(days=14)

    # Customers with outbound messages in last 14 days
    outbound_result = await db.execute(
        select(Customer.id, Customer.name, Customer.status, Customer.primary_channel, func.count(Message.id))
        .join(Message, Message.customer_id == Customer.id)
        .where(
            Customer.business_id == business.id,
            Message.direction == MessageDirection.outbound,
            Message.created_at >= fourteen_days_ago,
        )
        .group_by(Customer.id, Customer.name, Customer.status, Customer.primary_channel)
        .having(func.count(Message.id) >= 3)
    )
    rows = outbound_result.all()

    alerts = []
    for customer_id, customer_name, cust_status, channel, outbound_count in rows:
        # Check if customer has replied since our first outbound in this window
        last_inbound_result = await db.execute(
            select(Message)
            .where(
                Message.business_id == business.id,
                Message.customer_id == customer_id,
                Message.direction == MessageDirection.inbound,
                Message.created_at >= fourteen_days_ago,
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_inbound = last_inbound_result.scalar_one_or_none()

        if last_inbound:
            days_since_reply = (now.date() - last_inbound.created_at.date()).days
        else:
            # No reply at all in 14 days
            days_since_reply = 14

        # Only flag if no reply in 5+ days
        if days_since_reply < 5:
            continue

        # Calculate pause recommendation
        if outbound_count >= 5 or days_since_reply >= 10:
            pause_days = 21
            rec = f"You've sent {outbound_count} messages in 14 days with no reply for {days_since_reply} days. Pause for {pause_days} days — KROVA will alert you when they show activity."
        else:
            pause_days = 12
            rec = f"{outbound_count} messages sent, no reply in {days_since_reply} days. Give them space — pause for {pause_days} days."

        alerts.append(AntiSpamAlert(
            customer_id=str(customer_id),
            customer_name=customer_name,
            outbound_count=outbound_count,
            days_since_last_reply=days_since_reply,
            status=cust_status,
            channel=channel,
            recommendation=rec,
            pause_days=pause_days,
        ))

    alerts.sort(key=lambda a: a.days_since_last_reply, reverse=True)
    return alerts[:15]


# ── Relationship Debt Tracker ─────────────────────────────────────────────────

class RelationshipDebtItem(BaseModel):
    customer_id: str
    customer_name: str | None
    days_since_contact: int
    debt_score: float           # 0–100: higher = more urgent to reach out
    relationship_type: str      # loyal_client, former_hot_lead, referral_source
    status: str
    channel: str
    suggested_action: str


@router.get("/relationship-debt", response_model=list[RelationshipDebtItem])
@limiter.limit(API_LIMIT)
async def get_relationship_debt(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[RelationshipDebtItem]:
    """
    Customers you've forgotten who deserve personal attention — not a template.
    Scores the 'debt' based on relationship value × days neglected.
    These are real humans who trusted you. Reach out.
    """
    from datetime import datetime, timedelta

    business = await _get_business(current_user, db)
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    result = await db.execute(
        select(Customer)
        .where(
            Customer.business_id == business.id,
            Customer.status.in_(["converted", "warm", "hot"]),
            Customer.last_contact_at != None,  # noqa: E711
        )
        .order_by(Customer.last_contact_at.asc().nullslast())
        .limit(50)
    )
    customers = result.scalars().all()

    items = []
    for c in customers:
        if not c.last_contact_at:
            continue

        try:
            if hasattr(c.last_contact_at, 'date'):
                last_contact_date = c.last_contact_at.date() if hasattr(c.last_contact_at, 'date') else c.last_contact_at
            else:
                from datetime import date as date_type
                last_contact_date = date_type.fromisoformat(str(c.last_contact_at)[:10])
            days_since = (now.date() - last_contact_date).days
        except Exception:
            continue

        if days_since < 30:
            continue

        # Determine relationship type
        if c.status == "converted":
            rel_type = "loyal_client"
            base_score = 80
        elif c.status == "hot":
            rel_type = "former_hot_lead"
            base_score = 70
        else:
            rel_type = "warm_prospect"
            base_score = 50

        # Debt score: base + recency penalty (capped at 100)
        debt_score = min(100.0, base_score + (days_since - 30) * 0.3)

        # Suggested action
        if rel_type == "loyal_client":
            action = f"Personal check-in with {c.name or 'this client'} — not a template, not a follow-up. Ask how they're doing. This is a relationship, not a transaction."
        elif rel_type == "former_hot_lead":
            action = f"Reach out to {c.name or 'this lead'} — they were hot {days_since} days ago. A simple 'how are things going?' is enough to reopen the conversation."
        else:
            action = f"Quick personal message to {c.name or 'this contact'} — {days_since} days of silence. Check in without selling anything."

        items.append(RelationshipDebtItem(
            customer_id=str(c.id),
            customer_name=c.name,
            days_since_contact=days_since,
            debt_score=round(debt_score, 1),
            relationship_type=rel_type,
            status=c.status,
            channel=c.primary_channel,
            suggested_action=action,
        ))

    items.sort(key=lambda x: x.debt_score, reverse=True)
    return items[:15]


# ── Voice of Customer ─────────────────────────────────────────────────────────

class VoiceTheme(BaseModel):
    theme: str
    frequency: int          # how many times this theme appeared
    sentiment: str          # positive | neutral | negative | mixed
    example_quote: str      # actual customer quote that best captures this theme
    action: str             # what this means for the business


class VoiceOfCustomerResponse(BaseModel):
    period_days: int
    total_messages_analyzed: int
    themes: list[VoiceTheme]
    top_request: str | None
    top_complaint: str | None
    top_praise: str | None
    overall_mood: str       # happy | neutral | frustrated | mixed
    generated_at: str


@router.get("/voice-of-customer", response_model=VoiceOfCustomerResponse)
@limiter.limit(API_LIMIT)
async def get_voice_of_customer(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> VoiceOfCustomerResponse:
    """
    Monthly aggregation of what customers are actually saying across all channels.
    Real themes from real conversations — not sentiment labels.
    'They keep asking about pricing transparency' is more useful than '40% negative sentiment.'
    """
    from shared.database.models.message import Message, MessageDirection
    from shared.claude.client import claude_client
    from datetime import datetime, timedelta
    import json, re

    business = await _get_business(current_user, db)
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    msgs_result = await db.execute(
        select(Message)
        .where(
            Message.business_id == business.id,
            Message.direction == MessageDirection.inbound,
            Message.created_at >= thirty_days_ago,
            Message.content != None,  # noqa: E711
        )
        .order_by(Message.created_at.desc())
        .limit(100)
    )
    msgs = msgs_result.scalars().all()

    if len(msgs) < 5:
        return VoiceOfCustomerResponse(
            period_days=30,
            total_messages_analyzed=len(msgs),
            themes=[],
            top_request=None,
            top_complaint=None,
            top_praise=None,
            overall_mood="neutral",
            generated_at=str(now.date()),
        )

    sample = "\n".join(f"- {(m.content or '')[:150]}" for m in msgs[:60])

    prompt = f"""You are analyzing customer messages for a {business.business_type} business in India.
Read these {len(msgs)} customer messages from the last 30 days and identify recurring themes.

Messages:
{sample}

Return JSON:
{{
  "themes": [
    {{
      "theme": "short theme name",
      "frequency": estimated count of how many messages relate to this,
      "sentiment": "positive | neutral | negative | mixed",
      "example_quote": "best representative quote from the messages",
      "action": "what the business owner should do about this"
    }}
  ],
  "top_request": "most common customer ask in one sentence",
  "top_complaint": "most common complaint in one sentence, or null",
  "top_praise": "most common positive feedback in one sentence, or null",
  "overall_mood": "happy | neutral | frustrated | mixed"
}}

Include 3–5 themes. Respond only with valid JSON."""

    raw = await claude_client.complete(prompt, max_tokens=700)

    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(match.group()) if match else {}
    except Exception:
        data = {}

    themes = [
        VoiceTheme(
            theme=t.get("theme", ""),
            frequency=t.get("frequency", 1),
            sentiment=t.get("sentiment", "neutral"),
            example_quote=t.get("example_quote", ""),
            action=t.get("action", ""),
        )
        for t in data.get("themes", [])
    ]

    return VoiceOfCustomerResponse(
        period_days=30,
        total_messages_analyzed=len(msgs),
        themes=themes,
        top_request=data.get("top_request"),
        top_complaint=data.get("top_complaint"),
        top_praise=data.get("top_praise"),
        overall_mood=data.get("overall_mood", "neutral"),
        generated_at=str(now.date()),
    )


# ── Cluster Intelligence ──────────────────────────────────────────────────────

class CustomerCluster(BaseModel):
    cluster_name: str
    description: str
    customer_count: int
    percentage: float
    avg_health_score: float
    conversion_rate: float
    characteristics: list[str]
    primary_channel: str
    energy_level: str       # high | medium | low (effort this cluster requires)
    revenue_potential: str  # high | medium | low
    strategy: str           # what to do with this cluster


class ClusterIntelligenceResponse(BaseModel):
    clusters: list[CustomerCluster]
    most_valuable_cluster: str
    highest_effort_cluster: str
    total_customers_analyzed: int
    insight: str
    generated_at: str


@router.get("/clusters", response_model=ClusterIntelligenceResponse)
@limiter.limit(API_LIMIT)
async def get_cluster_intelligence(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> ClusterIntelligenceResponse:
    """
    Auto-discover customer types from actual conversation patterns.
    'You're spending 60% energy on customers who convert 4% of the time.'
    No manual tagging — KROVA finds the patterns automatically.
    """
    from shared.database.models.message import Message, MessageDirection
    from shared.claude.client import claude_client
    from datetime import datetime
    import json, re

    business = await _get_business(current_user, db)

    customers_result = await db.execute(
        select(Customer)
        .where(Customer.business_id == business.id)
        .order_by(Customer.created_at.desc())
        .limit(100)
    )
    customers = customers_result.scalars().all()

    if len(customers) < 5:
        return ClusterIntelligenceResponse(
            clusters=[],
            most_valuable_cluster="",
            highest_effort_cluster="",
            total_customers_analyzed=len(customers),
            insight="Need more customer data to find patterns. Keep using KROVA.",
            generated_at=str(datetime.now(timezone.utc).date()),
        )

    # Build customer summaries for Claude
    summaries = []
    for c in customers[:50]:
        msg_count_r = await db.execute(
            select(func.count(Message.id)).where(
                Message.business_id == business.id,
                Message.customer_id == c.id,
            )
        )
        msg_count = msg_count_r.scalar() or 0

        summaries.append(
            f"Customer: {c.name or 'Unknown'}, Channel: {c.primary_channel}, "
            f"Status: {c.status}, Health: {c.health_score}/100, Messages: {msg_count}"
        )

    status_counts = {}
    for c in customers:
        status_counts[c.status] = status_counts.get(c.status, 0) + 1

    prompt = f"""You are analyzing customer data for a {business.business_type} business.
Group these {len(customers)} customers into 3–4 meaningful clusters based on their patterns.

Customer data:
{chr(10).join(summaries[:40])}

Status breakdown: {status_counts}

Return JSON:
{{
  "clusters": [
    {{
      "cluster_name": "descriptive name like 'Quick Deciders' or 'Price Researchers'",
      "description": "who these customers are in one sentence",
      "customer_count": estimated number,
      "percentage": percentage of total,
      "avg_health_score": estimated average,
      "conversion_rate": 0.0 to 1.0,
      "characteristics": ["list", "of", "2-4", "traits"],
      "primary_channel": "whatsapp | email | instagram",
      "energy_level": "high | medium | low",
      "revenue_potential": "high | medium | low",
      "strategy": "what to do with this cluster specifically"
    }}
  ],
  "most_valuable_cluster": "cluster name",
  "highest_effort_cluster": "cluster name",
  "insight": "one key business insight from this clustering"
}}

Respond only with valid JSON."""

    raw = await claude_client.complete(prompt, max_tokens=900)

    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(match.group()) if match else {}
    except Exception:
        data = {}

    clusters = [
        CustomerCluster(
            cluster_name=cl.get("cluster_name", ""),
            description=cl.get("description", ""),
            customer_count=cl.get("customer_count", 0),
            percentage=cl.get("percentage", 0.0),
            avg_health_score=cl.get("avg_health_score", 50.0),
            conversion_rate=cl.get("conversion_rate", 0.0),
            characteristics=cl.get("characteristics", []),
            primary_channel=cl.get("primary_channel", "whatsapp"),
            energy_level=cl.get("energy_level", "medium"),
            revenue_potential=cl.get("revenue_potential", "medium"),
            strategy=cl.get("strategy", ""),
        )
        for cl in data.get("clusters", [])
    ]

    return ClusterIntelligenceResponse(
        clusters=clusters,
        most_valuable_cluster=data.get("most_valuable_cluster", ""),
        highest_effort_cluster=data.get("highest_effort_cluster", ""),
        total_customers_analyzed=len(customers),
        insight=data.get("insight", ""),
        generated_at=str(datetime.now(timezone.utc).date()),
    )


# ── KROVA Coach ───────────────────────────────────────────────────────────────

class BehaviorPattern(BaseModel):
    pattern: str
    impact: str
    data_point: str     # The actual number behind this
    recommendation: str


class KROVACoachResponse(BaseModel):
    has_enough_data: bool
    days_of_data: int
    avg_response_time_hours: float
    best_response_day: str | None      # day of week when owner responds fastest
    worst_response_day: str | None
    follow_up_consistency: float       # 0–1: how consistently owner follows up
    conversion_rate: float
    patterns: list[BehaviorPattern]
    top_habit_to_change: str | None
    estimated_uplift: str | None       # e.g. "~30% more conversions"
    generated_at: str


@router.get("/coach", response_model=KROVACoachResponse)
@limiter.limit(API_LIMIT)
async def get_krova_coach(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> KROVACoachResponse:
    """
    KROVA Coach — tracks the owner's own behaviour patterns.
    'You consistently lose leads on days 3-4. Leads that convert get follow-up within 24h.'
    Needs 90+ days of data to be meaningful. No consultant has this data. KROVA does.
    """
    from shared.database.models.message import Message, MessageDirection
    from shared.database.models.action import Action, ActionStatus
    from datetime import datetime, timedelta

    business = await _get_business(current_user, db)
    now = datetime.now(timezone.utc)

    # Check data age
    first_msg_result = await db.execute(
        select(Message)
        .where(Message.business_id == business.id)
        .order_by(Message.created_at.asc())
        .limit(1)
    )
    first_msg = first_msg_result.scalar_one_or_none()

    days_of_data = 0
    if first_msg:
        days_of_data = (now.date() - first_msg.created_at.date()).days

    if days_of_data < 30:
        return KROVACoachResponse(
            has_enough_data=False,
            days_of_data=days_of_data,
            avg_response_time_hours=0.0,
            best_response_day=None,
            worst_response_day=None,
            follow_up_consistency=0.0,
            conversion_rate=0.0,
            patterns=[],
            top_habit_to_change=None,
            estimated_uplift=None,
            generated_at=str(now.date()),
        )

    # Avg response time: time between inbound message and next outbound per customer
    ninety_days_ago = now - timedelta(days=min(90, days_of_data))

    inbound_result = await db.execute(
        select(Message)
        .where(
            Message.business_id == business.id,
            Message.direction == MessageDirection.inbound,
            Message.created_at >= ninety_days_ago,
        )
        .order_by(Message.created_at.asc())
        .limit(200)
    )
    inbound_msgs = inbound_result.scalars().all()

    response_times_hours = []
    day_response_times: dict[int, list[float]] = {i: [] for i in range(7)}

    for msg in inbound_msgs:
        next_outbound_result = await db.execute(
            select(Message)
            .where(
                Message.business_id == business.id,
                Message.customer_id == msg.customer_id,
                Message.direction == MessageDirection.outbound,
                Message.created_at > msg.created_at,
            )
            .order_by(Message.created_at.asc())
            .limit(1)
        )
        next_out = next_outbound_result.scalar_one_or_none()
        if next_out:
            diff_h = (next_out.created_at - msg.created_at).total_seconds() / 3600
            if 0 < diff_h < 168:  # within a week
                response_times_hours.append(diff_h)
                day_response_times[msg.created_at.weekday()].append(diff_h)

    avg_response = round(sum(response_times_hours) / len(response_times_hours), 1) if response_times_hours else 0.0

    # Best/worst response day
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_avgs = {
        d: sum(times) / len(times)
        for d, times in day_response_times.items()
        if times
    }
    best_day = day_names[min(day_avgs, key=day_avgs.get)] if day_avgs else None
    worst_day = day_names[max(day_avgs, key=day_avgs.get)] if day_avgs else None

    # Conversion rate
    total_customers = await db.execute(
        select(func.count(Customer.id)).where(Customer.business_id == business.id)
    )
    total = total_customers.scalar() or 1
    converted = await db.execute(
        select(func.count(Customer.id)).where(
            Customer.business_id == business.id,
            Customer.status == "converted",
        )
    )
    conv_count = converted.scalar() or 0
    conversion_rate = round(conv_count / total, 3)

    # Follow-up consistency: % of hot leads that received a follow-up within 48h
    hot_customers_result = await db.execute(
        select(Customer).where(
            Customer.business_id == business.id,
            Customer.status.in_(["hot", "converted"]),
        ).limit(50)
    )
    hot_customers = hot_customers_result.scalars().all()

    followed_up = 0
    for hc in hot_customers:
        last_inbound_r = await db.execute(
            select(Message)
            .where(
                Message.business_id == business.id,
                Message.customer_id == hc.id,
                Message.direction == MessageDirection.inbound,
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_in = last_inbound_r.scalar_one_or_none()
        if last_in:
            next_out_r = await db.execute(
                select(Message)
                .where(
                    Message.business_id == business.id,
                    Message.customer_id == hc.id,
                    Message.direction == MessageDirection.outbound,
                    Message.created_at > last_in.created_at,
                )
                .order_by(Message.created_at.asc())
                .limit(1)
            )
            next_out = next_out_r.scalar_one_or_none()
            if next_out:
                diff_h = (next_out.created_at - last_in.created_at).total_seconds() / 3600
                if diff_h <= 48:
                    followed_up += 1
    follow_up_consistency = round(followed_up / len(hot_customers), 2) if hot_customers else 0.0

    # Build behaviour patterns
    patterns = []

    if avg_response > 4:
        patterns.append(BehaviorPattern(
            pattern="Slow first response",
            impact="Leads that convert respond fastest in the first hour — yours average {:.1f}h".format(avg_response),
            data_point=f"Average first response: {avg_response}h",
            recommendation="Set a rule: reply to any new inbound within 2 hours. KROVA can auto-draft the reply for approval.",
        ))

    if follow_up_consistency < 0.6:
        patterns.append(BehaviorPattern(
            pattern="Inconsistent follow-up on hot leads",
            impact=f"Only {round(follow_up_consistency * 100)}% of hot leads get a reply within 48h",
            data_point=f"Follow-up rate: {round(follow_up_consistency * 100)}%",
            recommendation="Enable autopilot for hot lead follow-ups with approval — KROVA drafts, you approve in one tap.",
        ))

    if worst_day and day_avgs:
        worst_idx = day_names.index(worst_day)
        worst_avg = round(day_avgs.get(worst_idx, 0), 1)
        patterns.append(BehaviorPattern(
            pattern=f"Slowest on {worst_day}s",
            impact=f"Leads that message on {worst_day} wait {worst_avg}h for a response on average",
            data_point=f"{worst_day} avg response: {worst_avg}h",
            recommendation=f"On {worst_day}s, check messages at least once in the morning and once after lunch.",
        ))

    top_habit = patterns[0].pattern if patterns else None
    estimated_uplift = None
    if avg_response > 4 and conversion_rate > 0:
        estimated_uplift = f"~{round(min(50, (avg_response - 2) * 5))}% more conversions by replying within 2h"

    return KROVACoachResponse(
        has_enough_data=days_of_data >= 30,
        days_of_data=days_of_data,
        avg_response_time_hours=avg_response,
        best_response_day=best_day,
        worst_response_day=worst_day,
        follow_up_consistency=follow_up_consistency,
        conversion_rate=conversion_rate,
        patterns=patterns,
        top_habit_to_change=top_habit,
        estimated_uplift=estimated_uplift,
        generated_at=str(now.date()),
    )
