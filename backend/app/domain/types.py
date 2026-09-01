"""Core enums shared across layers. Values are machine-facing and always English."""
from enum import Enum


class Language(str, Enum):
    EN = "en"
    HI = "hi"

    @property
    def other(self) -> "Language":
        return Language.HI if self is Language.EN else Language.EN


class RiskLevel(str, Enum):
    NON_URGENT = "NON_URGENT"
    URGENT = "URGENT"
    CRITICAL = "CRITICAL"


class PatientContext(str, Enum):
    """Age band of the injured person.

    Age is what actually changes first aid — CPR and choking technique,
    medicine doses, and how fragile the patient is. "Who is it?" (self or
    someone else) tells none of that, so the app asks for an age range
    instead. UNKNOWN is never offered as a choice; it is the fallback when
    the free-text flow is submitted without picking one.
    """

    BABY = "baby"  # under 1 year
    CHILD = "child"  # 1-12 years
    ADULT = "adult"  # 13-60 years
    ELDERLY = "elderly"  # over 60 years
    UNKNOWN = "unknown"


class GuidanceSource(str, Enum):
    AI = "ai"
    FALLBACK = "fallback"
    RULES = "rules"


OTHER_CATEGORY_KEY = "other"
