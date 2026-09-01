from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import enforce_session_creation_limit
from app.core.settings import get_settings
from app.db.engine import get_db
from app.db.models import as_utc
from app.db.repositories.sessions import SessionRepository
from app.schemas.api import SessionCreateRequest, SessionResponse

router = APIRouter(tags=["sessions"])


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    payload: SessionCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(enforce_session_creation_limit),
) -> SessionResponse:
    settings = get_settings()
    session = await SessionRepository(db).create(
        language=payload.language.value, ttl_hours=settings.session_ttl_hours
    )
    return SessionResponse(token=session.token, expires_at=as_utc(session.expires_at))
