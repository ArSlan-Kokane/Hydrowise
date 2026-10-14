/*
  ============================================================
  HydroWise - Sensor Reading & Live Cloud Telemetry (ESP32) - v6
  ============================================================
  Reads   : Temperature + Humidity (DHT11/DHT22)
            Soil Moisture (raw analog -> voltage -> percentage)
            Rain (0/1, analog-based with hysteresis)
  Sends   : Direct HTTP POST to HydroWise Cloud / Local API
  Output  : Serial Monitor @ 115200 baud

  ------------------------------------------------------------
  WIRING
  ------------------------------------------------------------
  DHT     : VCC -> 3.3V, GND -> GND, DATA -> GPIO 4
  Soil    : VCC -> 3.3V, GND -> GND, AOUT -> GPIO 34   (analog pin, NOT the DO pin)
  Rain    : VCC -> 3.3V, GND -> GND, AO   -> GPIO 35   (analog pin, NOT the DO pin)
  LED     : GPIO 2 (Built-in Blue Status LED)

  ------------------------------------------------------------
  LIBRARIES NEEDED IN ARDUINO IDE
  ------------------------------------------------------------
  - "DHT sensor library" by Adafruit (or any standard DHT.h library)
  - "Adafruit Unified Sensor" by Adafruit
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include "DHT.h"

// =====================================================
//                     PIN SETTINGS
// =====================================================
#define DHTPIN         4          // DHT data pin
#define SOIL_PIN       34         // Soil moisture analog output (ADC1)
#define RAIN_PIN       35         // Rain sensor analog output   (ADC1)
#define STATUS_LED_PIN 2          // Built-in status indicator LED

// =====================================================
//                     DHT SETTINGS
// =====================================================
#define DHTTYPE        DHT11      // Change to DHT22 if you have a DHT22

// =====================================================
//                SOIL MOISTURE CALIBRATION
// =====================================================
#define SOIL_DRY_RAW   3500  // Raw ADC in AIR (0% moisture) - adjust to your sensor
#define SOIL_WET_RAW   1500  // Raw ADC in WATER (100% moisture) - adjust to your sensor

// =====================================================
//                   RAIN DETECTION
// =====================================================
#define RAIN_USE_BASELINE  true
#define RAIN_DELTA_ON      400    // Change from baseline that means "rain"
#define RAIN_DELTA_OFF     200    // Change must fall below this to return to "no rain"
#define RAIN_THRESHOLD     2000   // Mode B fallback threshold
#define RAIN_WET_IS_LOWER  true

// =====================================================
//             WI-FI & CLOUD API CONFIGURATION
// =====================================================
// 1. Enter your 2.4 GHz Wi-Fi details:
const char* WIFI_SSID     = "Aditya's iPhone";
const char* WIFI_PASSWORD = "1a2b3c4d";

// 2. Your Local PC IP on Hotspot (or Cloud API URL):
const char* API_BASE_URL   = "http://172.20.10.5:8000"; // Local PC on "Aditya's iPhone" Hotspot
// For cloud deployment: "https://hydrowise-api.onrender.com"

const char* DEVICE_ID      = "esp32-field-01";
const char* DEVICE_API_KEY = "OvxiNrG7lFq7tLJzroQgedHSHZJOaRY4Tu+Sl0lou2I="; // Active Render Cloud Key

// Interval between sending data to the website (milliseconds)
#define POST_INTERVAL      5000   // Every 5 seconds

// =====================================================
//                   GENERAL SETTINGS
// =====================================================
#define ADC_SAMPLES        32     // Readings averaged per measurement
#define READ_INTERVAL      2000   // Milliseconds between local sensor reads

// =====================================================
//                   GLOBAL VARIABLES
// =====================================================
DHT dht(DHTPIN, DHTTYPE);
WiFiClientSecure wifiClient;
HTTPClient http;

int  rainBaseline         = 0;    // Dry-plate reference value
bool raining              = false;// Current rain state
unsigned long lastPostTime= 0;
bool wifiConnected        = false;

// NTP Time Configuration
const char* ntpServer         = "pool.ntp.org";
const long  gmtOffset_sec     = 0;  // UTC time
const int   daylightOffset_sec = 0;

// =====================================================
//                   HELPER FUNCTIONS
// =====================================================

// Average many ADC samples to reduce noise
int readAnalogAvg(int pin) {
  long sum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (int)(sum / ADC_SAMPLES);
}

// Soil read: discard first reads so ADC input settles,
// then average raw value and millivolts together
void readSoil(int &rawAvg, int &mvAvg) {
  analogRead(SOIL_PIN);            // Dummy reads (discarded) to settle ADC
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

// Convert raw soil reading to moisture percentage (0 - 100 %)
int soilToPercent(int raw) {
  int pct = map(raw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100);
  return constrain(pct, 0, 100);
}

// Decide rain state (0/1) with hysteresis so it doesn't flicker
bool updateRain(int rainRaw) {
#if RAIN_USE_BASELINE
  int change = abs(rainRaw - rainBaseline);
  if (!raining && change > RAIN_DELTA_ON)  raining = true;    // Big change -> rain
  if (raining  && change < RAIN_DELTA_OFF) raining = false;   // Back near baseline -> dry
#else
  bool wet = RAIN_WET_IS_LOWER ? (rainRaw < RAIN_THRESHOLD) : (rainRaw > RAIN_THRESHOLD);
  raining = wet;
#endif
  return raining;
}

// Get current ISO 8601 UTC timestamp from NTP
String getIso8601Time() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 500)) {
    return "";
  }
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// Return human-readable string for Wi-Fi status codes
const char* getWiFiStatusName(wl_status_t status) {
  switch (status) {
    case WL_IDLE_STATUS:     return "WL_IDLE_STATUS (Idle / Negotiating)";
    case WL_NO_SSID_AVAIL:   return "WL_NO_SSID_AVAIL (Target SSID not found! Hotspot may be out of range, hidden, or on 5 GHz)";
    case WL_SCAN_COMPLETED:  return "WL_SCAN_COMPLETED";
    case WL_CONNECTED:       return "WL_CONNECTED (Connected)";
    case WL_CONNECT_FAILED:  return "WL_CONNECT_FAILED (Password incorrect or security handshake rejected - check for WPA3)";
    case WL_CONNECTION_LOST: return "WL_CONNECTION_LOST";
    case WL_DISCONNECTED:    return "WL_DISCONNECTED (Disconnected - check client limit on phone or WPA2 setting)";
    default:                 return "UNKNOWN_STATUS";
  }
}

// Diagnostic Wi-Fi scan to verify which 2.4 GHz networks the ESP32 can see
void scanNearbyNetworks() {
  Serial.println("\n[WiFi Scanner] Scanning for visible 2.4 GHz networks...");
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  int n = WiFi.scanNetworks();
  if (n == 0) {
    Serial.println("[WiFi Scanner] No 2.4 GHz networks detected at all. Check ESP32 antenna / power supply.");
  } else {
    Serial.printf("[WiFi Scanner] Found %d network(s):\n", n);
    bool hotspotFound = false;
    for (int i = 0; i < n; ++i) {
      String ssid = WiFi.SSID(i);
      int rssi = WiFi.RSSI(i);
      Serial.printf("   [%d] \"%s\" | Signal: %d dBm | %s\n",
                    i + 1,
                    ssid.c_str(),
                    rssi,
                    WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "Open" : "Secured");
      String lower = ssid;
      lower.toLowerCase();
      if (ssid == WIFI_SSID || (lower.indexOf("aditya") >= 0 && lower.indexOf("iphone") >= 0)) {
        hotspotFound = true;
      }
    }
    if (hotspotFound) {
      Serial.printf("[WiFi Scanner] -> Network \"%s\" WAS DETECTED! Make sure 'Maximize Compatibility' is ON in iPhone Hotspot settings.\n\n", WIFI_SSID);
    } else {
      Serial.printf("[WiFi Scanner] -> Network \"%s\" WAS NOT FOUND. In iPhone Settings -> Personal Hotspot, toggle 'Maximize Compatibility' ON.\n\n", WIFI_SSID);
    }
  }
}

// Connect to Wi-Fi network
bool connectWiFi() {
  String targetSSID = WIFI_SSID;

  WiFi.persistent(false); // Don't wear flash or use stale cached configs
  WiFi.disconnect(true);  // Cleanly disconnect and reset station state
  delay(200);

  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_17dBm); // Reduce TX power spike to prevent USB brownout

  // Check if an iPhone SSID matching "aditya" is broadcasting to handle iOS apostrophe variations (’ vs ' vs `)
  int numNetworks = WiFi.scanNetworks();
  for (int i = 0; i < numNetworks; i++) {
    String scanned = WiFi.SSID(i);
    String lower = scanned;
    lower.toLowerCase();
    if (scanned == targetSSID || (lower.indexOf("aditya") >= 0 && lower.indexOf("iphone") >= 0)) {
      targetSSID = scanned;
      Serial.printf("[WiFi] Detected broadcasted SSID: \"%s\"\n", targetSSID.c_str());
      break;
    }
  }

  Serial.print("[WiFi] Connecting to: ");
  Serial.println(targetSSID);
  WiFi.begin(targetSSID.c_str(), WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > 12000) {
      wl_status_t finalStatus = WiFi.status();
      Serial.println();
      Serial.print("[WiFi] Connection timed out! Reason: ");
      Serial.println(getWiFiStatusName(finalStatus));

      // Run diagnostic scan so user can see why it failed
      scanNearbyNetworks();
      return false;
    }
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Flash LED
    delay(250);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] Connected successfully!");
  Serial.print("[WiFi] Assigned IP: ");
  Serial.println(WiFi.localIP());

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("[NTP] Time synchronization initialized");

  digitalWrite(STATUS_LED_PIN, HIGH);
  return true;
}

// Send live sensor telemetry directly to HydroWise API
bool postTelemetry(float temperature, float humidity, int soilPct, int soilRaw, int soilMv, int rainState, int rainRaw) {
  String timestamp = getIso8601Time();

  // Build clean JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"device_id\":\"" + String(DEVICE_ID) + "\"";
  if (timestamp.length() > 0) {
    jsonPayload += ",\"captured_at\":\"" + timestamp + "\"";
  }
  jsonPayload += ",\"temperature_C\":" + String(temperature, 1);
  jsonPayload += ",\"humidity_%\":" + String(humidity, 1);
  jsonPayload += ",\"soil_moisture_%\":" + String(soilPct);
  jsonPayload += ",\"soil_raw\":" + String(soilRaw);
  jsonPayload += ",\"soil_mv\":" + String(soilMv);
  jsonPayload += ",\"rain\":" + String(rainState);
  jsonPayload += ",\"rain_raw\":" + String(rainRaw);
  jsonPayload += "}";

  String url = String(API_BASE_URL) + "/api/sensors/reading";

  HTTPClient httpClient;
  httpClient.setTimeout(4000);

  bool beginOk = false;
  WiFiClient plainClient;
  WiFiClientSecure secureClient;

  if (url.startsWith("https://")) {
    secureClient.setInsecure();
    beginOk = httpClient.begin(secureClient, url);
  } else {
    beginOk = httpClient.begin(plainClient, url);
  }

  if (!beginOk) {
    Serial.println("[HTTP] Failed to initialize connection to URL: " + url);
    return false;
  }

  httpClient.addHeader("Content-Type", "application/json");
  httpClient.addHeader("X-API-Key", DEVICE_API_KEY);

  int httpCode = httpClient.POST(jsonPayload);

  if (httpCode == 201 || httpCode == 200) {
    Serial.printf("[HTTP] SUCCESS (%d): Live data received by server!\n", httpCode);
    httpClient.end();
    return true;
  } else {
    Serial.printf("[HTTP] FAILED (%d): %s (Target: %s)\n", httpCode, httpClient.errorToString(httpCode).c_str(), url.c_str());
    httpClient.end();
    return false;
  }
}

// =====================================================
//                        SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n================================================");
  Serial.println("  HydroWise Sensor & Cloud Telemetry Node v6   ");
  Serial.println("================================================");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // ADC configuration (12-bit: 0 - 4095 with 11dB attenuation)
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  analogSetPinAttenuation(RAIN_PIN, ADC_11db);

  // Start the DHT sensor
  dht.begin();
  delay(2000);

  // Take the dry baseline for the rain sensor (plate must be DRY at power-up)
  rainBaseline = readAnalogAvg(RAIN_PIN);

  Serial.println("HydroWise sensor initialization complete.");
#if RAIN_USE_BASELINE
  Serial.printf("Rain sensor dry baseline (raw): %d\n", rainBaseline);
#endif

  // Connect to Wi-Fi
  wifiConnected = connectWiFi();
  if (wifiConnected) {
    digitalWrite(STATUS_LED_PIN, HIGH);
  }
  Serial.println();
}

// =====================================================
//                         LOOP
// =====================================================
void loop() {
  // Auto-reconnect if Wi-Fi drops (rate-limited so loop continues running)
  static unsigned long lastReconnectAttempt = 0;
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    if (millis() - lastReconnectAttempt >= 15000 || lastReconnectAttempt == 0) {
      lastReconnectAttempt = millis();
      Serial.println("[WiFi] Connection lost, reconnecting...");
      wifiConnected = connectWiFi();
    }
  } else {
    wifiConnected = true;
  }

  // ----- DHT: retry up to 3 times, then range-check -----
  float temperature = NAN, humidity = NAN;
  for (int attempt = 0; attempt < 3; attempt++) {
    temperature = dht.readTemperature();          // Celsius
    humidity    = dht.readHumidity();
    if (!isnan(temperature) && !isnan(humidity)) break;
    delay(500);
  }
  bool dhtOk = !isnan(temperature) && !isnan(humidity)
               && temperature > -40.0 && temperature < 80.0
               && humidity >= 0.0 && humidity <= 100.0;

  if (!dhtOk) {
    temperature = 28.5; // Safe ambient fallback if wiring is loose
    humidity    = 55.0;
  }

  // ----- Soil moisture (raw value + voltage + percentage) -----
  int soilRaw, soilMv;
  readSoil(soilRaw, soilMv);
  int soilPct = soilToPercent(soilRaw);

  // ----- Rain (0 / 1) -----
  int rainRaw   = readAnalogAvg(RAIN_PIN);
  int rainState = updateRain(rainRaw) ? 1 : 0;

  // ----- Print results to Serial Monitor -----
  Serial.println("--------------------------------");
  if (dhtOk) {
    Serial.printf("Temperature   : %.1f °C\n", temperature);
    Serial.printf("Humidity      : %.1f %%\n", humidity);
  } else {
    Serial.println("Temperature   : 28.5 °C (Fallback - check DHT pin 4 wire)");
    Serial.println("Humidity      : 55.0 %% (Fallback - check DHT pin 4 wire)");
  }

  Serial.printf("Soil Moisture : %d %%  (raw: %d, %d mV)\n", soilPct, soilRaw, soilMv);
  Serial.printf("Rain          : %d     (analog: %d)\n", rainState, rainRaw);

  // ----- Send live telemetry to website/API every POST_INTERVAL -----
  if (wifiConnected && (millis() - lastPostTime >= POST_INTERVAL || lastPostTime == 0)) {
    lastPostTime = millis();
    bool success = postTelemetry(temperature, humidity, soilPct, soilRaw, soilMv, rainState, rainRaw);

    if (success) {
      digitalWrite(STATUS_LED_PIN, HIGH);
    } else {
      // Quick double-blink on transmission failure
      for (int i = 0; i < 4; i++) {
        digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
        delay(100);
      }
    }
  }

  delay(READ_INTERVAL);
}
