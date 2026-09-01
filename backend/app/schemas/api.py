"""Request and response models for /api/v1.

Display text in responses is always in the requested language; ids, enum
values, and error codes are always English.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.settings import get_settings
from app.domain.types import GuidanceSource, Language, PatientContext, RiskLevel
from app.schemas.guidance import ActionStep, EmergencyFlags, Guidance, MedicalFollowUp


class SessionCreateRequest(BaseModel):
    language: Language = Language.EN


class SessionResponse(BaseModel):
    token: str
    expires_at: datetime


class CategorySummary(BaseModel):
    key: str
    label: str
    # The other language's label, used only for the dual-language cards on the
    # landing screen. Every screen after that is single-language.
    label_alt: str
    icon: str


class CategoryListResponse(BaseModel):
    categories: list[CategorySummary]


class QuestionOptionOut(BaseModel):
    id: str
    text: str


class QuestionOut(BaseModel):
    id: str
    text: str
    options: list[QuestionOptionOut]


class CategoryDetailResponse(BaseModel):
    key: str
    label: str
    questions: list[QuestionOut]


class AnswerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_id: str = Field(min_length=1, max_length=60)
    option_id: str = Field(min_length=1, max_length=60)


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    language: Language
    category_key: str = Field(min_length=1, max_length=40)
    patient_context: PatientContext = PatientContext.UNKNOWN
    answers: Optional[list[AnswerIn]] = Field(default=None, max_length=20)
    description: Optional[str] = None

    @field_validator("description")
    @classmethod
    def _cap_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        limit = get_settings().max_description_chars
        if len(trimmed) > limit:
            raise ValueError(f"description exceeds {limit} characters")
        return trimmed


class VideoOut(BaseModel):
    video_id: Optional[str] = None


class SourceOut(BaseModel):
    source_id: str
    label: str
    url: str


class AnalysisResponse(BaseModel):
    id: UUID
    # The language this guidance was generated in. A stored result is not
    # translated when the user switches language, so the client needs to know
    # what it is showing and can offer to re-run the analysis instead.
    language: Language
    risk_level: RiskLevel
    source: GuidanceSource
    summary: str
    emergency: EmergencyFlags
    immediate_actions: list[ActionStep]
    do_not: list[str]
    monitor: list[str]
    medical_follow_up: MedicalFollowUp
    video: VideoOut
    sources: list[SourceOut]

    @classmethod
    def build(
        cls,
        analysis_id: UUID,
        language: Language,
        guidance: Guidance,
        source: GuidanceSource,
        risk_level: RiskLevel,
        video_id: Optional[str],
        sources: list[SourceOut],
    ) -> "AnalysisResponse":
        return cls(
            id=analysis_id,
            language=language,
            risk_level=risk_level,
            source=source,
            summary=guidance.summary,
            emergency=guidance.emergency,
            immediate_actions=guidance.immediate_actions,
            do_not=guidance.do_not,
            monitor=guidance.monitor,
            medical_follow_up=guidance.medical_follow_up,
            video=VideoOut(video_id=video_id),
            sources=sources,
        )


class HealthResponse(BaseModel):
    status: str
    database: str
    ai_provider: str
    degraded: bool


class CleanupResponse(BaseModel):
    deleted_sessions: int
    deleted_usage_rows: int
