"""
KROVA — Export Router
Generates a complete structured business report from all KROVA data.
Owner can share with accountant, investor, bank, or business partner.

Endpoints:
  GET /export/business-report  — full structured report as JSON
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.database.models.business import Business
from shared.database.models.commitment import Commitment
from shared.database.models.competitor import CompetitorMention
from shared.database.models.customer import Customer
from shared.database.models.dna import BusinessDNA
from shared.database.models.message import Message, MessageDirection
from shared.database.models.prediction import Prediction, PredictionStatus
from shared.database.models.revenue import RevenueEntry, RevenueStatus
from shared.database.models.revenue_signal import RevenueSignal
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/export", tags=["export"])


class BusinessReportResponse(BaseModel):
    report_date: str
    business_name: str | None
    business_type: str
    period_days: int

    # Customer health
    customer_summary: dict
    pipeline_breakdown: dict

    # Financial
    financial_summary: dict

    # Intelligence highlights
    active_predictions: int
    overdue_commitments: int
    unresolved_revenue_leaks: int
    competitor_mentions_30d: int

    # Activity
    messages_30d: int
    messages_90d: int

    # DNA snapshot
    dna_narrative: str | None
    analysis_runs: int

    # Raw data sections for detailed sharing
    top_predictions: list[dict]
    revenue_leaks_summary: list[dict]
    overdue_commitments_list: list[dict]

    generated_at: str


@router.get("/business-report", response_model=BusinessReportResponse)
@limiter.limit(API_LIMIT)
async def get_business_report(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> BusinessReportResponse:
    """
    Complete business intelligence export.
    Everything KROVA knows about your business in one structured document.
    Share with your accountant, investor, bank, or business partner.
    No consultant generates this automatically from unstructured data.
    """
    from services.api.dependencies.auth import require_business

    business_id = require_business(current_user)
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    ninety_days_ago = now - timedelta(days=90)
    today = now.date().isoformat()

    # Load business
    biz_result = await db.execute(
        select(Business).where(Business.id == business_id)
    )
    business = biz_result.scalar_one_or_none()

    # Customer summary
    status_result = await db.execute(
        select(Customer.status, func.count(Customer.id))
        .where(Customer.business_id == business_id)
        .group_by(Customer.status)
    )
    status_map = {s: c for s, c in status_result.all()}
    total_customers = sum(status_map.values())

    # Channel breakdown
    channel_result = await db.execute(
        select(Customer.primary_channel, func.count(Customer.id))
        .where(Customer.business_id == business_id)
        .group_by(Customer.primary_channel)
    )
    channel_map = {ch: c for ch, c in channel_result.all()}

    # Financial summary
    received_result = await db.execute(
        select(func.sum(RevenueEntry.amount)).where(
            RevenueEntry.business_id == business_id,
            RevenueEntry.status == RevenueStatus.received,
            RevenueEntry.payment_date >= now.date().replace(day=1).isoformat(),
        )
    )
    received_this_month = float(received_result.scalar() or 0)

    overdue_result = await db.execute(
        select(func.sum(RevenueEntry.amount)).where(
            RevenueEntry.business_id == business_id,
            RevenueEntry.status == RevenueStatus.expected,
            RevenueEntry.due_date < today,
        )
    )
    total_overdue = float(overdue_result.scalar() or 0)

    leaks_result = await db.execute(
        select(func.sum(RevenueSignal.estimated_amount)).where(
            RevenueSignal.business_id == business_id,
            RevenueSignal.is_resolved == False,  # noqa: E712
        )
    )
    total_leakage = float(leaks_result.scalar() or 0)

    # Intelligence
    predictions_result = await db.execute(
        select(func.count(Prediction.id)).where(
            Prediction.business_id == business_id,
            Prediction.status == PredictionStatus.active,
        )
    )
    active_preds = predictions_result.scalar() or 0

    overdue_comms_result = await db.execute(
        select(func.count(Commitment.id)).where(
            Commitment.business_id == business_id,
            Commitment.is_fulfilled == False,  # noqa: E712
            Commitment.is_dismissed == False,  # noqa: E712
            Commitment.due_date < today,
        )
    )
    overdue_comms = overdue_comms_result.scalar() or 0

    unresolved_leaks_result = await db.execute(
        select(func.count(RevenueSignal.id)).where(
            RevenueSignal.business_id == business_id,
            RevenueSignal.is_resolved == False,  # noqa: E712
        )
    )
    unresolved_leaks = unresolved_leaks_result.scalar() or 0

    competitor_30d_result = await db.execute(
        select(func.count(CompetitorMention.id)).where(
            CompetitorMention.business_id == business_id,
            CompetitorMention.mentioned_at >= thirty_days_ago.isoformat()[:10],
        )
    )
    competitor_mentions = competitor_30d_result.scalar() or 0

    # Message volume
    msgs_30d_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.business_id == business_id,
            Message.direction == MessageDirection.inbound,
            Message.created_at >= thirty_days_ago,
        )
    )
    msgs_30d = msgs_30d_result.scalar() or 0

    msgs_90d_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.business_id == business_id,
            Message.direction == MessageDirection.inbound,
            Message.created_at >= ninety_days_ago,
        )
    )
    msgs_90d = msgs_90d_result.scalar() or 0

    # DNA
    dna_result = await db.execute(
        select(BusinessDNA).where(BusinessDNA.business_id == business_id)
    )
    dna = dna_result.scalar_one_or_none()

    # Top predictions (for sharing)
    top_preds_result = await db.execute(
        select(Prediction, Customer)
        .outerjoin(Customer, Prediction.customer_id == Customer.id)
        .where(
            Prediction.business_id == business_id,
            Prediction.status == PredictionStatus.active,
        )
        .order_by((Prediction.probability * Prediction.confidence).desc())
        .limit(5)
    )
    top_predictions = [
        {
            "type": p.prediction_type,
            "text": p.prediction_text,
            "customer": c.name if c else None,
            "probability": round(p.probability * 100),
            "action": p.recommended_action,
        }
        for p, c in top_preds_result.all()
    ]

    # Revenue leaks summary
    leaks_detail_result = await db.execute(
        select(RevenueSignal, Customer)
        .outerjoin(Customer, RevenueSignal.customer_id == Customer.id)
        .where(
            RevenueSignal.business_id == business_id,
            RevenueSignal.is_resolved == False,  # noqa: E712
        )
        .order_by(RevenueSignal.estimated_amount.desc().nullslast())
        .limit(10)
    )
    revenue_leaks_summary = [
        {
            "type": s.signal_type,
            "customer": c.name if c else "Unknown",
            "amount": float(s.estimated_amount) if s.estimated_amount else None,
            "description": s.description,
        }
        for s, c in leaks_detail_result.all()
    ]

    # Overdue commitments list
    overdue_comms_detail_result = await db.execute(
        select(Commitment, Customer)
        .outerjoin(Customer, Commitment.customer_id == Customer.id)
        .where(
            Commitment.business_id == business_id,
            Commitment.is_fulfilled == False,  # noqa: E712
            Commitment.is_dismissed == False,  # noqa: E712
            Commitment.due_date < today,
        )
        .order_by(Commitment.due_date.asc())
        .limit(10)
    )
    overdue_commitments_list = [
        {
            "commitment": c.commitment_text,
            "customer": cust.name if cust else None,
            "due_date": str(c.due_date) if c.due_date else None,
            "channel": c.source_channel,
        }
        for c, cust in overdue_comms_detail_result.all()
    ]

    return BusinessReportResponse(
        report_date=today,
        business_name=business.name if business else None,
        business_type=business.business_type if business else "unknown",
        period_days=90,
        customer_summary={
            "total": total_customers,
            "by_status": status_map,
            "by_channel": channel_map,
        },
        pipeline_breakdown={
            "hot": status_map.get("hot", 0),
            "warm": status_map.get("warm", 0),
            "cold": status_map.get("cold", 0),
            "converted": status_map.get("converted", 0),
            "lost": status_map.get("lost", 0),
        },
        financial_summary={
            "received_this_month": received_this_month,
            "total_overdue": total_overdue,
            "estimated_revenue_leakage": total_leakage,
        },
        active_predictions=active_preds,
        overdue_commitments=overdue_comms,
        unresolved_revenue_leaks=unresolved_leaks,
        competitor_mentions_30d=competitor_mentions,
        messages_30d=msgs_30d,
        messages_90d=msgs_90d,
        dna_narrative=dna.narrative if dna else None,
        analysis_runs=dna.analysis_count if dna else 0,
        top_predictions=top_predictions,
        revenue_leaks_summary=revenue_leaks_summary,
        overdue_commitments_list=overdue_commitments_list,
        generated_at=now.isoformat(),
    )
