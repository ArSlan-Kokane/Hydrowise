from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field, field_validator

Recommendation = Literal["IRRIGATE", "DO_NOT_IRRIGATE"]
SafetyStatus = Literal["RECOMMENDATION_ONLY", "ACTUATION_BLOCKED", "ACTUATION_ALLOWED"]

class SensorReading(BaseModel):
    device_id: str = Field(min_length=1)
    captured_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    temperature_C: float = Field(ge=-10.0, le=60.0)
    humidity_percent: float = Field(alias="humidity_%", ge=0.0, le=100.0)
    soil_moisture_percent: float = Field(alias="soil_moisture_%", ge=0.0, le=100.0)
    received_at: datetime | None = None

    model_config = {"populate_by_name": True}

    @field_validator("captured_at", mode="before")
    @classmethod
    def default_captured_at_if_none(cls, v):
        if v is None:
            return datetime.now(timezone.utc)
        return v

class WeatherSnapshot(BaseModel):
    observed_at: datetime
    forecast_horizon_hours: Literal[6] = 6
    rain_probability_percent: float = Field(alias="rain_probability_%", ge=0, le=100)
    provider: str

    model_config = {"populate_by_name": True}

class WeatherGate(BaseModel):
    rain_probability_percent: float = Field(alias="rain_probability_%", ge=0, le=100)
    threshold_percent: Literal[30] = Field(30, alias="threshold_%")
    passed: bool

    model_config = {"populate_by_name": True}

class MLResult(BaseModel):
    recommendation: Recommendation
    model_version: str

class IrrigationDecision(BaseModel):
    decided_at: datetime
    recommendation: Recommendation
    weather_gate: WeatherGate
    ml_result: MLResult | None
    safety_status: SafetyStatus

class DecisionEvaluationRequest(BaseModel):
    weather: WeatherSnapshot
    sensors: SensorReading
