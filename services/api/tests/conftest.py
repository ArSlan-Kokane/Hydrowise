"""Shared fixtures and configuration for HydroWise API test suite."""

from __future__ import annotations

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.ingestion.telemetry import SqliteTelemetryStore
from app.main import create_app
from app.models.schemas import SensorReading, WeatherSnapshot


@pytest.fixture
def base_settings() -> Settings:
    """Standard base settings with in-memory database and mock providers."""
    return Settings(
        HYDROWISE_ENV="test",
        WEATHER_PROVIDER="mock",
        WEATHER_GATE_THRESHOLD_PERCENT=30.0,
        SQLITE_DB_PATH=":memory:",
        MODEL_ARTIFACT_PATH="ml/models/model_blueprint.json",
    )


@pytest.fixture
def open_meteo_settings() -> Settings:
    """Settings configured for live Open-Meteo weather provider."""
    return Settings(
        HYDROWISE_ENV="test",
        WEATHER_PROVIDER="open-meteo",
        WEATHER_LATITUDE=18.5204,
        WEATHER_LONGITUDE=73.8567,
        WEATHER_GATE_THRESHOLD_PERCENT=30.0,
        SQLITE_DB_PATH=":memory:",
        MODEL_ARTIFACT_PATH="ml/models/model_blueprint.json",
    )


@pytest.fixture
def dry_sensor_reading() -> SensorReading:
    """Arid/stressed conditions in Indian agriculture -> strongly requires irrigation."""
    return SensorReading(
        device_id="esp32-field-test",
        temperature_C=38.5,
        humidity_percent=32.0,
        soil_moisture_percent=18.0,
        captured_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def wet_sensor_reading() -> SensorReading:
    """Saturated soil/humid conditions -> does NOT require irrigation."""
    return SensorReading(
        device_id="esp32-field-test",
        temperature_C=22.0,
        humidity_percent=82.0,
        soil_moisture_percent=68.0,
        captured_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def low_rain_snapshot() -> WeatherSnapshot:
    """Clear sky snapshot (rain probability 10%, well below 30% gate threshold)."""
    return WeatherSnapshot(
        observed_at=datetime.now(timezone.utc),
        forecast_horizon_hours=6,
        rain_probability_percent=10.0,
        provider="test-weather-provider",
    )


@pytest.fixture
def high_rain_snapshot() -> WeatherSnapshot:
    """Rainstorm forecast (rain probability 75%, well above 30% gate threshold)."""
    return WeatherSnapshot(
        observed_at=datetime.now(timezone.utc),
        forecast_horizon_hours=6,
        rain_probability_percent=75.0,
        provider="test-weather-provider",
    )


@pytest.fixture
def boundary_30_snapshot() -> WeatherSnapshot:
    """Boundary test: exactly 30% rain probability (gate must pass)."""
    return WeatherSnapshot(
        observed_at=datetime.now(timezone.utc),
        forecast_horizon_hours=6,
        rain_probability_percent=30.0,
        provider="test-weather-provider",
    )


@pytest.fixture
def boundary_31_snapshot() -> WeatherSnapshot:
    """Boundary test: 31% rain probability (gate must block)."""
    return WeatherSnapshot(
        observed_at=datetime.now(timezone.utc),
        forecast_horizon_hours=6,
        rain_probability_percent=31.0,
        provider="test-weather-provider",
    )


@pytest.fixture
def memory_store(tmp_path) -> SqliteTelemetryStore:
    """Isolated SQLite telemetry store for test execution."""
    db_file = tmp_path / "test_telemetry.db"
    return SqliteTelemetryStore(db_path=str(db_file))


@pytest.fixture
def api_client() -> TestClient:
    """Synchronous test client configured for HydroWise API."""
    app = create_app()
    return TestClient(app)
