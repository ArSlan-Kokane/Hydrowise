# HydroWise ESP32 Firmware & Telemetry Ingestion

Production firmware for the HydroWise smart irrigation edge sensor node. Transmits real-time temperature, humidity, calibrated soil moisture, and rain detection telemetry directly to the HydroWise cloud API.

---

## 🛠️ Hardware Wiring

| Sensor | ESP32 Pin | Voltage | Notes |
| :--- | :--- | :--- | :--- |
| **DHT11 / DHT22** (Temp & Humidity) | **GPIO 4** | 3.3V | Connect DATA to GPIO 4 (VCC to 3.3V, GND to GND). |
| **Soil Moisture Sensor** | **GPIO 34** | 3.3V | Connect analog **AOUT** to GPIO 34 (ADC1 channel 6). Do NOT use DO pin. |
| **Rain Detection Sensor** | **GPIO 35** | 3.3V | Connect analog **AO** to GPIO 35 (ADC1 channel 7). Do NOT use DO pin. |
| **Status Indicator LED** | **GPIO 2** | — | Built-in Blue LED on ESP32 DevKit boards. |

> ⚠️ **Important:** Pins 34 and 35 are on **ADC1**. Do not use ADC2 pins as ADC2 is disabled when ESP32 Wi-Fi is active.

---

## ⚡ Option 1: Arduino IDE Flashing (Quickest)

1. Open `firmware/esp32/HydroWise_Sensors.ino` directly in the **Arduino IDE**.
2. Install the required libraries via **Sketch -> Include Library -> Manage Libraries**:
   - `DHT sensor library` (Adafruit)
   - `Adafruit Unified Sensor` (Adafruit)
   - `ArduinoJson` (Benoit Blanchon, v6 or v7)
3. In `HydroWise_Sensors.ino`, configure your credentials:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   
   // Local LAN IP or Cloud Render URL:
   const char* API_BASE_URL   = "http://192.168.1.100:8000"; 
   // Or cloud: "https://hydrowise-api.onrender.com"
   ```
4. Select board **ESP32 Dev Module** and the correct COM Port.
5. Click **Upload** and open **Serial Monitor @ 115200 baud**.

---

## 💻 Option 2: PlatformIO (VS Code)

1. Open the project root in VS Code with the PlatformIO extension.
2. Edit `firmware/esp32/include/config.h` with your Wi-Fi credentials and API URL.
3. Build and upload:
   ```bash
   cd firmware/esp32
   pio run --target upload
   pio devicemonitor -b 115200
   ```

---

## 📡 Telemetry Packet Payload

The node automatically batches readings and transmits a JSON payload to `${API_BASE_URL}/api/sensors/reading`:

```json
{
  "device_id": "esp32-field-01",
  "captured_at": "2026-10-13T09:40:15Z",
  "temperature_C": 31.2,
  "humidity_%": 58.4,
  "soil_moisture_%": 36.8,
  "soil_raw": 2420,
  "soil_mv": 1950,
  "rain": 0,
  "rain_raw": 1920
}
```

- Authenticated via the `X-API-Key: hydrowise-esp32-key-dev` HTTP header.
- Status code `201 Created` indicates successful ingestion and database persistence.
