"""
KROVA — Structured Logging
JSON logs in production (parseable by Railway/Sentry).
Human-readable colored logs in development.
Every log carries business_id and request context automatically.
"""

import logging
import sys
from typing import Any
from uuid import UUID

from shared.config.settings import settings


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for production.
    Every log line is a valid JSON object — parseable by log aggregators.
    """

    def format(self, record: logging.LogRecord) -> str:
        import json
        import traceback

        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": settings.app_name,
            "environment": settings.environment,
        }

        # Attach any extra fields passed via logger.info("msg", extra={...})
        for key, value in record.__dict__.items():
            if key not in {
                "args", "asctime", "created", "exc_info", "exc_text",
                "filename", "funcName", "id", "levelname", "levelno",
                "lineno", "module", "msecs", "message", "msg", "name",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName", "taskName",
            }:
                payload[key] = str(value) if isinstance(value, UUID) else value

        if record.exc_info:
            payload["exception"] = traceback.format_exception(*record.exc_info)

        return json.dumps(payload, default=str)


class DevFormatter(logging.Formatter):
    """
    Colored formatter for development — readable at a glance.
    """

    COLORS = {
        "DEBUG": "\033[36m",     # cyan
        "INFO": "\033[32m",      # green
        "WARNING": "\033[33m",   # yellow
        "ERROR": "\033[31m",     # red
        "CRITICAL": "\033[35m",  # magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        level = f"{color}{record.levelname:8}{self.RESET}"
        base = f"{self.formatTime(record, '%H:%M:%S')} {level} [{record.name}] {record.getMessage()}"

        # Append extra context fields inline
        extras = []
        skip = {
            "args", "asctime", "created", "exc_info", "exc_text",
            "filename", "funcName", "id", "levelname", "levelno",
            "lineno", "module", "msecs", "message", "msg", "name",
            "pathname", "process", "processName", "relativeCreated",
            "stack_info", "thread", "threadName", "taskName",
        }
        for key, value in record.__dict__.items():
            if key not in skip:
                extras.append(f"{key}={value}")

        if extras:
            base += f"  \033[90m{' '.join(extras)}{self.RESET}"

        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)

        return base


def _build_handler() -> logging.Handler:
    handler = logging.StreamHandler(sys.stdout)
    if settings.is_production:
        handler.setFormatter(StructuredFormatter())
    else:
        handler.setFormatter(DevFormatter())
    return handler


def _configure_root_logger() -> None:
    root = logging.getLogger()
    root.setLevel(settings.log_level)

    # Remove any handlers that may have been added by libraries
    root.handlers.clear()
    root.addHandler(_build_handler())

    # Quiet down noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.is_development else logging.WARNING
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


# Configure once when this module is first imported
_configure_root_logger()


def get_logger(name: str) -> logging.Logger:
    """
    Get a named logger. Use module __name__ as the name.

    Usage:
        logger = get_logger(__name__)
        logger.info("Message saved", extra={"business_id": str(business_id), "channel": "whatsapp"})
    """
    return logging.getLogger(name)
