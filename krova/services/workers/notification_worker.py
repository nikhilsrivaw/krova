"""
KROVA — Notification Worker
Processes MorningBriefingJob from the notifications queue.
Sends the AI-generated morning briefing to the business owner's WhatsApp.

Flow per job:
1. Look up the business to get owner's WhatsApp number
2. Send the briefing text via WhatsApp Business API
3. Mark job complete

Runs as: python -m services.workers.notification_worker
"""

import asyncio
import signal
import sys
from typing import Any

from shared.cache.redis_client import check_redis_connection
from shared.database.connection import AsyncSessionLocal, check_db_connection
from shared.database.models.business import Business
from shared.integrations.whatsapp.client import WhatsAppClient
from shared.queue.bullmq_client import Queues, dequeue, retry_or_dead_letter
from shared.queue.job_types import JobType
from shared.utils.logging import get_logger

logger = get_logger(__name__)

_shutdown = False


def _handle_signal(sig: int, frame: Any) -> None:
    global _shutdown
    logger.info("Notification worker shutdown signal", extra={"signal": sig})
    _shutdown = True


async def process_briefing_job(job_data: dict[str, Any]) -> None:
    """
    Send the morning briefing message to the business owner's WhatsApp.
    The briefing text is pre-built by the analysis worker — we just deliver it.
    """
    from sqlalchemy import select

    business_id = job_data.get("business_id")
    briefing_text: str = job_data.get("briefing_text", "")
    owner_phone: str = job_data.get("owner_phone", "")

    if not business_id or not briefing_text or not owner_phone:
        logger.warning(
            "Briefing job missing required fields — dropped",
            extra={"business_id": business_id, "has_text": bool(briefing_text), "has_phone": bool(owner_phone)},
        )
        return

    # Verify business still exists and is active
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Business).where(
                Business.id == business_id,
                Business.is_active == True,  # noqa: E712
            )
        )
        business = result.scalar_one_or_none()

    if not business:
        logger.warning(
            "Business not found for briefing — dropped",
            extra={"business_id": business_id},
        )
        return

    # ── Try direct WhatsApp Cloud API first (if configured) ──────────────────
    from shared.config.settings import settings
    from sqlalchemy import select

    phone_number_id = business.extra_data.get("whatsapp_phone_number_id")

    if phone_number_id:
        wa = WhatsAppClient(
            access_token=settings.meta_app_secret,
            phone_number_id=phone_number_id,
        )
        try:
            await wa.send_text(to=owner_phone, text=briefing_text)
            logger.info("Morning briefing sent via WhatsApp Cloud API", extra={"business_id": str(business_id)})
            await wa.close()
            return
        except Exception as exc:
            logger.warning("WhatsApp Cloud API failed, trying BSP", extra={"error": str(exc)})
            await wa.close()

    # ── Fallback: send via connected BSP ─────────────────────────────────────
    from shared.database.models.platform import ConnectedPlatform, MessageTemplate
    from shared.utils.encryption import decrypt
    from services.workers.bsp_sender import send_whatsapp_message
    import difflib

    async with AsyncSessionLocal() as db:
        plat_result = await db.execute(
            select(ConnectedPlatform).where(
                ConnectedPlatform.business_id == business.id,
                ConnectedPlatform.is_active == True,  # noqa: E712
            ).limit(1)
        )
        platform = plat_result.scalar_one_or_none()

        if not platform:
            logger.warning("No BSP connected and no direct WhatsApp — briefing not sent", extra={"business_id": str(business_id)})
            return

        # Find best matching template for a briefing/utility message
        tmpl_result = await db.execute(
            select(MessageTemplate).where(
                MessageTemplate.platform_id == platform.id,
                MessageTemplate.is_active == True,  # noqa: E712
                MessageTemplate.status == "APPROVED",
                MessageTemplate.category.in_(["utility", "marketing"]),
            ).limit(20)
        )
        templates = tmpl_result.scalars().all()

    if not templates:
        logger.warning("No approved templates for briefing", extra={"business_id": str(business_id)})
        return

    # Pick template most similar to a briefing/summary message
    best = max(
        templates,
        key=lambda t: difflib.SequenceMatcher(None, "daily briefing summary update", t.body.lower()).ratio(),
    )

    try:
        api_key = decrypt(platform.api_key_encrypted)
        result = await send_whatsapp_message(
            platform=platform.platform,
            api_key=api_key,
            to_phone=owner_phone,
            template_name=best.template_name,
            variables=[briefing_text[:160]],   # BSP template body variable
            account_id=platform.account_id,
            source_phone=platform.source_phone,
            template_id=best.template_id,
        )
        if result.success:
            logger.info("Morning briefing sent via BSP", extra={"business_id": str(business_id), "platform": platform.platform})
        else:
            logger.error("BSP briefing send failed", extra={"business_id": str(business_id), "error": result.error})
    except Exception as exc:
        logger.error("BSP briefing exception", extra={"business_id": str(business_id), "error": str(exc)})
        raise


# ── Worker Loop ────────────────────────────────────────────────────────────────

async def run_worker() -> None:
    logger.info("Notification worker starting")

    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()
    if not db_ok or not redis_ok:
        logger.critical("Notification worker startup failed")
        sys.exit(1)

    logger.info("Notification worker ready", extra={"queue": Queues.NOTIFICATIONS})

    while not _shutdown:
        job_data = await dequeue(Queues.NOTIFICATIONS, timeout=5)
        if job_data is None:
            continue

        job_type = job_data.get("type")

        if job_type == JobType.send_morning_briefing:
            try:
                await process_briefing_job(job_data)
            except Exception as exc:
                logger.error(
                    "Briefing job failed",
                    extra={"error": str(exc)},
                    exc_info=True,
                )
                await retry_or_dead_letter(Queues.NOTIFICATIONS, job_data, str(exc))
        else:
            logger.warning("Unknown job type in notifications queue", extra={"type": job_type})

    logger.info("Notification worker shut down cleanly")


if __name__ == "__main__":
    from shared.utils.sentry import init_sentry
    init_sentry("worker-notifications")
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    asyncio.run(run_worker())
