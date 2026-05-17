"""
KROVA — Team Router
Owner invites team members who get sub-owner access to the workspace.
Invitation uses Supabase Admin invite — they receive an email, set a password, done.

Endpoints:
  GET    /team                     — list all team members (owner only)
  POST   /team/invite              — invite a new team member by email
  PATCH  /team/{id}                — update role or name
  DELETE /team/{id}                — deactivate team member
  POST   /team/accept              — called after Supabase signup to link supabase_user_id
  PATCH  /customers/{id}/assign    — assign a customer to a team member
  GET    /analytics/team           — per-member performance (owner/manager only)
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep, require_business, require_owner
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.database.models.customer import Customer
from shared.database.models.team_member import TeamMember
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/team", tags=["team"])

VALID_ROLES = {"manager", "team_member"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    name: str
    email: EmailStr
    role: str = "team_member"


class TeamMemberResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool
    has_accepted: bool
    invited_at: str
    accepted_at: str | None
    assigned_customer_count: int


class UpdateMemberRequest(BaseModel):
    name: str | None = None
    role: str | None = None


class AssignCustomerRequest(BaseModel):
    assigned_to: str | None   # supabase_user_id of team member, or null to unassign


# ── Endpoints ─────────────────────────────────────────────────────────────────

class MyRoleResponse(BaseModel):
    role: str   # "owner" | "manager" | "team_member"
    name: str | None
    member_id: str | None


@router.get("/me", response_model=MyRoleResponse)
@limiter.limit(API_LIMIT)
async def get_my_role(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> MyRoleResponse:
    """
    Returns the current user's role within the business.
    Used by the frontend layout to filter nav items for team members.
    Owners are not in the team_members table — inferred from is_owner flag.
    """
    if current_user.is_owner:
        return MyRoleResponse(role="owner", name=None, member_id=None)

    business_id = require_business(current_user)
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.business_id == business_id,
            TeamMember.supabase_user_id == current_user.supabase_user_id,
            TeamMember.is_active == True,  # noqa: E712
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return MyRoleResponse(role="owner", name=None, member_id=None)

    return MyRoleResponse(role=member.role, name=member.name, member_id=str(member.id))


@router.get("", response_model=list[TeamMemberResponse])
@limiter.limit(API_LIMIT)
async def list_team(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> list[TeamMemberResponse]:
    """All team members for this business. Owner and manager can see this."""
    business_id = require_business(current_user)
    if not current_user.is_manager_or_above:
        raise HTTPException(status_code=403, detail="Manager access required")

    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.business_id == business_id)
        .order_by(TeamMember.invited_at.desc())
    )
    members = result.scalars().all()

    # Count assigned customers per member
    counts: dict[uuid.UUID, int] = {}
    if members:
        supabase_ids = [m.supabase_user_id for m in members if m.supabase_user_id]
        if supabase_ids:
            count_result = await db.execute(
                select(Customer.assigned_to, func.count(Customer.id))
                .where(
                    Customer.business_id == business_id,
                    Customer.assigned_to.in_(supabase_ids),
                )
                .group_by(Customer.assigned_to)
            )
            counts = {row[0]: row[1] for row in count_result.all()}

    return [
        TeamMemberResponse(
            id=str(m.id),
            name=m.name,
            email=m.email,
            role=m.role,
            is_active=m.is_active,
            has_accepted=m.accepted_at is not None,
            invited_at=m.invited_at.isoformat(),
            accepted_at=m.accepted_at.isoformat() if m.accepted_at else None,
            assigned_customer_count=counts.get(m.supabase_user_id, 0) if m.supabase_user_id else 0,
        )
        for m in members
    ]


@router.post("/invite", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/hour")
async def invite_team_member(
    request: Request,
    body: InviteRequest,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> TeamMemberResponse:
    """
    Invite a team member by email.
    Sends a Supabase magic-link invite. They sign up, then POST /team/accept to link.
    Owner only.
    """
    require_owner(current_user)
    business_id = require_business(current_user)

    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_ROLES)}")

    # Check not already a member
    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.business_id == business_id,
            TeamMember.email == body.email,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This email is already a team member")

    member = TeamMember(
        business_id=business_id,
        name=body.name,
        email=body.email,
        role=body.role,
    )
    db.add(member)
    await db.flush()

    # Send invite via Supabase Admin API
    await _send_supabase_invite(body.email, str(business_id), body.name)

    await db.commit()
    await db.refresh(member)

    logger.info("Team member invited", extra={"business_id": str(business_id), "email": body.email, "role": body.role})

    return TeamMemberResponse(
        id=str(member.id),
        name=member.name,
        email=member.email,
        role=member.role,
        is_active=member.is_active,
        has_accepted=False,
        invited_at=member.invited_at.isoformat(),
        accepted_at=None,
        assigned_customer_count=0,
    )


@router.post("/accept")
@limiter.limit(API_LIMIT)
async def accept_invite(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Called after team member signs up via Supabase invite.
    Links their supabase_user_id to the pending TeamMember row.
    The JWT tells us who they are — we match by email.
    """
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.email == current_user.email,
            TeamMember.is_active == True,  # noqa: E712
            TeamMember.accepted_at.is_(None),
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="No pending invite found for this email")

    member.supabase_user_id = current_user.supabase_user_id
    member.accepted_at = datetime.now(timezone.utc)
    await db.commit()

    logger.info("Team invite accepted", extra={"member_id": str(member.id), "email": member.email})
    return {"accepted": True, "role": member.role}


