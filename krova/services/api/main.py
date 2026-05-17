"""
KROVA — FastAPI Application Entry Point
All middleware, routers, and startup/shutdown lifecycle hooks registered here.
This file should stay lean — configuration lives in middleware/, routers in routers/.
"""

import sentry_sdk
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from services.api.middleware.auth import CORS_CONFIG
from services.api.middleware.logging import RequestLoggingMiddleware
from services.api.middleware.rate_limit import limiter
from services.api.routers import (
    auth,
    businesses,
    customers,
    conversations,
    actions,
    analytics,
    insights,
    webhooks,
)
from services.api.routers import intelligence
from services.api.routers import platforms
from services.api.routers import team
from services.api.routers import export
from services.api.routers import channels
from shared.cache.redis_client import check_redis_connection
from shared.config.settings import settings
from shared.database.connection import check_db_connection
from shared.utils.errors import KrovaError
from shared.utils.logging import get_logger

logger = get_logger(__name__)


# ── Sentry ────────────────────────────────────────────────────────────────────
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=settings.app_version,
        # Don't send PII — no user IPs or email addresses in Sentry
        send_default_pii=False,
        # Sample 100% of errors, 10% of performance traces
        traces_sample_rate=0.1,
    )
    logger.info("Sentry initialized", extra={"environment": settings.environment})


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Startup: verify all external connections are healthy before accepting traffic.
    Shutdown: cleanly close connection pools.
    Railway will restart the container if startup fails — fast failure is correct.
    """
    logger.info(
        "KROVA API starting",
        extra={"version": settings.app_version, "environment": settings.environment},
    )

    # Verify critical connections before accepting any requests
    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()

    if not db_ok:
        logger.critical("Startup failed — database connection unavailable")
        raise RuntimeError("Cannot start: database connection failed")

    if not redis_ok:
        if settings.is_development:
            logger.warning("Redis unavailable — running without cache (dev mode)")
        else:
            logger.critical("Startup failed — Redis connection unavailable")
            raise RuntimeError("Cannot start: Redis connection failed")

    # ── APScheduler — nightly analysis trigger ────────────────────────────────
    scheduler = AsyncIOScheduler(timezone=ZoneInfo("Asia/Kolkata"))
    scheduler.add_job(
        _trigger_nightly_analysis,
        CronTrigger(hour=22, minute=0, timezone=ZoneInfo("Asia/Kolkata")),
        id="nightly_analysis",
        replace_existing=True,
        misfire_grace_time=3600,  # If server was down, still run if within 1 hour
    )
    scheduler.start()
    logger.info("APScheduler started — nightly analysis at 22:00 IST")

    logger.info("KROVA API ready")
    yield

    scheduler.shutdown(wait=False)
    logger.info("KROVA API shutting down")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="KROVA API",
    description="AI-powered autonomous business intelligence for Indian SMBs",
    version=settings.app_version,
    # Disable docs in production — no need to expose the schema publicly
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    openapi_url="/openapi.json" if settings.is_development else None,
    lifespan=lifespan,
)

# Attach rate limiter to app state (required by slowapi)
app.state.limiter = limiter


# ── Middleware (order matters — first added = outermost = runs last on request) ──
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(CORSMiddleware, **CORS_CONFIG)


# ── Exception Handlers ────────────────────────────────────────────────────────
@app.exception_handler(KrovaError)
async def krova_error_handler(request: Request, exc: KrovaError) -> JSONResponse:
    """
    Converts any KrovaError subclass into a consistent JSON response.
    The 'code' field is machine-readable — mobile app and dashboard can switch on it.
    """
    logger.warning(
        "Application error",
        extra={
            "code": exc.code,
            "message": exc.message,
            "path": request.url.path,
            **exc.context,
        },
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"error": {"code": "rate_limit_exceeded", "message": "Too many requests"}},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all — never let a raw 500 stack trace reach the client."""
    logger.error(
        "Unhandled exception",
        extra={"path": request.url.path, "error": str(exc)},
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "internal_error", "message": "An unexpected error occurred"}},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(businesses.router, prefix=API_PREFIX)
app.include_router(customers.router, prefix=API_PREFIX)
app.include_router(conversations.router, prefix=API_PREFIX)
app.include_router(actions.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(insights.router, prefix=API_PREFIX)
app.include_router(intelligence.router, prefix=API_PREFIX)
app.include_router(platforms.router, prefix=API_PREFIX)
app.include_router(team.router, prefix=API_PREFIX)
app.include_router(team.assign_router, prefix=API_PREFIX)
app.include_router(export.router, prefix=API_PREFIX)
app.include_router(channels.router, prefix=API_PREFIX)
# Webhooks: no API prefix — Meta configures the full path, keep it short
app.include_router(webhooks.router)


# ── Scheduler job ─────────────────────────────────────────────────────────────
async def _trigger_nightly_analysis() -> None:
    """Called by APScheduler at 22:00 IST every night."""
    from shared.database.connection import AsyncSessionLocal
    from shared.database.models.business import Business
    from shared.database.models.analysis import AnalysisResult, AnalysisStatus
    from shared.queue.bullmq_client import Queues, enqueue
    from shared.queue.job_types import BusinessAnalysisJob
    from sqlalchemy import select
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc).date().isoformat()
    logger.info("Nightly analysis triggered by scheduler", extra={"date": today})

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Business).where(Business.is_active == True)  # noqa: E712
        )
        businesses = result.scalars().all()
        queued = 0

        for business in businesses:
            existing = await db.execute(
                select(AnalysisResult).where(
                    AnalysisResult.business_id == business.id,
                    AnalysisResult.customer_id == None,  # noqa: E711
                    AnalysisResult.analysis_date == today,
                    AnalysisResult.status.in_([AnalysisStatus.completed, AnalysisStatus.processing]),
                )
            )
            if existing.scalar_one_or_none():
                continue

            summary_row = AnalysisResult(
                business_id=business.id,
                customer_id=None,
                analysis_date=today,
                status=AnalysisStatus.pending,
                raw_claude_output={},
            )
            db.add(summary_row)
            await enqueue(Queues.ANALYSIS, BusinessAnalysisJob(business_id=business.id, analysis_date=today))
            queued += 1

        await db.commit()

    logger.info("Nightly analysis jobs queued", extra={"count": queued})


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health() -> dict:
    """
    Railway hits this endpoint every 30 seconds.
    Returns 200 if both DB and Redis are reachable, 503 otherwise.
    Fast — uses cached connection pool pings, not new connections.
    """
    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()
    healthy = db_ok and redis_ok

    return JSONResponse(
        status_code=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "healthy" if healthy else "degraded",
            "version": settings.app_version,
            "environment": settings.environment,
            "checks": {"database": db_ok, "redis": redis_ok},
        },
    )
