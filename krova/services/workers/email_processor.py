"""
KROVA — Email Processor Worker
Processes jobs from the krova:queue:email queue.
For each Gmail/Outlook notification:
  1. Look up the business by email address
  2. Refresh OAuth access token
  3. Fetch the actual email content via Gmail/Outlook API
  4. Classify: business enquiry vs spam (Claude Haiku — stubbed until Week 5)
  5. If business: find/create customer, save as Message
  6. If spam/newsletter: discard silently

Runs as: python -m services.workers.email_processor
"""

import asyncio
import signal
import sys
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.cache.redis_client import check_redis_connection
from shared.claude.client import claude_client
from shared.database.connection import AsyncSessionLocal, check_db_connection
from shared.database.models.business import Business
from shared.database.models.customer import Channel, Customer, CustomerStatus
from shared.database.models.message import Message, MessageChannel, MessageDirection, MessageType
from shared.encryption.tokens import decrypt_token
from shared.integrations.gmail.client import GmailClient, ParsedEmail
from shared.prompts.email_classifier import EmailClassification, build_email_classifier_prompt
from shared.queue.bullmq_client import Queues, dequeue, retry_or_dead_letter
from shared.queue.job_types import JobType
from shared.utils.logging import get_logger

logger = get_logger(__name__)

_shutdown = False


def _handle_signal(sig: int, frame: Any) -> None:
    global _shutdown
    logger.info("Email processor shutdown signal", extra={"signal": sig})
    _shutdown = True


# ── Email Classification via Claude Haiku ─────────────────────────────────────

async def _is_business_email(subject: str | None, body: str | None, sender: str, sender_name: str | None) -> bool:
    """
    Claude Haiku classifies each email as 'business' or 'noise'.
    Fast and cheap — one short prompt per email.
    Falls back to heuristic if Claude call fails.
    """
    # Fast heuristic pre-filter — obvious noise never reaches Claude
    sender_lower = sender.lower()
    if any(x in sender_lower for x in ["noreply", "no-reply", "donotreply", "notifications@", "mailer@"]):
        return False

    # Reject obvious newsletter subjects
    subject_lower = (subject or "").lower()
    if any(x in subject_lower for x in ["unsubscribe", "newsletter", "promo", "offer", "deal", "sale %"]):
        return False

    if not subject and not body:
        return False

    # Claude Haiku classification — the real classifier
    try:
        prompt = build_email_classifier_prompt(
            sender_email=sender,
            sender_name=sender_name,
            subject=subject,
            body_preview=(body or "")[:500],
        )
        response = await claude_client.complete(prompt, max_tokens=10)
        classification = EmailClassification.parse(response)
        return classification == EmailClassification.BUSINESS
    except Exception as exc:
        # Claude unavailable — fall back to "assume business" so we don't lose enquiries
        logger.warning(
            "Email classifier failed — assuming business email",
            extra={"sender": sender, "error": str(exc)},
        )
        return True


# ── Core Processing ────────────────────────────────────────────────────────────

async def _find_business_by_email(
    email_address: str, db: AsyncSession
) -> Business | None:
    """Look up the business whose Gmail is connected with this email address."""
    result = await db.execute(
        select(Business).where(
            Business.is_active == True,  # noqa: E712
            Business.extra_data["gmail_email"].astext == email_address,
        )
    )
    return result.scalar_one_or_none()


async def process_gmail_job(job_data: dict[str, Any], db: AsyncSession) -> None:
    """
    Full Gmail processing:
    1. Find business by email address
    2. Refresh access token
    3. Fetch new messages via history API
    4. For each: classify → if business, save to DB
    """
    email_address: str = job_data.get("email_address", "")
    history_id: str = job_data.get("history_id", "")

    if not email_address:
        logger.warning("Gmail job missing email_address — dropped")
        return

    # ── Step 1: Find business ─────────────────────────────────────────────────
    business = await _find_business_by_email(email_address, db)
    if not business:
        logger.warning(
            "No business found for Gmail address — dropped",
            extra={"email": email_address},
        )
        return

    business_id = business.id

    # ── Step 2: Get Gmail credentials ────────────────────────────────────────
    # Credentials stored as encrypted JSON in business.metadata["gmail_credentials"]
    creds_raw = business.extra_data.get("gmail_credentials")
    if not creds_raw:
        logger.warning(
            "Business has no Gmail credentials",
            extra={"business_id": str(business_id)},
        )
        return

    from shared.config.settings import settings

    try:
        refresh_token = decrypt_token(creds_raw["refresh_token_encrypted"])
    except Exception as exc:
        logger.error(
            "Failed to decrypt Gmail refresh token",
            extra={"business_id": str(business_id), "error": str(exc)},
        )
        return

    gmail = GmailClient()
    try:
        access_token = await gmail.refresh_access_token(
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            refresh_token=refresh_token,
        )
    except Exception as exc:
        logger.error(
            "Failed to refresh Gmail token",
            extra={"business_id": str(business_id), "error": str(exc)},
        )
        raise  # Retryable

    # ── Step 3: List new message IDs via history ──────────────────────────────
    if not history_id:
        await gmail.close()
        return

    try:
        message_ids = await gmail.list_history(access_token, history_id)
    except Exception as exc:
        await gmail.close()
        raise  # Retryable

    if not message_ids:
        await gmail.close()
        return

    # ── Step 4: Process each new message ─────────────────────────────────────
    saved = 0
    for msg_id in message_ids:
        try:
            parsed = await gmail.get_message(access_token, msg_id)
            await _save_email_if_business(parsed, business_id, db)
            saved += 1
        except Exception as exc:
            logger.error(
                "Failed to process Gmail message",
                extra={"message_id": msg_id, "business_id": str(business_id), "error": str(exc)},
            )

    await gmail.close()

    if saved:
        logger.info(
            "Gmail messages saved",
            extra={"count": saved, "business_id": str(business_id)},
        )


