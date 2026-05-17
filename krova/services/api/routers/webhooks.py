"""
KROVA — Webhooks Router
The most latency-critical part of the API.
Meta will disable our webhook if we don't return 200 within 5 seconds.

Rule: validate → return 200 → queue everything else.
No DB calls. No AI calls. No blocking work inside these handlers.
"""

import base64
import json
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Header, Request, Response, status

from shared.integrations.instagram.message_types import (
    InstagramWebhookPayload,
    ParsedInstagramMessage,
)
from shared.integrations.whatsapp.message_types import (
    ParsedWhatsAppMessage,
    WhatsAppWebhookPayload,
)
from shared.integrations.whatsapp.validator import verify_meta_signature
from shared.config.settings import settings
from shared.queue.bullmq_client import Queues, enqueue
from shared.queue.job_types import GmailEmailJob, InstagramMessageJob, WhatsAppMessageJob
from shared.utils.errors import WebhookValidationError
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ── WhatsApp ──────────────────────────────────────────────────────────────────

@router.get("/whatsapp")
async def whatsapp_verify(
    hub_mode: str | None = None,
    hub_challenge: str | None = None,
    hub_verify_token: str | None = None,
) -> Response:
    """
    Meta webhook verification handshake.
    Meta sends this GET request when you first configure the webhook URL.
    We verify the token matches our secret and echo back the challenge.
    """
    if (
        hub_mode == "subscribe"
        and hub_verify_token == settings.meta_webhook_verify_token
        and hub_challenge
    ):
        logger.info("WhatsApp webhook verified by Meta")
        return Response(content=hub_challenge, media_type="text/plain")

    logger.warning(
        "WhatsApp webhook verification failed",
        extra={"mode": hub_mode, "token_match": hub_verify_token == settings.meta_webhook_verify_token},
    )
    return Response(status_code=status.HTTP_403_FORBIDDEN)


@router.post("/whatsapp", status_code=status.HTTP_200_OK)
async def whatsapp_incoming(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str | None = Header(default=None),
) -> dict[str, str]:
    """
    Receives all incoming WhatsApp messages and status updates from Meta.

    Steps:
    1. Read raw body (must happen before any parsing for signature check)
    2. Verify HMAC-SHA256 signature
    3. Return 200 immediately
    4. Parse + enqueue in background (BackgroundTasks runs after response is sent)
    """
    raw_body = await request.body()

    # Step 1: Verify signature — raises 403 on failure
    try:
        verify_meta_signature(raw_body, x_hub_signature_256)
    except WebhookValidationError:
        # Already logged in verify_meta_signature
        return Response(status_code=status.HTTP_403_FORBIDDEN)

    # Step 2: Schedule background processing — response sent immediately after this
    background_tasks.add_task(_process_whatsapp_payload, raw_body)

    # Step 3: Return 200 to Meta — within milliseconds of receiving the request
    return {"status": "received"}


async def _process_whatsapp_payload(raw_body: bytes) -> None:
    """
    Runs after the 200 response is sent.
    Parses the payload and drops one job per message onto the ingestion queue.
    """
    import json

    try:
        payload_dict: dict[str, Any] = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        logger.error("WhatsApp webhook: invalid JSON body", extra={"error": str(exc)})
        return

    try:
        payload = WhatsAppWebhookPayload(**payload_dict)
    except Exception as exc:
        logger.error(
            "WhatsApp webhook: payload parse error",
            extra={"error": str(exc)},
        )
        return

    if not payload.is_whatsapp_message_event():
        # Delivery receipts / read receipts — nothing to do
        return

    messages = ParsedWhatsAppMessage.extract_all(payload)
    if not messages:
        return

    enqueued = 0
    for msg in messages:
        try:
            # Check if this is an owner reply to a morning briefing
            if msg.content and await _handle_briefing_reply(msg.sender_phone, msg.content.strip().lower()):
                logger.info("Handled briefing reply command", extra={"sender": msg.sender_phone, "cmd": msg.content.strip()})
                continue

            job = WhatsAppMessageJob(
                phone_number_id=msg.phone_number_id,
                sender_phone=msg.sender_phone,
                sender_name=msg.sender_name,
                message_id=msg.message_id,
                message_type=msg.message_type,
                content=msg.content,
                timestamp=msg.timestamp,
                raw_payload=msg.raw_payload,
            )
            await enqueue(Queues.INGESTION, job)
            enqueued += 1
        except Exception as exc:
            logger.error(
                "Failed to enqueue WhatsApp message",
                extra={"message_id": msg.message_id, "error": str(exc)},
            )

    logger.info(
        "WhatsApp webhook processed",
        extra={"messages_enqueued": enqueued, "phone_number_id": messages[0].phone_number_id},
    )


