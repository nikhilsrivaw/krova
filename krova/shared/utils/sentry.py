"""
KROVA — Sentry initialisation helper.
Called once at the top of every worker's main() so all errors are captured.
No-ops cleanly when SENTRY_DSN is not set (local dev).
"""

import sentry_sdk
from shared.config.settings import settings
from shared.utils.logging import get_logger

logger = get_logger(__name__)


def init_sentry(service_name: str) -> None:
    """
    Initialise Sentry for a worker or API service.
    Pass the service name so errors are tagged by origin in the Sentry dashboard.

    Usage:
        from shared.utils.sentry import init_sentry
        init_sentry("worker-messages")
    """
    if not settings.sentry_dsn:
        return

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=settings.app_version,
        send_default_pii=False,
        traces_sample_rate=0.05,  # Workers: low trace rate — they run in tight loops
    )
    sentry_sdk.set_tag("service", service_name)
    logger.info("Sentry initialised", extra={"service": service_name})
