"""
KROVA — Channel OAuth Router
Manages the OAuth flows for connecting Gmail, Instagram, and WhatsApp Business.

Endpoints:
  GET  /channels/status                    — which channels are connected for this business
  GET  /channels/gmail/oauth-url           — generate Google OAuth URL (authenticated)
  GET  /channels/gmail/callback            — Google redirects here after auth (public)
  DELETE /channels/gmail                   — disconnect Gmail
  GET  /channels/instagram/oauth-url       — generate Meta/Instagram OAuth URL (authenticated)
  GET  /channels/instagram/callback        — Meta redirects here after auth (public)
  DELETE /channels/instagram               — disconnect Instagram
  POST /channels/whatsapp                  — save WhatsApp Cloud API phone number ID
  DELETE /channels/whatsapp                — disconnect WhatsApp Cloud API

OAuth flow:
  1. Frontend calls GET /channels/{channel}/oauth-url (JWT required) → gets back { url }
  2. Frontend redirects user to that URL (or opens popup)
  3. Provider redirects to /channels/{channel}/callback?code=...&state=...
  4. Backend exchanges code → stores tokens encrypted → redirects to frontend settings page
  5. Frontend shows "Connected" status

State token: encrypted business_id with Fernet — tamper-proof without extra DB calls.
"""

import base64
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.config.settings import settings
from shared.database.models.business import Business
from shared.encryption.tokens import decrypt_token, encrypt_token
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/channels", tags=["channels"])

# ── Helpers ───────────────────────────────────────────────────────────────────

FRONTEND_BASE = "http://localhost:3000"  # overridden by FRONTEND_URL env var if set

def _get_frontend_base() -> str:
    import os
    return os.environ.get("FRONTEND_URL", FRONTEND_BASE)


def _make_state(business_id: str) -> str:
    """Encrypt business_id into a tamper-proof state token."""
    encrypted = encrypt_token(business_id)
    return base64.urlsafe_b64encode(encrypted.encode()).decode()


def _read_state(state: str) -> str:
    """Decrypt state token back to business_id. Raises on invalid state."""
    try:
        encrypted = base64.urlsafe_b64decode(state.encode()).decode()
        return decrypt_token(encrypted)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")


