#ifndef CONFIG_H
#define CONFIG_H

// Sensor Pin Configuration
#define DHT_PIN 4
#define SOIL_MOISTURE_PIN 34  // ADC1 only (ADC2 conflicts with Wi-Fi)
#define RAIN_PIN 35           // ADC1 only (Rain detector AO)
#define STATUS_LED_PIN 2      // Built-in LED on most ESP32 boards

// DHT Sensor Model
#define DHTTYPE DHT11         // Change to DHT22 if using DHT22

// Soil Moisture Calibration (measure these with your sensor)
// SOIL_DRY_RAW: reading in dry air (typically 2800 - 3300)
// SOIL_WET_RAW: reading submerged in water (typically 1100 - 1500)
#define SOIL_DRY_RAW 3200
#define SOIL_WET_RAW 1400

// Rain Detector Calibration
#define RAIN_USE_BASELINE true
#define RAIN_DELTA_ON 400
#define RAIN_DELTA_OFF 200

// Sensor Reading & Post Intervals (milliseconds)
#define READING_INTERVAL_MS 2000
#define POST_INTERVAL_MS 10000

// Serial Monitor Baud Rate
#define SERIAL_BAUD 115200

// Wi-Fi Configuration
#define WIFI_SSID "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"
#define WIFI_TIMEOUT_MS 20000

// API Configuration
// Set to your computer's local IP (e.g. "http://192.168.1.100:8000") or cloud URL ("https://hydrowise-api.onrender.com")
#define API_BASE_URL "http://192.168.1.100:8000"
#define DEVICE_ID "esp32-field-01"
#define DEVICE_API_KEY "hydrowise-esp32-key-dev"

#endif // CONFIG_H
