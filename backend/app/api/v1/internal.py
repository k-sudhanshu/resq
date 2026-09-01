import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_internal_secret
from app.core.logging import log_event
from app.core.settings import get_settings
from app.db.engine import get_db
from app.db.repositories.sessions import SessionRepository
from app.db.repositories.usage import UsageRepository
from app.schemas.api import CleanupResponse, HealthResponse
from app.services.quota_service import is_degraded

router = APIRouter(tags=["internal"])
logger = logging.getLogger(__name__)

USAGE_RETENTION_DAYS = 7


@router.get("/health", response_model=HealthResponse)
async def health(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    """Also the cold-start probe the frontend pings before showing the UI."""
    database = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        database = "unavailable"
    return HealthResponse(
        status="ok" if database == "ok" else "degraded",
        database=database,
        ai_provider=get_settings().ai_provider,
        degraded=is_degraded(),
    )


@router.post("/internal/cleanup", response_model=CleanupResponse)
async def cleanup(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_internal_secret),
) -> CleanupResponse:
    """TTL enforcement, called by a scheduled workflow.

    Requires the internal secret: without it, anyone could wipe live sessions.
    """
    deleted_sessions = await SessionRepository(db).delete_expired()
    deleted_usage = await UsageRepository(db).delete_older_than(USAGE_RETENTION_DAYS)
    log_event(
        logger,
        "cleanup_completed",
        deleted_sessions=deleted_sessions,
        deleted_usage_rows=deleted_usage,
    )
    return CleanupResponse(
        deleted_sessions=deleted_sessions, deleted_usage_rows=deleted_usage
    )
