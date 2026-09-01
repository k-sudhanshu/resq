"""Verified guidance served when the AI cannot be used or trusted."""
from app.content.registry import ContentRegistry
from app.domain.types import OTHER_CATEGORY_KEY, Language
from app.schemas.guidance import Guidance


def get_guidance(
    registry: ContentRegistry,
    language: Language,
    category_key: str,
    critical: bool,
) -> Guidance:
    content = registry.language(language)
    key = category_key if category_key in content.fallbacks else OTHER_CATEGORY_KEY
    fallback = content.fallbacks[key]
    block = fallback.critical if critical else fallback.default
    return block.model_copy(deep=True)
