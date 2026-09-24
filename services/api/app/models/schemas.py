from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

Recommendation = Literal["IRRIGATE", "DO_NOT_IRRIGATE"]
SafetyStatus = Literal["RECOMMENDATION_ONLY", "ACTUATION_BLOCKED", "ACTUATION_ALLOWED"]

class SensorReading(BaseModel):
    device_id: str = Field(min_length=1)
    captured_at: datetime
    temperature_C: float
    humidity_percent: float = Field(alias="humidity_%", ge=0, le=100)
    soil_moisture_percent: float = Field(alias="soil_moisture_%", ge=0, le=100)

    model_config = {"populate_by_name": True}

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
