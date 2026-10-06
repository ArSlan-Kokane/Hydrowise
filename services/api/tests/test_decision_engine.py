"""Integration tests for the complete Decision Engine pipeline (Phase 5).

Decision Order (docs/architecture.md):
    1. Fetch rain probability from weather provider.
    2. If rain > 30% -> DO_NOT_IRRIGATE immediately (ML skipped).
    3. Validate sensor reading (pulled from store or payload).
    4. Invoke ML classifier using temperature, humidity, soil moisture.
    5. Attach safety status (RECOMMENDATION_ONLY in Phase 1-5).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import pytest

from app.config import Settings
from app.decision.engine import DecisionEngine
from app.decision.ml_adapter import ProprietaryMLAdapter
from app.ingestion.telemetry import SqliteTelemetryStore
from app.models.schemas import IrrigationDecision, SensorReading, WeatherSnapshot
from app.providers.weather import MockWeatherProvider


def _build_engine(
    settings: Settings,
    store: SqliteTelemetryStore | None = None,
) -> DecisionEngine:
    weather = MockWeatherProvider(settings)
    ml = ProprietaryMLAdapter(settings)
    return DecisionEngine(settings=settings, weather=weather, ml=ml, store=store)


def test_decision_engine_weather_gate_blocks_skipping_ml(
    base_settings: Settings,
    high_rain_snapshot: WeatherSnapshot,
    dry_sensor_reading: SensorReading,
) -> None:
    """When rain forecast > 30%, irrigation is blocked and ML is skipped completely."""
    engine = _build_engine(base_settings)

    decision: IrrigationDecision = asyncio.run(
        engine.evaluate(snapshot=high_rain_snapshot, reading=dry_sensor_reading)
    )

    # Hard constraints verification
    assert decision.recommendation == "DO_NOT_IRRIGATE"
    assert decision.weather_gate.passed is False
    assert decision.weather_gate.rain_probability_percent == 75.0
    assert decision.ml_result is None  # ML was not invoked
    assert decision.safety_status == "RECOMMENDATION_ONLY"


def test_decision_engine_gate_passes_irrigate(
    base_settings: Settings,
    low_rain_snapshot: WeatherSnapshot,
    dry_sensor_reading: SensorReading,
) -> None:
    """When rain forecast <= 30% and soil is dry, ML is invoked and recommends IRRIGATE."""
    engine = _build_engine(base_settings)

    decision: IrrigationDecision = asyncio.run(
        engine.evaluate(snapshot=low_rain_snapshot, reading=dry_sensor_reading)
    )

    assert decision.weather_gate.passed is True
    assert decision.ml_result is not None
    assert decision.ml_result.recommendation == "IRRIGATE"
    assert decision.recommendation == "IRRIGATE"
    assert decision.safety_status == "RECOMMENDATION_ONLY"


def test_decision_engine_gate_passes_do_not_irrigate(
    base_settings: Settings,
    low_rain_snapshot: WeatherSnapshot,
    wet_sensor_reading: SensorReading,
) -> None:
    """When rain forecast <= 30% but soil is saturated, ML recommends DO_NOT_IRRIGATE."""
    engine = _build_engine(base_settings)

    decision: IrrigationDecision = asyncio.run(
        engine.evaluate(snapshot=low_rain_snapshot, reading=wet_sensor_reading)
    )

    assert decision.weather_gate.passed is True
    assert decision.ml_result is not None
    assert decision.ml_result.recommendation == "DO_NOT_IRRIGATE"
    assert decision.recommendation == "DO_NOT_IRRIGATE"


def test_decision_engine_pulls_latest_from_telemetry_store(
    base_settings: Settings,
    low_rain_snapshot: WeatherSnapshot,
    memory_store: SqliteTelemetryStore,
) -> None:
    """When no reading is passed in payload, engine uses the latest reading stored in DB."""
    engine = _build_engine(base_settings, store=memory_store)

    # Save a live dry reading into the store
    live_reading = SensorReading(
        device_id="esp32-field-live",
        temperature_C=39.0,
        humidity_percent=30.0,
        soil_moisture_percent=15.0,
        captured_at=datetime.now(timezone.utc),
    )
    asyncio.run(memory_store.save(live_reading))

    # Evaluate without explicit reading argument
    decision = asyncio.run(engine.evaluate(snapshot=low_rain_snapshot, reading=None))

    assert decision.weather_gate.passed is True
    assert decision.ml_result is not None
    assert decision.recommendation == "IRRIGATE"


def test_decision_engine_fallback_when_store_empty(
    base_settings: Settings,
    low_rain_snapshot: WeatherSnapshot,
    memory_store: SqliteTelemetryStore,
) -> None:
    """When store is empty and no reading provided, engine uses fallback generator safely."""
    engine = _build_engine(base_settings, store=memory_store)

    # Store is empty
    assert asyncio.run(memory_store.latest()) is None

    # Should evaluate without raising errors
    decision = asyncio.run(engine.evaluate(snapshot=low_rain_snapshot, reading=None))
    assert decision.recommendation in ("IRRIGATE", "DO_NOT_IRRIGATE")
    assert decision.weather_gate.passed is True
