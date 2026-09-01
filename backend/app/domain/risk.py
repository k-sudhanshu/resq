"""Deterministic risk logic.

This module is pure: standard library only, no I/O, no framework imports.
Safety decisions must stay trivially unit-testable and impossible to
entangle with the rest of the system.

Invariant: rules may only escalate risk, never downgrade it.
"""
from collections.abc import Iterable, Mapping, Sequence
from typing import Optional

from app.domain.types import RiskLevel

SEVERITY: Mapping[RiskLevel, int] = {
    RiskLevel.NON_URGENT: 0,
    RiskLevel.URGENT: 1,
    RiskLevel.CRITICAL: 2,
}


def _most_severe(levels: Iterable[RiskLevel]) -> Optional[RiskLevel]:
    present = [level for level in levels if level is not None]
    if not present:
        return None
    return max(present, key=lambda level: SEVERITY[level])


def merge_risk(
    rule_risk: Optional[RiskLevel], ai_risk: Optional[RiskLevel]
) -> RiskLevel:
    """Final risk is the most severe of the deterministic and AI verdicts."""
    return _most_severe([rule_risk, ai_risk]) or RiskLevel.NON_URGENT


def evaluate_rules(
    escalations: Sequence[Optional[RiskLevel]],
) -> Optional[RiskLevel]:
    """Highest escalation declared by the selected answer options.

    Callers pass the `escalates_to` value of each chosen option, which the
    content registry reads from the question YAML. Keeping the lookup outside
    this function is what lets safety metadata live next to the question text
    it applies to while the engine stays generic.
    """
    return _most_severe(escalations)
