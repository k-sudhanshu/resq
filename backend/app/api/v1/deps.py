"""Shared route dependencies: auth, rate limiting, language, provider choice."""
from typing import Optional

from fastapi import Depends, Header, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import RateLimitedError, SessionInvalidError, ValidationError
from app.core.rate_limit import FixedWindowLimiter
from app.core.settings import get_settings
from app.db.engine import get_db
from app.db.models import Session as SessionRow
from app.db.repositories.sessions import SessionRepository
from app.domain.types import Language
from app.services.ai.provider import AIProvider

_settings = get_settings()

# Two limiters guarding different things: creating sessions is limited by IP so
# that minting fresh sessions cannot bypass the per-session analysis limit.
session_create_limiter = FixedWindowLimiter(
    limit=_settings.sessions_per_ip_per_hour, window_seconds=3600
)
analysis_limiter = FixedWindowLimiter(
    limit=_settings.analyses_per_session_per_minute, window_seconds=60
)

_provider: Optional[AIProvider] = None


def build_provider() -> AIProvider:
    """Instantiated once per process, selected by AI_PROVIDER."""
    global _provider
    if _provider is None:
        settings = get_settings()
        if settings.ai_provider == "gemini":
            from app.services.ai.gemini import GeminiProvider

            _provider = GeminiProvider()
        else:
            from app.services.ai.mock import MockAIProvider

            _provider = MockAIProvider()
    return _provider


def reset_provider() -> None:
    global _provider
    _provider = None


def get_provider() -> AIProvider:
    return build_provider()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_session_creation_limit(request: Request) -> None:
    allowed, _, retry_after = session_create_limiter.check(client_ip(request))
    if not allowed:
        raise RateLimitedError(retry_after)


async def require_session(
    x_session_token: Optional[str] = Header(default=None, alias="X-Session-Token"),
    db: AsyncSession = Depends(get_db),
) -> SessionRow:
    """The session token header is the only way a session is identified."""
    if not x_session_token:
        raise SessionInvalidError()
    session = await SessionRepository(db).get_active_by_token(x_session_token)
    if session is None:
        raise SessionInvalidError()
    return session


def enforce_analysis_limit(session: SessionRow) -> int:
    allowed, remaining, retry_after = analysis_limiter.check(str(session.id))
    if not allowed:
        raise RateLimitedError(retry_after)
    return remaining


def language_param(lang: str = Query(default="en")) -> Language:
    try:
        return Language(lang)
    except ValueError as exc:
        raise ValidationError({"lang": "unsupported_language"}) from exc


def require_internal_secret(
    x_internal_secret: Optional[str] = Header(default=None, alias="X-Internal-Secret"),
) -> None:
    if x_internal_secret != get_settings().internal_secret:
        raise SessionInvalidError()
