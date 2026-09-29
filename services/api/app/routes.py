"""API route definitions — Phase 1.3.

All business logic is delegated to injected services (DecisionEngine,
IngestionService).  Routes are responsible only for HTTP plumbing:
reading request data, invoking services, and returning responses.

Mock fallbacks
--------------
Endpoints that do not yet have a live data source (e.g. /sensors/latest,
/sensors/history) continue to call the mock data generator.  They are
individually marked with a # TODO comment so they are easy to find when
live ingestion or persistence is wired in.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status

from .decision.engine import DecisionEngine
from .dependencies import device_secret_dep, engine_dep, ingestion_dep, settings_dep
from .ingestion.telemetry import IngestionService, IngestionStatus
from .mock.data_generator import (
    evaluate as mock_evaluate,
    history,
    sensor_reading,
    weather_snapshot,
)
from .models.schemas import DecisionEvaluationRequest, SensorReading
from .config import Settings

router = APIRouter(prefix="/api/v1")


# --------------------------------------------------------------------------- #
# Health / status                                                               #
# --------------------------------------------------------------------------- #

@router.get("/health")
def health(settings: Settings = Depends(settings_dep)) -> dict:
    return {
        "status": "ok",
        "service": "hydrowise-api",
        "env": settings.hydrowise_env,
        "weather_adapter": "mock" if settings.use_mock_weather else "live",
        "ml_adapter": "mock" if settings.use_mock_ml else "sklearn",
    }


@router.get("/system/status")
def system_status(settings: Settings = Depends(settings_dep)) -> dict:
    return {
        "checked_at": datetime.now(timezone.utc),
        "api": "online",
        "weather_provider": "mock" if settings.use_mock_weather else "live",
        "esp32": "simulated",  # TODO: update when live telemetry is wired
        "actuation": "recommendation-only",
        "ml_adapter": "mock" if settings.use_mock_ml else f"sklearn@{settings.model_version}",
    }


# --------------------------------------------------------------------------- #
# Weather                                                                      #
# --------------------------------------------------------------------------- #

@router.get("/weather/snapshot")
async def get_weather(engine: DecisionEngine = Depends(engine_dep)):
    """Return the current weather snapshot from the configured provider."""
    # Fetch snapshot directly from the wired weather provider
    return await engine._weather.fetch_snapshot()


# --------------------------------------------------------------------------- #
# Sensors                                                                      #
# --------------------------------------------------------------------------- #

@router.get("/sensors/latest")
def get_latest_sensors():
    """
    Return the most recent sensor reading.

    # TODO (Phase 4): replace mock with TelemetryStore.latest() once live
    # ESP32 ingestion is wired.
    """
    return sensor_reading()


@router.post("/sensors/telemetry", status_code=status.HTTP_201_CREATED)
async def post_telemetry(
    reading: SensorReading,
    ingestion: IngestionService = Depends(ingestion_dep),
    device_secret: str | None = Depends(device_secret_dep),
):
    """
    Accept a sensor reading from an ESP32 device.

    The IngestionService validates device authentication (via the optional
    X-Device-Secret header) and checks that the reading is fresh before
    persisting it.
    """
    result = await ingestion.ingest(reading, device_secret=device_secret)

    if result.status is IngestionStatus.AUTHENTICATION_FAILED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.detail,
        )

    if result.status is IngestionStatus.STALE_READING:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.detail,
        )

    return result.reading


@router.get("/sensors/history")
def get_sensor_history():
    """
    Return 24 hours of sensor history.

    # TODO (Phase 4): replace mock with TelemetryStore.history() once
    # persistence is available.
    """
    return {"items": history()}


# --------------------------------------------------------------------------- #
# Decisions                                                                    #
# --------------------------------------------------------------------------- #

@router.post("/decisions/evaluate")
async def evaluate_decision(
    payload: DecisionEvaluationRequest,
    engine: DecisionEngine = Depends(engine_dep),
):
    """
    Evaluate irrigation need for an explicit weather + sensor payload.

    Uses the full decision pipeline (weather gate → ML → safety layer).
    The weather snapshot in the payload bypasses the live provider call.
    """
    return await engine.evaluate(
        snapshot=payload.weather,
        reading=payload.sensors,
    )


@router.get("/decisions/evaluate")
async def get_current_decision(engine: DecisionEngine = Depends(engine_dep)):
    """
    Evaluate irrigation need using fresh data from configured adapters.

    Fetches a weather snapshot from the provider and a sensor reading from
    the mock generator (Phase 1) / telemetry store (Phase 4+).
    """
    return await engine.evaluate()


@router.get("/decisions/history")
async def get_decision_history(engine: DecisionEngine = Depends(engine_dep)):
    """
    Return a short history of irrigation decisions.

    # TODO (Phase 6): replace with real decision history from persistence.
    """
    decisions = [await engine.evaluate() for _ in range(8)]
    return {"items": decisions}
