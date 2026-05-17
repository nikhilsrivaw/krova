"""
KROVA — BSP Sender Worker
Sends WhatsApp messages via connected BSP (Interakt / Wati / Gupshup).

Architecture:
- Business pays the BSP directly — KROVA never owns the channel.
- KROVA calls the BSP API with the business's own credentials.
- Only approved Meta templates are sent. Never freeform content.
- Freeform content is the owner's job (suggested in-app, owner sends manually).

Usage:
    result = await send_whatsapp_message(platform_row, api_key, to_phone, template_name, variables)
    templates = await fetch_templates(platform_row, api_key)
"""

import httpx
import re
from dataclasses import dataclass
from typing import Any

from shared.utils.logging import get_logger

logger = get_logger(__name__)


# ── Data types ─────────────────────────────────────────────────────────────────

@dataclass
class SendResult:
    success: bool
    message_id: str | None = None
    error: str | None = None


@dataclass
class TemplateFetchResult:
    templates: list[dict]
    error: str | None = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _extract_variables(body: str) -> list[str]:
    """Extract {{1}}, {{2}}... or {{name}} variable placeholders from template body."""
    return re.findall(r"\{\{(\w+)\}\}", body)


def _normalize_phone(phone: str) -> str:
    """Strip +, spaces, dashes. Ensure starts with country code (assume +91 if 10 digits)."""
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        digits = "91" + digits
    return digits


# ── Interakt ───────────────────────────────────────────────────────────────────

