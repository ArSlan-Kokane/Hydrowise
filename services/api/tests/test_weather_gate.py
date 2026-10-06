"""Tests for the weather gate rule engine and weather providers (Phase 4).

Hard Architecture Rules Tested:
1. Rain probability > 30% MUST block irrigation immediately (GateResult.passed == False).
2. Rain probability <= 30% passes the gate (GateResult.passed == True).
3. The 30% threshold is evaluated before any ML model is invoked.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import pytest

from app.config import Settings
from app.decision.gate import GateResult
from app.models.schemas import WeatherSnapshot
from app.providers.weather import (
    MockWeatherProvider,
    OpenMeteoWeatherProvider,
    get_weather_provider,
)


def _make_snapshot(rain_prob: float) -> WeatherSnapshot:
    return WeatherSnapshot(
        observed_at=datetime.now(timezone.utc),
        forecast_horizon_hours=6,
        rain_probability_percent=rain_prob,
        provider="test-gate-fixture",
    )


@pytest.mark.parametrize(
    ("rain_prob", "expected_passed"),
    [
        (0.0, True),
        (10.0, True),
        (25.5, True),
        (29.9, True),
        (30.0, True),    # Exact boundary threshold: rain <= 30.0 passes
        (30.1, False),   # Above threshold: blocks
        (31.0, False),
        (50.0, False),
        (75.0, False),
        (100.0, False),
    ],
)
def test_weather_gate_threshold_boundaries(
    base_settings: Settings, rain_prob: float, expected_passed: bool
) -> None:
    """Validate strict 30% boundary conditions for the weather gate."""
    snapshot = _make_snapshot(rain_prob)
    result = GateResult.evaluate(snapshot, base_settings)

    assert result.passed is expected_passed
    assert result.gate.passed is expected_passed
    assert result.gate.rain_probability_percent == rain_prob
    assert result.gate.threshold_percent == 30


def test_weather_gate_architecture_constraint_fixed_30(base_settings: Settings) -> None:
    """Verify WeatherGate enforces fixed 30% threshold architecture constraint."""
    snap = _make_snapshot(20.0)
    result = GateResult.evaluate(snap, base_settings)
    assert result.gate.threshold_percent == 30
    assert result.passed is True


def test_mock_weather_provider(base_settings: Settings) -> None:
    """Mock weather provider returns valid WeatherSnapshot conforming to schema."""
    provider = MockWeatherProvider(base_settings)
    snapshot = asyncio.run(provider.fetch_snapshot())

    assert isinstance(snapshot, WeatherSnapshot)
    assert 0.0 <= snapshot.rain_probability_percent <= 100.0
    assert snapshot.forecast_horizon_hours == 6
    assert snapshot.provider == "mock-weather-adapter"


def test_weather_provider_factory(base_settings: Settings, open_meteo_settings: Settings) -> None:
    """Factory selects correct provider implementation based on settings."""
    mock_prov = get_weather_provider(base_settings)
    assert isinstance(mock_prov, MockWeatherProvider)

    om_prov = get_weather_provider(open_meteo_settings)
    assert isinstance(om_prov, OpenMeteoWeatherProvider)


def test_open_meteo_fallback_on_unreachable_endpoint() -> None:
    """Open-Meteo provider gracefully falls back to safe snapshot if API is unreachable."""
    bad_settings = Settings(
        WEATHER_PROVIDER="open-meteo",
        weather_api_base_url="http://127.0.0.1:59999/unreachable",
    )
    provider = OpenMeteoWeatherProvider(bad_settings)
    snapshot = asyncio.run(provider.fetch_snapshot())

    assert isinstance(snapshot, WeatherSnapshot)
    assert snapshot.forecast_horizon_hours == 6
    assert snapshot.rain_probability_percent == 0.0
    assert snapshot.provider == "open-meteo-fallback"
