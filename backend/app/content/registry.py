"""Loads and validates all content at startup, then serves it from memory.

Nothing else in the codebase opens a YAML file at request time. The registry
also owns the English/Hindi parity check: a missing or half-finished Hindi
translation fails startup and CI rather than leaking English to a Hindi user.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Optional

import yaml
from pydantic import ValidationError as PydanticValidationError

from app.content.schema import (
    BannedPattern,
    CategoryDef,
    CategoryFile,
    FallbackFile,
    OptionDef,
    QuestionDef,
    QuestionSet,
    SafetyFile,
    SourceDef,
    SourceFile,
    VideoFile,
)
from app.domain.types import OTHER_CATEGORY_KEY, Language, RiskLevel
from app.schemas.guidance import Guidance

CONTENT_ROOT = Path(__file__).parent
LANGUAGES = (Language.EN, Language.HI)


class ContentError(RuntimeError):
    """Raised for malformed content or an English/Hindi parity violation."""


def _read_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise ContentError(f"missing content file: {path.relative_to(CONTENT_ROOT)}")
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ContentError(f"content file is not a mapping: {path.name}")
    return data


def _parse(model: type, data: dict[str, Any], path: Path):
    try:
        return model(**data)
    except PydanticValidationError as exc:
        raise ContentError(f"invalid content in {path.name}: {exc}") from exc


class CompiledSafetyRule:
    __slots__ = ("regex", "reason", "negation_exempt")

    def __init__(self, banned: BannedPattern) -> None:
        self.regex = re.compile(banned.pattern, re.IGNORECASE)
        self.reason = banned.reason
        self.negation_exempt = banned.negation_exempt


class LanguageContent:
    """Everything human-readable for a single language."""

    def __init__(
        self,
        language: Language,
        categories: list[CategoryDef],
        questions: dict[str, list[QuestionDef]],
        fallbacks: dict[str, FallbackFile],
    ) -> None:
        self.language = language
        self.categories = categories
        self.questions = questions
        self.fallbacks = fallbacks
        self.categories_by_key = {category.key: category for category in categories}
        # (category_key, question_id) -> question, and option lookup for rules
        self._option_index: dict[tuple[str, str, str], OptionDef] = {}
        self._question_index: dict[tuple[str, str], QuestionDef] = {}
        for category_key, question_list in questions.items():
            for question in question_list:
                self._question_index[(category_key, question.id)] = question
                for option in question.options:
                    self._option_index[(category_key, question.id, option.id)] = option

    def question(self, category_key: str, question_id: str) -> Optional[QuestionDef]:
        return self._question_index.get((category_key, question_id))

    def option(
        self, category_key: str, question_id: str, option_id: str
    ) -> Optional[OptionDef]:
        return self._option_index.get((category_key, question_id, option_id))


class ContentRegistry:
    def __init__(self, root: Path = CONTENT_ROOT) -> None:
        self.root = root
        self.by_language: dict[Language, LanguageContent] = {}
        self.sources: dict[str, SourceDef] = {}
        self.videos: dict[str, dict[str, Optional[str]]] = {}
        self.safety: dict[Language, list[CompiledSafetyRule]] = {}

    # ------------------------------------------------------------------ load
    def load(self) -> ContentRegistry:
        for language in LANGUAGES:
            self.by_language[language] = self._load_language(language)

        source_file: SourceFile = _parse(
            SourceFile,
            _read_yaml(self.root / "trusted_sources.yaml"),
            self.root / "trusted_sources.yaml",
        )
        self.sources = {source.id: source for source in source_file.sources}

        video_file: VideoFile = _parse(
            VideoFile,
            _read_yaml(self.root / "videos.yaml"),
            self.root / "videos.yaml",
        )
        self.videos = video_file.videos

        for language in LANGUAGES:
            path = self.root / "safety" / f"{language.value}.yaml"
            safety_file: SafetyFile = _parse(SafetyFile, _read_yaml(path), path)
            self.safety[language] = [
                CompiledSafetyRule(banned) for banned in safety_file.banned_patterns
            ]

        self._validate_sources()
        self._validate_parity()
        return self

    def _load_language(self, language: Language) -> LanguageContent:
        base = self.root / language.value

        category_path = base / "categories.yaml"
        category_file: CategoryFile = _parse(
            CategoryFile, _read_yaml(category_path), category_path
        )

        questions: dict[str, list[QuestionDef]] = {}
        fallbacks: dict[str, FallbackFile] = {}

        for category in category_file.categories:
            if category.key == OTHER_CATEGORY_KEY:
                raise ContentError(
                    f"'{OTHER_CATEGORY_KEY}' is a reserved key and must not be "
                    "declared in categories.yaml"
                )
            question_path = base / "questions" / f"{category.key}.yaml"
            question_set: QuestionSet = _parse(
                QuestionSet, _read_yaml(question_path), question_path
            )
            questions[category.key] = question_set.questions

        # Every category plus the free-text "other" flow needs fallback text.
        for key in [c.key for c in category_file.categories] + [OTHER_CATEGORY_KEY]:
            fallback_path = base / "fallback" / f"{key}.yaml"
            fallbacks[key] = _parse(
                FallbackFile, _read_yaml(fallback_path), fallback_path
            )

        return LanguageContent(
            language=language,
            categories=category_file.categories,
            questions=questions,
            fallbacks=fallbacks,
        )

    # -------------------------------------------------------------- validate
    def _validate_sources(self) -> None:
        for source in self.sources.values():
            for language in LANGUAGES:
                if not source.labels.get(language.value):
                    raise ContentError(
                        f"source '{source.id}' is missing a '{language.value}' label"
                    )
        for language, content in self.by_language.items():
            for key, fallback in content.fallbacks.items():
                for block_name in ("default", "critical"):
                    block: Guidance = getattr(fallback, block_name)
                    unknown = [s for s in block.sources if s not in self.sources]
                    if unknown:
                        raise ContentError(
                            f"{language.value}/fallback/{key}.yaml {block_name} "
                            f"references unknown source ids: {unknown}"
                        )

    def _validate_parity(self) -> None:
        """English and Hindi trees must be structurally identical."""
        english = self.by_language[Language.EN]
        problems: list[str] = []

        for language in LANGUAGES:
            if language is Language.EN:
                continue
            other = self.by_language[language]
            tag = language.value

            en_keys = [c.key for c in english.categories]
            other_keys = [c.key for c in other.categories]
            if en_keys != other_keys:
                problems.append(
                    "categories.yaml keys/order differ: "
                    f"en={en_keys} {tag}={other_keys}"
                )
                continue

            for category_key in en_keys:
                en_questions = english.questions[category_key]
                other_questions = other.questions[category_key]
                en_ids = [q.id for q in en_questions]
                other_ids = [q.id for q in other_questions]
                if en_ids != other_ids:
                    problems.append(
                        f"questions/{category_key}.yaml question ids differ: "
                        f"en={en_ids} {tag}={other_ids}"
                    )
                    continue
                for en_question, other_question in zip(en_questions, other_questions):
                    en_options = [(o.id, o.escalates_to) for o in en_question.options]
                    other_options = [
                        (o.id, o.escalates_to) for o in other_question.options
                    ]
                    if en_options != other_options:
                        problems.append(
                            f"questions/{category_key}.yaml '{en_question.id}': option "
                            f"ids or escalates_to differ: en={en_options} "
                            f"{tag}={other_options}"
                        )

            for key, en_fallback in english.fallbacks.items():
                other_fallback = other.fallbacks[key]
                for block_name in ("default", "critical"):
                    en_block: Guidance = getattr(en_fallback, block_name)
                    other_block: Guidance = getattr(other_fallback, block_name)
                    en_shape = _guidance_shape(en_block)
                    other_shape = _guidance_shape(other_block)
                    if en_shape != other_shape:
                        problems.append(
                            f"fallback/{key}.yaml [{block_name}] structure/safety "
                            f"metadata differs: en={en_shape} {tag}={other_shape}"
                        )

        if problems:
            raise ContentError(
                "English/Hindi content parity check failed:\n  - "
                + "\n  - ".join(problems)
            )

    # ------------------------------------------------------------- accessors
    def language(self, language: Language) -> LanguageContent:
        return self.by_language[language]

    def category_keys(self) -> list[str]:
        return [c.key for c in self.by_language[Language.EN].categories]

    def is_valid_category(self, key: str) -> bool:
        return key == OTHER_CATEGORY_KEY or key in self.category_keys()

    def escalation_for(
        self, language: Language, category_key: str, question_id: str, option_id: str
    ) -> Optional[RiskLevel]:
        option = self.language(language).option(category_key, question_id, option_id)
        return option.escalates_to if option else None

    def video_id(self, category_key: str, language: Language) -> Optional[str]:
        return (self.videos.get(category_key) or {}).get(language.value)

    def source_payload(self, source_id: str, language: Language) -> Optional[dict]:
        source = self.sources.get(source_id)
        if source is None:
            return None
        return {
            "source_id": source.id,
            "label": source.labels[language.value],
            "url": source.url,
        }


def _guidance_shape(block: Guidance) -> dict[str, Any]:
    """Machine-facing parts of a guidance block, which must match across languages."""
    return {
        "risk_level": block.risk_level.value,
        "call_112": block.emergency.call_112,
        "call_108": block.emergency.call_108,
        "steps": len(block.immediate_actions),
        "do_not": len(block.do_not),
        "monitor": len(block.monitor),
        "follow_up_required": block.medical_follow_up.required,
        "sources": sorted(block.sources),
    }


_registry: Optional[ContentRegistry] = None


def load_registry(root: Path = CONTENT_ROOT) -> ContentRegistry:
    global _registry
    _registry = ContentRegistry(root).load()
    return _registry


def get_registry() -> ContentRegistry:
    if _registry is None:
        raise RuntimeError("content registry accessed before load_registry()")
    return _registry