async def _send_interakt(api_key: str, to_phone: str, template_name: str, variables: list[str]) -> SendResult:
    """
    Interakt API: https://dev.interakt.ai/reference
    Auth: Basic base64(api_key:)
    """
    import base64
    token = base64.b64encode(f"{api_key}:".encode()).decode()
    phone = _normalize_phone(to_phone)

    payload: dict[str, Any] = {
        "countryCode": f"+{phone[:2]}",
        "phoneNumber": phone[2:],
        "callbackData": "krova_autopilot",
        "type": "Template",
        "template": {
            "name": template_name,
            "languageCode": "en",
            "bodyValues": variables,
        },
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                "https://api.interakt.ai/v1/public/message/",
                json=payload,
                headers={"Authorization": f"Basic {token}", "Content-Type": "application/json"},
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("result"):
                return SendResult(success=True, message_id=data.get("id"))
            return SendResult(success=False, error=data.get("message") or f"HTTP {resp.status_code}")
        except Exception as e:
            return SendResult(success=False, error=str(e))


async def _fetch_interakt_templates(api_key: str) -> TemplateFetchResult:
    import base64
    token = base64.b64encode(f"{api_key}:".encode()).decode()

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                "https://api.interakt.ai/v1/public/templates/",
                headers={"Authorization": f"Basic {token}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                raw = data.get("templates") or data.get("data") or []
                templates = []
                for t in raw:
                    body = t.get("body") or t.get("message") or ""
                    templates.append({
                        "template_id": str(t.get("id") or t.get("elementName", "")),
                        "template_name": t.get("elementName") or t.get("name", ""),
                        "category": (t.get("category") or "utility").lower(),
                        "language": t.get("languageCode") or "en",
                        "body": body,
                        "variables": _extract_variables(body),
                        "status": t.get("status") or "APPROVED",
                    })
                return TemplateFetchResult(templates=templates)
            return TemplateFetchResult(templates=[], error=f"HTTP {resp.status_code}")
        except Exception as e:
            return TemplateFetchResult(templates=[], error=str(e))


# ── Wati ───────────────────────────────────────────────────────────────────────

async def _send_wati(api_key: str, account_id: str, to_phone: str, template_name: str, variables: list[str]) -> SendResult:
    """
    Wati API: https://docs.wati.io/reference
    account_id is the Wati tenant subdomain (e.g. 'live-mt-server.wati.io/12345')
    """
    phone = _normalize_phone(to_phone)
    base = f"https://live-mt-server.wati.io/{account_id}"

    # Wati expects parameters as key-value pairs
    parameters = [{"name": str(i + 1), "value": v} for i, v in enumerate(variables)]

    payload: dict[str, Any] = {
        "template_name": template_name,
        "broadcast_name": "krova_send",
        "parameters": parameters,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                f"{base}/api/v1/sendTemplateMessage?whatsappNumber={phone}",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("result"):
                return SendResult(success=True, message_id=data.get("id"))
            return SendResult(success=False, error=data.get("info") or f"HTTP {resp.status_code}")
        except Exception as e:
            return SendResult(success=False, error=str(e))


async def _fetch_wati_templates(api_key: str, account_id: str) -> TemplateFetchResult:
    base = f"https://live-mt-server.wati.io/{account_id}"

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                f"{base}/api/v1/getMessageTemplates",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                raw = data.get("messageTemplates") or []
                templates = []
                for t in raw:
                    body = t.get("body") or ""
                    templates.append({
                        "template_id": str(t.get("id", "")),
                        "template_name": t.get("elementName") or t.get("name", ""),
                        "category": (t.get("category") or "utility").lower(),
                        "language": t.get("language") or "en",
                        "body": body,
                        "variables": _extract_variables(body),
                        "status": t.get("status") or "APPROVED",
                    })
                return TemplateFetchResult(templates=templates)
            return TemplateFetchResult(templates=[], error=f"HTTP {resp.status_code}")
        except Exception as e:
            return TemplateFetchResult(templates=[], error=str(e))


# ── Gupshup ────────────────────────────────────────────────────────────────────

async def _send_gupshup(api_key: str, source_phone: str, to_phone: str, template_id: str, variables: list[str]) -> SendResult:
    """
    Gupshup Enterprise API
    source_phone is the business's registered WhatsApp number.
    """
    phone = _normalize_phone(to_phone)

    payload: dict[str, Any] = {
        "channel": "whatsapp",
        "source": source_phone,
        "destination": phone,
        "message": {
            "isHSM": "true",
            "type": "template",
            "template": {
                "id": template_id,
                "params": variables,
            },
        },
        "src.name": "KROVA",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                "https://api.gupshup.io/sm/api/v1/template/msg",
                data={"payload": str(payload)},
                headers={"apikey": api_key, "Content-Type": "application/x-www-form-urlencoded"},
            )
            data = resp.json()
            if resp.status_code == 202 and data.get("status") == "submitted":
                return SendResult(success=True, message_id=data.get("messageId"))
            return SendResult(success=False, error=data.get("message") or f"HTTP {resp.status_code}")
        except Exception as e:
            return SendResult(success=False, error=str(e))


async def _fetch_gupshup_templates(api_key: str, source_phone: str) -> TemplateFetchResult:
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                "https://api.gupshup.io/sm/api/v1/templates",
                headers={"apikey": api_key},
            )
            if resp.status_code == 200:
                data = resp.json()
                raw = data.get("templates") or []
                templates = []
                for t in raw:
                    body = t.get("data") or t.get("body") or ""
                    templates.append({
                        "template_id": str(t.get("id") or t.get("elementName", "")),
                        "template_name": t.get("elementName") or t.get("name", ""),
                        "category": (t.get("category") or "utility").lower(),
                        "language": t.get("languageCode") or "en",
                        "body": body,
                        "variables": _extract_variables(body),
                        "status": t.get("status") or "APPROVED",
                    })
                return TemplateFetchResult(templates=templates)
            return TemplateFetchResult(templates=[], error=f"HTTP {resp.status_code}")
        except Exception as e:
            return TemplateFetchResult(templates=[], error=str(e))


# ── Public API ─────────────────────────────────────────────────────────────────

async def send_whatsapp_message(
    platform: str,
    api_key: str,
    to_phone: str,
    template_name: str,
    variables: list[str],
    account_id: str | None = None,
    source_phone: str | None = None,
    template_id: str | None = None,
) -> SendResult:
    """
    Send a WhatsApp template message via the connected BSP.
    Only call this from autopilot worker — requires approved template.
    """
    if platform == "interakt":
        return await _send_interakt(api_key, to_phone, template_name, variables)
    elif platform == "wati":
        if not account_id:
            return SendResult(success=False, error="Wati account_id required")
        return await _send_wati(api_key, account_id, to_phone, template_name, variables)
    elif platform == "gupshup":
        if not source_phone:
            return SendResult(success=False, error="Gupshup source_phone required")
        tid = template_id or template_name
        return await _send_gupshup(api_key, source_phone, to_phone, tid, variables)
    else:
        return SendResult(success=False, error=f"Unknown platform: {platform}")


async def fetch_templates(
    platform: str,
    api_key: str,
    account_id: str | None = None,
    source_phone: str | None = None,
) -> TemplateFetchResult:
    """Fetch all approved templates from the connected BSP."""
    if platform == "interakt":
        return await _fetch_interakt_templates(api_key)
    elif platform == "wati":
        if not account_id:
            return TemplateFetchResult(templates=[], error="Wati account_id required")
        return await _fetch_wati_templates(api_key, account_id)
    elif platform == "gupshup":
        sp = source_phone or ""
        return await _fetch_gupshup_templates(api_key, sp)
    else:
        return TemplateFetchResult(templates=[], error=f"Unknown platform: {platform}")
