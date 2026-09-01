from abc import ABC, abstractmethod
from typing import Optional

from app.schemas.ai import AIRequestContext
from app.schemas.guidance import Guidance


class AIUnavailableError(RuntimeError):
    """Raised for any provider failure: timeout, quota, bad shape, refusal.

    The caller treats every cause identically — route to fallback — so the
    reason is recorded for logs but never changes control flow.
    """

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class AIQuotaExceededError(AIUnavailableError):
    """Provider reported a quota/rate limit (HTTP 429).

    Distinct from other failures only because it also flips fallback-only mode
    for the rest of the UTC day instead of retrying all day.
    """


class AIProvider(ABC):
    name: str = "abstract"

    @abstractmethod
    async def analyze(
        self, context: AIRequestContext, image: Optional[bytes]
    ) -> Guidance:
        """Return validated guidance, or raise AIUnavailableError."""
