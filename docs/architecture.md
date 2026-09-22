# HydroWise architecture baseline

## Purpose

HydroWise is a decision-support system for answering whether farmland should be irrigated now. This repository currently contains scaffolding only; implementation is intentionally deferred.

## Boundaries

| Area | Responsibility | Must not do yet |
| --- | --- | --- |
| `apps/web` | Future dashboard and operator-facing views | Call providers, devices, or models directly |
| `services/api` | Future authenticated service boundary and orchestration | Bypass the weather gate or expose secrets |
| `ml` | Dataset preparation, evaluation, and model artifact lifecycle | Use rainfall probability as a training feature |
| `firmware/esp32` | Future sensor telemetry producer | Make irrigation decisions or directly actuate the pump |
| `packages/contracts` | Stable data contracts between boundaries | Encode provider- or device-specific business logic |

## Decision order

1. Obtain the next-six-hour rain probability from the weather provider.
2. If probability is greater than 30%, return `DO_NOT_IRRIGATE` and do not invoke ML.
3. Otherwise validate current temperature, humidity, and soil moisture readings.
4. Invoke the trained classifier using only those three sensor features.
5. Apply a final safety layer before any future actuation; the ML result is never a direct pump command.

## Deferred implementation choices

The weather provider, persistence technology, authentication mechanism for devices, model-serving format, and deployment target are intentionally not selected in this scaffolding phase. They should be chosen when the first vertical slice is implemented.
