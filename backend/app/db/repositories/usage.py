from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DailyUsage


def utc_today() -> date:
    return datetime.now(timezone.utc).date()


class UsageRepository:
    """Counter for AI calls per UTC day.

    Written with a plain UPDATE-then-INSERT rather than a dialect-specific
    upsert so the identical code runs on SQLite and Postgres. The increment
    itself happens inside the database, so concurrent requests cannot lose
    counts.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_count(self, day: date = None) -> int:
        day = day or utc_today()
        result = await self.db.execute(
            select(DailyUsage.ai_calls).where(DailyUsage.day == day)
        )
        return result.scalar_one_or_none() or 0

    async def increment(self, day: date = None) -> int:
        day = day or utc_today()
        updated = await self.db.execute(
            update(DailyUsage)
            .where(DailyUsage.day == day)
            .values(ai_calls=DailyUsage.ai_calls + 1)
        )
        if updated.rowcount == 0:
            try:
                self.db.add(DailyUsage(day=day, ai_calls=1))
                await self.db.commit()
                return 1
            except IntegrityError:
                # Another request created today's row first; increment instead.
                await self.db.rollback()
                await self.db.execute(
                    update(DailyUsage)
                    .where(DailyUsage.day == day)
                    .values(ai_calls=DailyUsage.ai_calls + 1)
                )
        await self.db.commit()
        return await self.get_count(day)

    async def delete_older_than(self, days: int) -> int:
        cutoff = utc_today() - timedelta(days=days)
        result = await self.db.execute(
            delete(DailyUsage).where(DailyUsage.day < cutoff)
        )
        await self.db.commit()
        return result.rowcount or 0
