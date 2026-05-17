"""
KROVA — Auth Dependency
Validates the Supabase JWT on every protected request.
Extracts the current user and their business_id from the token.
Every protected route declares CurrentUser as a parameter — FastAPI injects it.

Flow:
  1. Mobile app / dashboard sends: Authorization: Bearer <supabase_jwt>
  2. This dependency decodes the JWT using the Supabase JWT secret (HS256)
     OR the Supabase JWKS public key (ES256 — newer Supabase projects)
  3. Looks up the user row in our database to get their business_id
  4. Returns a CurrentUser object to the route handler
"""

import base64
import json
import uuid
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.database import get_db
from shared.config.settings import settings
from shared.database.models.business import Business
from shared.database.models.team_member import TeamMember
from shared.database.models.user import User
from shared.utils.errors import AuthenticationError
from shared.utils.logging import get_logger


def _get_jwt_algorithm(token: str) -> str:
    """Peek at the JWT header to determine which algorithm was used."""
    try:
        header_b64 = token.split(".")[0]
        header_b64 += "=" * (4 - len(header_b64) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        return header.get("alg", "HS256")
    except Exception:
        return "HS256"


_jwks_cache: dict | None = None


async def _get_supabase_jwks() -> dict:
    """Fetch and cache Supabase's JWKS public keys for ES256 verification."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url, timeout=5.0)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache

logger = get_logger(__name__)

# FastAPI's built-in Bearer token extractor
_bearer = HTTPBearer(auto_error=False)


class CurrentUser:
    """
    Injected into every protected route handler.
    Contains the authenticated user's identity, their business_id, and role.
    role: "owner" | "manager" | "team_member"
    business_id: None only if user has not completed onboarding yet.
    """

    def __init__(
        self,
        user: User,
        business_id: uuid.UUID | None = None,
        role: str = "owner",
    ) -> None:
        self.id: uuid.UUID = user.id
        self.supabase_user_id: uuid.UUID = user.supabase_user_id
        self.email: str = user.email
        self.is_onboarded: bool = user.is_onboarded
        self.business_id: uuid.UUID | None = business_id
        self.role: str = role

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"

    @property
    def is_manager_or_above(self) -> bool:
        return self.role in ("owner", "manager")


async def _get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """
    Core auth logic — decode JWT, load user from DB.
    Raises HTTP 401 on any failure — never leaks token details to the caller.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    alg = _get_jwt_algorithm(token)

    try:
        if alg == "ES256":
            # Supabase ES256 — verify using JWKS public key
            jwks = await _get_supabase_jwks()
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
        else:
            # Legacy HS256 — verify using shared secret
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as exc:
        logger.warning("JWT decode failed", extra={"error": str(exc), "alg": alg})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Supabase puts the user's UUID in the "sub" claim
    supabase_uid_str: str | None = payload.get("sub")
    if not supabase_uid_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )

    try:
        supabase_uid = uuid.UUID(supabase_uid_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    result = await db.execute(
        select(User).where(
            User.supabase_user_id == supabase_uid,
            User.is_active == True,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        logger.warning(
            "Authenticated user not found in DB",
            extra={"supabase_user_id": str(supabase_uid)},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Resolve business_id and role:
    # 1. Check if they own a business (owner)
    # 2. If not, check if they're an active team member on any business
    biz_result = await db.execute(
        select(Business.id).where(
            Business.owner_user_id == supabase_uid,
            Business.is_active == True,  # noqa: E712
        )
    )
    business_id = biz_result.scalar_one_or_none()
    role = "owner"

    if business_id is None:
        tm_result = await db.execute(
            select(TeamMember).where(
                TeamMember.supabase_user_id == supabase_uid,
                TeamMember.is_active == True,  # noqa: E712
            )
        )
        tm = tm_result.scalar_one_or_none()
        if tm:
            business_id = tm.business_id
            role = tm.role

    return CurrentUser(user, business_id=business_id, role=role)


# Annotated shorthand — use this in route signatures
AuthDep = Annotated[CurrentUser, Depends(_get_current_user)]


def require_business(current_user: CurrentUser) -> uuid.UUID:
    """
    Raise 404 if the user has no active business.
    Returns the business_id directly so routers don't have to re-query.
    Usage: business_id = require_business(current_user)
    """
    if not current_user.business_id:
        raise HTTPException(status_code=404, detail="Business not found")
    return current_user.business_id


def require_owner(current_user: CurrentUser) -> None:
    """Raise 403 if the user is not a business owner."""
    if not current_user.is_owner:
        raise HTTPException(status_code=403, detail="Owner access required")
