"""
KROVA — Connected Platforms Router
Business owners connect their BSP (Interakt / Wati / Gupshup) here.
API keys are encrypted at rest — never returned in plaintext.

Endpoints:
  GET    /platforms              — list connected platforms (masked keys)
  POST   /platforms/connect      — connect a new BSP with API key
  DELETE /platforms/{id}         — disconnect a platform
  POST   /platforms/{id}/sync    — trigger template sync for a platform
  GET    /platforms/templates    — list all synced templates
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.database.models.business import Business
from shared.database.models.platform import ConnectedPlatform, MessageTemplate
from shared.utils.encryption import decrypt, encrypt
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/platforms", tags=["platforms"])

SUPPORTED_PLATFORMS = {"interakt", "wati", "gupshup"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class ConnectPlatformRequest(BaseModel):
    platform: str
    api_key: str
    account_id: str | None = None    # Wati: tenant account ID
    source_phone: str | None = None  # Gupshup: registered WhatsApp sender number


class ConnectedPlatformResponse(BaseModel):
    id: str
    platform: str
    api_key_masked: str              # last 4 chars only
    account_id: str | None
    source_phone: str | None
    is_active: bool
    template_count: int
    last_synced_at: str | None
    connected_at: str


class TemplateResponse(BaseModel):
    id: str
    platform_id: str
    template_id: str
    template_name: str
    category: str | None
    language: str
    body: str
    variables: list
    status: str | None
    is_active: bool


# ── Business lookup helper ────────────────────────────────────────────────────

async def _get_business(current_user, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(
            Business.owner_user_id == current_user.supabase_user_id,
            Business.is_active == True,  # noqa: E712
        )
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business


def _mask_key(key: str) -> str:
    """Return ****...last4 representation."""
    if len(key) <= 4:
        return "****"
    return "****" + key[-4:]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ConnectedPlatformResponse])
@limiter.limit(API_LIMIT)
async def list_platforms(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[ConnectedPlatformResponse]:
    """All BSP integrations connected to this business."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(ConnectedPlatform)
        .where(ConnectedPlatform.business_id == business.id)
        .order_by(ConnectedPlatform.connected_at.desc())
    )
    platforms = result.scalars().all()

    return [
        ConnectedPlatformResponse(
            id=str(p.id),
            platform=p.platform,
            api_key_masked=_mask_key(decrypt(p.api_key_encrypted)),
            account_id=p.account_id,
            source_phone=p.source_phone,
            is_active=p.is_active,
            template_count=p.template_count,
            last_synced_at=p.last_synced_at.isoformat() if p.last_synced_at else None,
            connected_at=p.connected_at.isoformat(),
        )
        for p in platforms
    ]


