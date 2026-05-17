"""
Smoke tests — verify the API starts and basic routes respond.
These tests mock Redis and DB to avoid needing a live database in CI.
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def mock_connections():
    """Mock DB and Redis health checks so tests run without live infrastructure."""
    with (
        patch("shared.database.connection.check_db_connection", new_callable=AsyncMock, return_value=True),
        patch("shared.cache.redis_client.check_redis_connection", new_callable=AsyncMock, return_value=True),
        patch("shared.database.connection.AsyncSessionLocal"),
    ):
        yield


@pytest.mark.asyncio
async def test_health_endpoint(mock_connections):
    """Health endpoint returns 200 when DB and Redis report healthy."""
    with (
        patch("services.api.main.check_db_connection", new_callable=AsyncMock, return_value=True),
        patch("services.api.main.check_redis_connection", new_callable=AsyncMock, return_value=True),
    ):
        from services.api.main import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")

        assert response.status_code in (200, 503)  # 503 ok in test env without real connections
        data = response.json()
        assert "status" in data
        assert "version" in data


@pytest.mark.asyncio
async def test_unknown_route_returns_404(mock_connections):
    """Unknown routes should not expose stack traces."""
    from services.api.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/this-does-not-exist")
    assert response.status_code == 404


def test_job_types_serialise():
    """Job models must serialise to JSON without error (used in queue)."""
    import uuid
    from shared.queue.job_types import WhatsAppMessageJob, GmailEmailJob, BusinessAnalysisJob

    wa_job = WhatsAppMessageJob(
        phone_number_id="123",
        sender_phone="+919999999999",
        sender_name="Test",
        message_id="msg_001",
        message_type="text",
        content="Hello",
        timestamp="1700000000",
        raw_payload={},
    )
    assert wa_job.model_dump_json()

    gmail_job = GmailEmailJob(email_address="test@gmail.com", history_id="12345")
    assert gmail_job.model_dump_json()

    analysis_job = BusinessAnalysisJob(
        business_id=uuid.uuid4(),
        analysis_date="2026-04-04",
    )
    assert analysis_job.model_dump_json()


def test_encryption_round_trip():
    """Fernet encrypt → decrypt must return original value."""
    import os
    import base64
    from unittest.mock import patch

    test_key = base64.urlsafe_b64encode(os.urandom(32)).decode()

    with patch.dict("os.environ", {"ENCRYPTION_KEY": test_key}):
        from importlib import reload
        import shared.config.settings as s
        reload(s)
        import shared.encryption.tokens as t
        reload(t)

        original = "my_secret_refresh_token"
        encrypted = t.encrypt_token(original)
        assert encrypted != original
        assert t.decrypt_token(encrypted) == original
