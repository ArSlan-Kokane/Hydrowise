"""ML inference adapter — Step 4 of the decision order.

Architecture constraints (docs/architecture.md):
    - Invoked ONLY when the weather gate passes.
    - Input features: temperature_C, humidity_%, soil_moisture_% only.
    - Rainfall probability must NEVER be used as a feature.
    - The ML result is never a direct pump command.

Design pattern
--------------
MLAdapter is a Protocol.  Concrete implementations:

    MockMLAdapter   — rule-based stub (Phase 1, no model file needed).
    SklearnMLAdapter — loads a scikit-learn artifact from disk (Phase 5+).

Adding a different serving backend (ONNX, TensorFlow Serving, etc.) means
writing a new class that satisfies the MLAdapter protocol and wiring it in
get_ml_adapter() — nothing else changes.
"""

from __future__ import annotations

import logging
from typing import Protocol, runtime_checkable

from ..config import Settings
from ..models.schemas import MLResult, Recommendation, SensorReading

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Protocol                                                                     #
# --------------------------------------------------------------------------- #

@runtime_checkable
class MLAdapter(Protocol):
    """Contract: predict irrigation need from sensor features only."""

    async def predict(self, reading: SensorReading) -> MLResult:
        """Return an MLResult using only sensor features."""
        ...


# --------------------------------------------------------------------------- #
# Mock adapter (Phase 1)                                                        #
# --------------------------------------------------------------------------- #

class MockMLAdapter:
    """
    Deterministic rule-based stub used when no model artifact is available.

    Rules mirror the heuristic used in the original mock data_generator so
    that the end-to-end decision flow is exercisable without training.

    DO NOT promote these thresholds to production logic; they exist solely to
    keep the Phase 1 API functional.
    """

    def __init__(self, settings: Settings) -> None:
        self._version = settings.model_version

    async def predict(self, reading: SensorReading) -> MLResult:
        recommendation: Recommendation = (
            "IRRIGATE"
            if (
                reading.soil_moisture_percent < 35
                and reading.temperature_C > 28
                and reading.humidity_percent < 65
            )
            else "DO_NOT_IRRIGATE"
        )
        logger.debug(
            "MockMLAdapter: %s (soil=%.1f, temp=%.1f, hum=%.1f)",
            recommendation,
            reading.soil_moisture_percent,
            reading.temperature_C,
            reading.humidity_percent,
        )
        return MLResult(recommendation=recommendation, model_version=self._version)


# --------------------------------------------------------------------------- #
# Sklearn adapter skeleton (Phase 5+)                                          #
# --------------------------------------------------------------------------- #

class SklearnMLAdapter:
    """
    Loads a serialised scikit-learn pipeline from disk and runs inference.

    Implementation is deferred until Phase 5 (ML inference adapter, per
    implementation-sequence.md).  The skeleton is here so that the wiring
    machinery compiles and the switching logic in get_ml_adapter() is
    already in place.

    When implementing:
    1. Add joblib / pickle to pyproject.toml dependencies.
    2. Load the artifact in __init__ (fail fast at startup if missing).
    3. Validate that the artifact exposes predict() and reports probabilities.
    4. Map the output to an MLResult.
    5. Add an explicit check that 'rain_probability_%' is NOT in the
       feature set — this is a hard architecture rule.
    """

    FEATURE_COLUMNS = ["temperature_C", "humidity_%", "soil_moisture_%"]

    def __init__(self, settings: Settings) -> None:
        self._artifact_path = settings.model_artifact_path
        self._version = settings.model_version
        self._model = None  # loaded lazily on first predict()

    def _load_model(self) -> None:
        try:
            import joblib  # type: ignore[import]
            self._model = joblib.load(self._artifact_path)
            logger.info("ML model loaded from %s", self._artifact_path)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to load ML model from {self._artifact_path!r}: {exc}"
            ) from exc

    async def predict(self, reading: SensorReading) -> MLResult:
        if self._model is None:
            self._load_model()

        features = [[
            reading.temperature_C,
            reading.humidity_percent,
            reading.soil_moisture_percent,
        ]]
        raw: str = self._model.predict(features)[0]  # type: ignore[union-attr]
        recommendation: Recommendation = "IRRIGATE" if raw in ("IRRIGATE", 1, "1") else "DO_NOT_IRRIGATE"
        return MLResult(recommendation=recommendation, model_version=self._version)


# --------------------------------------------------------------------------- #
# Dependency factory                                                            #
# --------------------------------------------------------------------------- #

def get_ml_adapter(settings: Settings) -> MLAdapter:
    """
    Return the appropriate ML adapter based on current settings.

    Switching to the real model requires only setting MODEL_ARTIFACT_PATH in
    the environment — no route or decision-engine changes needed.
    """
    if settings.use_mock_ml:
        logger.info(
            "ML adapter: mock rule-based stub  "
            "(set MODEL_ARTIFACT_PATH to enable the trained model)"
        )
        return MockMLAdapter(settings)

    logger.info("ML adapter: sklearn artifact (%s)", settings.model_artifact_path)
    return SklearnMLAdapter(settings)
