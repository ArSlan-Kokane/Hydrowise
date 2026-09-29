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

from pydantic import Field
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

    # ------------------------------------------------------------------ #
    # Weather provider                                                     #
    # ------------------------------------------------------------------ #
    weather_api_base_url: str = Field(
        default="",
        description=(
            "Base URL for the live weather provider.  "
            "Empty string → mock adapter is used."
        ),
    )
    weather_api_key: str = Field(
        default="",
        description="API key for the weather provider.  Keep out of source control.",
    )
    # Fixed decision gate threshold (architecture constraint, not configurable)
    weather_gate_threshold_percent: float = Field(
        default=30.0,
        description=(
            "Rain-probability threshold (%).  If forecast ≥ this value the "
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
    device_ingestion_secret: str = Field(
        default="",
        description=(
            "Shared secret used to authenticate ESP32 telemetry posts.  "
            "Empty → authentication is skipped (development only)."
        ),
    )
    sensor_freshness_seconds: int = Field(
        default=300,
        description=(
            "Maximum age (seconds) of a sensor reading considered 'fresh'.  "
            "Readings older than this fail the freshness check."
        ),
    )

    # ------------------------------------------------------------------ #
    # ML model artifact                                                    #
    # ------------------------------------------------------------------ #
    model_artifact_path: str = Field(
        default="",
        description=(
            "Filesystem path to the trained model artifact (e.g. .pkl / .joblib).  "
            "Empty → mock ML adapter is used."
        ),
    )
    model_version: str = Field(
        default="mock-v0.1",
        description="Version tag injected into IrrigationDecision.ml_result.",
    )

    # ------------------------------------------------------------------ #
    # Persistence (deferred)                                               #
    # ------------------------------------------------------------------ #
    database_url: str = Field(
        default="",
        description="Connection URL for the future persistence layer.",
    )

    # ------------------------------------------------------------------ #
    # API service                                                          #
    # ------------------------------------------------------------------ #
    api_cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
        description="Allowed CORS origins for the web dashboard.",
    )

    @property
    def use_mock_weather(self) -> bool:
        """True when no live weather provider is configured."""
        return not self.weather_api_base_url or not self.weather_api_key

    @property
    def use_mock_ml(self) -> bool:
        """True when no trained model artifact is configured."""
        return not self.model_artifact_path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the application settings singleton (cached after first call)."""
    return Settings()
