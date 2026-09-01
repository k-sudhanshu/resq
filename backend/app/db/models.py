"""SQLAlchemy models.

Column types are chosen so the same code runs on SQLite (local) and Postgres
(production): `Uuid` renders as CHAR on SQLite and native uuid on Postgres,
and JSON upgrades to JSONB only on Postgres.
"""
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

JsonColumn = JSON().with_variant(JSONB(), "postgresql")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    """Attach UTC to values read back from SQLite, which drops tzinfo."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # Last language used. Analytics only: every request carries `language`
    # explicitly, so this value never influences a response.
    language: Mapped[str] = mapped_column(String(2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("sessions.id", ondelete="CASCADE"), index=True
    )
    language: Mapped[str] = mapped_column(String(2))
    category_key: Mapped[str] = mapped_column(String(40))
    patient_context: Mapped[str] = mapped_column(String(20))
    # Answers are only ever read back together with their analysis, so they are
    # a JSON column rather than a second table.
    answers: Mapped[Optional[list]] = mapped_column(JsonColumn, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    had_image: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(10))
    risk_level: Mapped[str] = mapped_column(String(12))
    response: Mapped[dict] = mapped_column(JsonColumn)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )


class DailyUsage(Base):
    """AI call counter, one row per UTC day.

    Lives in the database rather than memory because the free backend instance
    sleeps when idle; an in-process counter would reset several times a day and
    protect nothing.
    """

    __tablename__ = "daily_usage"

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    ai_calls: Mapped[int] = mapped_column(Integer, default=0)
