"""The analysis pipeline.

This is the only module that knows the order of steps; everything it calls is
independently replaceable.

    validate input
      -> hard-rule pre-check (CRITICAL short-circuits, no AI call)
      -> image processing (in memory)
      -> AI call (timeout, up to two retries with increasing backoff)
      -> output guard (safety, language, sources)
      -> risk merge (rules can only escalate)
      -> persist + respond
    any AI or guard failure -> verified fallback content, still risk-merged
"""
import asyncio
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.registry import ContentRegistry, get_registry
from app.core.errors import ValidationError
from app.core.logging import log_event
from app.db.repositories.analyses import AnalysisRepository
from app.domain.risk import evaluate_rules, merge_risk
from app.domain.types import (
    OTHER_CATEGORY_KEY,
    GuidanceSource,
    Language,
    RiskLevel,
)
from app.schemas.ai import AIRequestContext, AnswerContext
from app.schemas.api import AnalysisRequest, AnalysisResponse, SourceOut
from app.schemas.guidance import Guidance
from app.services import fallback_service, image_service, output_guard
from app.services.ai.provider import (
    AIProvider,
    AIQuotaExceededError,
    AIUnavailableError,
)
from app.services.output_guard import GuardRejection
from app.services.quota_service import QuotaService, mark_quota_exhausted

logger = logging.getLogger(__name__)

# Waits before retry 2 and retry 3. Provider overload (503) usually clears in
# seconds, not milliseconds, so the second wait is deliberately longer.
RETRY_DELAYS_SECONDS = (0.5, 2.0)


class AnalysisOutcome:
    """Result of the pipeline plus why it took the path it did (for logs)."""

    def __init__(
        self,
        response: AnalysisResponse,
        source: GuidanceSource,
        degraded_reason: Optional[str] = None,
    ) -> None:
        self.response = response
        self.source = source
        self.degraded_reason = degraded_reason


