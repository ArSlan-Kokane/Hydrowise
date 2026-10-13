/*
  HydroWise - Complete ESP32 IoT Cloud Sensor Node & Telemetry Ingestion Firmware
  ================================================================================
  Integrated for HydroWise Smart Irrigation Decision Support System.

  Reads:
    - Temperature & Humidity (DHT11 or DHT22) on GPIO 4
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

  REQUIRED LIBRARIES (Arduino IDE Library Manager):
  -------------------------------------------------
  1. "DHT sensor library" by Adafruit
  2. "Adafruit Unified Sensor" by Adafruit
  3. "ArduinoJson" by Benoit Blanchon (v6 or v7)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>
#include "DHT.h"

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
#define DHTTYPE         DHT11   // Set to DHT11 or DHT22 to match your sensor
#define ADC_SAMPLES     32      // Samples averaged to smooth ADC electrical noise

// Soil calibration parameters (calibrate with your soil and sensor):
// Measure raw reading in completely dry air vs submerged in water
#define SOIL_DRY_RAW    3200    // Raw 12-bit ADC in dry air (0% moisture)
#define SOIL_WET_RAW    1400    // Raw 12-bit ADC in water / saturated soil (100% moisture)

// Rain detection mode:
// Mode A (default): Compares against dry baseline measured at boot
#define RAIN_USE_BASELINE  true
#define RAIN_DELTA_ON      400   // Change from baseline indicating active rain
#define RAIN_DELTA_OFF     200   // Hysteresis cutoff to return to no-rain
#define RAIN_THRESHOLD     2000  // Fallback threshold if baseline disabled
#define RAIN_WET_IS_LOWER  true

// ============================================================================
// 3. NETWORK & CLOUD API CONFIGURATION
// ============================================================================
// Update these with your Wi-Fi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const unsigned long WIFI_TIMEOUT_MS = 20000;

// API Endpoint configuration:
// For local LAN testing: "http://<YOUR_COMPUTER_LOCAL_IP>:8000" (e.g. "http://192.168.1.100:8000")
// For Render Cloud deployment: "https://hydrowise-api.onrender.com"
const char* API_BASE_URL   = "http://192.168.1.100:8000"; 
const char* DEVICE_ID      = "esp32-field-01";
const char* DEVICE_API_KEY = "hydrowise-esp32-key-dev";

// Telemetry transmit interval (in milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 10000;  // Send every 10 seconds

// Serial Monitor baud rate
#define SERIAL_BAUD 115200

// ============================================================================
// 4. GLOBAL OBJECTS & STATE
// ============================================================================
DHT dht(DHT_PIN, DHTTYPE);
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
// 5. HELPER FUNCTIONS
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
    // Normal capacitive inverted curve (dry raw > wet raw)
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

  // Initialize NTP time sync
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("[NTP] Time synchronization requested");

  digitalWrite(STATUS_LED_PIN, HIGH);
  return true;
}

// POST Telemetry payload directly to API
bool postTelemetry(float temperature, float humidity, float soilPct, int soilRaw, int soilMv, int rainState, int rainRaw) {
  String timestamp = getIso8601Time();

  // Construct JSON Document
  JsonDocument doc;
  doc["device_id"]         = DEVICE_ID;
  if (timestamp.length() > 0) {
    doc["captured_at"]     = timestamp;
  }
  doc["temperature_C"]     = round(temperature * 10.0) / 10.0;
  doc["humidity_%"]        = round(humidity * 10.0) / 10.0;
  doc["soil_moisture_%"]   = round(soilPct * 10.0) / 10.0;
  doc["soil_raw"]          = soilRaw;
  doc["soil_mv"]           = soilMv;
  doc["rain"]              = rainState;
  doc["rain_raw"]          = rainRaw;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  String url = String(API_BASE_URL) + "/api/sensors/reading";

  // If using HTTPS, disable SSL cert verification for flexible edge devices
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
    String resp = http.getString();
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
// 6. SETUP
// ============================================================================
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);

  Serial.println("\n=============================================");
  Serial.println("   HydroWise ESP32 Cloud Sensor Node v5.2   ");
  Serial.println("=============================================");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Configure 12-bit ADC (0 - 4095) with 11dB attenuation (~3.3V range)
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  analogSetPinAttenuation(RAIN_PIN, ADC_11db);

  // Initialize DHT sensor
  dht.begin();
  delay(1500);

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
// 7. MAIN LOOP
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

  // 2. Read DHT Temperature and Humidity with retry
  float temperature = NAN, humidity = NAN;
  for (int attempt = 0; attempt < 3; attempt++) {
    temperature = dht.readTemperature();
    humidity    = dht.readHumidity();
    if (!isnan(temperature) && !isnan(humidity)) break;
    delay(400);
  }

  bool dhtOk = !isnan(temperature) && !isnan(humidity)
               && temperature >= -10.0 && temperature <= 60.0
               && humidity >= 0.0 && humidity <= 100.0;

  if (!dhtOk) {
    temperature = 28.5; // Fallback safe ambient value if wire is loose
    humidity    = 55.0;
    Serial.println("[WARN] DHT sensor read error - using fallback");
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
      // Blink LED to indicate transmit error
      for (int i = 0; i < 4; i++) {
        digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
        delay(100);
      }
    }
  }

  delay(2000);
}
