#!/usr/bin/env python3
"""
HydroWise USB Serial to API Bridge
==================================
Reads telemetry from an ESP32 connected via USB COM port and forwards
it to the HydroWise API service. Useful for offline bench testing or
when Wi-Fi / AP isolation is active.

Usage:
    python services/api/scripts/serial_bridge.py --port COM3 --baud 115200
    python services/api/scripts/serial_bridge.py --auto
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
import urllib.request
import urllib.error

try:
    import serial
    import serial.tools.list_ports
    PYSERIAL_AVAILABLE = True
except ImportError:
    PYSERIAL_AVAILABLE = False


API_URL = "http://localhost:8000/api/sensors/reading"
API_KEY = "hydrowise-esp32-key-dev"


def post_to_api(data: dict) -> bool:
    try:
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            API_URL,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.getcode() in (200, 201)
    except Exception as exc:
        print(f"[API Error] Failed to post: {exc}")
        return False


def find_esp32_port() -> str | None:
    if not PYSERIAL_AVAILABLE:
        return None
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        desc = p.description.lower()
        if "cp210" in desc or "ch340" in desc or "usb-serial" in desc or "uart" in desc:
            return p.device
    if ports:
        return ports[0].device
    return None


def parse_and_forward(port_name: str, baud: int):
    if not PYSERIAL_AVAILABLE:
        print("[ERROR] pyserial is not installed. Install with: pip install pyserial")
        sys.exit(1)

    print(f"[*] Opening serial port {port_name} @ {baud} baud...")
    ser = serial.Serial(port_name, baud, timeout=1)
    print("[*] Listening for ESP32 sensor stream... Press Ctrl+C to stop.")

    temp = None
    hum = None
    soil_pct = None
    soil_raw = None
    soil_mv = None
    rain = 0
    rain_raw = None

    temp_re = re.compile(r"Temperature\s*:\s*([0-9.]+)")
    hum_re = re.compile(r"Humidity\s*:\s*([0-9.]+)")
    soil_re = re.compile(r"Soil Moisture\s*:\s*([0-9.]+)\s*%.*Raw:\s*(\d+),\s*(\d+)\s*mV")
    rain_re = re.compile(r"Rain Detected\s*:\s*(YES|NO).*Raw:\s*(\d+)")

    try:
        while True:
            line = ser.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                continue

            print(f"[ESP32 Serial] {line}")

            m_t = temp_re.search(line)
            if m_t:
                temp = float(m_t.group(1))

            m_h = hum_re.search(line)
            if m_h:
                hum = float(m_h.group(1))

            m_s = soil_re.search(line)
            if m_s:
                soil_pct = float(m_s.group(1))
                soil_raw = int(m_s.group(2))
                soil_mv = int(m_s.group(3))

            m_r = rain_re.search(line)
            if m_r:
                rain = 1 if "YES" in m_r.group(1) else 0
                rain_raw = int(m_r.group(2))

                # Rain line is the last in the batch - trigger POST
                if temp is not None and hum is not None and soil_pct is not None:
                    payload = {
                        "device_id": "esp32-usb-serial",
                        "captured_at": datetime.now(timezone.utc).isoformat(),
                        "temperature_C": temp,
                        "humidity_%": hum,
                        "soil_moisture_%": soil_pct,
                        "soil_raw": soil_raw,
                        "soil_mv": soil_mv,
                        "rain": rain,
                        "rain_raw": rain_raw,
                    }
                    ok = post_to_api(payload)
                    if ok:
                        print(f"--> [SUCCESS] Forwarded to API: Temp={temp}C, Soil={soil_pct}%, Rain={rain}")
                    else:
                        print("--> [FAIL] Could not deliver to API")
    except KeyboardInterrupt:
        print("\nStopping serial bridge.")
        ser.close()


def main():
    parser = argparse.ArgumentParser(description="HydroWise USB Serial Bridge")
    parser.add_argument("--port", type=str, default=None, help="COM port (e.g. COM3)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default: 115200)")
    parser.add_argument("--auto", action="store_true", help="Auto-detect ESP32 port")
    args = parser.parse_args()

    port = args.port
    if not port or args.auto:
        port = find_esp32_port()
        if not port:
            print("[WARN] Could not auto-detect COM port. Specify manually with --port COMx")
            sys.exit(1)
        print(f"[*] Auto-detected port: {port}")

    parse_and_forward(port, args.baud)


if __name__ == "__main__":
    main()
