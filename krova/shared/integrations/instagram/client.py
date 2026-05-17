"""
KROVA — Instagram Graph API Client
Sends DM replies from the business's Instagram account to customers.
Uses the Messenger Platform send API (same as WhatsApp pattern).
"""

import asyncio
from typing import Any

import httpx

from shared.config.settings import settings
from shared.utils.errors import InstagramError
from shared.utils.logging import get_logger

logger = get_logger(__name__)

_MAX_RETRIES = 3
_RETRY_DELAYS = [1, 2, 4]


class InstagramClient:
    """
    Async client for the Instagram Graph API.
    Sends DM replies to customers who messaged the business.
    """

    def __init__(self) -> None:
        self._base_url = settings.meta_graph_base_url
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            headers={"Content-Type": "application/json"},
        )

    async def send_dm_reply(
        self,
        page_id: str,
        recipient_instagram_id: str,
        text: str,
        access_token: str,
    ) -> dict[str, Any]:
        """
        Send a DM reply to a customer's Instagram account.

        Args:
            page_id: The Facebook Page ID linked to the Instagram Business account
            recipient_instagram_id: The sender's Instagram scoped user ID (IGSID)
            text: Message text to send
            access_token: Page access token (decrypted from DB)
        """
        url = f"{self._base_url}/{page_id}/messages"
        payload = {
            "recipient": {"id": recipient_instagram_id},
            "message": {"text": text},
            "messaging_type": "RESPONSE",
        }

        return await self._post_with_retry(url, payload, access_token, recipient_instagram_id)

    async def get_user_profile(
        self,
        instagram_user_id: str,
        access_token: str,
    ) -> dict[str, Any]:
        """
        Fetch basic profile info for an Instagram user (name, username).
        Used to enrich customer profiles when a DM arrives.
        Best-effort — returns empty dict on failure.
        """
        url = f"{self._base_url}/{instagram_user_id}"
        try:
            response = await self._client.get(
                url,
                params={"fields": "name,username", "access_token": access_token},
            )
            if response.status_code == 200:
                return response.json()
        except Exception as exc:
            logger.warning(
                "Failed to fetch Instagram user profile",
                extra={"user_id": instagram_user_id, "error": str(exc)},
            )
        return {}

    async def _post_with_retry(
        self,
        url: str,
        payload: dict[str, Any],
        access_token: str,
        recipient: str,
    ) -> dict[str, Any]:
        last_exc: Exception | None = None

        for attempt, delay in enumerate([0] + _RETRY_DELAYS, start=1):
            if delay:
                await asyncio.sleep(delay)
            try:
                response = await self._client.post(
                    url,
                    json=payload,
                    params={"access_token": access_token},
                )
                if response.status_code == 200:
                    data = response.json()
                    logger.info(
                        "Instagram DM sent",
                        extra={"recipient": recipient, "message_id": data.get("message_id"), "attempt": attempt},
                    )
                    return data

                if 400 <= response.status_code < 500:
                    raise InstagramError(
                        f"Instagram API client error {response.status_code}",
                        error=response.json(),
                        recipient=recipient,
                    )

                last_exc = InstagramError(
                    f"Instagram API server error {response.status_code}",
                    attempt=attempt,
                )
            except InstagramError:
                raise
            except httpx.TimeoutException as exc:
                last_exc = InstagramError("Instagram API timed out", error=str(exc))
            except httpx.RequestError as exc:
                last_exc = InstagramError("Instagram API network error", error=str(exc))

            logger.warning(
                "Instagram send failed — retrying",
                extra={"attempt": attempt, "recipient": recipient, "error": str(last_exc)},
            )

        raise last_exc or InstagramError("Instagram send failed after all retries")

    async def close(self) -> None:
        await self._client.aclose()


instagram_client = InstagramClient()
