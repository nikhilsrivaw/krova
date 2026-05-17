"""
KROVA — Gmail Nightly Pull Worker
Proactively syncs Gmail for all businesses that have connected Gmail.

Why this exists alongside email_processor.py:
- email_processor handles real-time push via Google Pub/Sub (immediate delivery)
- This worker handles nightly pull (catch-up sync, runs after 22:00 IST analysis)

The two are complementary:
- Push: fast, real-time, but can miss messages if Pub/Sub subscription lapses
- Pull: reliable backup, catches anything push missed, also handles new OAuth connections

Process (per business):
  1. Find all active businesses with gmail_credentials in extra_data
  2. Refresh OAuth token
  3. Fetch messages received in the last 26 hours (overlap to avoid gaps)
  4. Skip already-seen messages (duplicate check by external_id)
  5. Classify → save → done
  6. Update gmail_last_synced_at in business.extra_data

Called by:
  analysis_worker.py → run_gmail_sync(business_id, db) after nightly analysis
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config.settings import settings
from shared.database.models.business import Business
from shared.encryption.tokens import decrypt_token
from shared.integrations.gmail.client import GmailClient
from shared.utils.logging import get_logger

logger = get_logger(__name__)

# Spam/noise sender patterns — never reach Claude
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
    """Fast heuristic pre-filter — obvious non-business emails discarded before Claude."""
    sender_lower = sender_email.lower()
    if any(noise in sender_lower for noise in _NOISE_SENDERS):
        return True
    if subject:
        subj_lower = subject.lower()
        if any(noise in subj_lower for noise in _NOISE_SUBJECTS):
            return True
    return False


async def run_gmail_sync(business_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Sync Gmail for a single business. Returns the number of new messages saved.
    Called from analysis_worker after nightly analysis completes.
    """
    # Load business
    biz_result = await db.execute(
        select(Business).where(Business.id == business_id, Business.is_active == True)  # noqa: E712
    )
    business = biz_result.scalar_one_or_none()
    if not business:
        return 0

    creds = business.extra_data.get("gmail_credentials")
    if not creds or not creds.get("refresh_token_encrypted"):
        return 0  # Gmail not connected for this business

    # Decrypt refresh token
    try:
        refresh_token = decrypt_token(creds["refresh_token_encrypted"])
    except Exception as exc:
        logger.error("Gmail token decrypt failed", extra={"business_id": str(business_id), "error": str(exc)})
        return 0

    gmail = GmailClient()
    try:
        # Refresh access token
        access_token = await gmail.refresh_access_token(
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            refresh_token=refresh_token,
        )
    except Exception as exc:
        logger.warning("Gmail token refresh failed", extra={"business_id": str(business_id), "error": str(exc)})
        await gmail.close()
        return 0

    # Pull last 26 hours — 2h overlap to avoid edge-case gaps from nightly timing
    since = datetime.now(timezone.utc) - timedelta(hours=26)
    since_epoch = int(since.timestamp())

    try:
        message_ids = await gmail.list_messages(access_token, after_epoch_seconds=since_epoch)
    except Exception as exc:
        logger.warning("Gmail list_messages failed", extra={"business_id": str(business_id), "error": str(exc)})
        await gmail.close()
        return 0

    if not message_ids:
        await gmail.close()
        _update_sync_time(business)
        await db.commit()
        return 0

    saved = 0
    for msg_id in message_ids:
        try:
            parsed = await gmail.get_message(access_token, msg_id)

            # Pre-filter obvious noise before any DB lookup
            if _is_noise(parsed.sender_email, parsed.subject):
                continue

            # Skip emails the business owner sent (outbound — only want inbound)
            owner_email = creds.get("email", "")
            if owner_email and parsed.sender_email.lower() == owner_email.lower():
                continue

            from services.workers.email_processor import _save_email_if_business
            await _save_email_if_business(parsed, business_id, db)
            saved += 1

        except Exception as exc:
            logger.warning(
                "Gmail message processing failed (skipped)",
                extra={"message_id": msg_id, "business_id": str(business_id), "error": str(exc)},
            )
            continue

    _update_sync_time(business)
    await db.commit()
    await gmail.close()

    if saved:
        logger.info("Gmail nightly sync complete", extra={"business_id": str(business_id), "saved": saved})

    return saved


async def run_gmail_sync_all(db: AsyncSession) -> dict[str, int]:
    """
    Sync Gmail for ALL active businesses that have Gmail connected.
    Called from the nightly scheduler as a standalone job (separate from per-business analysis).
    Returns {business_id: messages_saved}.
    """
    result = await db.execute(
        select(Business).where(Business.is_active == True)  # noqa: E712
    )
    businesses = result.scalars().all()

    totals: dict[str, int] = {}
    for business in businesses:
        if not business.extra_data.get("gmail_credentials"):
            continue
        count = await run_gmail_sync(business.id, db)
        totals[str(business.id)] = count

    logger.info(
        "Gmail sync all complete",
        extra={"businesses_synced": len(totals), "total_messages": sum(totals.values())},
    )
    return totals


def _update_sync_time(business: Business) -> None:
    """Update gmail_last_synced_at in business.extra_data (in-place)."""
    extra = dict(business.extra_data)
    extra["gmail_last_synced_at"] = datetime.now(timezone.utc).isoformat()
    business.extra_data = extra
