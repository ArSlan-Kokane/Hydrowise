"""Weather provider adapter layer.

Structure
---------
WeatherProvider  — abstract protocol that all provider adapters must satisfy.
MockWeatherProvider — deterministic stub used in development / test.

Adding a real provider (e.g. Open-Meteo, OpenWeatherMap) means creating a new
class that implements WeatherProvider and wiring it in get_weather_provider()
without touching any other module.

The provider is injected into FastAPI routes via Depends(get_weather_provider),
so swapping implementations requires only a one-line change in this file
(or an env-var toggle).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Protocol, runtime_checkable

from ..config import Settings
from ..models.schemas import WeatherSnapshot

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Protocol (interface contract)                                                #
# --------------------------------------------------------------------------- #

@runtime_checkable
class WeatherProvider(Protocol):
    """Adapter contract: fetch the next-6-hour rain-probability snapshot."""

    async def fetch_snapshot(self) -> WeatherSnapshot:
        """Return the current weather snapshot for the decision gate."""
        ...


# --------------------------------------------------------------------------- #
# Mock adapter (Phase 1 — no live API key required)                            #
# --------------------------------------------------------------------------- #

class MockWeatherProvider:
    """
    Deterministic stub that returns a fixed low-rain reading.

    The fixed 5 % rain probability ensures the weather gate passes during
    local development so the full decision flow can be exercised end-to-end
    without a real API key.

    Replace with a live provider adapter once a weather API is chosen.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def fetch_snapshot(self) -> WeatherSnapshot:
        logger.debug("MockWeatherProvider: returning deterministic snapshot")
        return WeatherSnapshot(
            observed_at=datetime.now(timezone.utc),
            rain_probability_percent=5.0,
            provider="mock-weather-adapter",
        )


# --------------------------------------------------------------------------- #
# Stub for a future HTTP-backed provider (skeleton only)                       #
# --------------------------------------------------------------------------- #

class HttpWeatherProvider:
    """
    Placeholder for a real HTTP weather provider.

    Implementation is intentionally deferred — the provider URL/key, request
    shape, and error-handling strategy are not yet selected.  Only the
    constructor and method signature are defined so that the injection
    machinery can reference this class without compile errors.

    When implementing: fill in fetch_snapshot(), add httpx as a dependency,
    parse the provider-specific JSON into WeatherSnapshot, and add retry /
    circuit-breaker logic appropriate for production.
    """

    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.weather_api_base_url
        self._api_key = settings.weather_api_key
        self._horizon = settings.weather_forecast_horizon_hours

    async def fetch_snapshot(self) -> WeatherSnapshot:
        raise NotImplementedError(
            "HttpWeatherProvider.fetch_snapshot() is not yet implemented.  "
            "Set WEATHER_API_BASE_URL and WEATHER_API_KEY to an empty string "
            "to use MockWeatherProvider instead."
        )


# --------------------------------------------------------------------------- #
# Dependency factory (wired into FastAPI via Depends)                          #
# --------------------------------------------------------------------------- #

def get_weather_provider(settings: Settings) -> WeatherProvider:
    """
    Return the appropriate weather provider based on current settings.

    Called once per request by FastAPI's dependency injection system.
    Switching to a real provider requires only setting WEATHER_API_BASE_URL
    and WEATHER_API_KEY in the environment — no route or business-logic
    changes needed.
    """
    if settings.use_mock_weather:
        logger.info(
            "Weather provider: mock (set WEATHER_API_BASE_URL + WEATHER_API_KEY "
            "to enable the live provider)"
        )
        return MockWeatherProvider(settings)

    logger.info("Weather provider: HTTP (%s)", settings.weather_api_base_url)
    return HttpWeatherProvider(settings)