async def _get_business_for_user(current_user: AuthDep, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(
            Business.owner_user_id == current_user.supabase_user_id,
            Business.is_active == True,  # noqa: E712
        )
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return biz


# ── Channel Status ────────────────────────────────────────────────────────────

class ChannelStatusResponse(BaseModel):
    gmail: bool
    instagram: bool
    whatsapp: bool
    outlook: bool
    gmail_email: str | None
    instagram_username: str | None
    whatsapp_phone_number_id: str | None
    outlook_email: str | None


@router.get("/status", response_model=ChannelStatusResponse)
@limiter.limit(API_LIMIT)
async def get_channel_status(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> ChannelStatusResponse:
    """Returns which channels are connected for this business."""
    biz = await _get_business_for_user(current_user, db)
    extra = biz.extra_data or {}

    gmail_creds = extra.get("gmail_credentials")
    instagram_creds = extra.get("instagram_credentials")
    whatsapp_id = extra.get("whatsapp_phone_number_id")
    outlook_creds = extra.get("outlook_credentials")

    return ChannelStatusResponse(
        gmail=bool(gmail_creds),
        instagram=bool(instagram_creds),
        whatsapp=bool(whatsapp_id),
        outlook=bool(outlook_creds),
        gmail_email=extra.get("gmail_email"),
        instagram_username=extra.get("instagram_username"),
        whatsapp_phone_number_id=whatsapp_id,
        outlook_email=extra.get("outlook_email"),
    )


# ── Gmail OAuth ───────────────────────────────────────────────────────────────

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


class OAuthUrlResponse(BaseModel):
    url: str


@router.get("/gmail/oauth-url", response_model=OAuthUrlResponse)
@limiter.limit(API_LIMIT)
async def get_gmail_oauth_url(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> OAuthUrlResponse:
    """
    Returns the Google OAuth URL for connecting Gmail.
    Frontend redirects the user to this URL.
    """
    biz = await _get_business_for_user(current_user, db)
    state = _make_state(str(biz.id))

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return OAuthUrlResponse(url=url)


@router.get("/gmail/callback")
async def gmail_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """
    Google redirects here after the owner grants Gmail access.
    Exchanges auth code for refresh token, stores encrypted in business.extra_data.
    """
    import httpx

    business_id = _read_state(state)
    frontend = _get_frontend_base()

    # Exchange auth code for tokens
    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            # Get user email
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            user_info = user_resp.json() if user_resp.is_success else {}
    except Exception as exc:
        logger.error("Gmail OAuth token exchange failed", extra={"error": str(exc)})
        return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=gmail_auth_failed", status_code=302)

    # Store credentials encrypted in business.extra_data
    from sqlalchemy import UUID as SA_UUID
    import uuid

    try:
        biz_result = await db.execute(
            select(Business).where(Business.id == uuid.UUID(business_id))
        )
        biz = biz_result.scalar_one_or_none()
        if not biz:
            return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=business_not_found", status_code=302)

        extra = dict(biz.extra_data or {})
        # Only store what's needed — access_token is short-lived, we keep refresh_token
        raw_refresh = tokens.get("refresh_token", "")
        extra["gmail_credentials"] = {
            "refresh_token_encrypted": encrypt_token(raw_refresh) if raw_refresh else "",
            "email": user_info.get("email", ""),
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "scopes": GMAIL_SCOPES,
        }
        extra["gmail_email"] = user_info.get("email", "")
        biz.extra_data = extra
        await db.commit()

        logger.info("Gmail connected", extra={"business_id": business_id, "email": extra["gmail_email"]})
    except Exception as exc:
        logger.error("Failed to store Gmail credentials", extra={"error": str(exc)})
        return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=gmail_store_failed", status_code=302)

    return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&connected=gmail", status_code=302)


@router.delete("/gmail")
@limiter.limit(API_LIMIT)
async def disconnect_gmail(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Remove Gmail credentials for this business."""
    biz = await _get_business_for_user(current_user, db)
    extra = dict(biz.extra_data or {})
    extra.pop("gmail_credentials", None)
    extra.pop("gmail_email", None)
    extra.pop("gmail_last_synced_at", None)
    biz.extra_data = extra
    await db.commit()
    logger.info("Gmail disconnected", extra={"business_id": str(biz.id)})
    return {"disconnected": True}


# ── Instagram OAuth ───────────────────────────────────────────────────────────

@router.get("/instagram/oauth-url", response_model=OAuthUrlResponse)
@limiter.limit(API_LIMIT)
async def get_instagram_oauth_url(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> OAuthUrlResponse:
    """
    Returns the Meta (Instagram Graph API) OAuth URL.
    Requests instagram_basic + instagram_manage_messages permissions.
    """
    biz = await _get_business_for_user(current_user, db)
    state = _make_state(str(biz.id))

    # Instagram callback URL (configure this in Meta App Dashboard)
    instagram_redirect = f"{settings.google_redirect_uri.rsplit('/', 2)[0]}/channels/instagram/callback"

    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": instagram_redirect,
        "response_type": "code",
        "scope": "instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging",
        "state": state,
    }
    url = "https://www.facebook.com/v18.0/dialog/oauth?" + urllib.parse.urlencode(params)
    return OAuthUrlResponse(url=url)


@router.get("/instagram/callback")
async def instagram_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """
    Meta redirects here after the owner grants Instagram access.
    Exchanges code for a long-lived access token, stores in business.extra_data.
    """
    import httpx, uuid

    business_id = _read_state(state)
    frontend = _get_frontend_base()
    instagram_redirect = f"{settings.google_redirect_uri.rsplit('/', 2)[0]}/channels/instagram/callback"

    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for short-lived token
            token_resp = await client.get(
                f"https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "client_id": settings.meta_app_id,
                    "client_secret": settings.meta_app_secret,
                    "redirect_uri": instagram_redirect,
                    "code": code,
                },
            )
            token_resp.raise_for_status()
            short_token = token_resp.json().get("access_token", "")

            # Exchange for long-lived token (60-day)
            long_resp = await client.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": settings.meta_app_id,
                    "client_secret": settings.meta_app_secret,
                    "fb_exchange_token": short_token,
                },
            )
            long_token_data = long_resp.json() if long_resp.is_success else {}
            long_token = long_token_data.get("access_token", short_token)

            # Get Instagram username from linked IG account
            me_resp = await client.get(
                "https://graph.facebook.com/v18.0/me/accounts",
                params={"access_token": long_token, "fields": "name,instagram_business_account{username}"},
            )
            me_data = me_resp.json() if me_resp.is_success else {}
            pages = me_data.get("data", [])
            ig_username = None
            ig_account_id = None
            page_access_token = long_token
            for page in pages:
                ig_acct = page.get("instagram_business_account", {})
                if ig_acct:
                    ig_username = ig_acct.get("username")
                    ig_account_id = ig_acct.get("id")
                    break

    except Exception as exc:
        logger.error("Instagram OAuth failed", extra={"error": str(exc)})
        return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=instagram_auth_failed", status_code=302)

    try:
        biz_result = await db.execute(
            select(Business).where(Business.id == uuid.UUID(business_id))
        )
        biz = biz_result.scalar_one_or_none()
        if not biz:
            return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=business_not_found", status_code=302)

        extra = dict(biz.extra_data or {})
        extra["instagram_credentials"] = {
            "access_token": long_token,
            "account_id": ig_account_id,
        }
        extra["instagram_username"] = ig_username
        biz.extra_data = extra
        await db.commit()
        logger.info("Instagram connected", extra={"business_id": business_id, "username": ig_username})
    except Exception as exc:
        logger.error("Failed to store Instagram credentials", extra={"error": str(exc)})
        return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=instagram_store_failed", status_code=302)

    return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&connected=instagram", status_code=302)


@router.delete("/instagram")
@limiter.limit(API_LIMIT)
async def disconnect_instagram(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    biz = await _get_business_for_user(current_user, db)
    extra = dict(biz.extra_data or {})
    extra.pop("instagram_credentials", None)
    extra.pop("instagram_username", None)
    biz.extra_data = extra
    await db.commit()
    return {"disconnected": True}


# ── WhatsApp Cloud API ────────────────────────────────────────────────────────

class WhatsAppConnectBody(BaseModel):
    phone_number_id: str
    display_phone_number: str | None = None


@router.post("/whatsapp")
@limiter.limit(API_LIMIT)
async def connect_whatsapp(
    request: Request,
    body: WhatsAppConnectBody,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Save the WhatsApp Cloud API phone_number_id for this business.
    The access token is META_APP_SECRET (already in settings).
    Owner gets this from their Meta Business Manager → WhatsApp → Phone numbers.
    """
    if not body.phone_number_id.strip():
        raise HTTPException(status_code=400, detail="phone_number_id is required")

    biz = await _get_business_for_user(current_user, db)
    extra = dict(biz.extra_data or {})
    extra["whatsapp_phone_number_id"] = body.phone_number_id.strip()
    if body.display_phone_number:
        extra["whatsapp_display_phone"] = body.display_phone_number.strip()
    biz.extra_data = extra
    await db.commit()
    return {"connected": True, "phone_number_id": body.phone_number_id}


@router.delete("/whatsapp")
@limiter.limit(API_LIMIT)
async def disconnect_whatsapp(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    biz = await _get_business_for_user(current_user, db)
    extra = dict(biz.extra_data or {})
    extra.pop("whatsapp_phone_number_id", None)
    extra.pop("whatsapp_display_phone", None)
    biz.extra_data = extra
    await db.commit()
    return {"disconnected": True}


# ── Outlook OAuth ─────────────────────────────────────────────────────────────

OUTLOOK_SCOPES = [
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/User.Read",
    "offline_access",
]


@router.get("/outlook/oauth-url", response_model=OAuthUrlResponse)
@limiter.limit(API_LIMIT)
async def get_outlook_oauth_url(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> OAuthUrlResponse:
    """
    Returns the Microsoft OAuth URL for connecting Outlook/Office 365.
    Frontend redirects the user to this URL.
    """
    biz = await _get_business_for_user(current_user, db)
    state = _make_state(str(biz.id))

    params = {
        "client_id": settings.microsoft_client_id,
        "redirect_uri": settings.microsoft_redirect_uri,
        "response_type": "code",
        "scope": " ".join(OUTLOOK_SCOPES),
        "response_mode": "query",
        "state": state,
    }
    tenant_id = settings.microsoft_tenant_id
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize?" + urllib.parse.urlencode(params)
    return OAuthUrlResponse(url=url)


@router.get("/outlook/callback")
async def outlook_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """
    Microsoft redirects here after the owner grants Outlook access.
    Exchanges auth code for refresh token, stores encrypted in business.extra_data.
    """
    import httpx, uuid

    business_id = _read_state(state)
    frontend = _get_frontend_base()
    tenant_id = settings.microsoft_tenant_id
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                token_url,
                data={
                    "code": code,
                    "client_id": settings.microsoft_client_id,
                    "client_secret": settings.microsoft_client_secret,
                    "redirect_uri": settings.microsoft_redirect_uri,
                    "grant_type": "authorization_code",
                    "scope": " ".join(OUTLOOK_SCOPES),
                },
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            # Get user's email from Microsoft Graph
            me_resp = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
                params={"$select": "mail,userPrincipalName,displayName"},
            )
            me_data = me_resp.json() if me_resp.is_success else {}
    except Exception as exc:
        logger.error("Outlook OAuth token exchange failed", extra={"error": str(exc)})
        return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=outlook_auth_failed", status_code=302)

    try:
        biz_result = await db.execute(
            select(Business).where(Business.id == uuid.UUID(business_id))
        )
        biz = biz_result.scalar_one_or_none()
        if not biz:
            return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=business_not_found", status_code=302)

        raw_refresh = tokens.get("refresh_token", "")
        owner_email = me_data.get("mail") or me_data.get("userPrincipalName") or ""
        extra = dict(biz.extra_data or {})
        extra["outlook_credentials"] = {
            "refresh_token_encrypted": encrypt_token(raw_refresh) if raw_refresh else "",
            "email": owner_email,
            "tenant_id": tenant_id,
            "scopes": OUTLOOK_SCOPES,
        }
        extra["outlook_email"] = owner_email
        biz.extra_data = extra
        await db.commit()
        logger.info("Outlook connected", extra={"business_id": business_id, "email": owner_email})
    except Exception as exc:
        logger.error("Failed to store Outlook credentials", extra={"error": str(exc)})
        return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&error=outlook_store_failed", status_code=302)

    return RedirectResponse(f"{frontend}/dashboard/settings?tab=channels&connected=outlook", status_code=302)


@router.delete("/outlook")
@limiter.limit(API_LIMIT)
async def disconnect_outlook(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    biz = await _get_business_for_user(current_user, db)
    extra = dict(biz.extra_data or {})
    extra.pop("outlook_credentials", None)
    extra.pop("outlook_email", None)
    extra.pop("outlook_last_synced_at", None)
    biz.extra_data = extra
    await db.commit()
    logger.info("Outlook disconnected", extra={"business_id": str(biz.id)})
    return {"disconnected": True}
