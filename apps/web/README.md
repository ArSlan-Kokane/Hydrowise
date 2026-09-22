# HydroWise web client

This directory is reserved for the future monitoring and decision-support dashboard.

## Current status

Scaffold only. No routes, data fetching, charts, authentication, or irrigation controls are implemented yet.

## Planned boundary

- Read typed weather, sensor, and decision records from the API service.
- Display the weather gate result separately from the ML result.
- Surface data freshness and safety status before any future pump action.

The web client must not call weather providers, hardware devices, or ML models directly.
