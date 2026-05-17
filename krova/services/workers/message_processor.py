"""
KROVA — Message Processor Worker
Reads WhatsAppMessageJob from the ingestion queue and saves the message to the database.
This is the worker that turns a webhook event into a permanent database record.

Runs as a standalone process: python -m services.workers.message_processor
Never imported by other services — communicates only through the Redis queue.

For every message:
1. Find which business owns this phone_number_id
2. Find or create the customer (by sender phone)
3. Check for duplicate (message_id already in DB)
4. Save the message
5. Update customer's last_contact_at and status if needed
"""

import asyncio
import signal
import sys
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.cache.redis_client import check_redis_connection
from shared.database.connection import AsyncSessionLocal, check_db_connection
from shared.database.models.business import Business
from shared.database.models.customer import Channel, Customer, CustomerStatus
from shared.database.models.message import Message, MessageChannel, MessageDirection, MessageType
from shared.queue.bullmq_client import Queues, dequeue, retry_or_dead_letter
from shared.queue.job_types import InstagramMessageJob, JobType, WhatsAppMessageJob
from shared.utils.logging import get_logger

logger = get_logger(__name__)

# Graceful shutdown flag — set to True by SIGTERM/SIGINT
_shutdown = False


def _handle_signal(sig: int, frame: Any) -> None:
    global _shutdown
    logger.info("Shutdown signal received", extra={"signal": sig})
    _shutdown = True


async def process_whatsapp_message(
    job: WhatsAppMessageJob, db: AsyncSession
) -> None:
    """
    Core logic: save one WhatsApp message to the database.
    Idempotent — safe to call twice for the same message_id.
    """
    # ── Step 1: Find business by phone_number_id ──────────────────────────────
    # The phone_number_id from Meta identifies which business's WhatsApp line
    # this message arrived on. We store phone_number_id in the business's
    # channel credentials. For now we look it up from business metadata.
    # TODO: when channel credentials model is added, query that table instead.
    result = await db.execute(
        select(Business).where(
            Business.is_active == True,  # noqa: E712
            Business.extra_data["whatsapp_phone_number_id"].astext == job.phone_number_id,
        )
    )
    business = result.scalar_one_or_none()

    if business is None:
        logger.warning(
            "No business found for phone_number_id — message dropped",
            extra={"phone_number_id": job.phone_number_id, "sender": job.sender_phone},
        )
        return  # Not retryable — no business owns this number

    business_id = business.id

    # ── Step 2: Duplicate check ───────────────────────────────────────────────
    existing_msg = await db.execute(
        select(Message.id).where(Message.external_id == job.message_id)
    )
    if existing_msg.scalar_one_or_none():
        logger.info(
            "Duplicate message skipped",
            extra={"message_id": job.message_id, "business_id": str(business_id)},
        )
        return

    # ── Step 3: Find or create customer ──────────────────────────────────────
    customer_result = await db.execute(
        select(Customer).where(
            Customer.business_id == business_id,
            Customer.phone == job.sender_phone,
        )
    )
    customer = customer_result.scalar_one_or_none()

    if customer is None:
        customer = Customer(
            business_id=business_id,
            phone=job.sender_phone,
            name=job.sender_name,
            primary_channel=Channel.whatsapp,
            status=CustomerStatus.new,
            health_score=50,
            metadata={},
        )
        db.add(customer)
        await db.flush()  # Get customer.id before we reference it in Message
        logger.info(
            "New customer created",
            extra={
                "customer_id": str(customer.id),
                "business_id": str(business_id),
                "phone": job.sender_phone,
            },
        )
    else:
        # Update name if we now have it (Meta sometimes sends name on first message only)
        if job.sender_name and not customer.name:
            customer.name = job.sender_name

    # Update last contact timestamp
    customer.last_contact_at = datetime.fromtimestamp(
        int(job.timestamp), tz=timezone.utc
    ).isoformat()

    # ── Step 4: Save message ──────────────────────────────────────────────────
    msg_type_map = {
        "text": MessageType.text,
        "image": MessageType.image,
        "audio": MessageType.audio,
        "video": MessageType.video,
        "document": MessageType.document,
    }

    message = Message(
        business_id=business_id,
        customer_id=customer.id,
        channel=MessageChannel.whatsapp,
        message_type=msg_type_map.get(job.message_type, MessageType.text),
        direction=MessageDirection.inbound,
        content=job.content,
        external_id=job.message_id,
        sent_at=datetime.fromtimestamp(
            int(job.timestamp), tz=timezone.utc
        ).isoformat(),
        is_analysed=False,
        raw_payload=job.raw_payload,
    )
    db.add(message)
    await db.flush()

    logger.info(
        "Message saved",
        extra={
            "message_id": str(message.id),
            "business_id": str(business_id),
            "customer_id": str(customer.id),
            "channel": "whatsapp",
            "type": job.message_type,
        },
    )


