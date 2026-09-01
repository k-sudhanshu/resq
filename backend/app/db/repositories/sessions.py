import secrets
import uuid
from datetime import timedelta
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Analysis, Session, as_utc, utcnow


class SessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, language: str, ttl_hours: int) -> Session:
        now = utcnow()
        session = Session(
            id=uuid.uuid4(),
            token=secrets.token_urlsafe(32),
            language=language,
            created_at=now,
            expires_at=now + timedelta(hours=ttl_hours),
        )
        self.db.add(session)
        await self.db.commit()
        return session

    async def get_active_by_token(self, token: str) -> Optional[Session]:
        result = await self.db.execute(select(Session).where(Session.token == token))
        session = result.scalar_one_or_none()
        if session is None:
            return None
        if as_utc(session.expires_at) <= utcnow():
            return None
        return session

    async def touch_language(self, session: Session, language: str) -> None:
        if session.language != language:
            session.language = language
            await self.db.commit()

    async def delete_expired(self) -> int:
        """Remove expired sessions and their analyses.

        Analyses are deleted explicitly because SQLite does not enforce
        ON DELETE CASCADE unless foreign keys are switched on per connection.
        """
        expired = (
            await self.db.execute(
                select(Session.id).where(Session.expires_at <= utcnow())
            )
        ).scalars().all()
        if not expired:
            return 0
        await self.db.execute(
            delete(Analysis).where(Analysis.session_id.in_(expired))
        )
        await self.db.execute(delete(Session).where(Session.id.in_(expired)))
        await self.db.commit()
        return len(expired)
