"""Daily AI budget and fallback-only mode.

The counter lives in Postgres/SQLite rather than memory because the free
backend instance sleeps when idle, which would reset an in-process counter
several times a day and protect nothing.
"""
import logging
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.db.repositories.usage import UsageRepository, utc_today

logger = logging.getLogger(__name__)

# Set when the provider reports a quota error, so the rest of the UTC day goes
# straight to fallback instead of retrying a request we know will fail.
_degraded_until_day: date = None  # type: ignore[assignment]


def mark_quota_exhausted() -> None:
    global _degraded_until_day
    _degraded_until_day = utc_today()
    logger.warning(
        "ai_quota_exhausted",
        extra={"extra_fields": {"day": _degraded_until_day.isoformat()}},
    )


def reset_degraded_mode() -> None:
    """Test helper; also called when the process restarts a new day."""
    global _degraded_until_day
    _degraded_until_day = None  # type: ignore[assignment]


def is_degraded() -> bool:
    return _degraded_until_day == utc_today()


class QuotaService:
    def __init__(self, db: AsyncSession) -> None:
        self.usage = UsageRepository(db)
        self.budget = get_settings().daily_ai_budget

    async def ai_calls_allowed(self) -> bool:
        if is_degraded():
            return False
        return await self.usage.get_count() < self.budget

    async def record_call(self) -> int:
        return await self.usage.increment()

    async def remaining(self) -> int:
        used = await self.usage.get_count()
        return max(self.budget - used, 0)
