"""FailoverProvider: primary first, secondary on failure, quota semantics."""
from typing import Optional

import pytest

from app.domain.types import Language, PatientContext, RiskLevel
from app.schemas.ai import AIRequestContext
from app.schemas.guidance import ActionStep, Guidance, MedicalFollowUp
from app.services.ai.failover import FailoverProvider
from app.services.ai.provider import (
    AIProvider,
    AIQuotaExceededError,
    AIUnavailableError,
)


def _guidance(summary: str) -> Guidance:
    return Guidance(
        risk_level=RiskLevel.NON_URGENT,
        summary=summary,
        immediate_actions=[ActionStep(step=1, title="t", instruction="i")],
        medical_follow_up=MedicalFollowUp(required=False),
    )


def _context() -> AIRequestContext:
    return AIRequestContext(
        language=Language.EN,
        category_key="burn",
        category_label_en="Burn",
        patient_context=PatientContext.ADULT,
    )


class FakeProvider(AIProvider):
    def __init__(self, name: str, result=None, error: Optional[Exception] = None):
        self.name = name
        self.result = result
        self.error = error
        self.calls = 0

    async def analyze(self, context, image):
        self.calls += 1
        if self.error is not None:
            raise self.error
        return self.result


@pytest.mark.asyncio
async def test_primary_success_skips_secondary():
    primary = FakeProvider("p", result=_guidance("primary"))
    secondary = FakeProvider("s", result=_guidance("secondary"))
    provider = FailoverProvider(primary, secondary)

    result = await provider.analyze(_context(), None)

    assert result.summary == "primary"
    assert secondary.calls == 0


@pytest.mark.asyncio
async def test_primary_failure_uses_secondary():
    primary = FakeProvider("p", error=AIUnavailableError("timeout"))
    secondary = FakeProvider("s", result=_guidance("secondary"))
    provider = FailoverProvider(primary, secondary)

    result = await provider.analyze(_context(), None)

    assert result.summary == "secondary"
    assert primary.calls == 1


@pytest.mark.asyncio
async def test_primary_quota_uses_secondary():
    primary = FakeProvider("p", error=AIQuotaExceededError("provider_quota"))
    secondary = FakeProvider("s", result=_guidance("secondary"))
    provider = FailoverProvider(primary, secondary)

    result = await provider.analyze(_context(), None)

    assert result.summary == "secondary"


@pytest.mark.asyncio
async def test_both_quota_raises_quota_error():
    """Only when both providers are quota-limited may the pipeline flip to
    fallback-only mode for the rest of the day."""
    primary = FakeProvider("p", error=AIQuotaExceededError("provider_quota"))
    secondary = FakeProvider("s", error=AIQuotaExceededError("provider_quota"))
    provider = FailoverProvider(primary, secondary)

    with pytest.raises(AIQuotaExceededError):
        await provider.analyze(_context(), None)


@pytest.mark.asyncio
async def test_single_quota_is_downgraded():
    """One provider out of quota must not disable AI for the whole day."""
    primary = FakeProvider("p", error=AIUnavailableError("timeout"))
    secondary = FakeProvider("s", error=AIQuotaExceededError("provider_quota"))
    provider = FailoverProvider(primary, secondary)

    with pytest.raises(AIUnavailableError) as excinfo:
        await provider.analyze(_context(), None)
    assert not isinstance(excinfo.value, AIQuotaExceededError)


@pytest.mark.asyncio
async def test_primary_quota_secondary_failure_is_downgraded():
    primary = FakeProvider("p", error=AIQuotaExceededError("provider_quota"))
    secondary = FakeProvider("s", error=AIUnavailableError("timeout"))
    provider = FailoverProvider(primary, secondary)

    with pytest.raises(AIUnavailableError) as excinfo:
        await provider.analyze(_context(), None)
    assert not isinstance(excinfo.value, AIQuotaExceededError)


@pytest.mark.asyncio
async def test_both_fail_raises_secondary_reason():
    primary = FakeProvider("p", error=AIUnavailableError("timeout"))
    secondary = FakeProvider("s", error=AIUnavailableError("http_500"))
    provider = FailoverProvider(primary, secondary)

    with pytest.raises(AIUnavailableError) as excinfo:
        await provider.analyze(_context(), None)
    assert excinfo.value.reason == "http_500"
