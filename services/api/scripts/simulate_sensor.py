#!/usr/bin/env python3
"""
HydroWise Sensor Simulator
==========================
Simulates an ESP32 field device streaming live temperature, humidity,
and soil moisture readings to the HydroWise API service.

Usage:
    python services/api/scripts/simulate_sensor.py
    python services/api/scripts/simulate_sensor.py --once
    python services/api/scripts/simulate_sensor.py --interval 2.0
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
from datetime import datetime, timezone
import urllib.request
import urllib.error

# Load environment variables if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000").rstrip("/")
DEVICE_ID = os.getenv("DEVICE_ID", "esp32-field-01")
DEVICE_API_KEY = os.getenv("DEVICE_API_KEY", "hydrowise-esp32-key-dev")


def generate_reading(device_id: str = DEVICE_ID) -> dict:
    """Generate India-climate-realistic sensor telemetry."""
    # Typical semi-arid / agricultural Indian conditions
    temp = round(random.uniform(28.0, 39.5), 1)
    humidity = round(random.uniform(35.0, 70.0), 1)
    soil = round(random.uniform(18.0, 48.0), 1)

    return {
        "device_id": device_id,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "temperature_C": temp,
        "humidity_%": humidity,
        "soil_moisture_%": soil,
    }


def post_reading(reading: dict, base_url: str = API_BASE_URL, api_key: str = DEVICE_API_KEY) -> tuple[int, dict]:
    """POST reading to API with X-API-Key header."""
    url = f"{base_url}/api/sensors/reading"
    data = json.dumps(reading).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key,
    }

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status_code = response.getcode()
            body = json.loads(response.read().decode("utf-8"))
            return status_code, body
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode("utf-8")) if e.headers.get_content_type() == "application/json" else {"error": str(e)}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="HydroWise ESP32 Sensor Simulator")
    parser.add_argument("--once", action="store_true", help="Send a single reading and exit")
    parser.add_argument("--interval", type=float, default=5.0, help="Interval between readings in seconds (default: 5.0)")
    parser.add_argument("--url", type=str, default=API_BASE_URL, help=f"API Base URL (default: {API_BASE_URL})")
    parser.add_argument("--key", type=str, default=DEVICE_API_KEY, help="Device API Key")
    parser.add_argument("--device", type=str, default=DEVICE_ID, help=f"Device ID (default: {DEVICE_ID})")
    args = parser.parse_args()

    print("=" * 60)
    print("[*] HydroWise ESP32 Telemetry Simulator")
    print(f"Target URL: {args.url}/api/sensors/reading")
    print(f"Device ID : {args.device}")
    print(f"Auth Key  : {'*' * len(args.key) if args.key else '(none)'}")
    print(f"Interval  : {args.interval}s")
    print("=" * 60)

    count = 0
    try:
        while True:
            count += 1
            reading = generate_reading(device_id=args.device)
            status, response = post_reading(reading, base_url=args.url, api_key=args.key)

            if status == 201:
                rec_at = response.get("received_at", "N/A")
                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] #{count:03d} -> HTTP 201 | "
                    f"Temp: {reading['temperature_C']} C | "
                    f"Hum: {reading['humidity_%']}% | "
                    f"Soil: {reading['soil_moisture_%']}% | "
                    f"Stamped: {rec_at}"
                )
            else:
                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] #{count:03d} -> HTTP {status} FAILED: {response}"
                )

            if args.once:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")


if __name__ == "__main__":
    main()
