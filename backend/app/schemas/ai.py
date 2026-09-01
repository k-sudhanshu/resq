from typing import Optional

from pydantic import BaseModel

from app.domain.types import Language, PatientContext


class AnswerContext(BaseModel):
    question_id: str
    option_id: str
    # English question/option text is included so the model has meaning, not
    # just identifiers. Display text for the user comes from content, not here.
    question_text: str
    option_text: str


class AIRequestContext(BaseModel):
    """Everything the provider needs, with no HTTP or DB concepts attached."""

    language: Language
    category_key: str
    category_label_en: str
    patient_context: PatientContext
    answers: list[AnswerContext] = []
    description: Optional[str] = None
    has_image: bool = False
