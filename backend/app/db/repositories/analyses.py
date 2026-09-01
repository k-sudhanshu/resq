import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Analysis


class AnalysisRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        session_id: uuid.UUID,
        language: str,
        category_key: str,
        patient_context: str,
        answers: Optional[list[dict[str, str]]],
        description: Optional[str],
        had_image: bool,
        source: str,
        risk_level: str,
        response: dict[str, Any],
    ) -> Analysis:
        analysis = Analysis(
            id=uuid.uuid4(),
            session_id=session_id,
            language=language,
            category_key=category_key,
            patient_context=patient_context,
            answers=answers,
            description=description,
            had_image=had_image,
            source=source,
            risk_level=risk_level,
            response=response,
        )
        self.db.add(analysis)
        await self.db.commit()
        return analysis

    async def get_for_session(
        self, analysis_id: uuid.UUID, session_id: uuid.UUID
    ) -> Optional[Analysis]:
        """Scoped to the owning session on purpose.

        A result can only be read back by the session that created it, so a
        leaked id alone does not expose someone's description or guidance.
        """
        result = await self.db.execute(
            select(Analysis).where(
                Analysis.id == analysis_id, Analysis.session_id == session_id
            )
        )
        return result.scalar_one_or_none()
