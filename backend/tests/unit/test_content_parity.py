"""Guards the promise that Hindi can never silently lag behind English.

If this test fails, a content file is missing, half-translated, or its safety
metadata differs between languages — all of which must block a deploy.
"""
import pytest

from app.content.registry import ContentError, load_registry
from app.domain.types import Language

LANGUAGES = [Language.EN, Language.HI]


@pytest.fixture(scope="module")
def registry():
    return load_registry()


def test_registry_loads_and_parity_check_passes(registry):
    assert registry.category_keys()


def test_every_category_exists_in_both_languages(registry):
    keys = {
        language: [c.key for c in registry.language(language).categories]
        for language in LANGUAGES
    }
    assert keys[Language.EN] == keys[Language.HI]


def test_question_and_option_ids_match_across_languages(registry):
    for category_key in registry.category_keys():
        per_language = {}
        for language in LANGUAGES:
            questions = registry.language(language).questions[category_key]
            per_language[language] = [
                (q.id, tuple((o.id, o.escalates_to) for o in q.options))
                for q in questions
            ]
        assert per_language[Language.EN] == per_language[Language.HI], category_key


def test_display_text_actually_differs_between_languages(registry):
    """Catches a Hindi file that was copied from English but never translated."""
    for category_key in registry.category_keys():
        english = registry.language(Language.EN).questions[category_key]
        hindi = registry.language(Language.HI).questions[category_key]
        for en_question, hi_question in zip(english, hindi):
            assert en_question.text != hi_question.text, en_question.id


def test_fallback_guidance_exists_for_every_category_plus_other(registry):
    expected = set(registry.category_keys()) | {"other"}
    for language in LANGUAGES:
        assert set(registry.language(language).fallbacks) == expected


def test_every_source_has_a_label_in_both_languages(registry):
    for source in registry.sources.values():
        for language in LANGUAGES:
            assert source.labels.get(language.value)


def test_safety_lists_exist_per_language_and_are_not_identical(registry):
    for language in LANGUAGES:
        assert registry.safety[language], language
    english_patterns = {rule.regex.pattern for rule in registry.safety[Language.EN]}
    hindi_patterns = {rule.regex.pattern for rule in registry.safety[Language.HI]}
    # Each list targets phrasing natural to its own language, so they must not
    # be copies of each other.
    assert not english_patterns & hindi_patterns


def test_parity_violation_is_detected(tmp_path):
    """Break a Hindi file on purpose and confirm loading fails."""
    import shutil

    from app.content.registry import CONTENT_ROOT

    root = tmp_path / "content"
    shutil.copytree(
        CONTENT_ROOT, root, ignore=shutil.ignore_patterns("*.py", "__pycache__")
    )
    hindi_burn = root / "hi" / "questions" / "burn.yaml"
    hindi_burn.write_text(
        hindi_burn.read_text(encoding="utf-8").replace("burn_size", "burn_area"),
        encoding="utf-8",
    )

    with pytest.raises(ContentError) as exc:
        load_registry(root)
    assert "parity" in str(exc.value).lower()

    load_registry()  # restore the real registry for other tests
