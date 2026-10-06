"""Integration tests for FastAPI endpoints (HTTP client level)."""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi.testclient import TestClient


def test_health_endpoint(api_client: TestClient) -> None:
    """GET /api/health and /api/v1/health return 200 OK with service status."""
    res = api_client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "hydrowise-api"

    res_v1 = api_client.get("/api/v1/health")
    assert res_v1.status_code == 200
    assert res_v1.json()["status"] == "ok"



def test_weather_snapshot_endpoint(api_client: TestClient) -> None:
    """GET /api/v1/weather/snapshot returns valid forecast snapshot."""
    res = api_client.get("/api/v1/weather/snapshot")
    assert res.status_code == 200
    data = res.json()
    assert "rain_probability_%" in data or "rain_probability_percent" in data
    assert data["forecast_horizon_hours"] == 6
    assert "provider" in data


def test_sensor_ingestion_and_latest(api_client: TestClient) -> None:
    """POST /api/sensors/reading ingests telemetry; GET /api/sensors/latest retrieves it."""
    reading_payload = {
        "device_id": "esp32-e2e-test",
        "temperature_C": 33.5,
        "humidity_%": 45.0,
        "soil_moisture_%": 22.0,
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }

    # Ingest with device API key
    headers = {"X-API-Key": "hydrowise-esp32-key-dev"}
    post_res = api_client.post("/api/v1/sensors/reading", json=reading_payload, headers=headers)
    assert post_res.status_code == 201

    # Fetch latest
    get_res = api_client.get("/api/v1/sensors/latest")
    assert get_res.status_code == 200
    latest_data = get_res.json()
    assert latest_data["device_id"] == "esp32-e2e-test"
    assert latest_data["temperature_C"] == 33.5


def test_decision_evaluate_endpoint(api_client: TestClient) -> None:
    """GET /api/v1/decisions/evaluate returns an IrrigationDecision."""
    res = api_client.get("/api/v1/decisions/evaluate")
    assert res.status_code == 200
    data = res.json()

    assert "recommendation" in data
    assert data["recommendation"] in ("IRRIGATE", "DO_NOT_IRRIGATE")
    assert "weather_gate" in data
    assert "safety_status" in data
    assert data["safety_status"] == "RECOMMENDATION_ONLY"
