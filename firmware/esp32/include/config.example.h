#ifndef CONFIG_H
#define CONFIG_H

// Sensor Pin Configuration
#define DHT_PIN 4
#define SOIL_MOISTURE_PIN 34  // ADC1 only (ADC2 conflicts with Wi-Fi)

// Soil Moisture Calibration (measure these with your sensor)
// SOIL_DRY_RAW: reading in dry air
// SOIL_WET_RAW: reading submerged in water
#define SOIL_DRY_RAW 2800
#define SOIL_WET_RAW 1200

// Sensor Reading Interval (milliseconds)
#define READING_INTERVAL_MS 5000

// Serial Monitor Baud Rate
#define SERIAL_BAUD 115200

// Wi-Fi Configuration
#define WIFI_SSID "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"
#define WIFI_TIMEOUT_MS 20000

// API Configuration
#define API_BASE_URL "http://192.168.1.100:8000"  // Change to your API server IP
#define DEVICE_ID "esp32-field-01"
#define DEVICE_API_KEY "hydrowise-esp32-key-dev"

// POST Interval (milliseconds) - how often to send data to API
#define POST_INTERVAL_MS 30000

// Status LED Pin
#define STATUS_LED_PIN 2  // Built-in LED on most ESP32 boards

#endif // CONFIG_H
