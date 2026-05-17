"""
KROVA — Alembic migrations environment.
Uses the async SQLAlchemy engine so migrations run the same way as the app.
DATABASE_URL is read from the environment — never hardcoded.
"""

import asyncio
import os
from logging.config import fileConfig
from pathlib import Path

# Load .env so DATABASE_URL is available when running alembic from the CLI
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ── Import all models so Alembic sees the full metadata ──────────────────────
# This is the only place we need a wildcard import — Alembic requires it.
from shared.database.base import Base  # noqa: F401
import shared.database.models  # noqa: F401  registers all models on Base.metadata

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Pull DATABASE_URL from environment, converting asyncpg → psycopg2 for Alembic
# Alembic runs migrations synchronously by default; we use async_engine_from_config
# with the asyncpg URL directly.
def get_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return url


# ── Offline migrations (generate SQL without connecting) ─────────────────────

def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (connect and apply) ────────────────────────────────────

def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    config_section = config.get_section(config.config_ini_section, {})
    config_section["sqlalchemy.url"] = get_url()

    connectable = async_engine_from_config(
        config_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # No pooling during migrations
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
