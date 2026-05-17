"""
KROVA — Action Worker
HIGH PRIORITY queue. Runs 24/7.
Owner taps HAAN (approve) in the mobile app → action job enqueued → this worker fires.
Within 5 seconds of the tap, the customer receives a WhatsApp message from the owner's number.

This is the "magic moment" of KROVA — the owner approves with one tap
and the customer gets a perfectly timed, personalised message.

Runs as: python -m services.workers.action_worker
"""

import asyncio
import signal
import sys
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.cache.redis_client import check_redis_connection
from shared.database.connection import AsyncSessionLocal, check_db_connection
from shared.database.models.action import Action, ActionStatus
from shared.database.models.business import Business
from shared.encryption.tokens import decrypt_token
from shared.integrations.instagram.client import instagram_client
from shared.integrations.whatsapp.client import whatsapp_client
from shared.queue.bullmq_client import Queues, dequeue_priority, retry_or_dead_letter
from shared.queue.job_types import ExecuteActionJob, JobType
from shared.utils.errors import IntegrationError
from shared.utils.logging import get_logger

logger = get_logger(__name__)
_shutdown = False


def _handle_signal(sig: int, frame: Any) -> None:
    global _shutdown
    logger.info("Action worker shutdown signal", extra={"signal": sig})
    _shutdown = True


async def execute_action(job: ExecuteActionJob, db: AsyncSession) -> None:
    """
    Send the approved message to the customer on the appropriate channel.
    Updates the Action row with sent status and external message ID.
    """
    # ── Fetch action row ──────────────────────────────────────────────────────
    action_result = await db.execute(
        select(Action).where(Action.id == job.action_id)
    )
    action = action_result.scalar_one_or_none()

    if action is None:
        logger.warning("Action not found", extra={"action_id": str(job.action_id)})
        return

    if action.status not in (ActionStatus.approved, ActionStatus.pending):
        logger.info(
            "Action already processed — skipped",
            extra={"action_id": str(job.action_id), "status": action.status},
        )
        return

    # Mark as sending immediately — prevents double-send on worker restart
    action.status = ActionStatus.sending
    await db.flush()

    # ── Fetch business channel credentials ───────────────────────────────────
    business_result = await db.execute(
        select(Business).where(Business.id == job.business_id)
    )
    business = business_result.scalar_one_or_none()
    if not business:
        raise ValueError(f"Business not found: {job.business_id}")

    external_message_id: str | None = None

    try:
        # ── Send on correct channel ───────────────────────────────────────────
        if job.channel == "whatsapp" and job.recipient_phone:
            wa_creds = business.extra_data.get("whatsapp_credentials", {})
            access_token = decrypt_token(wa_creds["access_token_encrypted"])
            phone_number_id = job.phone_number_id or wa_creds.get("phone_number_id", "")

            response = await whatsapp_client.send_text_message(
                phone_number_id=phone_number_id,
                to=job.recipient_phone,
                text=job.message_content,
                access_token=access_token,
            )
            external_message_id = (
                response.get("messages", [{}])[0].get("id")
            )

        elif job.channel == "instagram" and job.recipient_instagram_id:
            ig_creds = business.extra_data.get("instagram_credentials", {})
            access_token = decrypt_token(ig_creds["access_token_encrypted"])
            page_id = ig_creds.get("page_id", "")

            response = await instagram_client.send_dm_reply(
                page_id=page_id,
                recipient_instagram_id=job.recipient_instagram_id,
                text=job.message_content,
                access_token=access_token,
            )
            external_message_id = response.get("message_id")

        else:
            raise ValueError(f"Unsupported channel or missing recipient: {job.channel}")

        # ── Mark sent ─────────────────────────────────────────────────────────
        action.status = ActionStatus.sent
        action.external_message_id = external_message_id
        action.raw_response = {"external_message_id": external_message_id}
        await db.flush()

        logger.info(
            "Action executed",
            extra={
                "action_id": str(job.action_id),
                "business_id": str(job.business_id),
                "customer_id": str(job.customer_id),
                "channel": job.channel,
                "external_message_id": external_message_id,
            },
        )

    except IntegrationError as exc:
        action.status = ActionStatus.failed
        action.error_detail = str(exc)
        await db.flush()
        raise


# ── Worker Loop ───────────────────────────────────────────────────────────────

async def run_worker() -> None:
    logger.info("Action worker starting")

    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()
    if not db_ok or not redis_ok:
        logger.critical("Action worker startup failed")
        sys.exit(1)

    logger.info(
        "Action worker ready — polling HIGH PRIORITY queue",
        extra={"queue": Queues.ACTIONS},
    )

    while not _shutdown:
        # Poll ACTIONS first (high priority), then fall through to INGESTION if empty
        queue_name, job_data = await dequeue_priority(
            Queues.ACTIONS,
            timeout=5,
        )

        if job_data is None:
            continue

        if job_data.get("type") != JobType.execute_action:
            logger.warning("Unknown job in actions queue", extra={"type": job_data.get("type")})
            continue

        job = ExecuteActionJob(**job_data)

        async with AsyncSessionLocal() as db:
            try:
                await execute_action(job, db)
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.error(
                    "Action execution failed",
                    extra={
                        "action_id": str(job.action_id),
                        "error": str(exc),
                    },
                    exc_info=True,
                )
                await retry_or_dead_letter(Queues.ACTIONS, job_data, str(exc))

    logger.info("Action worker shut down cleanly")


if __name__ == "__main__":
    from shared.utils.sentry import init_sentry
    init_sentry("worker-actions")
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    asyncio.run(run_worker())
