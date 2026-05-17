"""
KROVA — Nightly Analysis Orchestrator
Triggered at 10 PM IST by APScheduler inside the API server.
Fetches all active businesses and enqueues one BusinessAnalysisJob per business.
The analysis_worker picks up each job, calls Claude Batch API, saves results.

This file runs inside the API process — it can import from shared/ normally.
All logic lives in shared/ — this is the entry-point trigger only.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from shared.database.connection import AsyncSessionLocal
from shared.database.models.analysis import AnalysisResult, AnalysisStatus
from shared.database.models.business import Business
from shared.queue.bullmq_client import Queues, enqueue
from shared.queue.job_types import BusinessAnalysisJob
from shared.utils.logging import get_logger

logger = get_logger(__name__)


async def trigger_nightly_analysis() -> int:
    """
    Entry point called by APScheduler at 10 PM IST.
    1. Fetch all active businesses
    2. Create pending AnalysisResult rows (enables resumability)
    3. Enqueue one BusinessAnalysisJob per business
    Returns the number of businesses queued.
    """
    today = datetime.now(timezone.utc).date().isoformat()
    logger.info("Nightly analysis triggered", extra={"date": today})

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Business).where(Business.is_active == True)  # noqa: E712
        )
        businesses = result.scalars().all()

        if not businesses:
            logger.warning("No active businesses found for nightly analysis")
            return 0

        queued = 0
        for business in businesses:
            # Idempotent — skip if already running or completed today
            existing = await db.execute(
                select(AnalysisResult).where(
                    AnalysisResult.business_id == business.id,
                    AnalysisResult.customer_id == None,  # noqa: E711
                    AnalysisResult.analysis_date == today,
                    AnalysisResult.status.in_([
                        AnalysisStatus.completed,
                        AnalysisStatus.processing,
                    ]),
                )
            )
            if existing.scalar_one_or_none():
                logger.info(
                    "Analysis already queued for today — skipped",
                    extra={"business_id": str(business.id)},
                )
                continue

            # Create pending summary row — marks this business as "in flight"
            summary_row = AnalysisResult(
                business_id=business.id,
                customer_id=None,
                analysis_date=today,
                status=AnalysisStatus.pending,
                raw_claude_output={},
            )
            db.add(summary_row)

            job = BusinessAnalysisJob(
                business_id=business.id,
                analysis_date=today,
            )
            await enqueue(Queues.ANALYSIS, job)
            queued += 1

        await db.commit()

    logger.info("Nightly jobs enqueued", extra={"count": queued, "date": today})
    return queued
