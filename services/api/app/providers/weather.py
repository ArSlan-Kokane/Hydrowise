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
# Live Open-Meteo provider (Phase 4 — Free, No API key required)              #
# --------------------------------------------------------------------------- #

class OpenMeteoWeatherProvider:
    """
    Live weather provider using the Open-Meteo forecast API.

    Fetches the 6-hour precipitation probability forecast for the configured coordinates.
    Caches the snapshot in memory for 15 minutes (900 s) to avoid unnecessary external calls.
    """

    def __init__(self, settings: Settings) -> None:
        self._lat = settings.weather_latitude
        self._lon = settings.weather_longitude
        self._horizon = settings.weather_forecast_horizon_hours
        self._base_url = settings.weather_api_base_url or "https://api.open-meteo.com/v1/forecast"
        self._cached_snapshot: WeatherSnapshot | None = None
        self._cache_time: datetime | None = None
        self._cache_ttl_seconds = 900  # 15 minutes

    async def fetch_snapshot(self) -> WeatherSnapshot:
        now = datetime.now(timezone.utc)
        if (
            self._cached_snapshot is not None
            and self._cache_time is not None
            and (now - self._cache_time).total_seconds() < self._cache_ttl_seconds
        ):
            logger.debug("OpenMeteoWeatherProvider: returning cached 15-min snapshot")
            return self._cached_snapshot

        try:
            import httpx

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    self._base_url,
                    params={
                        "latitude": self._lat,
                        "longitude": self._lon,
                        "hourly": "precipitation_probability",
                        "forecast_hours": self._horizon,
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            hourly = data.get("hourly", {})
            probs = hourly.get("precipitation_probability", [])
            if probs:
                max_rain = float(max(probs[: self._horizon]))
            else:
                max_rain = 0.0

            snapshot = WeatherSnapshot(
                observed_at=now,
                forecast_horizon_hours=6,
                rain_probability_percent=max_rain,
                provider=f"open-meteo ({self._lat:.2f}N, {self._lon:.2f}E)",
            )
            self._cached_snapshot = snapshot
            self._cache_time = now
            logger.info(
                "OpenMeteoWeatherProvider: fetched live 6h rain probability = %.1f %%",
                max_rain,
            )
            return snapshot

        except Exception as exc:
            logger.warning(
                "OpenMeteoWeatherProvider: failed to fetch live weather (%s). Using fallback.",
                exc,
            )
            if self._cached_snapshot is not None:
                return self._cached_snapshot
            return WeatherSnapshot(
                observed_at=now,
                forecast_horizon_hours=6,
                rain_probability_percent=0.0,
                provider="open-meteo-fallback",
            )


# --------------------------------------------------------------------------- #
# Stub for custom HTTP-backed provider                                         #
# --------------------------------------------------------------------------- #

class HttpWeatherProvider:
    """Placeholder for a custom HTTP weather provider."""

    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.weather_api_base_url
        self._api_key = settings.weather_api_key
        self._horizon = settings.weather_forecast_horizon_hours

    async def fetch_snapshot(self) -> WeatherSnapshot:
        raise NotImplementedError(
            "HttpWeatherProvider.fetch_snapshot() is not yet implemented.  "
            "Set WEATHER_PROVIDER=open-meteo or WEATHER_PROVIDER=mock."
        )


# --------------------------------------------------------------------------- #
# Dependency factory (wired into FastAPI via Depends)                          #
# --------------------------------------------------------------------------- #

_open_meteo_singleton: OpenMeteoWeatherProvider | None = None


def get_weather_provider(settings: Settings) -> WeatherProvider:
    """
    Return the appropriate weather provider based on current settings.

    Defaults to OpenMeteoWeatherProvider for live forecasts without API keys.
    """
    global _open_meteo_singleton

    if settings.use_mock_weather:
        logger.info("Weather provider: mock")
        return MockWeatherProvider(settings)

    if settings.weather_provider.lower() == "open-meteo":
        if _open_meteo_singleton is None:
            logger.info(
                "Initializing Open-Meteo live provider (%.2f N, %.2f E)",
                settings.weather_latitude,
                settings.weather_longitude,
            )
            _open_meteo_singleton = OpenMeteoWeatherProvider(settings)
        return _open_meteo_singleton

    logger.info("Weather provider: HTTP (%s)", settings.weather_api_base_url)
    return HttpWeatherProvider(settings)

