"""
Environment-backed configuration for the HydroWise API service.

Values are read from environment variables (or a .env file when python-dotenv
is available).  No secret values are committed; placeholders are provided via
.env.example.

Design note
-----------
All external integration points (weather provider URL/key, device secret,
model path) are optional in the development environment.  The service boots
without them and falls back to mock adapters; this makes local development
and CI fast without requiring real credentials.
"""

from functools import lru_cache
from typing import Literal
import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings derived from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------ #
    # Runtime environment                                                  #
    # ------------------------------------------------------------------ #
    hydrowise_env: Literal["development", "production", "test"] = Field(
        default="development",
        description="Controls which adapter implementations are wired in.",
    )

    weather_provider: Literal["open-meteo", "mock", "custom"] = Field(
        default="open-meteo",
        alias="WEATHER_PROVIDER",
        description="Provider for weather forecasting ('open-meteo', 'mock', or 'custom').",
    )
    weather_latitude: float = Field(
        default=18.5204,
        alias="WEATHER_LATITUDE",
        description="Latitude for weather forecast (default: 18.5204 Pune, Maharashtra).",
    )
    weather_longitude: float = Field(
        default=73.8567,
        alias="WEATHER_LONGITUDE",
        description="Longitude for weather forecast (default: 73.8567 Pune, Maharashtra).",
    )
    weather_api_base_url: str = Field(
        default="https://api.open-meteo.com/v1/forecast",
        description=(
            "Base URL for the live weather provider. "
            "Empty string → mock adapter is used."
        ),
    )
    weather_api_key: str = Field(
        default="",
        description="API key for the weather provider (not required for Open-Meteo).",
    )
    # Fixed decision gate threshold (architecture constraint, not configurable)
    weather_gate_threshold_percent: float = Field(
        default=30.0,
        description=(
            "Rain-probability threshold (%). If forecast ≥ this value the "
            "system returns DO_NOT_IRRIGATE without invoking ML."
        ),
    )
    weather_forecast_horizon_hours: Literal[6] = Field(
        default=6,
        description="Fixed 6-hour forecast window required by the decision architecture.",
    )

    # ------------------------------------------------------------------ #
    # Sensor / device ingestion                                            #
    # ------------------------------------------------------------------ #
    device_api_key: str = Field(
        default="",
        alias="DEVICE_API_KEY",
        description="API key required for device telemetry posts via X-API-Key header.",
    )
    device_ingestion_secret: str = Field(
        default="",
        alias="DEVICE_INGESTION_SECRET",
        description="Shared secret used to authenticate ESP32 telemetry posts (legacy).",
    )
    sensor_freshness_seconds: int = Field(
        default=300,
        description=(
            "Maximum age (seconds) of a sensor reading considered 'fresh'.  "
            "Readings older than this fail the freshness check."
        ),
    )

    @property
    def effective_device_api_key(self) -> str:
        """Return the configured device API key or fallback to legacy secret."""
        return self.device_api_key or self.device_ingestion_secret

    # ------------------------------------------------------------------ #
    # ML model artifact                                                    #
    # ------------------------------------------------------------------ #
    model_artifact_path: str = Field(
        default="ml/models/model_blueprint.json",
        alias="MODEL_ARTIFACT_PATH",
        description=(
            "Filesystem path to the trained model artifact (e.g. .json blueprint / .pkl).  "
            "Empty → mock ML adapter is used."
        ),
    )
    model_version: str = Field(
        default="mock-v0.1",
        description="Version tag injected into IrrigationDecision.ml_result.",
    )

    # ------------------------------------------------------------------ #
    # Persistence                                                          #
    # ------------------------------------------------------------------ #
    database_url: str = Field(
        default="sqlite:///hydrowise.db",
        alias="DATABASE_URL",
        description="Connection URL for database (SQLite or PostgreSQL).",
    )

    @property
    def sqlite_db_path(self) -> str:
        """Resolve the SQLite filesystem path from database_url."""
        url = self.database_url or "sqlite:///hydrowise.db"
        if url.startswith("sqlite:///"):
            return url[len("sqlite:///") :]
        if url.startswith("sqlite://"):
            return url[len("sqlite://") :]
        return url

    @property
    def use_postgres(self) -> bool:
        """True when DATABASE_URL is a PostgreSQL connection string."""
        return self.database_url and self.database_url.startswith("postgresql://")

    # ------------------------------------------------------------------ #
    # API service                                                          #
    # ------------------------------------------------------------------ #
    cors_origins_str: str = Field(
        default='["http://localhost:5173","http://127.0.0.1:5173","*"]',
        alias="CORS_ORIGINS",
        description="Allowed CORS origins for the web dashboard (JSON string or comma-separated).",
    )

    @property
    def api_cors_origins(self) -> list[str]:
        """Parse and return CORS origins as a list."""
        if isinstance(self.cors_origins_str, list):
            return self.cors_origins_str
        if not self.cors_origins_str or self.cors_origins_str.strip() == "":
            return ["http://localhost:5173", "http://127.0.0.1:5173", "*"]
        # Try JSON first
        try:
            return json.loads(self.cors_origins_str)
        except json.JSONDecodeError:
            # Fall back to comma-separated
            return [origin.strip() for origin in self.cors_origins_str.split(",")]

    @property
    def use_mock_weather(self) -> bool:
        """True when mock weather adapter is configured."""
        if self.weather_provider.lower() == "mock":
            return True
        if self.weather_provider.lower() == "open-meteo":
            return False
        return not self.weather_api_base_url

    @property
    def use_mock_ml(self) -> bool:
        """True when no trained model artifact is configured."""
        return not self.model_artifact_path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the application settings singleton (cached after first call)."""
    return Settings()
