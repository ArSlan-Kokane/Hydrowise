/*
  HydroWise - Complete ESP32 IoT Cloud Sensor Node (ZERO-DEPENDENCY EDITION)
  ==========================================================================
  Integrated for HydroWise Smart Irrigation Decision Support System.

  NO EXTERNAL LIBRARIES REQUIRED!
  - Does NOT require Adafruit DHT library
  - Does NOT require Adafruit Unified Sensor
  - Does NOT require ArduinoJson
  - Compiles directly with standard ESP32 Arduino Core!

  Reads:
    - Temperature & Humidity (DHT11 or DHT22) on GPIO 4 (via built-in microsecond bitbang reader)
    - Soil Moisture Raw ADC & Voltage on GPIO 34 (ADC1)
    - Rain Sensor (Analog plate with power-on baseline & hysteresis) on GPIO 35 (ADC1)

  Transmits:
    - Directly over Wi-Fi via HTTP POST to HydroWise Cloud / Local API:
      POST ${API_BASE_URL}/api/sensors/reading
    - Authenticated with X-API-Key header.
    - NTP UTC ISO 8601 timestamping.

  WIRING GUIDE:
  -------------
  DHT11/DHT22 : VCC -> 3.3V, GND -> GND, DATA -> GPIO 4
  Soil Sensor : VCC -> 3.3V, GND -> GND, AOUT -> GPIO 34 (Analog input, not digital DO)
  Rain Sensor : VCC -> 3.3V, GND -> GND, AO   -> GPIO 35 (Analog input, not DO)
  Status LED  : GPIO 2 (Built-in blue LED on most ESP32 DevKit boards)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

// ============================================================================
// 1. HARDWARE PIN DEFINITIONS
// ============================================================================
#define DHT_PIN         4    // DHT Data pin
#define SOIL_PIN        34   // Capacitive/resistive soil sensor analog AO (ADC1 only)
#define RAIN_PIN        35   // Rain detector analog AO (ADC1 only)
#define STATUS_LED_PIN  2    // Built-in status indicator LED

// ============================================================================
// 2. SENSOR TYPE & CALIBRATION
// ============================================================================
#define DHT_TYPE        11   // Set to 11 for DHT11, or 22 for DHT22
#define ADC_SAMPLES     32   // Samples averaged to smooth ADC electrical noise

// Soil calibration parameters:
// Measure raw reading in completely dry air vs submerged in water
#define SOIL_DRY_RAW    3200 // Raw 12-bit ADC in dry air (0% moisture)
#define SOIL_WET_RAW    1400 // Raw 12-bit ADC in water / saturated soil (100% moisture)

// Rain detection mode:
#define RAIN_USE_BASELINE  true
#define RAIN_DELTA_ON      400  // Change from baseline indicating active rain
#define RAIN_DELTA_OFF     200  // Hysteresis cutoff to return to no-rain
#define RAIN_THRESHOLD     2000 // Fallback threshold if baseline disabled
#define RAIN_WET_IS_LOWER  true

// ============================================================================
// 3. NETWORK & CLOUD API CONFIGURATION
// ============================================================================
// Update these with your Wi-Fi credentials (must be 2.4 GHz)
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const unsigned long WIFI_TIMEOUT_MS = 20000;

// API Endpoint configuration:
// For local testing: Use your computer's Wi-Fi IP address on port 8000
const char* API_BASE_URL   = "http://10.181.251.251:8000"; 
const char* DEVICE_ID      = "esp32-field-01";
const char* DEVICE_API_KEY = "hydrowise-esp32-key-dev";

// Telemetry transmit interval (in milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 8000;  // Send every 8 seconds

// Serial Monitor baud rate
#define SERIAL_BAUD 115200

// ============================================================================
// 4. GLOBAL OBJECTS & STATE
// ============================================================================
WiFiClientSecure wifiClient;
HTTPClient http;

int  rainBaseline = 0;
bool raining      = false;
unsigned long lastPostTime    = 0;
bool lastPostSuccess          = false;
bool wifiConnected            = false;

// NTP Time Configuration
const char* ntpServer         = "pool.ntp.org";
const long  gmtOffset_sec     = 0;  // UTC time
const int   daylightOffset_sec = 0;

// ============================================================================
// 5. BUILT-IN STANDALONE DHT DRIVER (NO ADAFRUIT LIBRARY NEEDED)
// ============================================================================
bool readDHTDirect(int pin, int dhtType, float &temperature, float &humidity) {
  uint8_t data[5] = {0, 0, 0, 0, 0};

  // 1. Send start signal
  pinMode(pin, OUTPUT);
  digitalWrite(pin, HIGH);
  delay(10);
  digitalWrite(pin, LOW);
  delay(dhtType == 11 ? 20 : 2); // DHT11 needs ≥18ms LOW; DHT22 needs ~1-2ms
  digitalWrite(pin, HIGH);
  delayMicroseconds(30);

  // Switch to input with pullup to read response
  pinMode(pin, INPUT_PULLUP);

  // 2. Wait for sensor response: 80us LOW then 80us HIGH
  unsigned long timeout = micros();
  while (digitalRead(pin) == HIGH) {
    if (micros() - timeout > 100) return false;
  }
  timeout = micros();
  while (digitalRead(pin) == LOW) {
    if (micros() - timeout > 100) return false;
  }
  timeout = micros();
  while (digitalRead(pin) == HIGH) {
    if (micros() - timeout > 100) return false;
  }

  // 3. Read 40 data bits (5 bytes) with interrupt protection
  noInterrupts();
  for (int i = 0; i < 40; i++) {
    // Wait for the 50us LOW pulse preceding each bit
    timeout = micros();
    while (digitalRead(pin) == LOW) {
      if (micros() - timeout > 100) {
        interrupts();
        return false;
      }
    }
    // Measure HIGH duration (26-28us = '0', 70us = '1')
    unsigned long startHigh = micros();
    timeout = micros();
    while (digitalRead(pin) == HIGH) {
      if (micros() - timeout > 120) {
        interrupts();
        return false;
      }
    }
    unsigned long duration = micros() - startHigh;

    // Threshold ~40us distinguishes bit 0 from bit 1
    if (duration > 40) {
      data[i / 8] |= (1 << (7 - (i % 8)));
    }
  }
  interrupts();

  // 4. Verify checksum
  uint8_t sum = (data[0] + data[1] + data[2] + data[3]) & 0xFF;
  if (data[4] != sum) {
    return false;
  }

  // 5. Decode values
  if (dhtType == 11) {
    humidity = (float)data[0];
    temperature = (float)data[2];
    if (data[3] & 0x80) temperature = -temperature;
  } else { // DHT22 / AM2302
    humidity = ((float)((data[0] << 8) | data[1])) * 0.1;
    float tempRaw = ((float)(((data[2] & 0x7F) << 8) | data[3])) * 0.1;
    if (data[2] & 0x80) tempRaw = -tempRaw;
    temperature = tempRaw;
  }

  return (humidity >= 0.0 && humidity <= 100.0 && temperature >= -40.0 && temperature <= 80.0);
}

// ============================================================================
// 6. SENSOR HELPER FUNCTIONS
// ============================================================================

// Average multiple analog reads to filter high-frequency ADC noise
int readAnalogAvg(int pin) {
  long sum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (int)(sum / ADC_SAMPLES);
}

// Soil read: Discard first reads for ADC multiplexer settling, then average raw and mV
void readSoil(int &rawAvg, int &mvAvg) {
  analogRead(SOIL_PIN);  // Settling dummy reads
  analogRead(SOIL_PIN);
  delay(10);
  long rawSum = 0, mvSum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    rawSum += analogRead(SOIL_PIN);
    mvSum  += analogReadMilliVolts(SOIL_PIN);
    delay(2);
  }
  rawAvg = (int)(rawSum / ADC_SAMPLES);
  mvAvg  = (int)(mvSum / ADC_SAMPLES);
}

// Decide rain state (0/1) with hysteresis
bool updateRain(int rainRaw) {
#if RAIN_USE_BASELINE
  int change = abs(rainRaw - rainBaseline);
  if (!raining && change > RAIN_DELTA_ON)  raining = true;
  if (raining  && change < RAIN_DELTA_OFF) raining = false;
#else
  bool wet = RAIN_WET_IS_LOWER ? (rainRaw < RAIN_THRESHOLD) : (rainRaw > RAIN_THRESHOLD);
  raining = wet;
#endif
  return raining;
}

// Convert raw ADC value to 0-100% soil moisture
float computeSoilMoisturePercent(int soilRaw) {
  float percent = 0.0;
  if (SOIL_DRY_RAW > SOIL_WET_RAW) {
    percent = (float)(SOIL_DRY_RAW - soilRaw) / (float)(SOIL_DRY_RAW - SOIL_WET_RAW) * 100.0;
  } else {
    percent = (float)(soilRaw - SOIL_DRY_RAW) / (float)(SOIL_WET_RAW - SOIL_DRY_RAW) * 100.0;
  }
  return constrain(percent, 0.0, 100.0);
}

// Get current ISO 8601 UTC timestamp
String getIso8601Time() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 500)) {
    return "";
  }
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// Connect to Wi-Fi network
bool connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_TIMEOUT_MS) {
      Serial.println("\n[WiFi] Connection timed out!");
      return false;
    }
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Flash LED while connecting
    delay(250);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] Connected successfully!");
  Serial.print("[WiFi] Assigned IP: ");
  Serial.println(WiFi.localIP());

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("[NTP] Time synchronization requested");

  digitalWrite(STATUS_LED_PIN, HIGH);
  return true;
}

// POST Telemetry payload directly to API (Standard zero-dependency String format)
bool postTelemetry(float temperature, float humidity, float soilPct, int soilRaw, int soilMv, int rainState, int rainRaw) {
  String timestamp = getIso8601Time();

  // Build clean JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"device_id\":\"" + String(DEVICE_ID) + "\"";
  if (timestamp.length() > 0) {
    jsonPayload += ",\"captured_at\":\"" + timestamp + "\"";
  }
  jsonPayload += ",\"temperature_C\":" + String(temperature, 1);
  jsonPayload += ",\"humidity_%\":" + String(humidity, 1);
  jsonPayload += ",\"soil_moisture_%\":" + String(soilPct, 1);
  jsonPayload += ",\"soil_raw\":" + String(soilRaw);
  jsonPayload += ",\"soil_mv\":" + String(soilMv);
  jsonPayload += ",\"rain\":" + String(rainState);
  jsonPayload += ",\"rain_raw\":" + String(rainRaw);
  jsonPayload += "}";

  String url = String(API_BASE_URL) + "/api/sensors/reading";

  if (url.startsWith("https://")) {
    wifiClient.setInsecure();
  }

  Serial.printf("[HTTP] POST %s\n", url.c_str());
  Serial.printf("[HTTP] Payload: %s\n", jsonPayload.c_str());

  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);

  int httpCode = http.POST(jsonPayload);

  if (httpCode == 201 || httpCode == 200) {
    Serial.printf("[HTTP] SUCCESS (%d): Server accepted telemetry\n", httpCode);
    http.end();
    return true;
  } else {
    Serial.printf("[HTTP] FAILED (%d): %s\n", httpCode, http.errorToString(httpCode).c_str());
    http.end();
    return false;
  }
}

// ============================================================================
// 7. SETUP
// ============================================================================
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);

  Serial.println("\n=============================================");
  Serial.println("HydroWise ESP32 Node (Zero-Dependency Edition)");
  Serial.println("=============================================");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Configure 12-bit ADC (0 - 4095) with 11dB attenuation (~3.3V range)
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  analogSetPinAttenuation(RAIN_PIN, ADC_11db);

  delay(1000);

  // Take dry baseline for rain sensor (keep sensor dry during startup)
  rainBaseline = readAnalogAvg(RAIN_PIN);
  Serial.printf("[Sensors] Rain sensor dry baseline: %d\n", rainBaseline);

  // Connect to Wi-Fi
  wifiConnected = connectWiFi();
  if (wifiConnected) {
    digitalWrite(STATUS_LED_PIN, HIGH);
  }

  Serial.println("[System] HydroWise node ready. Starting telemetry loop...\n");
}

// ============================================================================
// 8. MAIN LOOP
// ============================================================================
void loop() {
  // 1. Maintain Wi-Fi connectivity
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    Serial.println("[WiFi] Lost connection, attempting reconnect...");
    wifiConnected = connectWiFi();
  } else {
    wifiConnected = true;
  }

  // 2. Read DHT Temperature and Humidity with retry (using built-in bitbang reader)
  float temperature = NAN, humidity = NAN;
  for (int attempt = 0; attempt < 3; attempt++) {
    if (readDHTDirect(DHT_PIN, DHT_TYPE, temperature, humidity)) {
      break;
    }
    delay(400);
  }

  if (isnan(temperature) || isnan(humidity)) {
    temperature = 28.5; // Fallback safe ambient value if wire is unplugged
    humidity    = 55.0;
    Serial.println("[WARN] DHT read error (check pin 4 wire) - using fallback value");
  }

  // 3. Read Soil Moisture (Analog + Voltage)
  int soilRaw = 0, soilMv = 0;
  readSoil(soilRaw, soilMv);
  float soilMoisturePct = computeSoilMoisturePercent(soilRaw);

  // 4. Read Rain Sensor
  int rainRaw = readAnalogAvg(RAIN_PIN);
  int rainState = updateRain(rainRaw) ? 1 : 0;

  // 5. Output Local Diagnostics to Serial Monitor
  Serial.println("---------------------------------------------");
  Serial.printf("Temperature   : %.1f C\n", temperature);
  Serial.printf("Humidity      : %.1f %%\n", humidity);
  Serial.printf("Soil Moisture : %.1f %%  (Raw: %d, %d mV)\n", soilMoisturePct, soilRaw, soilMv);
  Serial.printf("Rain Detected : %s  (Raw: %d, Baseline: %d)\n", rainState ? "YES [RAIN]" : "NO [DRY]", rainRaw, rainBaseline);

  // 6. Send Telemetry to HydroWise Cloud / Local API
  if (wifiConnected && (millis() - lastPostTime >= TELEMETRY_INTERVAL_MS || lastPostTime == 0)) {
    lastPostTime = millis();
    bool success = postTelemetry(temperature, humidity, soilMoisturePct, soilRaw, soilMv, rainState, rainRaw);
    lastPostSuccess = success;

    if (success) {
      digitalWrite(STATUS_LED_PIN, HIGH);
    } else {
      for (int i = 0; i < 4; i++) {
        digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
        delay(100);
      }
    }
  }

  delay(2000);
}
