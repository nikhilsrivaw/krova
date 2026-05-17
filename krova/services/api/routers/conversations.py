"""
KROVA — Conversations Router
Real-time chat between the business owner and KROVA.
Claude Sonnet reads the business context + last night's analysis and answers in plain language.

The mobile app experience:
  Owner: "Aaj kya hua?"
  KROVA: "3 hot leads hain — Rahul ne aaj message kiya, Priya ko follow up karo…"

Streaming via Server-Sent Events (SSE) — words appear as Claude generates them.
Session history persisted in DB — owner can scroll back and reference.

Endpoints:
  POST /conversations            — start new session (or return active one)
  POST /conversations/{id}/chat  — send message, stream Claude response
  GET  /conversations/{id}       — get session history
"""

import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.dependencies.auth import AuthDep
from services.api.dependencies.database import get_db
from services.api.middleware.rate_limit import API_LIMIT, limiter
from shared.claude.client import claude_client
from shared.context.builder import build_conversation_context
from shared.database.connection import AsyncSessionLocal
from shared.database.models.action import Action, ActionStatus
from shared.database.models.business import Business
from shared.database.models.conversation import ConversationSession
from shared.prompts.conversation import build_conversation_prompt
from shared.utils.errors import ClaudeError
from shared.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/conversations", tags=["conversations"])

# Max messages kept per session — oldest dropped when exceeded
_MAX_SESSION_MESSAGES = 20


# ── Schemas ───────────────────────────────────────────────────────────────────

class StartSessionResponse(BaseModel):
    session_id: str
    is_new: bool
    title: str | None
    message_count: int


class ChatRequest(BaseModel):
    message: str


class SessionMessage(BaseModel):
    role: str
    content: str
    timestamp: str | None


class SessionResponse(BaseModel):
    session_id: str
    title: str | None
    messages: list[SessionMessage]
    is_active: bool
    created_at: datetime


# ── Business lookup helper ────────────────────────────────────────────────────

async def _get_business_id(current_user, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(
        select(Business.id).where(
            Business.owner_user_id == current_user.supabase_user_id,
            Business.is_active == True,  # noqa: E712
        )
    )
    business_id = result.scalar_one_or_none()
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )
    return business_id


# ── Streaming helper ──────────────────────────────────────────────────────────

