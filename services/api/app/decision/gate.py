"""Weather gate — Step 1 of the decision order.

Architecture constraint (docs/architecture.md):
    If rain_probability_percent > 30 % → return DO_NOT_IRRIGATE immediately.
    Do NOT invoke ML.

The threshold is fixed at 30 % by architecture decision and is not intended to
be user-configurable via the API.  It is surfaced in Settings only to allow
the default to be overridden in test fixtures.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from ..config import Settings
from ..models.schemas import WeatherGate, WeatherSnapshot

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GateResult:
    """Outcome of the weather gate evaluation."""

    gate: WeatherGate
    passed: bool  # True → ML may be invoked; False → immediate DO_NOT_IRRIGATE

    @classmethod
    def evaluate(cls, snapshot: WeatherSnapshot, settings: Settings) -> "GateResult":
        """
        Apply the rain-probability gate.

        Parameters
        ----------
        snapshot:
            Current weather snapshot from the provider.
        settings:
            Application settings (carries the threshold value).

        Returns
        -------
        GateResult with passed=True when rain probability is at or below the
        threshold, False otherwise.
        """
        rain = snapshot.rain_probability_percent
        threshold = settings.weather_gate_threshold_percent
        passed = rain <= threshold

        if not passed:
            logger.info(
                "Weather gate BLOCKED: rain probability %.1f %% > threshold %.0f %%",
                rain,
                threshold,
            )
        else:
            logger.debug(
                "Weather gate PASSED: rain probability %.1f %% ≤ threshold %.0f %%",
                rain,
                threshold,
            )

        return cls(
            gate=WeatherGate(
                rain_probability_percent=rain,
                threshold_percent=int(threshold),
                passed=passed,
            ),
            passed=passed,
        )
