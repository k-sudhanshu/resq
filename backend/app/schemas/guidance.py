"""The canonical guidance shape.

Both AI output and hand-written fallback content are parsed into these
models, so the rest of the system cannot tell them apart structurally and
every code path renders identically.
"""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.domain.types import RiskLevel


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EmergencyFlags(StrictModel):
    call_112: bool = False
    call_108: bool = False


class ActionStep(StrictModel):
    step: int = Field(ge=1, le=8)
    title: str = Field(min_length=1, max_length=120)
    instruction: str = Field(min_length=1, max_length=600)


class MedicalFollowUp(StrictModel):
    required: bool
    reason: Optional[str] = Field(default=None, max_length=400)


class Guidance(StrictModel):
    risk_level: RiskLevel
    summary: str = Field(min_length=1, max_length=600)
    emergency: EmergencyFlags = EmergencyFlags()
    immediate_actions: list[ActionStep] = Field(min_length=1, max_length=8)
    do_not: list[str] = Field(default=[], max_length=8)
    monitor: list[str] = Field(default=[], max_length=8)
    medical_follow_up: MedicalFollowUp
    sources: list[str] = Field(default=[], max_length=6)

    def display_strings(self) -> list[str]:
        """Human-readable values, used by the output language check.

        `do_not` is included here but deliberately excluded from the safety
        filter — see `services/output_guard.py`.
        """
        parts = [self.summary]
        for action in self.immediate_actions:
            parts.extend([action.title, action.instruction])
        parts.extend(self.do_not)
        parts.extend(self.monitor)
        if self.medical_follow_up.reason:
            parts.append(self.medical_follow_up.reason)
        return [part for part in parts if part]

    def recommendation_strings(self) -> list[str]:
        """Strings that tell the user to *do* something.

        The safety filter scans only these. `do_not` entries are excluded on
        purpose: "do not apply butter to a burn" is correct first aid and must
        not be flagged as recommending butter.
        """
        parts = [self.summary]
        for action in self.immediate_actions:
            parts.extend([action.title, action.instruction])
        parts.extend(self.monitor)
        if self.medical_follow_up.reason:
            parts.append(self.medical_follow_up.reason)
        return [part for part in parts if part]