async def _stream_and_save(
    session_id: uuid.UUID,
    messages: list[dict],
    system: str,
    business_id: str,
) -> AsyncGenerator[str, None]:
    """
    Streams Claude's response as SSE chunks.
    Saves the full assistant response to the session after streaming completes.
    Uses a separate DB session for the post-stream save — the request session is closed.
    """
    import json

    full_response: list[str] = []
    error_occurred = False

    try:
        async for text_delta in claude_client.stream(messages=messages, system=system):
            full_response.append(text_delta)
            payload = json.dumps({"delta": text_delta})
            yield f"data: {payload}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

        logger.info(
            "Conversation stream complete",
            extra={
                "business_id": business_id,
                "session_id": str(session_id),
                "response_chars": sum(len(c) for c in full_response),
            },
        )

    except ClaudeError as exc:
        error_occurred = True
        error_payload = json.dumps({"error": exc.message})
        yield f"data: {error_payload}\n\n"
        logger.error(
            "Stream error",
            extra={"business_id": business_id, "error": exc.message},
        )

    except Exception as exc:
        error_occurred = True
        error_payload = json.dumps({"error": "AI response failed"})
        yield f"data: {error_payload}\n\n"
        logger.error(
            "Unexpected stream error",
            extra={"business_id": business_id, "error": str(exc)},
            exc_info=True,
        )

    # Save assistant response to session after stream finishes
    if full_response and not error_occurred:
        assistant_text = "".join(full_response)
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(ConversationSession).where(ConversationSession.id == session_id)
                )
                session_row = result.scalar_one_or_none()
                if session_row:
                    msgs = list(session_row.messages or [])
                    msgs.append({
                        "role": "assistant",
                        "content": assistant_text,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                    if len(msgs) > _MAX_SESSION_MESSAGES:
                        msgs = msgs[-_MAX_SESSION_MESSAGES:]
                    await db.execute(
                        update(ConversationSession)
                        .where(ConversationSession.id == session_id)
                        .values(messages=msgs)
                    )
                    await db.commit()
        except Exception as exc:
            # Non-fatal — stream already delivered to client
            logger.error(
                "Failed to save assistant response to session",
                extra={"session_id": str(session_id), "error": str(exc)},
            )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=StartSessionResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(API_LIMIT)
async def start_session(
    request: Request,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> StartSessionResponse:
    """
    Returns the owner's active conversation session.
    If none exists, creates a new one.
    There is only one active session per business at a time.
    """
    business_id = await _get_business_id(current_user, db)

    # Return existing active session if one exists
    existing_result = await db.execute(
        select(ConversationSession).where(
            ConversationSession.business_id == business_id,
            ConversationSession.is_active == True,  # noqa: E712
        )
        .order_by(ConversationSession.created_at.desc())
        .limit(1)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        return StartSessionResponse(
            session_id=str(existing.id),
            is_new=False,
            title=existing.title,
            message_count=len(existing.messages or []),
        )

    # Create new session
    session = ConversationSession(
        business_id=business_id,
        user_id=current_user.id,
        messages=[],
        is_active=True,
    )
    db.add(session)
    await db.flush()

    logger.info(
        "New conversation session created",
        extra={"session_id": str(session.id), "business_id": str(business_id)},
    )

    return StartSessionResponse(
        session_id=str(session.id),
        is_new=True,
        title=None,
        message_count=0,
    )


@router.post("/{session_id}/chat")
@limiter.limit(API_LIMIT)
async def chat(
    request: Request,
    session_id: uuid.UUID,
    body: ChatRequest,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Sends a message to KROVA and streams the response word-by-word via SSE.
    The mobile app reads the stream and appends each delta to the chat bubble.

    Response format (each line):
      data: {"delta": "word"}\n\n     — partial response
      data: {"done": true}\n\n         — stream complete
      data: {"error": "message"}\n\n   — on failure
    """
    business_id = await _get_business_id(current_user, db)

    # Verify session belongs to this business
    session_result = await db.execute(
        select(ConversationSession).where(
            ConversationSession.id == session_id,
            ConversationSession.business_id == business_id,
        )
    )
    session_row = session_result.scalar_one_or_none()

    if session_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Validate message
    message = body.message.strip()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty",
        )

    # ── Save user message to session ─────────────────────────────────────────
    msgs = list(session_row.messages or [])
    msgs.append({
        "role": "user",
        "content": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Auto-title the session from the first user message
    title = session_row.title
    if title is None and message:
        title = message[:80]

    if len(msgs) > _MAX_SESSION_MESSAGES:
        msgs = msgs[-_MAX_SESSION_MESSAGES:]

    await db.execute(
        update(ConversationSession)
        .where(ConversationSession.id == session_id)
        .values(messages=msgs, title=title)
    )
    await db.commit()

    # ── Build conversation context ────────────────────────────────────────────
    ctx = await build_conversation_context(business_id, db)

    # Pending actions count — included in system prompt
    pending_count_result = await db.execute(
        select(func.count(Action.id)).where(
            Action.business_id == business_id,
            Action.status == ActionStatus.pending,
        )
    )
    pending_count = pending_count_result.scalar() or 0

    # Conversation history for Claude — exclude the current message (already in msgs)
    history_for_claude = [
        {"role": m["role"], "content": m["content"]}
        for m in msgs[:-1]  # all but the last (current) user message
        if m["role"] in ("user", "assistant")
    ]

    # ── Build prompt ──────────────────────────────────────────────────────────
    prompt_result = build_conversation_prompt(
        business_name=ctx.get("business_name", ""),
        business_type=ctx.get("business_type", ""),
        business_context=ctx.get("business_context"),
        analysis_summary=ctx.get("analysis_summary"),
        hot_leads=ctx.get("hot_leads", []),
        at_risk_customers=ctx.get("at_risk_customers", []),
        pending_actions_count=pending_count,
        conversation_history=history_for_claude,
        owner_question=message,
    )

    system = prompt_result[0]["system"]
    claude_messages = prompt_result[0]["messages"]

    # ── Stream response ───────────────────────────────────────────────────────
    generator = _stream_and_save(
        session_id=session_id,
        messages=claude_messages,
        system=system,
        business_id=str(business_id),
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Prevents nginx buffering the stream
        },
    )


@router.get("/{session_id}", response_model=SessionResponse)
@limiter.limit(API_LIMIT)
async def get_session(
    request: Request,
    session_id: uuid.UUID,
    current_user: AuthDep,
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """
    Returns the full message history of a conversation session.
    Used when the owner returns to the app and wants to scroll back.
    """
    business_id = await _get_business_id(current_user, db)

    result = await db.execute(
        select(ConversationSession).where(
            ConversationSession.id == session_id,
            ConversationSession.business_id == business_id,
        )
    )
    session_row = result.scalar_one_or_none()

    if session_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    messages = [
        SessionMessage(
            role=m.get("role", "user"),
            content=m.get("content", ""),
            timestamp=m.get("timestamp"),
        )
        for m in (session_row.messages or [])
    ]

    return SessionResponse(
        session_id=str(session_row.id),
        title=session_row.title,
        messages=messages,
        is_active=session_row.is_active,
        created_at=session_row.created_at,
    )
