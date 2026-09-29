"""Safety layer — Step 5 of the decision order.

Architecture constraint (docs/architecture.md):
    "Apply a final safety layer before any future actuation; the ML result
     is never a direct pump command."

Responsibilities
----------------
1. Determine the SafetyStatus to attach to every IrrigationDecision.
2. In Phase 1 the status is always RECOMMENDATION_ONLY — no actuation path
   exists yet.
3. When actuation hardware is introduced (Phase 8 per implementation-sequence),
   this module is the single place that decides whether a pump command may
   be issued and under what conditions (manual-override, fail-safe, etc.).

Nothing outside this module should set safety_status on IrrigationDecision.
"""

from __future__ import annotations

import logging

from ..models.schemas import Recommendation, SafetyStatus

logger = logging.getLogger(__name__)


def apply_safety(recommendation: Recommendation) -> SafetyStatus:
    """
    Apply the final safety check and return the appropriate SafetyStatus.

    Phase 1 behaviour
    -----------------
    Always returns RECOMMENDATION_ONLY.  The recommendation is forwarded to
    the dashboard only; no actuation path is wired.

    Future phases
    -------------
    When hardware relay integration is added (Phase 8), this function should:
    - Confirm manual-override mode is inactive.
    - Confirm fail-safe sensor readings are within safe bounds.
    - Return ACTUATION_ALLOWED only when all safety conditions are met.
    - Return ACTUATION_BLOCKED with a reason when any condition fails.

    Parameters
    ----------
    recommendation:
        The final recommendation produced by the ML adapter (or the weather
        gate override).

    Returns
    -------
    SafetyStatus — always RECOMMENDATION_ONLY in Phase 1.
    """
    # Phase 1: no hardware relay, all decisions are advisory only.
    status: SafetyStatus = "RECOMMENDATION_ONLY"

    logger.debug(
        "Safety layer: recommendation=%s, status=%s", recommendation, status
    )
    return status
