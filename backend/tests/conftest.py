import asyncio
import os
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
import pytest_asyncio

# Tests run against a throwaway SQLite file and the mock provider, so nothing
# here can touch a real database or spend AI quota.
TEST_DB = Path(__file__).parent / "test_resq.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB}"
os.environ["AI_PROVIDER"] = "mock"
os.environ["INTERNAL_SECRET"] = "test-secret"
os.environ["ENVIRONMENT"] = "local"
# Pinned rather than inherited: a developer's .env relaxes these limits so the
# app stays usable while clicking through it, which would otherwise make the
# rate-limit tests pass or fail depending on whose machine they run on.
os.environ["SESSIONS_PER_IP_PER_HOUR"] = "10"
os.environ["ANALYSES_PER_SESSION_PER_MINUTE"] = "5"

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.api.v1 import deps  # noqa: E402
from app.core.settings import get_settings  # noqa: E402
from app.db import engine as db_engine  # noqa: E402
from app.db.models import Base  # noqa: E402
from app.main import create_app  # noqa: E402
from app.services import quota_service  # noqa: E402


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def app_client() -> AsyncIterator[AsyncClient]:
    get_settings.cache_clear()
    deps.reset_provider()
    deps.session_create_limiter.reset()
    deps.analysis_limiter.reset()
    quota_service.reset_degraded_mode()
    await db_engine.dispose_engine()
    if TEST_DB.exists():
        TEST_DB.unlink()

    engine = db_engine.get_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    app = create_app()
    transport = ASGITransport(app=app)
    async with (
        AsyncClient(transport=transport, base_url="http://test") as client,
        app.router.lifespan_context(app),
    ):
        yield client

    await db_engine.dispose_engine()
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest_asyncio.fixture
async def session_token(app_client: AsyncClient) -> str:
    response = await app_client.post("/api/v1/sessions", json={"language": "en"})
    assert response.status_code == 201
    return response.json()["token"]
