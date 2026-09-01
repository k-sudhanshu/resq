import pytest

from app.content.registry import load_registry
from app.domain.types import Language, RiskLevel
from app.schemas.guidance import ActionStep, Guidance, MedicalFollowUp
from app.services import output_guard
from app.services.output_guard import GuardRejection


@pytest.fixture(scope="module")
def registry():
    return load_registry()


def guidance(
    summary: str, do_not=None, sources=None, instruction="Cool it."
) -> Guidance:
    return Guidance(
        risk_level=RiskLevel.URGENT,
        summary=summary,
        immediate_actions=[ActionStep(step=1, title="Act", instruction=instruction)],
        do_not=do_not or [],
        monitor=[],
        medical_follow_up=MedicalFollowUp(required=True, reason="See a doctor."),
        sources=sources or [],
    )


def test_safe_english_guidance_passes(registry):
    result = output_guard.apply(
        guidance("Cool the burn under running water for 20 minutes."),
        Language.EN,
        registry,
    )
    assert result.summary.startswith("Cool the burn")


def test_harmful_remedy_recommendation_is_rejected(registry):
    with pytest.raises(GuardRejection) as exc:
        output_guard.apply(
            guidance("Apply butter and turmeric to the burn."), Language.EN, registry
        )
    assert exc.value.reason == "unsafe_content"


def test_medication_dosage_is_rejected(registry):
    with pytest.raises(GuardRejection):
        output_guard.apply(
            guidance("Give 500 mg of paracetamol every four hours."),
            Language.EN,
            registry,
        )


def test_negated_mention_of_a_remedy_is_allowed(registry):
    """"Do not apply butter" is correct advice and must not be flagged."""
    result = output_guard.apply(
        guidance(
            "Cool the burn with water. Do not apply butter or toothpaste.",
            do_not=["Do not apply ghee to the burn."],
        ),
        Language.EN,
        registry,
    )
    assert result is not None


def test_do_not_list_is_never_scanned_for_recommendations(registry):
    result = output_guard.apply(
        guidance(
            "Cool the burn under running water.",
            do_not=["Never put toothpaste, butter, or ash on a burn."],
        ),
        Language.EN,
        registry,
    )
    assert result.do_not


def test_advice_against_seeking_care_is_rejected(registry):
    with pytest.raises(GuardRejection):
        output_guard.apply(
            guidance("This is minor, no need to see a doctor."), Language.EN, registry
        )


def test_hindi_harmful_remedy_is_rejected(registry):
    with pytest.raises(GuardRejection):
        output_guard.apply(
            guidance("जली जगह पर हल्दी और घी लगाएं।"), Language.HI, registry
        )


def test_hindi_negated_remedy_is_allowed(registry):
    result = output_guard.apply(
        guidance("जली जगह को पानी से ठंडा करें। घी या हल्दी न लगाएं।"),
        Language.HI,
        registry,
    )
    assert result is not None


def test_english_output_for_a_hindi_request_is_rejected(registry):
    """A Hindi user must never be shown English guidance as the answer."""
    with pytest.raises(GuardRejection) as exc:
        output_guard.apply(
            guidance("Cool the burn under running water for 20 minutes."),
            Language.HI,
            registry,
        )
    assert exc.value.reason == "wrong_output_language"


def test_hindi_output_for_an_english_request_is_rejected(registry):
    with pytest.raises(GuardRejection) as exc:
        output_guard.apply(
            guidance("जली जगह को ठंडे पानी के नीचे रखें।"), Language.EN, registry
        )
    assert exc.value.reason == "wrong_output_language"


def test_hindi_output_may_contain_latin_numbers_and_terms(registry):
    result = output_guard.apply(
        guidance(
            "अभी 112 या 108 पर कॉल करें और CPR शुरू करें।",
            instruction="छाती के बीच ज़ोर से दबाएं, 30 बार।",
        ),
        Language.HI,
        registry,
    )
    assert result is not None


def test_unknown_source_ids_are_dropped(registry):
    result = output_guard.apply(
        guidance(
            "Cool the burn under running water.",
            sources=["who_burns", "invented_source"],
        ),
        Language.EN,
        registry,
    )
    assert result.sources == ["who_burns"]
