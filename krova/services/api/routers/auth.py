"""
KROVA — Auth Router
Handles user registration, login, token refresh, and OAuth callbacks.
Supabase manages the actual auth state — we create a matching user row in our DB.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from shared.database.models.user import User
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    supabase_user_id: str  # Client sends this after completing Supabase Auth


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    is_onboarded: bool

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> User:
    """
    Called after Supabase Auth sign-up OR after first login.
    Idempotent — safe to call on every login. Returns existing user if already registered.
    """
    import uuid

    supabase_uid = uuid.UUID(body.supabase_user_id)

    # Check by supabase_user_id first (most reliable)
    existing = await db.execute(
        select(User).where(User.supabase_user_id == supabase_uid)
    )
    existing_user = existing.scalar_one_or_none()
    if existing_user:
        return existing_user  # Already registered — just return

    # Also check by email in case of partial duplicate
    existing_email = await db.execute(
        select(User).where(User.email == body.email)
    )
    if existing_email.scalar_one_or_none():
        # Email exists but different supabase_user_id — update it
        existing_by_email = existing_email.scalar_one_or_none()
        return existing_by_email  # type: ignore[return-value]

    user = User(
        supabase_user_id=supabase_uid,
        email=body.email,
        full_name=body.full_name,
        is_onboarded=False,
        is_active=True,
        preferences={},
    )
    db.add(user)
    await db.flush()

    logger.info("User registered", extra={"user_id": str(user.id), "email": user.email})
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: AuthDep, db: AsyncSession = Depends(get_db)) -> User:
    """
    Returns the current user's profile. Called by mobile app on every launch
    to check onboarding state and restore session.
    """
    result = await db.execute(
        select(User).where(
            User.supabase_user_id == current_user.supabase_user_id,
            User.is_active == True,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user