class AnalysisService:
    def __init__(
        self,
        db: AsyncSession,
        provider: AIProvider,
        registry: Optional[ContentRegistry] = None,
    ) -> None:
        self.db = db
        self.provider = provider
        self.registry = registry or get_registry()
        self.analyses = AnalysisRepository(db)
        self.quota = QuotaService(db)

    # ------------------------------------------------------------- validation
    def _validate(self, request: AnalysisRequest) -> None:
        if not self.registry.is_valid_category(request.category_key):
            raise ValidationError({"category_key": "unknown_category"})

        if request.category_key == OTHER_CATEGORY_KEY:
            if not request.description:
                raise ValidationError({"description": "required_for_other"})
            return

        if not request.answers:
            raise ValidationError({"answers": "required_for_category"})

        content = self.registry.language(request.language)
        seen: set[str] = set()
        for answer in request.answers:
            if answer.question_id in seen:
                raise ValidationError({"answers": "duplicate_question"})
            seen.add(answer.question_id)
            option = content.option(
                request.category_key, answer.question_id, answer.option_id
            )
            if option is None:
                raise ValidationError(
                    {
                        "answers": "unknown_question_or_option",
                        "question_id": answer.question_id,
                    }
                )

    # ------------------------------------------------------------------- main
    async def run(
        self,
        session_id: UUID,
        request: AnalysisRequest,
        image_bytes: Optional[bytes],
    ) -> AnalysisOutcome:
        self._validate(request)
        language = request.language

        rule_risk = self._rule_risk(request)

        # A rule-flagged critical case gets verified content immediately: it is
        # the fastest path for the worst situations, and it saves AI quota.
        if rule_risk is RiskLevel.CRITICAL:
            guidance = fallback_service.get_guidance(
                self.registry, language, request.category_key, critical=True
            )
            return await self._finalise(
                session_id=session_id,
                request=request,
                guidance=guidance,
                source=GuidanceSource.RULES,
                rule_risk=rule_risk,
                had_image=image_bytes is not None,
                degraded_reason=None,
            )

        processed_image = image_service.process(image_bytes) if image_bytes else None

        guidance, source, degraded_reason = await self._guidance(
            request, processed_image
        )

        return await self._finalise(
            session_id=session_id,
            request=request,
            guidance=guidance,
            source=source,
            rule_risk=rule_risk,
            had_image=image_bytes is not None,
            degraded_reason=degraded_reason,
        )

    def _rule_risk(self, request: AnalysisRequest) -> Optional[RiskLevel]:
        if not request.answers:
            return None
        escalations = [
            self.registry.escalation_for(
                request.language,
                request.category_key,
                answer.question_id,
                answer.option_id,
            )
            for answer in request.answers
        ]
        return evaluate_rules(escalations)

    async def _guidance(
        self, request: AnalysisRequest, image: Optional[bytes]
    ) -> tuple[Guidance, GuidanceSource, Optional[str]]:
        """Ask the AI, guard the answer, or fall back to verified content."""
        if not await self.quota.ai_calls_allowed():
            return (
                fallback_service.get_guidance(
                    self.registry, request.language, request.category_key, False
                ),
                GuidanceSource.FALLBACK,
                "quota",
            )

        context = self._build_context(request, has_image=image is not None)
        last_reason = "unknown"

        total_attempts = len(RETRY_DELAYS_SECONDS) + 1
        for attempt in range(1, total_attempts + 1):
            try:
                await self.quota.record_call()
                raw = await self.provider.analyze(context, image)
                return (
                    output_guard.apply(raw, request.language, self.registry),
                    GuidanceSource.AI,
                    None,
                )
            except AIQuotaExceededError as exc:
                # No point retrying today; every further call would also fail.
                mark_quota_exhausted()
                last_reason = exc.reason
                break
            except (AIUnavailableError, GuardRejection) as exc:
                last_reason = getattr(exc, "reason", "unknown")
                log_event(
                    logger,
                    "ai_attempt_failed",
                    attempt=attempt,
                    reason=last_reason,
                    provider=self.provider.name,
                )
                if attempt < total_attempts:
                    await asyncio.sleep(RETRY_DELAYS_SECONDS[attempt - 1])

        return (
            fallback_service.get_guidance(
                self.registry, request.language, request.category_key, False
            ),
            GuidanceSource.FALLBACK,
            last_reason,
        )

    def _build_context(
        self, request: AnalysisRequest, has_image: bool
    ) -> AIRequestContext:
        # The situation is described to the model in English (ids are identical
        # across languages, so English text is always available); only the
        # output language varies.
        english = self.registry.language(Language.EN)
        answers: list[AnswerContext] = []
        for answer in request.answers or []:
            question = english.question(request.category_key, answer.question_id)
            option = english.option(
                request.category_key, answer.question_id, answer.option_id
            )
            if question is None or option is None:
                continue
            answers.append(
                AnswerContext(
                    question_id=answer.question_id,
                    option_id=answer.option_id,
                    question_text=question.text,
                    option_text=option.text,
                )
            )

        category = english.categories_by_key.get(request.category_key)
        return AIRequestContext(
            language=request.language,
            category_key=request.category_key,
            category_label_en=category.label if category else "Other problem",
            patient_context=request.patient_context,
            answers=answers,
            description=request.description,
            has_image=has_image,
        )

    async def _finalise(
        self,
        session_id: UUID,
        request: AnalysisRequest,
        guidance: Guidance,
        source: GuidanceSource,
        rule_risk: Optional[RiskLevel],
        had_image: bool,
        degraded_reason: Optional[str],
    ) -> AnalysisOutcome:
        final_risk = merge_risk(rule_risk, guidance.risk_level)
        guidance.risk_level = final_risk
        if final_risk is RiskLevel.CRITICAL:
            # A critical result must always offer the emergency numbers, even
            # if the AI forgot to set the flags.
            guidance.emergency.call_112 = True
            guidance.emergency.call_108 = True

        sources = [
            SourceOut(**payload)
            for payload in (
                self.registry.source_payload(source_id, request.language)
                for source_id in guidance.sources
            )
            if payload is not None
        ]

        response_body = {
            "language": request.language.value,
            "risk_level": final_risk.value,
            "source": source.value,
            "summary": guidance.summary,
            "emergency": guidance.emergency.model_dump(),
            "immediate_actions": [
                action.model_dump() for action in guidance.immediate_actions
            ],
            "do_not": guidance.do_not,
            "monitor": guidance.monitor,
            "medical_follow_up": guidance.medical_follow_up.model_dump(),
            "video": {
                "video_id": self.registry.video_id(
                    request.category_key, request.language
                )
            },
            "sources": [item.model_dump() for item in sources],
        }

        analysis = await self.analyses.create(
            session_id=session_id,
            language=request.language.value,
            category_key=request.category_key,
            patient_context=request.patient_context.value,
            answers=[answer.model_dump() for answer in request.answers]
            if request.answers
            else None,
            description=request.description,
            had_image=had_image,
            source=source.value,
            risk_level=final_risk.value,
            response=response_body,
        )

        log_event(
            logger,
            "analysis_completed",
            analysis_id=str(analysis.id),
            language=request.language.value,
            category=request.category_key,
            risk_level=final_risk.value,
            source=source.value,
            had_image=had_image,
            degraded_reason=degraded_reason,
        )

        response = AnalysisResponse.build(
            analysis_id=analysis.id,
            language=request.language,
            guidance=guidance,
            source=source,
            risk_level=final_risk,
            video_id=response_body["video"]["video_id"],
            sources=sources,
        )
        return AnalysisOutcome(response, source, degraded_reason)


def response_from_stored(analysis) -> AnalysisResponse:
    """Rebuild a response from the stored row, for GET /analyses/{id}."""
    body = dict(analysis.response)
    return AnalysisResponse(
        id=analysis.id,
        language=body.get("language", analysis.language),
        risk_level=body["risk_level"],
        source=body["source"],
        summary=body["summary"],
        emergency=body["emergency"],
        immediate_actions=body["immediate_actions"],
        do_not=body["do_not"],
        monitor=body["monitor"],
        medical_follow_up=body["medical_follow_up"],
        video=body["video"],
        sources=body["sources"],
    )
