"""FastAPI dependency providers.

All injectable objects are defined here so that routes remain thin and
all wiring decisions live in one place.

Usage in routes
---------------
    from fastapi import Depends
    from .dependencies import engine_dep, ingestion_dep, settings_dep

    @router.get("/decisions/evaluate")
    async def evaluate(engine: DecisionEngine = Depends(engine_dep)):
        return await engine.evaluate()

Swapping implementations
------------------------
Change get_weather_provider() or get_ml_adapter() in their respective modules
(or toggle via env-vars) — nothing in this file or in the routes changes.
"""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings
from .decision.engine import DecisionEngine
from .decision.ml_adapter import get_ml_adapter
from .ingestion.telemetry import IngestionService, get_telemetry_store
from .providers.weather import get_weather_provider


# --------------------------------------------------------------------------- #
# Settings                                                                     #
# --------------------------------------------------------------------------- #

def settings_dep() -> Settings:
    """Inject the application settings singleton."""
    return get_settings()


# --------------------------------------------------------------------------- #
# Decision engine                                                              #
# --------------------------------------------------------------------------- #

async def engine_dep(
    settings: Settings = Depends(settings_dep),
) -> DecisionEngine:
    """
    Build and inject a DecisionEngine with the correct provider adapters.

    Called once per request by FastAPI.  Both the weather provider and ML
    adapter are selected based on the current settings (env-var driven).
    """
    weather = get_weather_provider(settings)
    ml = get_ml_adapter(settings)
    return DecisionEngine(settings=settings, weather=weather, ml=ml)


# --------------------------------------------------------------------------- #
# Ingestion service                                                            #
# --------------------------------------------------------------------------- #

def ingestion_dep(
    settings: Settings = Depends(settings_dep),
) -> IngestionService:
    """Build and inject an IngestionService backed by the in-process store."""
    store = get_telemetry_store()
    return IngestionService(settings=settings, store=store)


# --------------------------------------------------------------------------- #
# Optional device authentication header                                        #
# --------------------------------------------------------------------------- #

def device_secret_dep(
    x_device_secret: str | None = Header(default=None, alias="X-Device-Secret"),
) -> str | None:
    """
    Extract the device authentication secret from the request header.

    Routes that require device auth should include this dependency.
    The IngestionService handles the actual validation so that the route
    handler stays free of auth logic.
    """
    return x_device_secret
