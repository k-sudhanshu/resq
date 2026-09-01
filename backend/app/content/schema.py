"""Validation models for the YAML content trees.

Display text differs per language; every identifier and every piece of
safety metadata must be identical across languages. `registry.py` enforces
that with a parity check at startup and in CI.
"""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.domain.types import RiskLevel
from app.schemas.guidance import Guidance


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class OptionDef(StrictModel):
    id: str
    text: str
    # Safety metadata lives next to the answer it applies to, so rules and
    # questions cannot drift apart.
    escalates_to: Optional[RiskLevel] = None


class QuestionDef(StrictModel):
    id: str
    text: str
    options: list[OptionDef] = Field(min_length=2)


class QuestionSet(StrictModel):
    questions: list[QuestionDef] = Field(min_length=1)


class CategoryDef(StrictModel):
    key: str
    label: str
    icon: str


class CategoryFile(StrictModel):
    categories: list[CategoryDef] = Field(min_length=1)


class FallbackFile(StrictModel):
    # `default` is used when the AI is unavailable; `critical` is returned
    # directly when a hard rule short-circuits before any AI call.
    default: Guidance
    critical: Guidance


class SourceDef(StrictModel):
    id: str
    url: str
    labels: dict[str, str]


class SourceFile(StrictModel):
    sources: list[SourceDef] = Field(min_length=1)


class VideoFile(StrictModel):
    # category key -> language -> provider video id (null until curated)
    videos: dict[str, dict[str, Optional[str]]] = {}


class BannedPattern(StrictModel):
    pattern: str
    reason: str
    # By default a match inside a negated sentence is ignored, so that correct
    # advice ("do not apply butter") is not mistaken for the harmful act.
    # Patterns where the negation *is* the harm ("no need to see a doctor")
    # must opt out.
    negation_exempt: bool = False


class SafetyFile(StrictModel):
    banned_patterns: list[BannedPattern] = []