async def _save_email_if_business(
    email: ParsedEmail,
    business_id: Any,
    db: AsyncSession,
) -> None:
    """Classify the email and save it if it looks like a business enquiry."""
    # Skip if not a business email
    if not await _is_business_email(email.subject, email.body, email.sender_email, email.sender_name):
        logger.info(
            "Email classified as non-business — discarded",
            extra={"sender": email.sender_email, "subject": email.subject},
        )
        return

    # Duplicate check
    existing = await db.execute(
        select(Message.id).where(Message.external_id == email.message_id)
    )
    if existing.scalar_one_or_none():
        return

    # Find or create customer
    customer_result = await db.execute(
        select(Customer).where(
            Customer.business_id == business_id,
            Customer.email == email.sender_email,
        )
    )
    customer = customer_result.scalar_one_or_none()

    if customer is None:
        customer = Customer(
            business_id=business_id,
            email=email.sender_email,
            name=email.sender_name,
            primary_channel=Channel.gmail,
            status=CustomerStatus.new,
            health_score=50,
            metadata={},
        )
        db.add(customer)
        await db.flush()
        logger.info(
            "New customer created from email",
            extra={"customer_id": str(customer.id), "email": email.sender_email},
        )

    # Update last contact
    if email.timestamp_ms:
        try:
            ts = datetime.fromtimestamp(int(email.timestamp_ms) / 1000, tz=timezone.utc)
            customer.last_contact_at = ts.isoformat()
        except (ValueError, OSError):
            pass

    # Save message
    message = Message(
        business_id=business_id,
        customer_id=customer.id,
        channel=MessageChannel.gmail,
        message_type=MessageType.email,
        direction=MessageDirection.inbound,
        content=email.body,
        subject=email.subject,
        external_id=email.message_id,
        sent_at=customer.last_contact_at,
        is_analysed=False,
        raw_payload={"thread_id": email.thread_id},
    )
    db.add(message)
    await db.flush()

    logger.info(
        "Email saved",
        extra={
            "message_id": str(message.id),
            "business_id": str(business_id),
            "customer_id": str(customer.id),
            "subject": email.subject,
        },
    )


# ── Worker Loop ────────────────────────────────────────────────────────────────

async def run_worker() -> None:
    logger.info("Email processor worker starting")

    db_ok = await check_db_connection()
    redis_ok = await check_redis_connection()
    if not db_ok or not redis_ok:
        logger.critical("Email processor startup failed")
        sys.exit(1)

    logger.info("Email processor worker ready", extra={"queue": Queues.EMAIL})

    while not _shutdown:
        job_data = await dequeue(Queues.EMAIL, timeout=5)
        if job_data is None:
            continue

        job_type = job_data.get("type")

        if job_type == JobType.process_gmail_email:
            async with AsyncSessionLocal() as db:
                try:
                    await process_gmail_job(job_data, db)
                    await db.commit()
                except Exception as exc:
                    await db.rollback()
                    logger.error(
                        "Gmail job failed",
                        extra={"error": str(exc)},
                        exc_info=True,
                    )
                    await retry_or_dead_letter(Queues.EMAIL, job_data, str(exc))
        else:
            logger.warning("Unknown job type in email queue", extra={"type": job_type})

    logger.info("Email processor shut down cleanly")


if __name__ == "__main__":
    from shared.utils.sentry import init_sentry
    init_sentry("worker-email")
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    asyncio.run(run_worker())
