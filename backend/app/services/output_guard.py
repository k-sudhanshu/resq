"""Checks every piece of guidance before a user can see it.

Schema validation already happened in the provider. This module adds the three
checks that a valid-JSON-but-unsafe response would otherwise pass:

1. Safety filter  - banned phrases in the output's own language.
2. Language check - the output is actually written in the requested language.
3. Source filter  - unknown source ids are dropped, never rendered.

A failure of 1 or 2 is reported as a rejection, and the caller treats it
exactly like an AI outage: retry once, then serve verified fallback content.
"""
import re
from typing import Optional

from app.content.registry import ContentRegistry
from app.domain.types import Language
from app.schemas.guidance import Guidance

# Sentence splitting for both scripts (Devanagari uses danda "।").
_SENTENCE_SPLIT = re.compile(r"[.!?।\n]+")

_DEVANAGARI = re.compile(r"[\u0900-\u097F]")
_LATIN_LETTER = re.compile(r"[A-Za-z]")

# A negation cue means the sentence is telling the user *not* to do the thing,
# which is correct first-aid advice ("do not apply butter to a burn") and must
# not be flagged. Patterns where the negation itself is the harm opt out via
# `negation_exempt` in the safety YAML.
_NEGATION_CUES = {
    Language.EN: re.compile(
        r"\b(do not|don't|never|avoid|should not|shouldn't|must not|without)\b",
        re.IGNORECASE,
    ),
    Language.HI: re.compile(
        r"(नहीं|मत|कभी|बचें|(?<![\u0900-\u097F])न(?![\u0900-\u097F]))"
    ),
}

# Minimum share of letters that must belong to the expected script. Guidance
# legitimately contains Latin digits and words like "CPR" or "112" in Hindi
# text, so this is a ratio rather than an absolute rule.
_SCRIPT_RATIO_THRESHOLD = 0.6


class GuardRejection(Exception):
    def __init__(self, reason: str, detail: str = "") -> None:
        super().__init__(reason)
        self.reason = reason
        self.detail = detail


def check_safety(
    guidance: Guidance, language: Language, registry: ContentRegistry
) -> None:
    rules = registry.safety.get(language, [])
    negation = _NEGATION_CUES[language]

    for text in guidance.recommendation_strings():
        for sentence in _SENTENCE_SPLIT.split(text):
            if not sentence.strip():
                continue
            negated = negation.search(sentence) is not None
            for rule in rules:
                if not rule.regex.search(sentence):
                    continue
                if negated and not rule.negation_exempt:
                    continue
                raise GuardRejection("unsafe_content", rule.reason)


def check_language(guidance: Guidance, language: Language) -> None:
    """Reject output written in the wrong language.

    Without this, a Hindi user could be shown English guidance presented as
    the answer to their question.
    """
    devanagari = 0
    latin = 0
    for text in guidance.display_strings():
        devanagari += len(_DEVANAGARI.findall(text))
        latin += len(_LATIN_LETTER.findall(text))

    total = devanagari + latin
    if total == 0:
        raise GuardRejection("empty_output")

    expected_ratio = (devanagari if language is Language.HI else latin) / total
    if expected_ratio < _SCRIPT_RATIO_THRESHOLD:
        raise GuardRejection(
            "wrong_output_language", f"{language.value}_ratio_{expected_ratio:.2f}"
        )


def filter_sources(
    guidance: Guidance, registry: ContentRegistry
) -> list[str]:
    """Keep only whitelisted source ids, so a model cannot invent references."""
    return [
        source_id for source_id in guidance.sources if source_id in registry.sources
    ]


def apply(
    guidance: Guidance,
    language: Language,
    registry: ContentRegistry,
    strict_language: bool = True,
) -> Guidance:
    """Run all checks. Returns cleaned guidance or raises GuardRejection."""
    check_safety(guidance, language, registry)
    if strict_language:
        check_language(guidance, language)
    cleaned = guidance.model_copy(deep=True)
    cleaned.sources = filter_sources(guidance, registry)
    return cleaned


def rejection_reason(exc: Optional[GuardRejection]) -> str:
    return exc.reason if exc else "unknown"
