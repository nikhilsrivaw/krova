"""
KROVA — Insights Router
Serves pre-computed nightly analysis results to the mobile app and web dashboard.
All reads — no live AI calls. Claude already ran last night; we're just serving results.

Endpoints:
  GET /insights/summary    — morning briefing + customer status breakdown
  GET /insights/hot-leads  — customers Claude flagged as ready to convert
  GET /insights/at-risk    — customers needing urgent follow-up
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.cache.keys import CacheKeys
from shared.cache.redis_client import get_cached, set_cached
from shared.database.models.action import Action, ActionStatus
from shared.database.models.analysis import AnalysisResult
from shared.database.models.business import Business
from shared.database.models.customer import Customer
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/insights", tags=["insights"])

# Cache TTL for analysis results — refreshed after each nightly run
_ANALYSIS_TTL = 43_200  # 12 hours


# ── Schemas ───────────────────────────────────────────────────────────────────

class CustomerStatusBreakdown(BaseModel):
    hot: int
    warm: int
    cold: int
    converted: int
    lost: int
    new: int
    total: int


class InsightsSummary(BaseModel):
    morning_briefing: str | None
    analysis_date: str | None
    customer_counts: CustomerStatusBreakdown
    pending_actions: int


class HotLeadResponse(BaseModel):
    customer_id: str
    name: str | None
    phone: str | None
    email: str | None
    channel: str
    health_score: int
    urgency: str | None
    reasoning: str | None
    suggested_action: str | None
    suggested_message: str | None
    last_contact: str | None
    analysis_date: str | None


class AtRiskResponse(BaseModel):
    customer_id: str
    name: str | None
    phone: str | None
    email: str | None
    channel: str
    health_score: int
    status: str
    urgency: str | None
    reasoning: str | None
    suggested_action: str | None
    suggested_message: str | None
    last_contact: str | None


class HotLeadsListResponse(BaseModel):
    leads: list[HotLeadResponse]
    count: int


class AtRiskListResponse(BaseModel):
    customers: list[AtRiskResponse]
    count: int


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

@router.get("/summary", response_model=InsightsSummary)
@limiter.limit(API_LIMIT)
async def get_insights_summary(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> InsightsSummary:
    """
    Returns the morning briefing text and customer status breakdown.
    This is the first screen the owner sees when they open the app each morning.
    Cached for 12 hours — updated after nightly analysis completes.
    """
    business_id = await _get_business_id(current_user, db)

    cache_key = CacheKeys.latest_analysis(business_id)
    cached = await get_cached(cache_key)
    if cached and isinstance(cached, dict) and "summary" in cached:
        return InsightsSummary(**cached["summary"])

    # Latest business-level summary row (customer_id IS NULL)
    analysis_result = await db.execute(
        select(AnalysisResult)
        .where(
            AnalysisResult.business_id == business_id,
            AnalysisResult.customer_id == None,  # noqa: E711
        )
        .order_by(AnalysisResult.analysis_date.desc())
        .limit(1)
    )
    latest = analysis_result.scalar_one_or_none()

    # Customer status counts
    counts_result = await db.execute(
        select(Customer.status, func.count(Customer.id))
        .where(Customer.business_id == business_id)
        .group_by(Customer.status)
    )
    status_counts: dict[str, int] = {}
    total = 0
    for row_status, cnt in counts_result.all():
        status_counts[row_status] = cnt
        total += cnt

    breakdown = CustomerStatusBreakdown(
        hot=status_counts.get("hot", 0),
        warm=status_counts.get("warm", 0),
        cold=status_counts.get("cold", 0),
        converted=status_counts.get("converted", 0),
        lost=status_counts.get("lost", 0),
        new=status_counts.get("new", 0),
        total=total,
    )

    # Pending actions count
    pending_count_result = await db.execute(
        select(func.count(Action.id)).where(
            Action.business_id == business_id,
            Action.status == ActionStatus.pending,
        )
    )
    pending_count = pending_count_result.scalar() or 0

    summary = InsightsSummary(
        morning_briefing=latest.morning_briefing if latest else None,
        analysis_date=str(latest.analysis_date) if latest else None,
        customer_counts=breakdown,
        pending_actions=pending_count,
    )

    # Cache alongside hot leads / at-risk under the same key
    cached_payload = cached or {}
    cached_payload["summary"] = summary.model_dump(mode="json")
    await set_cached(cache_key, cached_payload, ttl_seconds=_ANALYSIS_TTL)

    return summary


@router.get("/hot-leads", response_model=HotLeadsListResponse)
@limiter.limit(API_LIMIT)
async def get_hot_leads(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> HotLeadsListResponse:
    """
    Returns customers Claude classified as hot from the latest nightly analysis.
    Ordered by urgency — highest urgency first.
    The mobile app shows these in the "Hot Leads" card at the top of the home screen.
    """
    business_id = await _get_business_id(current_user, db)

    cache_key = CacheKeys.latest_analysis(business_id)
    cached = await get_cached(cache_key)
    if cached and isinstance(cached, dict) and "hot_leads" in cached:
        data = cached["hot_leads"]
        return HotLeadsListResponse(leads=data["leads"], count=data["count"])

    # Subquery: latest analysis date per customer for this business
    # Join customers with their latest analysis result where status = hot
    result = await db.execute(
        select(Customer, AnalysisResult)
        .join(AnalysisResult, AnalysisResult.customer_id == Customer.id)
        .where(
            Customer.business_id == business_id,
            AnalysisResult.business_id == business_id,
            AnalysisResult.customer_status == "hot",
        )
        .order_by(
            AnalysisResult.analysis_date.desc(),
            AnalysisResult.urgency.asc(),  # high < low alphabetically — use health_score
            Customer.health_score.desc(),
        )
        .limit(20)
    )
    rows = result.all()

    leads = [
        HotLeadResponse(
            customer_id=str(customer.id),
            name=customer.name,
            phone=customer.phone,
            email=customer.email,
            channel=customer.primary_channel,
            health_score=customer.health_score,
            urgency=analysis.urgency,
            reasoning=analysis.reasoning,
            suggested_action=analysis.suggested_action,
            suggested_message=analysis.suggested_message,
            last_contact=customer.last_contact_at,
            analysis_date=str(analysis.analysis_date),
        )
        for customer, analysis in rows
    ]

    response = HotLeadsListResponse(leads=leads, count=len(leads))

    cached_payload = cached or {}
    cached_payload["hot_leads"] = response.model_dump(mode="json")
    await set_cached(cache_key, cached_payload, ttl_seconds=_ANALYSIS_TTL)

    return response


@router.get("/at-risk", response_model=AtRiskListResponse)
@limiter.limit(API_LIMIT)
async def get_at_risk_customers(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> AtRiskListResponse:
    """
    Returns customers Claude flagged as needing urgent attention.
    These are cold or warm customers with high urgency — about to go cold or be lost.
    The mobile app shows these in the "At Risk" section so the owner can intervene.
    """
    business_id = await _get_business_id(current_user, db)

    cache_key = CacheKeys.latest_analysis(business_id)
    cached = await get_cached(cache_key)
    if cached and isinstance(cached, dict) and "at_risk" in cached:
        data = cached["at_risk"]
        return AtRiskListResponse(customers=data["customers"], count=data["count"])

    result = await db.execute(
        select(Customer, AnalysisResult)
        .join(AnalysisResult, AnalysisResult.customer_id == Customer.id)
        .where(
            Customer.business_id == business_id,
            AnalysisResult.business_id == business_id,
            AnalysisResult.urgency == "high",
            AnalysisResult.customer_status.in_(["cold", "warm"]),
        )
        .order_by(
            AnalysisResult.analysis_date.desc(),
            Customer.health_score.asc(),  # lowest health first
        )
        .limit(20)
    )
    rows = result.all()

    customers = [
        AtRiskResponse(
            customer_id=str(customer.id),
            name=customer.name,
            phone=customer.phone,
            email=customer.email,
            channel=customer.primary_channel,
            health_score=customer.health_score,
            status=str(analysis.customer_status),
            urgency=analysis.urgency,
            reasoning=analysis.reasoning,
            suggested_action=analysis.suggested_action,
            suggested_message=analysis.suggested_message,
            last_contact=customer.last_contact_at,
        )
        for customer, analysis in rows
    ]

    response = AtRiskListResponse(customers=customers, count=len(customers))

    cached_payload = cached or {}
    cached_payload["at_risk"] = response.model_dump(mode="json")
    await set_cached(cache_key, cached_payload, ttl_seconds=_ANALYSIS_TTL)

    return response
