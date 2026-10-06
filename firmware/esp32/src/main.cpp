#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <config.h>
#include <time.h>

// DHT22 sensor setup
DHT dht(DHT_PIN, DHT22);

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

// LED states
void setLedConnecting() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
}

void setLedBlinking() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  // Blinking is handled in loop
}

void setLedSolidSuccess() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, HIGH);
}

void setLedFastBlink() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  // Fast blink is handled in loop
}

// Get current time in ISO 8601 UTC format
String getIso8601Time() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "";
  }

  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// Connect to Wi-Fi
bool connectToWiFi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startAttempt > WIFI_TIMEOUT_MS) {
      Serial.println("[ERROR] Wi-Fi connection timeout!");
      return false;
    }
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Configure NTP
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("NTP time sync initiated...");

  return true;
}

// Read sensor values
bool readSensors(float* temperature, float* humidity, int* soilMoisture) {
  // Read DHT22
  *temperature = dht.readTemperature();
  *humidity = dht.readHumidity();

  if (isnan(*temperature) || isnan(*humidity)) {
    Serial.println("[ERROR] Failed to read from DHT sensor!");
    return false;
  }

  // Read soil moisture (5 samples and average)
  int soilRawSum = 0;
  const int soilSamples = 5;

  for (int i = 0; i < soilSamples; i++) {
    soilRawSum += analogRead(SOIL_MOISTURE_PIN);
    delay(10);
  }

  int soilRawAverage = soilRawSum / soilSamples;

  // Convert to 0-100%
  *soilMoisture = map(soilRawAverage, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100);
  *soilMoisture = constrain(*soilMoisture, 0, 100);

  return true;
}

// Post sensor reading to API
bool postReading(float temperature, float humidity, int soilMoisture) {
  String capturedAt = getIso8601Time();

  // Build JSON payload
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  if (capturedAt.length() > 0) {
    doc["captured_at"] = capturedAt;
  }
  doc["temperature_C"] = temperature;
  doc["humidity_%"] = humidity;
  doc["soil_moisture_%"] = soilMoisture;

  String jsonString;
  serializeJson(doc, jsonString);

  // Prepare HTTP request
  String url = String(API_BASE_URL) + "/api/sensors/reading";

  // For HTTPS with setInsecure() (testing only - TODO: pin certificate in production)
  if (API_BASE_URL.startsWith("https")) {
    wifiClient.setInsecure();
  }

  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);

  Serial.print("POST -> ");
  int httpCode = http.POST(jsonString);

  if (httpCode == 201) {
    String response = http.getString();
    Serial.print(httpCode);
    Serial.print(" SUCCESS");
    Serial.println();
    http.end();
    return true;
  } else {
    Serial.print(httpCode);
    Serial.print(" FAILED: ");
    Serial.println(http.errorToString(httpCode));
    http.end();
    return false;
  }
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  while (!Serial) {
    delay(10);
  }

  Serial.println("HydroWise ESP32 Sensor Node");
  Serial.println("===========================");
  Serial.println("Initializing sensors...");

  // Initialize DHT22
  dht.begin();

  // Configure soil moisture pin
  pinMode(SOIL_MOISTURE_PIN, INPUT);

  // Configure status LED
  pinMode(STATUS_LED_PIN, OUTPUT);

  Serial.println("Sensors ready.");
  Serial.println();

  // Connect to Wi-Fi
  setLedConnecting();
  wifiConnected = connectToWiFi();

  if (wifiConnected) {
    setLedSolidSuccess();
  } else {
    setLedFastBlink();
  }

  Serial.println();
}

void loop() {
  // Auto-reconnect to Wi-Fi if disconnected
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println("[WARN] Wi-Fi disconnected, attempting to reconnect...");
    wifiConnected = connectToWiFi();
    if (wifiConnected) {
      setLedSolidSuccess();
    } else {
      setLedFastBlink();
    }
  }

  // Read sensors for local display
  float temperature, humidity;
  int soilMoisture;

  if (readSensors(&temperature, &humidity, &soilMoisture)) {
    Serial.print("[SENSOR] Temp: ");
    Serial.print(temperature, 1);
    Serial.print(" C | Hum: ");
    Serial.print(humidity, 1);
    Serial.print(" % | Soil: ");
    Serial.print(soilMoisture);
    Serial.println(" %");
  }

  // Post to API every POST_INTERVAL_MS
  if (wifiConnected && millis() - lastPostTime >= POST_INTERVAL_MS) {
    lastPostTime = millis();

    Serial.print("[API] Posting to ");
    Serial.println(API_BASE_URL);

    // Retry logic: up to 3 attempts with backoff
    bool success = false;
    for (int attempt = 1; attempt <= 3; attempt++) {
      if (postReading(temperature, humidity, soilMoisture)) {
        success = true;
        lastPostSuccess = true;
        setLedSolidSuccess();
        break;
      } else {
        Serial.print("[API] Attempt ");
        Serial.print(attempt);
        Serial.println(" failed, retrying...");
        delay(2000 * attempt);  // Exponential backoff: 2s, 4s, 6s
      }
    }

    if (!success) {
      lastPostSuccess = false;
      setLedFastBlink();
      Serial.println("[API] All POST attempts failed");
    }
  }

  // LED handling
  if (!wifiConnected) {
    // Fast blink: Wi-Fi disconnected
    if (millis() % 200 < 100) {
      digitalWrite(STATUS_LED_PIN, HIGH);
    } else {
      digitalWrite(STATUS_LED_PIN, LOW);
    }
  } else if (!lastPostSuccess) {
    // Fast blink: Last POST failed
    if (millis() % 200 < 100) {
      digitalWrite(STATUS_LED_PIN, HIGH);
    } else {
      digitalWrite(STATUS_LED_PIN, LOW);
    }
  } else {
    // Solid: Last POST succeeded
    digitalWrite(STATUS_LED_PIN, HIGH);
  }

  delay(READING_INTERVAL_MS);
}
