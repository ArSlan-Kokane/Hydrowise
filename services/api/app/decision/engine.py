"""Decision engine — orchestrates the full 5-step decision order.

Decision order (docs/architecture.md):
    1. Fetch rain probability from the weather provider.
    2. If probability > 30 % → DO_NOT_IRRIGATE (weather gate blocks).
    3. Validate sensor readings.
    4. Invoke ML classifier using only temperature, humidity, soil moisture.
    5. Apply safety layer; return IrrigationDecision.

DecisionEngine depends on WeatherProvider and MLAdapter via constructor
injection.  Routes obtain it through FastAPI's Depends() system using the
get_decision_engine() factory below.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..config import Settings
from ..ingestion import IngestionService, TelemetryStore
from ..models.schemas import IrrigationDecision, SensorReading, WeatherSnapshot
from ..providers import WeatherProvider
from .gate import GateResult
from .ml_adapter import MLAdapter
from .safety import apply_safety

logger = logging.getLogger(__name__)


class DecisionEngine:
    """
    Orchestrates the complete irrigation decision pipeline.

    Parameters
    ----------
    settings:       Application settings.
    weather:        Injected weather provider adapter.
    ml:             Injected ML inference adapter.
    """

    def __init__(
        self,
        settings: Settings,
        weather: WeatherProvider,
        ml: MLAdapter,
        store: TelemetryStore | None = None,
    ) -> None:
        self._settings = settings
        self._weather = weather
        self._ml = ml
        self._store = store

    async def evaluate(
        self,
        snapshot: WeatherSnapshot | None = None,
        reading: SensorReading | None = None,
    ) -> IrrigationDecision:
        """
        Run the full decision pipeline and return an IrrigationDecision.

        Parameters
        ----------
        snapshot:
            Optional pre-fetched weather snapshot (used by the POST endpoint
            that accepts an explicit payload).  If None, the engine fetches
            a fresh snapshot from the weather provider.
        reading:
            Optional pre-validated sensor reading (used by the POST endpoint).
            If None, the engine pulls the latest reading from the telemetry
            store (future) or falls back to the mock generator.

        Returns
        -------
        IrrigationDecision conforming to the contract schema.
        """
        # Step 1 — Weather snapshot
        if snapshot is None:
            snapshot = await self._weather.fetch_snapshot()
            logger.debug("Fetched weather snapshot from provider")

        # Step 2 — Weather gate
        gate_result: GateResult = GateResult.evaluate(snapshot, self._settings)

        if not gate_result.passed:
            # Gate blocked → skip ML, return immediately
            safety_status = apply_safety("DO_NOT_IRRIGATE")
            return IrrigationDecision(
                decided_at=datetime.now(timezone.utc),
                recommendation="DO_NOT_IRRIGATE",
                weather_gate=gate_result.gate,
                ml_result=None,
                safety_status=safety_status,
            )

        # Steps 3–4 — Sensor reading + ML inference
        if reading is None:
            if self._store is not None:
                latest_stored = await self._store.latest()
                if latest_stored is not None:
                    reading = latest_stored
                    logger.debug("Using live sensor reading from telemetry store: %s", reading.device_id)

            if reading is None:
                from ..mock.data_generator import sensor_reading as mock_sensor
                reading = mock_sensor()
                logger.debug("Using fallback sensor reading (no stored telemetry yet)")

        ml_result = await self._ml.predict(reading)
        logger.info("ML prediction: %s", ml_result.recommendation)

        # Step 5 — Safety layer
        safety_status = apply_safety(ml_result.recommendation)

        return IrrigationDecision(
            decided_at=datetime.now(timezone.utc),
            recommendation=ml_result.recommendation,
            weather_gate=gate_result.gate,
            ml_result=ml_result,
            safety_status=safety_status,
        )
