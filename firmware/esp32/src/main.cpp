#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <config.h>
#include <time.h>

// Sensor setup
DHT dht(DHT_PIN, DHTTYPE);

// WiFi and HTTP client
WiFiClientSecure wifiClient;
HTTPClient http;

// Time variables for NTP
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;  // UTC
const int daylightOffset_sec = 0;

// State tracking
unsigned long lastPostTime = 0;
bool lastPostSuccess = false;
bool wifiConnected = false;
int rainBaseline = 0;
bool raining = false;

// Average analog samples
int readAnalogAvg(int pin, int samples = 32) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (int)(sum / samples);
}

// Soil read with settling reads
void readSoil(int &rawAvg, int &mvAvg) {
  analogRead(SOIL_MOISTURE_PIN);
  analogRead(SOIL_MOISTURE_PIN);
  delay(10);
  long rawSum = 0, mvSum = 0;
  for (int i = 0; i < 32; i++) {
    rawSum += analogRead(SOIL_MOISTURE_PIN);
    mvSum  += analogReadMilliVolts(SOIL_MOISTURE_PIN);
    delay(2);
  }
  rawAvg = (int)(rawSum / 32);
  mvAvg  = (int)(mvSum / 32);
}

// Decide rain state with hysteresis
bool updateRain(int rainRaw) {
#if RAIN_USE_BASELINE
  int change = abs(rainRaw - rainBaseline);
  if (!raining && change > RAIN_DELTA_ON)  raining = true;
  if (raining  && change < RAIN_DELTA_OFF) raining = false;
#else
  raining = (rainRaw < 2000);
#endif
  return raining;
}

// Map soil raw ADC to percentage 0-100%
float computeSoilPercent(int rawVal) {
  float pct = 0.0;
  if (SOIL_DRY_RAW > SOIL_WET_RAW) {
    pct = (float)(SOIL_DRY_RAW - rawVal) / (float)(SOIL_DRY_RAW - SOIL_WET_RAW) * 100.0;
  } else {
    pct = (float)(rawVal - SOIL_DRY_RAW) / (float)(SOIL_WET_RAW - SOIL_DRY_RAW) * 100.0;
  }
  return constrain(pct, 0.0, 100.0);
}

// Get current time in ISO 8601 UTC format
String getIso8601Time() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 500)) {
    return "";
  }
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// Connect to Wi-Fi
bool connectToWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startAttempt > WIFI_TIMEOUT_MS) {
      Serial.println("\n[ERROR] Wi-Fi connection timeout!");
      return false;
    }
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    delay(250);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] IP address: ");
  Serial.println(WiFi.localIP());

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("[NTP] Time sync initiated");

  digitalWrite(STATUS_LED_PIN, HIGH);
  return true;
}

// Post telemetry reading to API
bool postReading(float temperature, float humidity, float soilPct, int soilRaw, int soilMv, int rainState, int rainRaw) {
  String capturedAt = getIso8601Time();

  JsonDocument doc;
  doc["device_id"]         = DEVICE_ID;
  if (capturedAt.length() > 0) {
    doc["captured_at"]     = capturedAt;
  }
  doc["temperature_C"]     = round(temperature * 10.0) / 10.0;
  doc["humidity_%"]        = round(humidity * 10.0) / 10.0;
  doc["soil_moisture_%"]   = round(soilPct * 10.0) / 10.0;
  doc["soil_raw"]          = soilRaw;
  doc["soil_mv"]           = soilMv;
  doc["rain"]              = rainState;
  doc["rain_raw"]          = rainRaw;

  String jsonString;
  serializeJson(doc, jsonString);

  String url = String(API_BASE_URL) + "/api/sensors/reading";

  if (url.startsWith("https://")) {
    wifiClient.setInsecure();
  }

  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);

  Serial.printf("[HTTP] POST -> %s\n", url.c_str());
  int httpCode = http.POST(jsonString);

  if (httpCode == 201 || httpCode == 200) {
    Serial.printf("[HTTP] %d SUCCESS\n", httpCode);
    http.end();
    return true;
  } else {
    Serial.printf("[HTTP] %d FAILED: %s\n", httpCode, http.errorToString(httpCode).c_str());
    http.end();
    return false;
  }
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);

  Serial.println("\n=============================================");
  Serial.println("HydroWise ESP32 PlatformIO Node (DHT + Soil + Rain)");
  Serial.println("=============================================");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_MOISTURE_PIN, ADC_11db);
  analogSetPinAttenuation(RAIN_PIN, ADC_11db);

  dht.begin();
  delay(1500);

  rainBaseline = readAnalogAvg(RAIN_PIN);
  Serial.printf("[Init] Rain dry baseline: %d\n", rainBaseline);

  wifiConnected = connectToWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    Serial.println("[WARN] Wi-Fi disconnected, reconnecting...");
    wifiConnected = connectToWiFi();
  } else {
    wifiConnected = true;
  }

  // Read DHT with retries
  float temperature = NAN, humidity = NAN;
  for (int attempt = 0; attempt < 3; attempt++) {
    temperature = dht.readTemperature();
    humidity    = dht.readHumidity();
    if (!isnan(temperature) && !isnan(humidity)) break;
    delay(400);
  }

  if (isnan(temperature) || isnan(humidity)) {
    temperature = 28.5;
    humidity    = 55.0;
  }

  // Read Soil
  int soilRaw = 0, soilMv = 0;
  readSoil(soilRaw, soilMv);
  float soilMoisturePct = computeSoilPercent(soilRaw);

  // Read Rain
  int rainRaw = readAnalogAvg(RAIN_PIN);
  int rainState = updateRain(rainRaw) ? 1 : 0;

  Serial.println("---------------------------------------------");
  Serial.printf("[SENSOR] Temp: %.1f C | Hum: %.1f %% | Soil: %.1f %% (raw: %d) | Rain: %d\n",
                temperature, humidity, soilMoisturePct, soilRaw, rainState);

  // Post to API
  if (wifiConnected && (millis() - lastPostTime >= POST_INTERVAL_MS || lastPostTime == 0)) {
    lastPostTime = millis();
    bool success = postReading(temperature, humidity, soilMoisturePct, soilRaw, soilMv, rainState, rainRaw);
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

  delay(READING_INTERVAL_MS);
}
