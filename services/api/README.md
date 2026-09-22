# HydroWise API service

This directory is the future server-side boundary for weather integration, sensor ingestion, decision orchestration, and dashboard reads.

## Current status

Scaffold only. No API routes, provider clients, persistence, background workers, ML inference, or hardware transport are implemented yet.

## Planned modules

- `app/providers/`: weather provider adapter(s); provider details stay server-side.
- `app/ingestion/`: authenticated ESP32 telemetry intake and validation.
- `app/decision/`: weather gate, ML adapter, and final safety layer as separate modules.
- `app/config.py`: environment-backed configuration without committed secrets.
- `app/main.py`: future FastAPI application entry point.

The weather gate must remain upstream of ML inference, and the ML adapter must never directly control a relay or pump.
