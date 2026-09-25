from datetime import datetime, timedelta, timezone
from random import Random

from ..models.schemas import (
    DecisionEvaluationRequest,
    IrrigationDecision,
    MLResult,
    SensorReading,
    WeatherGate,
    WeatherSnapshot,
)

_rng = Random(7)
DEVICE_ID = "esp32dev-field-01"


def weather_snapshot(rain_probability: float | None = None) -> WeatherSnapshot:
    return WeatherSnapshot(
        observed_at=datetime.now(timezone.utc),
        rain_probability_percent=rain_probability if rain_probability is not None else 5.0,
        provider="Mock weather adapter",
    )


def sensor_reading() -> SensorReading:
    return SensorReading(
        device_id=DEVICE_ID,
        captured_at=datetime.now(timezone.utc),
        temperature_C=round(36 + _rng.uniform(-2, 2), 1),
        humidity_percent=round(44 + _rng.uniform(-5, 5), 1),
        soil_moisture_percent=round(22 + _rng.uniform(-4, 4), 1),
    )


def evaluate(payload: DecisionEvaluationRequest) -> IrrigationDecision:
    rain = payload.weather.rain_probability_percent
    gate_passed = rain <= 30
    sensors = payload.sensors
    ml_recommendation = "IRRIGATE" if sensors.soil_moisture_percent < 35 and sensors.temperature_C > 28 and sensors.humidity_percent < 65 else "DO_NOT_IRRIGATE"
    return IrrigationDecision(
        decided_at=datetime.now(timezone.utc),
        recommendation=ml_recommendation if gate_passed else "DO_NOT_IRRIGATE",
        weather_gate=WeatherGate(rain_probability_percent=rain, passed=gate_passed),
        ml_result=MLResult(recommendation=ml_recommendation, model_version="mock-v0.1") if gate_passed else None,
        safety_status="RECOMMENDATION_ONLY",
    )


def history(hours: int = 24) -> list[SensorReading]:
    current = sensor_reading()
    return [current.model_copy(update={"captured_at": current.captured_at - timedelta(hours=hours - index)}) for index in range(hours)]
