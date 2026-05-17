"""
KROVA — Meta WhatsApp Cloud API Client
Sends messages from the business's WhatsApp Business number to their customers.
All outbound messages go through this client — never directly call the Meta API elsewhere.

Meta API docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
Rate limits: 1000 messages/second per phone number (well above our needs)
"""

import asyncio
from typing import Any

import httpx

from shared.config.settings import settings
from shared.utils.errors import WhatsAppError
from shared.utils.logging import get_logger

logger = get_logger(__name__)

# Retry configuration — Meta API is reliable but occasional 500s happen
_MAX_RETRIES = 3
_RETRY_DELAYS = [1, 2, 4]  # Exponential backoff in seconds


class WhatsAppClient:
    """
    Async client for the Meta WhatsApp Cloud API.
    One instance is shared across all workers — httpx handles connection pooling.
    """

    def __init__(self) -> None:
        self._base_url = settings.meta_graph_base_url
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            headers={"Content-Type": "application/json"},
        )

    async def send_text_message(
        self,
        phone_number_id: str,
        to: str,
        text: str,
        access_token: str,
    ) -> dict[str, Any]:
        """
        Send a plain text message from the business's WhatsApp number to a customer.

        Args:
            phone_number_id: Meta's ID for the business's WhatsApp number
            to: Recipient phone in E.164 format (e.g. +919876543210)
            text: Message content
            access_token: Business's WhatsApp access token (decrypted from DB)

        Returns:
            Meta API response dict containing the sent message ID
        """
        url = f"{self._base_url}/{phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }

        return await self._post_with_retry(url, payload, access_token, phone_number_id, to)

    async def mark_message_as_read(
        self,
        phone_number_id: str,
        message_id: str,
        access_token: str,
    ) -> None:
        """
        Mark an incoming message as read (shows blue ticks to customer).
        Best-effort — failure doesn't affect core functionality.
        """
        url = f"{self._base_url}/{phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
        try:
            await self._client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {access_token}"},
            )
        except Exception as exc:
            # Non-critical — log and continue
            logger.warning(
                "Failed to mark message as read",
                extra={"message_id": message_id, "error": str(exc)},
            )

    async def _post_with_retry(
        self,
        url: str,
        payload: dict[str, Any],
        access_token: str,
        phone_number_id: str,
        recipient: str,
    ) -> dict[str, Any]:
        """POST to Meta API with exponential backoff retry on transient errors."""
        last_exc: Exception | None = None

        for attempt, delay in enumerate(
            [0] + _RETRY_DELAYS, start=1
        ):  # delay=0 for first attempt
            if delay:
                await asyncio.sleep(delay)

            try:
                response = await self._client.post(
                    url,
                    json=payload,
                    headers={"Authorization": f"Bearer {access_token}"},
                )

                if response.status_code == 200:
                    data = response.json()
                    logger.info(
                        "WhatsApp message sent",
                        extra={
                            "phone_number_id": phone_number_id,
                            "recipient": recipient,
                            "message_id": data.get("messages", [{}])[0].get("id"),
                            "attempt": attempt,
                        },
                    )
                    return data

                # 4xx errors are not retryable (bad token, invalid number, etc.)
                if 400 <= response.status_code < 500:
                    error_data = response.json()
                    raise WhatsAppError(
                        f"Meta API client error {response.status_code}",
                        status_code=response.status_code,
                        error=error_data,
                        recipient=recipient,
                    )

                # 5xx — retryable
                last_exc = WhatsAppError(
                    f"Meta API server error {response.status_code}",
                    attempt=attempt,
                    recipient=recipient,
                )

            except WhatsAppError:
                raise
            except httpx.TimeoutException as exc:
                last_exc = WhatsAppError(
                    "Meta API request timed out",
                    attempt=attempt,
                    recipient=recipient,
                    error=str(exc),
                )
            except httpx.RequestError as exc:
                last_exc = WhatsAppError(
                    "Meta API network error",
                    attempt=attempt,
                    recipient=recipient,
                    error=str(exc),
                )

            logger.warning(
                "WhatsApp send failed — retrying",
                extra={
                    "attempt": attempt,
                    "max_attempts": _MAX_RETRIES + 1,
                    "recipient": recipient,
                    "error": str(last_exc),
                },
            )

        raise last_exc or WhatsAppError("WhatsApp send failed after all retries")

    async def close(self) -> None:
        """Close the underlying HTTP connection pool. Call on app shutdown."""
        await self._client.aclose()


# Module-level singleton — workers import this directly
whatsapp_client = WhatsAppClient()
