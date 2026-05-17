"""
KROVA — Microsoft Graph API Client (Outlook)
Fetches new emails from a business owner's Outlook/Office 365 account.
Uses Microsoft Graph API with OAuth2 (same pattern as Gmail).
Webhook notifications come via Microsoft Graph change notifications (subscriptions).

Auth: owner completes Microsoft OAuth → we store refresh_token encrypted in DB
→ trade for access_token on each call (expires every 60 minutes).
"""

import base64
from typing import Any

import httpx

from shared.utils.errors import OutlookError
from shared.utils.logging import get_logger

logger = get_logger(__name__)

_GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
_TOKEN_URL_TEMPLATE = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"


class ParsedOutlookEmail:
    """Flattened Outlook email from Microsoft Graph API response."""

    def __init__(
        self,
        message_id: str,
        conversation_id: str,
        sender_email: str,
        sender_name: str | None,
        subject: str | None,
        body: str | None,
        received_at: str,
        raw: dict[str, Any],
    ) -> None:
        self.message_id = message_id
        self.conversation_id = conversation_id
        self.sender_email = sender_email
        self.sender_name = sender_name
        self.subject = subject
        self.body = body
        self.received_at = received_at
        self.raw = raw


class OutlookClient:
    """
    Async Microsoft Graph API client for Outlook/Office 365 email.
    """

    def __init__(self, tenant_id: str = "common") -> None:
        self._tenant_id = tenant_id
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0))

    async def refresh_access_token(
        self,
        client_id: str,
        client_secret: str,
        refresh_token: str,
    ) -> str:
        """Exchange refresh token for a fresh access token."""
        token_url = _TOKEN_URL_TEMPLATE.format(tenant_id=self._tenant_id)
        try:
            response = await self._client.post(
                token_url,
                data={
                    "grant_type": "refresh_token",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "scope": "https://graph.microsoft.com/Mail.Read offline_access",
                },
            )
            if response.status_code != 200:
                raise OutlookError(
                    "Failed to refresh Outlook access token",
                    status_code=response.status_code,
                    error=response.text,
                )
            return response.json()["access_token"]
        except OutlookError:
            raise
        except Exception as exc:
            raise OutlookError("Token refresh error", error=str(exc)) from exc

    async def get_new_messages(
        self,
        access_token: str,
        top: int = 25,
    ) -> list[ParsedOutlookEmail]:
        """
        Fetch unread messages from the inbox, newest first.
        Called after receiving a Microsoft Graph change notification.
        """
        url = f"{_GRAPH_API_BASE}/me/mailFolders/inbox/messages"
        try:
            response = await self._client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "$filter": "isRead eq false",
                    "$orderby": "receivedDateTime desc",
                    "$top": str(top),
                    "$select": "id,conversationId,subject,from,body,receivedDateTime",
                },
            )
            if response.status_code != 200:
                raise OutlookError(
                    f"Outlook get messages failed: {response.status_code}",
                    error=response.text,
                )

            data = response.json()
            return [self._parse_message(m) for m in data.get("value", [])]

        except OutlookError:
            raise
        except Exception as exc:
            raise OutlookError("Outlook get messages error", error=str(exc)) from exc

    async def get_message(
        self,
        access_token: str,
        message_id: str,
    ) -> ParsedOutlookEmail:
        """Fetch a single message by ID."""
        url = f"{_GRAPH_API_BASE}/me/messages/{message_id}"
        try:
            response = await self._client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={"$select": "id,conversationId,subject,from,body,receivedDateTime"},
            )
            if response.status_code != 200:
                raise OutlookError(
                    f"Outlook get message failed: {response.status_code}",
                    message_id=message_id,
                )
            return self._parse_message(response.json())
        except OutlookError:
            raise
        except Exception as exc:
            raise OutlookError("Outlook get message error", error=str(exc)) from exc

    async def mark_as_read(self, access_token: str, message_id: str) -> None:
        """Mark a message as read after processing."""
        url = f"{_GRAPH_API_BASE}/me/messages/{message_id}"
        try:
            await self._client.patch(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                json={"isRead": True},
            )
        except Exception as exc:
            logger.warning(
                "Failed to mark Outlook message as read",
                extra={"message_id": message_id, "error": str(exc)},
            )

    def _parse_message(self, raw: dict[str, Any]) -> ParsedOutlookEmail:
        from_data = raw.get("from", {}).get("emailAddress", {})
        body_data = raw.get("body", {})
        # Graph returns HTML by default — strip tags for plain text
        body_content = body_data.get("content", "")
        if body_data.get("contentType") == "html":
            body_content = _strip_html(body_content)

        return ParsedOutlookEmail(
            message_id=raw["id"],
            conversation_id=raw.get("conversationId", ""),
            sender_email=from_data.get("address", ""),
            sender_name=from_data.get("name"),
            subject=raw.get("subject"),
            body=body_content or None,
            received_at=raw.get("receivedDateTime", ""),
            raw=raw,
        )

    async def close(self) -> None:
        await self._client.aclose()


def _strip_html(html: str) -> str:
    """Very basic HTML tag stripper — no external dependency needed."""
    import re
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


outlook_client = OutlookClient()
