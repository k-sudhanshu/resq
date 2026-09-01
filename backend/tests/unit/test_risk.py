"""The risk engine is the safety core, so its invariants are tested directly."""
from app.domain.risk import evaluate_rules, merge_risk
from app.domain.types import RiskLevel


def test_merge_takes_the_more_severe_verdict():
    assert merge_risk(RiskLevel.CRITICAL, RiskLevel.NON_URGENT) is RiskLevel.CRITICAL
    assert merge_risk(RiskLevel.NON_URGENT, RiskLevel.URGENT) is RiskLevel.URGENT


def test_rules_can_escalate_but_never_downgrade():
    # An AI verdict of NON_URGENT cannot survive a CRITICAL hard rule...
    assert merge_risk(RiskLevel.CRITICAL, RiskLevel.NON_URGENT) is RiskLevel.CRITICAL
    # ...and a NON_URGENT rule cannot pull a CRITICAL AI verdict down.
    assert merge_risk(RiskLevel.NON_URGENT, RiskLevel.CRITICAL) is RiskLevel.CRITICAL


def test_missing_verdicts_default_to_non_urgent():
    assert merge_risk(None, None) is RiskLevel.NON_URGENT
    assert merge_risk(None, RiskLevel.URGENT) is RiskLevel.URGENT


def test_evaluate_rules_returns_highest_escalation():
    escalations = [None, RiskLevel.URGENT, RiskLevel.CRITICAL]
    assert evaluate_rules(escalations) is RiskLevel.CRITICAL
    assert evaluate_rules([None, None]) is None
    assert evaluate_rules([]) is None