@router.patch("/{member_id}", response_model=TeamMemberResponse)
@limiter.limit(API_LIMIT)
async def update_team_member(
    request: Request,
    member_id: uuid.UUID,
    body: UpdateMemberRequest,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> TeamMemberResponse:
    """Update a team member's name or role. Owner only."""
    require_owner(current_user)
    business_id = require_business(current_user)

    if body.role and body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_ROLES)}")

    result = await db.execute(
        select(TeamMember).where(
            TeamMember.id == member_id,
            TeamMember.business_id == business_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    if body.name:
        member.name = body.name
    if body.role:
        member.role = body.role

    await db.commit()
    await db.refresh(member)

    return TeamMemberResponse(
        id=str(member.id),
        name=member.name,
        email=member.email,
        role=member.role,
        is_active=member.is_active,
        has_accepted=member.accepted_at is not None,
        invited_at=member.invited_at.isoformat(),
        accepted_at=member.accepted_at.isoformat() if member.accepted_at else None,
        assigned_customer_count=0,
    )


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(API_LIMIT)
async def deactivate_team_member(
    request: Request,
    member_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Deactivate a team member. Their assigned customers become unassigned. Owner only."""
    require_owner(current_user)
    business_id = require_business(current_user)

    result = await db.execute(
        select(TeamMember).where(
            TeamMember.id == member_id,
            TeamMember.business_id == business_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    member.is_active = False

    # Unassign their customers
    if member.supabase_user_id:
        cust_result = await db.execute(
            select(Customer).where(
                Customer.business_id == business_id,
                Customer.assigned_to == member.supabase_user_id,
            )
        )
        for customer in cust_result.scalars().all():
            customer.assigned_to = None

    await db.commit()
    logger.info("Team member deactivated", extra={"member_id": str(member_id)})


# ── Customer assignment (lives here, shares business context) ─────────────────

assign_router = APIRouter(tags=["team"])


@assign_router.patch("/customers/{customer_id}/assign", response_model=dict)
@limiter.limit(API_LIMIT)
async def assign_customer(
    request: Request,
    customer_id: uuid.UUID,
    body: AssignCustomerRequest,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Assign or unassign a customer to a team member.
    Manager and owner can assign. Team member can only reassign their own customers.
    """
    business_id = require_business(current_user)

    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business_id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Team members can only act on their own assigned customers
    if not current_user.is_manager_or_above:
        if customer.assigned_to != current_user.supabase_user_id:
            raise HTTPException(status_code=403, detail="You can only reassign your own customers")

    if body.assigned_to:
        try:
            assigned_uid = uuid.UUID(body.assigned_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid assigned_to UUID")

        # Verify target is an active team member of this business
        tm_result = await db.execute(
            select(TeamMember).where(
                TeamMember.business_id == business_id,
                TeamMember.supabase_user_id == assigned_uid,
                TeamMember.is_active == True,  # noqa: E712
            )
        )
        if not tm_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Target user is not an active team member")

        customer.assigned_to = assigned_uid
    else:
        customer.assigned_to = None

    await db.commit()
    return {"assigned_to": str(customer.assigned_to) if customer.assigned_to else None}


# ── Supabase invite helper ─────────────────────────────────────────────────────

async def _send_supabase_invite(email: str, business_id: str, name: str) -> None:
    """
    Sends a Supabase magic-link invite via the Admin API.
    On success the user receives an email to set their password.
    We pass business_id in user_metadata so the accept endpoint can match.
    """
    import httpx
    from shared.config.settings import settings

    url = f"{settings.supabase_url}/auth/v1/admin/invite"
    payload = {
        "email": email,
        "data": {
            "full_name": name,
            "invited_to_business": business_id,
            "role": "team_member",
        },
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "apikey": settings.supabase_service_key,
                    "Authorization": f"Bearer {settings.supabase_service_key}",
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code not in (200, 201):
                logger.warning(
                    "Supabase invite failed",
                    extra={"email": email, "status": resp.status_code, "body": resp.text[:200]},
                )
        except Exception as e:
            logger.warning("Supabase invite request failed", extra={"email": email, "error": str(e)})
