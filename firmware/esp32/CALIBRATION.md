# Soil Moisture Sensor Calibration

## Purpose
This document records the calibration values for the soil moisture sensor used in the HydroWise ESP32 firmware.

## Calibration Procedure

1. **Dry Reading (SOIL_DRY_RAW)**
   - Hold the soil moisture sensor in dry air
   - Upload and run the firmware
   - Note the raw analog reading from Serial output
   - Record this value as SOIL_DRY_RAW in config.h

2. **Wet Reading (SOIL_WET_RAW)**
   - Submerge the soil moisture sensor in water
   - Upload and run the firmware
   - Note the raw analog reading from Serial output
   - Record this value as SOIL_WET_RAW in config.h

## Calibration Notes

**Date**: [To be filled during calibration]
**Sensor Model**: [To be filled during calibration]

### Measured Values
- SOIL_DRY_RAW: [Measured value in dry air]
- SOIL_WET_RAW: [Measured value in water]

### Notes
- [Add any observations about sensor behavior]
- [Note if readings are stable or fluctuating]
- [Document any environmental factors]

## Formula Used

The firmware converts raw readings to 0-100% using:

```cpp
int soilMoisturePercent = map(rawReading, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100);
soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);
```

Note: Most capacitive soil moisture sensors have inverted readings (higher = drier, lower = wetter). The formula accounts for this by mapping from DRY to WET.

## Current Default Values (in config.example.h)
- SOIL_DRY_RAW: 2800
- SOIL_WET_RAW: 1200

These are placeholder values and should be replaced with actual calibrated values for your specific sensor.
