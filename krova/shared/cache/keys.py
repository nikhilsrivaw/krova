"""
KROVA — Cache Key Definitions
All Redis cache keys defined in one place.
No magic strings anywhere else in the codebase.
Every key has a documented TTL and invalidation rule.

Naming convention: krova:{resource}:{id}:{sub-resource}
"""

from uuid import UUID


class CacheKeys:
    """
    Static factory methods for every cache key used in KROVA.
    Always use these — never construct cache key strings manually.

    TTL guide:
        BUSINESS_SUMMARY    — 12 hours (refreshed after nightly analysis)
        CUSTOMER_LIST       — 5 minutes (invalidated on new message or action)
        ANALYSIS_RESULTS    — 12 hours (refreshed after nightly analysis)
        PENDING_ACTIONS     — 30 seconds (must stay fresh — owner is waiting)
        HEALTH_CHECK        — 30 seconds
    """

    # ── Business ──────────────────────────────────────────────────────────────
    @staticmethod
    def business_summary(business_id: UUID) -> str:
        """
        Pre-computed business summary for dashboard overview page.
        TTL: 43200 seconds (12 hours).
        Invalidated: before each nightly analysis run.
        """
        return f"krova:business:{business_id}:summary"

    @staticmethod
    def business_context(business_id: UUID) -> str:
        """
        Business context blob fed into Claude prompts.
        TTL: 3600 seconds (1 hour).
        Invalidated: when owner updates business settings.
        """
        return f"krova:business:{business_id}:context"

    # ── Customers ─────────────────────────────────────────────────────────────
    @staticmethod
    def customer_list(business_id: UUID) -> str:
        """
        Paginated customer list for dashboard.
        TTL: 300 seconds (5 minutes).
        Invalidated: on any new message or status change.
        """
        return f"krova:business:{business_id}:customers"

    @staticmethod
    def customer_detail(business_id: UUID, customer_id: UUID) -> str:
        """
        Single customer profile + recent messages.
        TTL: 300 seconds (5 minutes).
        Invalidated: on new message from this customer or action taken.
        """
        return f"krova:business:{business_id}:customer:{customer_id}"

    # ── Analysis ──────────────────────────────────────────────────────────────
    @staticmethod
    def latest_analysis(business_id: UUID) -> str:
        """
        Last night's full analysis results for a business.
        TTL: 43200 seconds (12 hours).
        Invalidated: when new analysis completes.
        """
        return f"krova:business:{business_id}:analysis:latest"

    @staticmethod
    def analysis_date(business_id: UUID, date: str) -> str:
        """
        Analysis for a specific date (YYYY-MM-DD).
        TTL: 0 (no expiry — historical data never changes).
        """
        return f"krova:business:{business_id}:analysis:{date}"

    # ── Actions ───────────────────────────────────────────────────────────────
    @staticmethod
    def pending_actions(business_id: UUID) -> str:
        """
        List of actions waiting for owner approval.
        TTL: 30 seconds — must be near real-time.
        Invalidated: immediately when owner approves or rejects.
        """
        return f"krova:business:{business_id}:actions:pending"

    # ── Rate Limiter ──────────────────────────────────────────────────────────
    @staticmethod
    def claude_token_bucket() -> str:
        """
        Redis key for the Claude API token bucket rate limiter.
        No TTL — the bucket logic manages its own state.
        """
        return "krova:claude:token_bucket"

    # ── Health ────────────────────────────────────────────────────────────────
    @staticmethod
    def health_check() -> str:
        """TTL: 30 seconds."""
        return "krova:health"

    # ── Nightly Analysis Job ──────────────────────────────────────────────────
    @staticmethod
    def analysis_job_lock(date: str) -> str:
        """
        Distributed lock key to prevent the nightly job from running twice.
        TTL: 3600 seconds (1 hour) — longer than any expected analysis run.
        """
        return f"krova:analysis:lock:{date}"

    @staticmethod
    def analysis_batch_id(business_id: UUID, date: str) -> str:
        """
        Anthropic Batch API request ID for a given business + date.
        Used to poll for batch results.
        TTL: 86400 seconds (24 hours — max Anthropic batch retention).
        """
        return f"krova:analysis:batch:{business_id}:{date}"