@router.post("/connect", response_model=ConnectedPlatformResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def connect_platform(
    request: Request,
    body: ConnectPlatformRequest,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> ConnectedPlatformResponse:
    """
    Connect a BSP. Validates the API key by fetching templates immediately.
    If the key is wrong, returns 400 — we never save invalid credentials.
    """
    if body.platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform. Choose: {', '.join(SUPPORTED_PLATFORMS)}")
    if body.platform == "wati" and not body.account_id:
        raise HTTPException(status_code=400, detail="Wati requires account_id (your Wati tenant ID)")
    if body.platform == "gupshup" and not body.source_phone:
        raise HTTPException(status_code=400, detail="Gupshup requires source_phone (registered sender number)")

    business = await _get_business(current_user, db)

    # Validate the key by attempting a template fetch
    from services.workers.bsp_sender import fetch_templates
    result = await fetch_templates(
        platform=body.platform,
        api_key=body.api_key,
        account_id=body.account_id,
        source_phone=body.source_phone,
    )
    if result.error and not result.templates:
        raise HTTPException(status_code=400, detail=f"Could not verify API key: {result.error}")

    # Upsert — if already exists, update the key
    existing = await db.execute(
        select(ConnectedPlatform).where(
            ConnectedPlatform.business_id == business.id,
            ConnectedPlatform.platform == body.platform,
        )
    )
    platform_row = existing.scalar_one_or_none()

    encrypted_key = encrypt(body.api_key)

    if platform_row:
        platform_row.api_key_encrypted = encrypted_key
        platform_row.account_id = body.account_id
        platform_row.source_phone = body.source_phone
        platform_row.is_active = True
    else:
        platform_row = ConnectedPlatform(
            business_id=business.id,
            platform=body.platform,
            api_key_encrypted=encrypted_key,
            account_id=body.account_id,
            source_phone=body.source_phone,
        )
        db.add(platform_row)

    await db.flush()

    # Save templates returned by validation fetch
    if result.templates:
        await _upsert_templates(db, business.id, platform_row.id, result.templates)
        platform_row.template_count = len(result.templates)
        platform_row.last_synced_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(platform_row)

    logger.info(
        "BSP platform connected",
        extra={"business_id": str(business.id), "platform": body.platform, "templates": len(result.templates)},
    )

    return ConnectedPlatformResponse(
        id=str(platform_row.id),
        platform=platform_row.platform,
        api_key_masked=_mask_key(body.api_key),
        account_id=platform_row.account_id,
        source_phone=platform_row.source_phone,
        is_active=platform_row.is_active,
        template_count=platform_row.template_count,
        last_synced_at=platform_row.last_synced_at.isoformat() if platform_row.last_synced_at else None,
        connected_at=platform_row.connected_at.isoformat(),
    )


@router.delete("/{platform_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(API_LIMIT)
async def disconnect_platform(
    request: Request,
    platform_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Disconnect a BSP — deletes the encrypted key and all synced templates."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(ConnectedPlatform).where(
            ConnectedPlatform.id == platform_id,
            ConnectedPlatform.business_id == business.id,
        )
    )
    platform_row = result.scalar_one_or_none()
    if not platform_row:
        raise HTTPException(status_code=404, detail="Platform not found")

    await db.delete(platform_row)
    await db.commit()

    logger.info("BSP platform disconnected", extra={"business_id": str(business.id), "platform": platform_row.platform})


@router.post("/{platform_id}/sync", response_model=ConnectedPlatformResponse)
@limiter.limit("5/minute")
async def sync_templates(
    request: Request,
    platform_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> ConnectedPlatformResponse:
    """Re-fetch templates from BSP. Call after adding new templates in BSP dashboard."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(ConnectedPlatform).where(
            ConnectedPlatform.id == platform_id,
            ConnectedPlatform.business_id == business.id,
        )
    )
    platform_row = result.scalar_one_or_none()
    if not platform_row:
        raise HTTPException(status_code=404, detail="Platform not found")

    api_key = decrypt(platform_row.api_key_encrypted)
    from services.workers.bsp_sender import fetch_templates
    fetch_result = await fetch_templates(
        platform=platform_row.platform,
        api_key=api_key,
        account_id=platform_row.account_id,
        source_phone=platform_row.source_phone,
    )

    if fetch_result.error and not fetch_result.templates:
        raise HTTPException(status_code=502, detail=f"BSP sync failed: {fetch_result.error}")

    await _upsert_templates(db, business.id, platform_row.id, fetch_result.templates)
    platform_row.template_count = len(fetch_result.templates)
    platform_row.last_synced_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(platform_row)

    return ConnectedPlatformResponse(
        id=str(platform_row.id),
        platform=platform_row.platform,
        api_key_masked=_mask_key(decrypt(platform_row.api_key_encrypted)),
        account_id=platform_row.account_id,
        source_phone=platform_row.source_phone,
        is_active=platform_row.is_active,
        template_count=platform_row.template_count,
        last_synced_at=platform_row.last_synced_at.isoformat() if platform_row.last_synced_at else None,
        connected_at=platform_row.connected_at.isoformat(),
    )


@router.get("/templates", response_model=list[TemplateResponse])
@limiter.limit(API_LIMIT)
async def list_templates(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[TemplateResponse]:
    """All approved WhatsApp templates synced from connected BSPs."""
    business = await _get_business(current_user, db)

    result = await db.execute(
        select(MessageTemplate)
        .where(
            MessageTemplate.business_id == business.id,
            MessageTemplate.is_active == True,  # noqa: E712
        )
        .order_by(MessageTemplate.template_name)
    )
    templates = result.scalars().all()

    return [
        TemplateResponse(
            id=str(t.id),
            platform_id=str(t.platform_id),
            template_id=t.template_id,
            template_name=t.template_name,
            category=t.category,
            language=t.language,
            body=t.body,
            variables=t.variables,
            status=t.status,
            is_active=t.is_active,
        )
        for t in templates
    ]


# ── Template upsert helper ────────────────────────────────────────────────────

async def _upsert_templates(
    db: AsyncSession,
    business_id: uuid.UUID,
    platform_id: uuid.UUID,
    templates: list[dict],
) -> None:
    """
    Sync templates from BSP fetch result into message_templates table.
    Upserts by (platform_id, template_id) — updates body/status if already exists.
    """
    existing_result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.platform_id == platform_id)
    )
    existing = {t.template_id: t for t in existing_result.scalars().all()}

    for t in templates:
        tid = t["template_id"]
        if tid in existing:
            row = existing[tid]
            row.body = t["body"]
            row.variables = t["variables"]
            row.status = t.get("status")
            row.is_active = t.get("status") == "APPROVED"
            row.synced_at = datetime.now(timezone.utc)
        else:
            row = MessageTemplate(
                business_id=business_id,
                platform_id=platform_id,
                template_id=tid,
                template_name=t["template_name"],
                category=t.get("category"),
                language=t.get("language", "en"),
                body=t["body"],
                variables=t.get("variables", []),
                status=t.get("status"),
                is_active=t.get("status") == "APPROVED",
            )
            db.add(row)
