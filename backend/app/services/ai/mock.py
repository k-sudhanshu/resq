"""Deterministic provider used in local development and CI.

It is the default everywhere except production so that testing never spends
the limited free Gemini quota.

Guidance is derived from the verified content for the requested category and
language, prefixed so it is obvious which path served the response. The
description may contain a trigger to exercise the failure paths without
touching a real provider — see TRIGGERS below and the README.
"""
from typing import Optional

from app.content.registry import get_registry
from app.domain.types import Language
from app.schemas.ai import AIRequestContext
from app.schemas.guidance import Guidance
from app.services.ai.provider import (
    AIProvider,
    AIQuotaExceededError,
    AIUnavailableError,
)

TRIGGER_FAIL = "__mock_fail__"
TRIGGER_QUOTA = "__mock_quota__"
TRIGGER_WRONG_LANGUAGE = "__mock_wrong_language__"
TRIGGER_UNSAFE = "__mock_unsafe__"
TRIGGER_BAD_SOURCE = "__mock_bad_source__"

UNSAFE_TEXT = {
    Language.EN: (
        "Apply toothpaste and butter to the burn, then give 500 mg of paracetamol."
    ),
    Language.HI: "जली जगह पर टूथपेस्ट और घी लगाएं, फिर 500 मिलीग्राम पैरासिटामोल दें।",
}

MOCK_PREFIX = {
    Language.EN: "[mock AI]",
    Language.HI: "[मॉक AI]",
}


class MockAIProvider(AIProvider):
    name = "mock"

    async def analyze(
        self, context: AIRequestContext, image: Optional[bytes]
    ) -> Guidance:
        description = (context.description or "").lower()

        if TRIGGER_FAIL in description:
            raise AIUnavailableError("mock_triggered_failure")
        if TRIGGER_QUOTA in description:
            raise AIQuotaExceededError("mock_triggered_quota")

        registry = get_registry()
        language = context.language
        if TRIGGER_WRONG_LANGUAGE in description:
            # Answer in the wrong language on purpose; the output guard must
            # catch this and fall back rather than showing it to the user.
            language = language.other

        content = registry.language(language)
        category_key = (
            context.category_key
            if context.category_key in content.fallbacks
            else "other"
        )
        block = content.fallbacks[category_key].default
        guidance = block.model_copy(deep=True)
        guidance.summary = f"{MOCK_PREFIX[language]} {guidance.summary}"

        if TRIGGER_UNSAFE in description:
            guidance.summary = UNSAFE_TEXT[language]
        if TRIGGER_BAD_SOURCE in description:
            guidance.sources = ["not_a_real_source"]

        return guidance
