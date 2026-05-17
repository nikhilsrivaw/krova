"""
KROVA — Request Logging Middleware
Logs every request with method, path, status code, and duration.
Attaches a unique request_id to every request for tracing across logs.
"""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from shared.utils.logging import get_logger

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every HTTP request as a structured log entry.
    Skips /health to avoid log spam from Railway's health checks.
    """

    SKIP_PATHS = {"/health", "/metrics"}

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())
        # Attach to request state so route handlers can reference it
        request.state.request_id = request_id

        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "HTTP request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else "unknown",
            },
        )

        # Surface request_id in response headers for client-side debugging
        response.headers["X-Request-ID"] = request_id
        return response
