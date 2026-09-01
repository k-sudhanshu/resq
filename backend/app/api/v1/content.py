"""Reference content, served from the in-process registry (no database hit)."""
from fastapi import APIRouter, Depends

from app.api.v1.deps import language_param
from app.content.registry import get_registry
from app.core.errors import NotFoundError
from app.domain.types import Language
from app.schemas.api import (
    CategoryDetailResponse,
    CategoryListResponse,
    CategorySummary,
    QuestionOptionOut,
    QuestionOut,
)

router = APIRouter(tags=["content"])


@router.get("/content/categories", response_model=CategoryListResponse)
async def list_categories(
    language: Language = Depends(language_param),
) -> CategoryListResponse:
    registry = get_registry()
    requested = registry.language(language)
    alternate = registry.language(language.other)
    return CategoryListResponse(
        categories=[
            CategorySummary(
                key=category.key,
                label=category.label,
                label_alt=alternate.categories_by_key[category.key].label,
                icon=category.icon,
            )
            for category in requested.categories
        ]
    )


@router.get(
    "/content/categories/{category_key}", response_model=CategoryDetailResponse
)
async def get_category(
    category_key: str,
    language: Language = Depends(language_param),
) -> CategoryDetailResponse:
    registry = get_registry()
    content = registry.language(language)
    category = content.categories_by_key.get(category_key)
    if category is None:
        raise NotFoundError()

    return CategoryDetailResponse(
        key=category.key,
        label=category.label,
        questions=[
            QuestionOut(
                id=question.id,
                text=question.text,
                # `escalates_to` is deliberately not exposed: the client never
                # needs it, and risk stays a server-side decision.
                options=[
                    QuestionOptionOut(id=option.id, text=option.text)
                    for option in question.options
                ],
            )
            for question in content.questions[category.key]
        ],
    )
