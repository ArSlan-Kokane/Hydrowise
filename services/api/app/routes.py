from fastapi import APIRouter, status
from datetime import datetime, timezone

from .mock.data_generator import evaluate, history, sensor_reading, weather_snapshot
from .models.schemas import DecisionEvaluationRequest, SensorReading

router = APIRouter(prefix="/api/v1")

@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "hydrowise-api", "mode": "phase-1-mock"}

@router.get("/weather/snapshot")
def get_weather():
    return weather_snapshot()

@router.get("/sensors/latest")
def get_latest_sensors():
    return sensor_reading()

@router.post("/sensors/telemetry", status_code=status.HTTP_201_CREATED)
def post_telemetry(reading: SensorReading):
    return reading

@router.get("/sensors/history")
def get_sensor_history():
    return {"items": history()}

@router.post("/decisions/evaluate")
def evaluate_decision(payload: DecisionEvaluationRequest):
    return evaluate(payload)

@router.get("/decisions/evaluate")
def get_current_decision():
    weather = weather_snapshot()
    sensors = sensor_reading()
    return evaluate(DecisionEvaluationRequest(weather=weather, sensors=sensors))

@router.get("/decisions/history")
def get_decision_history():
    return {"items": [get_current_decision() for _ in range(8)]}

@router.get("/system/status")
def system_status():
    return {
        "checked_at": datetime.now(timezone.utc),
        "api": "online",
        "weather_provider": "mock",
        "esp32": "simulated",
        "actuation": "recommendation-only",
    }