async def process_instagram_message(
    job: InstagramMessageJob, db: AsyncSession
) -> None:
    """
    Save one Instagram DM or comment to the database.
    Looks up business by instagram_account_id stored in business metadata.
    """
    result = await db.execute(
        select(Business).where(
            Business.is_active == True,  # noqa: E712
            Business.extra_data["instagram_account_id"].astext == job.instagram_account_id,
        )
    )
    business = result.scalar_one_or_none()

    if business is None:
        logger.warning(
            "No business found for Instagram account — message dropped",
            extra={"instagram_account_id": job.instagram_account_id},
        )
        return

    business_id = business.id

    # Duplicate check
    existing_msg = await db.execute(
        select(Message.id).where(Message.external_id == job.message_id)
    )
    if existing_msg.scalar_one_or_none():
        return

    # Find or create customer by Instagram ID
    customer_result = await db.execute(
        select(Customer).where(
            Customer.business_id == business_id,
            Customer.instagram_id == job.sender_instagram_id,
        )
    )
    customer = customer_result.scalar_one_or_none()

    if customer is None:
        customer = Customer(
            business_id=business_id,
            instagram_id=job.sender_instagram_id,
            name=job.sender_name,
            primary_channel=Channel.instagram,
            status=CustomerStatus.new,
            health_score=50,
            metadata={},
        )
        db.add(customer)
        await db.flush()
        logger.info(
            "New customer created from Instagram",
            extra={"customer_id": str(customer.id), "instagram_id": job.sender_instagram_id},
        )
    elif job.sender_name and not customer.name:
        customer.name = job.sender_name

    # Update last contact
    if job.timestamp:
        try:
            customer.last_contact_at = datetime.fromtimestamp(
                int(job.timestamp), tz=timezone.utc
            ).isoformat()
        except (ValueError, OSError):
            pass

    msg_type = MessageType.dm if job.message_type == "dm" else MessageType.comment
    message = Message(
        business_id=business_id,
        customer_id=customer.id,
        channel=MessageChannel.instagram,
        message_type=msg_type,
        direction=MessageDirection.inbound,
        content=job.content,
        external_id=job.message_id,
        sent_at=customer.last_contact_at,
        is_analysed=False,
        raw_payload=job.raw_payload,
    )
    db.add(message)
    await db.flush()

    logger.info(
        "Instagram message saved",
        extra={
            "message_id": str(message.id),
            "business_id": str(business_id),
            "customer_id": str(customer.id),
            "type": job.message_type,
        },
    )


async def run_worker() -> None:
    """
    Main worker loop — polls the ingestion queue and processes jobs.
    Handles both WhatsApp and Instagram messages.
    Runs until a shutdown signal is received.
    """
    logger.info("Message processor worker starting")

    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()
    if not db_ok or not redis_ok:
        logger.critical("Worker startup failed — DB or Redis unavailable")
        sys.exit(1)

    logger.info("Message processor worker ready", extra={"queue": Queues.INGESTION})

    while not _shutdown:
        job_data = await dequeue(Queues.INGESTION, timeout=5)

        if job_data is None:
            continue

        job_type = job_data.get("type")

        async with AsyncSessionLocal() as db:
            try:
                if job_type == JobType.process_whatsapp_message:
                    job = WhatsAppMessageJob(**job_data)
                    await process_whatsapp_message(job, db)

                elif job_type == JobType.process_instagram_message:
                    job = InstagramMessageJob(**job_data)
                    await process_instagram_message(job, db)

                else:
                    logger.warning(
                        "Unknown job type in ingestion queue — dropped",
                        extra={"job_type": job_type},
                    )
                    continue

                await db.commit()

            except Exception as exc:
                await db.rollback()
                logger.error(
                    "Failed to process message",
                    extra={"job_type": job_type, "error": str(exc)},
                    exc_info=True,
                )
                await retry_or_dead_letter(Queues.INGESTION, job_data, str(exc))

    logger.info("Message processor worker shut down cleanly")


if __name__ == "__main__":
    from shared.utils.sentry import init_sentry
    init_sentry("worker-messages")
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    asyncio.run(run_worker())
