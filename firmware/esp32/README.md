# HydroWise ESP32 firmware

This directory is reserved for firmware that reads the temperature/humidity and soil-moisture sensors and publishes validated telemetry over Wi-Fi.

## Current status

Scaffold only. No pin assignments, sensor drivers, Wi-Fi credentials, telemetry transport, relay control, or pump automation are implemented.

The device must not make irrigation decisions locally. Future relay/pump actuation belongs behind a server-side safety and authorization layer.
