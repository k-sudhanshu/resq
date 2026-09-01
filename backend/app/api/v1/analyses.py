import json
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import (
    enforce_analysis_limit,
    get_provider,
    require_session,
)
from app.core.errors import ImageRejectedError, NotFoundError, ValidationError
from app.core.settings import get_settings
from app.db.engine import get_db
from app.db.models import Session as SessionRow
from app.db.repositories.analyses import AnalysisRepository
from app.db.repositories.sessions import SessionRepository
from app.schemas.api import AnalysisRequest, AnalysisResponse
from app.services.ai.provider import AIProvider
from app.services.analysis_service import AnalysisService, response_from_stored

router = APIRouter(tags=["analyses"])

# Set when guidance did not come from the AI, so the frontend can show its
# localized "showing verified basic steps" notice.
DEGRADED_HEADER = "X-RESQ-Degraded"


@router.post("/analyses", response_model=AnalysisResponse)
async def create_analysis(
    response: Response,
    payload: str = Form(...),
    image: UploadFile = File(default=None),
    session: SessionRow = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    provider: AIProvider = Depends(get_provider),
) -> AnalysisResponse:
    """Single round trip: answers, optional description, optional image.

    `payload` is a JSON string because the request is multipart — the image
    travels with it rather than in a separate upload step.
    """
    remaining = enforce_analysis_limit(session)
    response.headers["X-RateLimit-Remaining"] = str(remaining)

    try:
        request = AnalysisRequest(**json.loads(payload))
    except json.JSONDecodeError as exc:
        raise ValidationError({"payload": "invalid_json"}) from exc
    except PydanticValidationError as exc:
        raise ValidationError(json.loads(exc.json())) from exc

    image_bytes = None
    if image is not None and image.filename:
        image_bytes = await image.read()
        if len(image_bytes) > get_settings().max_image_bytes:
            raise ImageRejectedError("too_large")

    await SessionRepository(db).touch_language(session, request.language.value)

    service = AnalysisService(db=db, provider=provider)
    outcome = await service.run(
        session_id=session.id, request=request, image_bytes=image_bytes
    )

    if outcome.degraded_reason:
        response.headers[DEGRADED_HEADER] = outcome.degraded_reason
    return outcome.response


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: UUID,
    session: SessionRow = Depends(require_session),
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    """Owner-only read.

    Scoped to the creating session, and a mismatch returns 404 rather than 403
    so the response does not confirm that the id exists.
    """
    analysis = await AnalysisRepository(db).get_for_session(analysis_id, session.id)
    if analysis is None:
        raise NotFoundError()
    return response_from_stored(analysis)
