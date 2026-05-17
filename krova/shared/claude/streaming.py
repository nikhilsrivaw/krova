"""
KROVA — Server-Sent Events Streaming
Wraps the Claude stream into FastAPI's StreamingResponse format.
The mobile app connects to this and receives words as they arrive —
giving the "thinking and responding in real time" experience.
"""

import json
from typing import AsyncGenerator

from fastapi.responses import StreamingResponse

from shared.claude.client import claude_client
from shared.utils.errors import ClaudeError
from shared.utils.logging import get_logger

logger = get_logger(__name__)


async def stream_conversation_response(
    messages: list[dict],
    system: str,
    business_id: str,
) -> AsyncGenerator[str, None]:
    """
    Yields SSE-formatted chunks from a Claude streaming response.
    Each chunk is: data: {"delta": "word"}\n\n
    Final chunk is: data: {"done": true}\n\n

    The mobile app's EventSource reads these and appends each delta
    to the chat bubble in real time.
    """
    full_response = []

    try:
        async for text_delta in claude_client.stream(
            messages=messages,
            system=system,
        ):
            full_response.append(text_delta)
            payload = json.dumps({"delta": text_delta})
            yield f"data: {payload}\n\n"

        # Signal completion
        yield f"data: {json.dumps({'done': True})}\n\n"

        logger.info(
            "Conversation stream complete",
            extra={
                "business_id": business_id,
                "response_chars": sum(len(c) for c in full_response),
            },
        )

    except ClaudeError as exc:
        error_payload = json.dumps({"error": exc.message})
        yield f"data: {error_payload}\n\n"
        logger.error(
            "Stream error",
            extra={"business_id": business_id, "error": exc.message},
        )


def make_streaming_response(generator: AsyncGenerator[str, None]) -> StreamingResponse:
    """
    Wrap a string generator in a FastAPI StreamingResponse with SSE headers.
    The mobile app's EventSource expects Content-Type: text/event-stream.
    """
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Prevents nginx from buffering the stream
        },
    )
