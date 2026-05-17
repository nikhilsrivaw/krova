"""
KROVA — PostgreSQL Async Connection
Single engine and session factory for the entire application.
Uses asyncpg driver for full async/await support.
Connection pooling via PgBouncer (handled by Supabase) + SQLAlchemy pool on top.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from shared.config.settings import settings
from shared.utils.logging import get_logger

logger = get_logger(__name__)

# ── Engine ───────────────────────────────────────────────────────────────────
# Created once at module import time — shared across all requests.
# pool_pre_ping=True tests the connection before handing it to a worker,
# preventing "SSL connection has been closed unexpectedly" errors after idle periods.
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
    # Echo SQL in development so we can catch N+1 queries early.
    echo=settings.is_development,
    # Supabase pooler runs PgBouncer in transaction mode — prepared statements
    # are not supported across connection re-use. Disable asyncpg's statement
    # cache to avoid DuplicatePreparedStatementError.
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

# ── Session factory ──────────────────────────────────────────────────────────
# expire_on_commit=False — keeps ORM objects accessible after commit() without
# issuing extra SELECT queries. Important for async — no implicit lazy loading.
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an async database session per request.
    The session is committed on clean exit and rolled back on any exception.
    Always closed in the finally block — connection is returned to the pool.

    Usage in a router:
        @router.get("/customers")
        async def list_customers(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connection() -> bool:
    """
    Health check — verifies the database is reachable.
    Called by the /health endpoint on startup.
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(__import__("sqlalchemy").text("SELECT 1"))
        logger.info("Database connection OK")
        return True
    except Exception as exc:
        logger.error("Database connection failed", extra={"error": str(exc)})
        return False