async def _handle_briefing_reply(sender_phone: str, text: str) -> bool:
    """
    Detect if a WhatsApp message is an owner reply to their morning briefing.
    Commands:
      "send"     → approve the top pending action for this owner's business
      "skip"     → defer the top pending action to tomorrow (mark dismissed)
      "show all" → send a deep link to the app (future: push notification)

    Returns True if the message was handled (so it won't be ingested as a lead).
    Returns False if not a recognized command from a known owner.
    """
    _COMMANDS = {"send", "skip", "show all", "send all", "approve"}
    if text not in _COMMANDS:
        return False

    # Import here to avoid circular at module load
    from shared.database.connection import AsyncSessionLocal
    from shared.database.models.business import Business
    from shared.database.models.action import Action, ActionStatus
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession

    try:
        async with AsyncSessionLocal() as db:
            # Find business where briefing_phone matches sender
            normalized = sender_phone.lstrip("+")
            biz_result = await db.execute(
                select(Business).where(
                    Business.is_active == True,  # noqa: E712
                )
            )
            businesses = biz_result.scalars().all()
            target_biz = None
            for biz in businesses:
                bp = (biz.briefing_phone or "").lstrip("+").replace(" ", "").replace("-", "")
                sp = normalized.replace(" ", "").replace("-", "")
                if bp and (bp == sp or bp.endswith(sp) or sp.endswith(bp)):
                    target_biz = biz
                    break

            if not target_biz:
                return False  # Not an owner phone we recognize

            if text in ("send", "approve", "send all"):
                # Approve the top pending action
                action_result = await db.execute(
                    select(Action).where(
                        Action.business_id == target_biz.id,
                        Action.status == ActionStatus.pending,
                    ).order_by(Action.created_at.asc()).limit(1)
                )
                action = action_result.scalar_one_or_none()
                if action:
                    action.status = ActionStatus.approved
                    await db.commit()
                    logger.info("Briefing reply: action approved", extra={"action_id": str(action.id), "business_id": str(target_biz.id)})
                return True

            if text == "skip":
                # Dismiss (soft-reject) the top pending action
                action_result = await db.execute(
                    select(Action).where(
                        Action.business_id == target_biz.id,
                        Action.status == ActionStatus.pending,
                    ).order_by(Action.created_at.asc()).limit(1)
                )
                action = action_result.scalar_one_or_none()
                if action:
                    action.status = ActionStatus.rejected
                    await db.commit()
                    logger.info("Briefing reply: action skipped", extra={"action_id": str(action.id)})
                return True

            if text == "show all":
                # Nothing to do server-side — future: send push notification
                logger.info("Briefing reply: show all requested", extra={"business_id": str(target_biz.id)})
                return True

    except Exception as exc:
        logger.warning("Briefing reply handler error (non-fatal)", extra={"error": str(exc)})

    return False


# ── Instagram ─────────────────────────────────────────────────────────────────

@router.get("/instagram")
async def instagram_verify(
    hub_mode: str | None = None,
    hub_challenge: str | None = None,
    hub_verify_token: str | None = None,
) -> Response:
    """Instagram uses the same verification flow as WhatsApp."""
    if (
        hub_mode == "subscribe"
        and hub_verify_token == settings.meta_webhook_verify_token
        and hub_challenge
    ):
        logger.info("Instagram webhook verified by Meta")
        return Response(content=hub_challenge, media_type="text/plain")

    return Response(status_code=status.HTTP_403_FORBIDDEN)


