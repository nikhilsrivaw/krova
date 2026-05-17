"""
KROVA — Outlook Nightly Pull Worker
Proactively syncs Outlook for all businesses that have connected Outlook/Office 365.

Why this exists alongside push notifications:
- Microsoft Graph change notifications handle real-time push (immediate)
- This worker handles nightly pull (catch-up, catches anything push missed)

Process (per business):
  1. Find all active businesses with outlook_credentials in extra_data
  2. Refresh OAuth token via Microsoft identity platform
  3. Fetch unread messages (up to 50, newest first)
  4. Skip already-seen messages (duplicate check by external_id)
  5. Classify → save → mark as read → done
  6. Update outlook_last_synced_at in business.extra_data

Called by:
  analysis_worker.py → run_outlook_sync(business_id, db) after nightly analysis
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config.settings import settings
from shared.database.models.business import Business
from shared.database.models.customer import Channel, Customer, CustomerStatus
from shared.database.models.message import Message, MessageChannel, MessageDirection, MessageType
from shared.encryption.tokens import decrypt_token
from shared.integrations.outlook.client import OutlookClient, ParsedOutlookEmail
from shared.utils.logging import get_logger

logger = get_logger(__name__)

# Reuse same noise heuristics as gmail_worker
_NOISE_SENDERS = frozenset([
    "noreply", "no-reply", "donotreply", "notifications@",
    "mailer@", "newsletter@", "promo@", "updates@", "info@",
    "support@", "hello@", "team@", "news@", "marketing@",
    "bounce@", "postmaster@", "auto-confirm@",
])

_NOISE_SUBJECTS = frozenset([
    "unsubscribe", "promotional", "discount", "offer", "sale",
    "newsletter", "weekly digest", "your receipt", "invoice from",
    "payment confirmation", "order confirmation", "verify your email",
    "confirm your email", "welcome to", "sign in attempt",
    "security alert", "reset your password",
])


def _is_noise(sender_email: str, subject: str | None) -> bool:
    sender_lower = sender_email.lower()
    if any(noise in sender_lower for noise in _NOISE_SENDERS):
        return True
    if subject:
        subj_lower = subject.lower()
        if any(noise in subj_lower for noise in _NOISE_SUBJECTS):
            return True
    return False


async def run_outlook_sync(business_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Sync Outlook for a single business. Returns the number of new messages saved.
    Called from analysis_worker after nightly analysis completes.
    """
    biz_result = await db.execute(
        select(Business).where(Business.id == business_id, Business.is_active == True)  # noqa: E712
    )
    business = biz_result.scalar_one_or_none()
    if not business:
        return 0

    creds = (business.extra_data or {}).get("outlook_credentials")
    if not creds or not creds.get("refresh_token_encrypted"):
        return 0  # Outlook not connected for this business

    try:
        refresh_token = decrypt_token(creds["refresh_token_encrypted"])
    except Exception as exc:
        logger.error("Outlook token decrypt failed", extra={"business_id": str(business_id), "error": str(exc)})
        return 0

    tenant_id = creds.get("tenant_id", settings.microsoft_tenant_id)
    outlook = OutlookClient(tenant_id=tenant_id)

    try:
        access_token = await outlook.refresh_access_token(
            client_id=settings.microsoft_client_id,
            client_secret=settings.microsoft_client_secret,
            refresh_token=refresh_token,
        )
    except Exception as exc:
        logger.warning("Outlook token refresh failed", extra={"business_id": str(business_id), "error": str(exc)})
        await outlook.close()
        return 0

    try:
        messages = await outlook.get_new_messages(access_token, top=50)
    except Exception as exc:
        logger.warning("Outlook get_new_messages failed", extra={"business_id": str(business_id), "error": str(exc)})
        await outlook.close()
        return 0

    if not messages:
        _update_sync_time(business)
        await db.commit()
        await outlook.close()
        return 0

    owner_email = creds.get("email", "")
    saved = 0

    for parsed in messages:
        try:
            if _is_noise(parsed.sender_email, parsed.subject):
                continue

            # Skip emails sent by the owner themselves
            if owner_email and parsed.sender_email.lower() == owner_email.lower():
                continue

            await _save_outlook_email(parsed, business_id, db)
            saved += 1

            # Mark as read in Outlook to avoid re-fetching next night
            try:
                await outlook.mark_as_read(access_token, parsed.message_id)
            except Exception:
                pass  # Non-fatal — just means we may see it again tomorrow

        except Exception as exc:
            logger.warning(
                "Outlook message processing failed (skipped)",
                extra={"message_id": parsed.message_id, "business_id": str(business_id), "error": str(exc)},
            )
            continue

    _update_sync_time(business)
    await db.commit()
    await outlook.close()

    if saved:
        logger.info("Outlook nightly sync complete", extra={"business_id": str(business_id), "saved": saved})

    return saved


async def _save_outlook_email(
    email: ParsedOutlookEmail,
    business_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """Classify the Outlook email and save it if it's a business enquiry."""
    from services.workers.email_processor import _is_business_email

    if not await _is_business_email(email.subject, email.body, email.sender_email, email.sender_name):
        logger.info(
            "Outlook email classified as non-business — discarded",
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
            primary_channel=Channel.outlook,
            status=CustomerStatus.new,
            health_score=50,
            metadata={},
        )
        db.add(customer)
        await db.flush()
        logger.info(
            "New customer created from Outlook email",
            extra={"customer_id": str(customer.id), "email": email.sender_email},
        )

    # Parse received_at timestamp
    sent_at: str | None = None
    if email.received_at:
        try:
            dt = datetime.fromisoformat(email.received_at.replace("Z", "+00:00"))
            sent_at = dt.isoformat()
            customer.last_contact_at = sent_at
        except ValueError:
            pass

    message = Message(
        business_id=business_id,
        customer_id=customer.id,
        channel=MessageChannel.outlook,
        message_type=MessageType.email,
        direction=MessageDirection.inbound,
        content=email.body or "",
        subject=email.subject,
        external_id=email.message_id,
        sent_at=sent_at,
        is_analysed=False,
        raw_payload={"conversation_id": email.conversation_id},
    )
    db.add(message)
    await db.flush()

    logger.info(
        "Outlook email saved",
        extra={
            "message_id": str(message.id),
            "business_id": str(business_id),
            "customer_id": str(customer.id),
        },
    )


async def run_outlook_sync_all(db: AsyncSession) -> dict[str, int]:
    """
    Sync Outlook for ALL active businesses that have Outlook connected.
    Returns {business_id: messages_saved}.
    """
    result = await db.execute(
        select(Business).where(Business.is_active == True)  # noqa: E712
    )
    businesses = result.scalars().all()

    totals: dict[str, int] = {}
    for business in businesses:
        if not (business.extra_data or {}).get("outlook_credentials"):
            continue
        count = await run_outlook_sync(business.id, db)
        totals[str(business.id)] = count

    logger.info(
        "Outlook sync all complete",
        extra={"businesses_synced": len(totals), "total_messages": sum(totals.values())},
    )
    return totals


def _update_sync_time(business: Business) -> None:
    extra = dict(business.extra_data or {})
    extra["outlook_last_synced_at"] = datetime.now(timezone.utc).isoformat()
    business.extra_data = extra
