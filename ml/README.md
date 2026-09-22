# HydroWise ML workspace

This directory will contain dataset preparation, exploratory analysis, model comparison, evaluation, and model artifact packaging.

## Current status

Scaffold only. No dataset, training script, notebook, feature engineering, or serialized model is included yet.

## Fixed model contract

The eventual classifier receives exactly three features:

- `temperature_C`
- `humidity_%`
- `soil_moisture_%`

Rain probability is a separate weather-gate input and must not be a training feature. Prototype labels are synthetic and must never be described as observed irrigation decisions.
