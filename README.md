#For test use
install unicorn
install ppm
install requirements.txt
Get into Hydrowise Direectory
##Paste For Backend
uvicorn services.api.app.main:app --host 0.0.0.0 --port 8000

##Paste For Frontend
pnpm --dir apps/web dev --host 0.0.0.0 --port 5173

# 🌱 Hydro-Wise

### **Smarter Irrigation. Better Decisions. Less Water.**

> An intelligent, IoT-ready irrigation decision system that combines **real-time environmental sensing, weather forecasting, and machine learning** to determine whether farmland should be irrigated.

---

## ⚡ The Idea

Hydro-Wise follows a simple principle:

**Never irrigate blindly.**

Before considering irrigation, the system first checks the **rain probability for the next 6 hours** using a Weather API.

```text
                    🌦️ WEATHER API
                         │
                Rain probability
                   (next 6 hrs)
                         │
              ┌──────────┴──────────┐
              │                     │
            > 30%                 ≤ 30%
              │                     │
              ▼                     ▼
       🚫 DON'T IRRIGATE        🌱 SENSOR DATA
                                      │
                          ┌───────────┼───────────┐
                          │           │           │
                         🌡️          💧          🌱
                     Temperature   Humidity   Soil Moisture
                          │           │           │
                          └───────────┼───────────┘
                                      ▼
                                🤖 ML MODEL
                                      │
                           ┌──────────┴──────────┐
                           ▼                     ▼
                       IRRIGATE            DON'T IRRIGATE
```

### 🧠 Why this approach?

The **Weather API handles rainfall first**, preventing unnecessary irrigation when significant rain is expected.

When rainfall probability is below the threshold, the **ML model evaluates current sensor conditions** to determine whether the soil/environment indicates a need for irrigation.

---

## 🔬 Machine Learning

### Input Features

* 🌡️ Atmospheric Temperature
* 💧 Humidity
* 🌱 Soil Moisture

### Prediction

**`Irrigate`** or **`Do Not Irrigate`**

The model is trained using an India-oriented sensor dataset containing irrigation-condition labels derived from environmental water-stress patterns.

> **Note:** The current training labels are synthetically derived for prototype development and are not claimed as observed irrigation decisions.

---

## 🏗️ System Architecture

```text
┌───────────────┐
│   WEATHER API │
└───────┬───────┘
        │
        ▼
 Rain Probability
        │
   >30% │ ≤30%
        │
        └──────────────────────┐
                               ▼
                       ┌──────────────┐
                       │   ESP32      │
                       └──────┬───────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
            🌡️ Temp       💧 Humidity   🌱 Soil Moisture
                 └────────────┼────────────┘
                              ▼
                       ┌──────────────┐
                       │  ML MODEL    │
                       └──────┬───────┘
                              ▼
                    Irrigate / Don't Irrigate
                              │
                       ┌──────┴──────┐
                       ▼             ▼
                    💦 Pump       📊 Dashboard
```

---

## 🛠️ Technology Stack

**Machine Learning**
`Python` · `Pandas` · `NumPy` · `Scikit-learn`

**IoT / Hardware**
`ESP32` · Soil Moisture Sensor · DHT22

**Weather Intelligence**
`Weather API`

**Future Automation**
`Relay` · `Water Pump`

**Visualization**
`Dashboard / Data Visualization`

---

## 📊 Current ML Dataset

**2,000 sensor readings**

| Feature                 | Description                     |
| ----------------------- | ------------------------------- |
| `soil_moisture_%`       | Soil moisture level             |
| `temperature_C`         | Atmospheric temperature         |
| `humidity_%`            | Relative humidity               |
| `irrigation_need_score` | Derived irrigation-demand score |
| `ml_suggestion`         | Target prediction               |

**Training target distribution**

`40% Irrigate` · `60% Do Not Irrigate`

---

## 🚀 Development Roadmap

```text
[✓] Dataset preparation
[✓] ML problem definition
[ ] Exploratory Data Analysis
[ ] Model training & comparison
[ ] Model evaluation
[ ] Weather API integration
[ ] ESP32 sensor integration
[ ] Decision engine
[ ] Pump automation
[ ] Live dashboard
[ ] End-to-end field testing
```

---

## 🎯 Vision

Hydro-Wise is being developed as a **climate-aware agricultural decision system** where irrigation is based on both:

**What is happening now**
🌡️ Temperature · 💧 Humidity · 🌱 Soil Moisture

**What may happen next**
🌧️ Rain probability

The goal is simple:

> **Use data before using water.**

---

### 📌 Project Status

**Active Development**

Built as an academic project focused on **IoT, Machine Learning, Weather Intelligence, and Sustainable Agriculture**.
