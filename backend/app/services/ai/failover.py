"""Failover chain: try the primary provider, then the secondary.

The pipeline (analysis_service) sees this as one provider with one failure
path, so its retry/backoff and verified-content fallback stay unchanged.

Quota semantics matter here: AIQuotaExceededError makes the pipeline stop
calling AI for the rest of the UTC day. With two providers, that day-long
switch is only justified when BOTH are quota-limited; if only one is, the
error is downgraded to a plain AIUnavailableError so the other keeps serving.
"""
import logging
from typing import Optional

from app.core.logging import log_event
from app.schemas.ai import AIRequestContext
from app.schemas.guidance import Guidance
from app.services.ai.provider import (
    AIProvider,
    AIQuotaExceededError,
    AIUnavailableError,
)

logger = logging.getLogger(__name__)


class FailoverProvider(AIProvider):
    def __init__(self, primary: AIProvider, secondary: AIProvider) -> None:
        self.primary = primary
        self.secondary = secondary
        self.name = f"{primary.name}->{secondary.name}"

    async def analyze(
        self, context: AIRequestContext, image: Optional[bytes]
    ) -> Guidance:
        try:
            return await self.primary.analyze(context, image)
        except AIUnavailableError as exc:
            # `exc` is unbound once this except block ends; keep a reference.
            primary_exc = exc
            log_event(
                logger,
                "ai_failover",
                primary=self.primary.name,
                secondary=self.secondary.name,
                reason=primary_exc.reason,
            )

        try:
            return await self.secondary.analyze(context, image)
        except AIQuotaExceededError as secondary_exc:
            if isinstance(primary_exc, AIQuotaExceededError):
                # Both providers out of quota: let the pipeline flip to
                # fallback-only mode for the rest of the day.
                raise
            raise AIUnavailableError(
                f"secondary_quota_after_{primary_exc.reason}"
            ) from secondary_exc
        except AIUnavailableError as secondary_exc:
            if isinstance(primary_exc, AIQuotaExceededError):
                # Primary quota exhausted and the secondary cannot cover for
                # it right now; still do not disable AI for the whole day,
                # because the secondary may recover on the next attempt.
                raise AIUnavailableError(
                    f"{secondary_exc.reason}_after_primary_quota"
                ) from secondary_exc
            raise