@router.post("/instagram", status_code=status.HTTP_200_OK)
async def instagram_incoming(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str | None = Header(default=None),
) -> dict[str, str]:
    """
    Instagram DMs and comments — same signature pattern as WhatsApp.
    Validate → return 200 → parse + enqueue in background.
    """
    raw_body = await request.body()

    try:
        verify_meta_signature(raw_body, x_hub_signature_256)
    except WebhookValidationError:
        return Response(status_code=status.HTTP_403_FORBIDDEN)

    background_tasks.add_task(_process_instagram_payload, raw_body)
    return {"status": "received"}


async def _process_instagram_payload(raw_body: bytes) -> None:
    """Parse Instagram webhook and enqueue one InstagramMessageJob per message/comment."""
    try:
        payload_dict: dict[str, Any] = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        logger.error("Instagram webhook: invalid JSON", extra={"error": str(exc)})
        return

    if payload_dict.get("object") != "instagram":
        return  # Not an Instagram event — ignore silently

    try:
        payload = InstagramWebhookPayload(**payload_dict)
    except Exception as exc:
        logger.error("Instagram webhook: parse error", extra={"error": str(exc)})
        return

    if not payload.has_messages() and not payload.has_comments():
        return

    messages = ParsedInstagramMessage.extract_all(payload)
    if not messages:
        return

    enqueued = 0
    for msg in messages:
        try:
            job = InstagramMessageJob(
                instagram_account_id=msg.instagram_account_id,
                sender_instagram_id=msg.sender_instagram_id,
                sender_name=msg.sender_name,
                message_id=msg.message_id,
                message_type=msg.message_type,
                content=msg.content,
                timestamp=msg.timestamp,
                raw_payload=msg.raw_payload,
            )
            await enqueue(Queues.INGESTION, job)
            enqueued += 1
        except Exception as exc:
            logger.error(
                "Failed to enqueue Instagram message",
                extra={"message_id": msg.message_id, "error": str(exc)},
            )

    logger.info(
        "Instagram webhook processed",
        extra={"messages_enqueued": enqueued},
    )


# ── Gmail ─────────────────────────────────────────────────────────────────────

@router.post("/gmail", status_code=status.HTTP_200_OK)
async def gmail_incoming(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """
    Google Cloud Pub/Sub push notification — a new email has arrived.
    Google sends: {"message": {"data": "<base64>", ...}, "subscription": "..."}
    The decoded data contains: {"emailAddress": "...", "historyId": "..."}
    We enqueue a GmailEmailJob — the email_processor worker fetches the actual content.
    """
    try:
        body = await request.json()
    except Exception:
        return {"status": "received"}  # Always return 200 to Pub/Sub

    background_tasks.add_task(_process_gmail_notification, body)
    return {"status": "received"}


async def _process_gmail_notification(body: dict[str, Any]) -> None:
    """Decode the Pub/Sub notification and enqueue a GmailEmailJob."""
    try:
        message = body.get("message", {})
        encoded_data = message.get("data", "")
        if not encoded_data:
            return

        decoded = base64.urlsafe_b64decode(encoded_data + "==").decode("utf-8")
        notification: dict[str, Any] = json.loads(decoded)

        email_address: str = notification.get("emailAddress", "")
        history_id: str = str(notification.get("historyId", ""))

        if not email_address or not history_id:
            logger.warning("Gmail notification missing emailAddress or historyId")
            return

        # The email_processor worker looks up the business by email_address,
        # fetches credentials, and retrieves the actual email from Gmail API.
        job = GmailEmailJob(
            email_address=email_address,
            history_id=history_id,
        )
        await enqueue(Queues.EMAIL, job)

        logger.info(
            "Gmail notification enqueued",
            extra={"email_address": email_address, "history_id": history_id},
        )

    except Exception as exc:
        logger.error("Failed to process Gmail notification", extra={"error": str(exc)})
