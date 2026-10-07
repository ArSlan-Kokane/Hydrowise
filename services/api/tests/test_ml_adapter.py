"""Tests for the ML inference adapter and proprietary AMHOE mathematical model (Phase 3 & 5).

Hard Architecture Rules Tested:
1. Feature set is ONLY: temperature_C, humidity_%, soil_moisture_%.
2. Rain probability is NEVER a training or inference feature.
3. The output is advisory recommendation (IRRIGATE / DO_NOT_IRRIGATE), never a direct pump command.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import pytest

from app.config import Settings
from app.decision.ml_adapter import (
    MockMLAdapter,
    ProprietaryMLAdapter,
    get_ml_adapter,
)
from app.models.schemas import MLResult, SensorReading


def test_mock_ml_adapter_heuristics(base_settings: Settings) -> None:
    """Mock ML adapter returns IRRIGATE on high-stress, DO_NOT_IRRIGATE otherwise."""
    adapter = MockMLAdapter(base_settings)

    stressed_reading = SensorReading(
        device_id="esp32-test",
        temperature_C=35.0,
        humidity_percent=40.0,
        soil_moisture_percent=20.0,
        captured_at=datetime.now(timezone.utc),
    )
    result = asyncio.run(adapter.predict(stressed_reading))
    assert isinstance(result, MLResult)
    assert result.recommendation == "IRRIGATE"

    wet_reading = SensorReading(
        device_id="esp32-test",
        temperature_C=22.0,
        humidity_percent=80.0,
        soil_moisture_percent=60.0,
        captured_at=datetime.now(timezone.utc),
    )
    result_wet = asyncio.run(adapter.predict(wet_reading))
    assert result_wet.recommendation == "DO_NOT_IRRIGATE"


def test_proprietary_amhoe_adapter_evaluation(base_settings: Settings) -> None:
    """AMHOE proprietary mathematical engine evaluates water-stress correctly."""
    adapter = ProprietaryMLAdapter(base_settings)
    assert adapter._version == "AMHOE-v1.0-proprietary"

    # Extreme Indian heatwave + dry soil -> IRRIGATE
    dry_field = SensorReading(
        device_id="esp32-test",
        temperature_C=39.5,
        humidity_percent=28.0,
        soil_moisture_percent=16.0,
        captured_at=datetime.now(timezone.utc),
    )
    res_dry = asyncio.run(adapter.predict(dry_field))
    assert res_dry.recommendation == "IRRIGATE"
    assert res_dry.model_version == "AMHOE-v1.0-proprietary"

    # Post-monsoon saturated soil -> DO_NOT_IRRIGATE
    saturated_field = SensorReading(
        device_id="esp32-test",
        temperature_C=24.0,
        humidity_percent=85.0,
        soil_moisture_percent=72.0,
        captured_at=datetime.now(timezone.utc),
    )
    res_sat = asyncio.run(adapter.predict(saturated_field))
    assert res_sat.recommendation == "DO_NOT_IRRIGATE"


def test_ml_adapter_factory_routing() -> None:
    """get_ml_adapter returns ProprietaryMLAdapter when blueprint JSON is configured."""
    # When empty -> Mock adapter
    mock_settings = Settings(model_artifact_path="")
    assert isinstance(get_ml_adapter(mock_settings), MockMLAdapter)

    # When .json blueprint is configured -> Proprietary AMHOE adapter
    blueprint_settings = Settings(model_artifact_path="ml/models/model_blueprint.json")
    assert isinstance(get_ml_adapter(blueprint_settings), ProprietaryMLAdapter)


def test_ml_adapter_features_strict_boundary() -> None:
    """Verify inference requires only the 3 physical sensor features and never rainfall."""
    reading = SensorReading(
        device_id="esp32-test",
        temperature_C=32.0,
        humidity_percent=45.0,
        soil_moisture_percent=25.0,
        captured_at=datetime.now(timezone.utc),
    )
    dumped = reading.model_dump()
    assert "rain_probability_percent" not in dumped
    assert "rainfall" not in dumped
    assert set(dumped.keys()) == {
        "device_id",
        "temperature_C",
        "humidity_percent",
        "soil_moisture_percent",
        "captured_at",
        "received_at",
    }
