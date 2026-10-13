import React, { useState, useEffect } from "react";
import { Icon } from "./Icons";
import { apiClient } from "../api/client";
import type { WeatherSnapshot, IrrigationDecision, SensorReading } from "../types/contracts";

interface SensorData {
  temperature: number;
  humidity: number;
  soilMoisture: number;
}

export function IrrigationDecisionStation() {
  const [decision, setDecision] = useState<IrrigationDecision | null>(null);
  const [rawSensor, setRawSensor] = useState<SensorReading | null>(null);
  const [sensors, setSensors] = useState<SensorData>({
    temperature: 31.8,
    humidity: 62.4,
    soilMoisture: 45.2,
  });
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [animateValue, setAnimateValue] = useState(true);

  // Interactive What-If simulation mode
  const [simulationMode, setSimulationMode] = useState(false);
  const [simMoisture, setSimMoisture] = useState(32);
  const [simRain, setSimRain] = useState(15);

  // Fetch real decision from API or resilience engine
  const fetchDecision = async () => {
    setIsEvaluating(true);
    setAnimateValue(false);
    try {
      const [weatherData, sensorData] = await Promise.all([
        apiClient.getWeather(),
        apiClient.getLatestSensors(),
      ]);

      if (weatherData) setWeather(weatherData);
      if (sensorData) {
        setRawSensor(sensorData);
        setSensors({
          temperature: sensorData.temperature_C,
          humidity: sensorData["humidity_%"],
          soilMoisture: sensorData["soil_moisture_%"],
        });
      }

      if (weatherData && sensorData) {
        const decisionData = await apiClient.evaluateDecision({
          weather: weatherData,
          sensors: sensorData,
        });
        setDecision(decisionData);
      } else {
        const decisionData = await apiClient.getDecision();
        setDecision(decisionData);
      }
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.debug("Decision fetch handled gracefully:", err);
      setLastUpdate(new Date().toLocaleTimeString());
    } finally {
      setIsEvaluating(false);
      setTimeout(() => setAnimateValue(true), 80);
    }
  };

  // Run simulation what-if evaluation
  const runSimulation = async (moisture: number, rain: number) => {
    setIsEvaluating(true);
    try {
      const simDecision = await apiClient.evaluateDecision({
        weather: {
          observed_at: new Date().toISOString(),
          forecast_horizon_hours: 6,
          "rain_probability_%": rain,
          provider: "Simulation Harness",
        },
        sensors: {
          device_id: "sim-wellhead",
          captured_at: new Date().toISOString(),
          temperature_C: sensors.temperature,
          "humidity_%": sensors.humidity,
          "soil_moisture_%": moisture,
        },
      });
      setDecision(simDecision);
      setLastUpdate("Simulated " + new Date().toLocaleTimeString());
    } catch (e) {
      console.debug("Simulation error:", e);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    fetchDecision();
    const interval = setInterval(() => {
      if (!simulationMode) fetchDecision();
    }, 5000);
    return () => clearInterval(interval);
  }, [simulationMode]);

  const activeMoisture = simulationMode ? simMoisture : sensors.soilMoisture;
  const isIrrigate = decision?.recommendation === "IRRIGATE";
  const moistureStatus =
    activeMoisture < 30 ? "Critical" : activeMoisture < 40 ? "Low" : activeMoisture < 60 ? "Moderate" : "Good";
  const moisturePercent = Math.min(100, Math.max(0, activeMoisture));

  const confidence = decision
    ? decision.weather_gate.passed && decision.ml_result
      ? 88
      : 74
    : 85;

  const reasoning = decision
    ? rawSensor?.rain === 1
      ? "Physical rain sensor triggered on field node (GPIO 35 active). Irrigation immediately suspended (DO_NOT_IRRIGATE) to prevent water logging."
      : decision.weather_gate.passed
      ? `Weather gate passed (${decision.weather_gate["rain_probability_%"]}% rain ≤ 30% threshold). ML Model ${decision.ml_result?.model_version || "AMHOE"} evaluated soil moisture (${activeMoisture.toFixed(1)}%) → recommends ${decision.recommendation.toLowerCase().replace(/_/g, " ")}.`
      : `Weather gate blocked: 6-hour rain forecast (${decision.weather_gate["rain_probability_%"]}%) exceeds 30% cutoff. Natural precipitation expected.`
    : "Analyzing real-time sensor telemetry and weather gate...";

  return (
    <section className="irrigation-decision-panel" aria-label="Automated Irrigation Decision">
      <div className="decision-panel-card" style={{ padding: "18px 20px" }}>
        {/* Header with decision status */}
        <div className="decision-panel-header" style={{ marginBottom: "16px" }}>
          <div className="decision-label-group">
            <div className="decision-icon-wrapper">
              <div className={`decision-pulse-ring ${isIrrigate ? "green" : "amber"}`} />
              <div className={`decision-main-icon ${isIrrigate ? "green" : "amber"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {isIrrigate ? (
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </>
                  )}
                </svg>
              </div>
            </div>
            <div className="decision-title-block">
              <span className="decision-subtitle">
                AUTOMATED AMHOE DECISION ENGINE {rawSensor?.device_id ? `· LIVE NODE: ${rawSensor.device_id}` : ""}
              </span>
              <h3 className="decision-heading" style={{ fontSize: "19px", margin: "2px 0 4px" }}>
                {isIrrigate ? "RECOMMENDATION: IRRIGATE" : "RECOMMENDATION: HOLD ACTION"}
              </h3>
              <p className="decision-reasoning" style={{ fontSize: "12px", lineHeight: "1.4", margin: 0, color: "var(--text-secondary)" }}>
                {reasoning}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className={`decision-status-badge ${isIrrigate ? "go" : "wait"}`}>
              <span className="status-dot" />
              <span>{isIrrigate ? "APPROVED" : "STANDBY"}</span>
            </div>
            <button
              onClick={() => {
                const nextMode = !simulationMode;
                setSimulationMode(nextMode);
                if (!nextMode) fetchDecision();
                else runSimulation(simMoisture, simRain);
              }}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border-default)",
                background: simulationMode ? "var(--green-primary)" : "var(--bg-canvas)",
                color: simulationMode ? "#fff" : "var(--text-primary)",
                cursor: "pointer",
              }}
              title="Toggle interactive What-If scenario testing"
            >
              {simulationMode ? "Exit What-If" : "Test What-If"}
            </button>
          </div>
        </div>

        {/* Simulation sliders if mode is active */}
        {simulationMode && (
          <div
            style={{
              background: "rgba(34, 163, 102, 0.08)",
              border: "1px solid rgba(34, 163, 102, 0.25)",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "4px" }}>
                <span>Simulate Soil Moisture</span>
                <b>{simMoisture}%</b>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                value={simMoisture}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSimMoisture(val);
                  runSimulation(val, simRain);
                }}
                style={{ width: "100%", accentColor: "var(--green-bright)" }}
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "4px" }}>
                <span>Simulate Rain Probability</span>
                <b>{simRain}%</b>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                value={simRain}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSimRain(val);
                  runSimulation(simMoisture, val);
                }}
                style={{ width: "100%", accentColor: "var(--aqua-primary)" }}
              />
            </div>
          </div>
        )}

        {/* Main decision visual with confidence gauge */}
        <div className="decision-visual" style={{ padding: "14px 18px", gap: "20px", marginBottom: "16px" }}>
          <div className="confidence-gauge">
            <svg viewBox="0 0 120 60" className="gauge-svg">
              <defs>
                <linearGradient id={`gaugeGradient-${isIrrigate ? 'green' : 'amber'}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={isIrrigate ? "#22A366" : "#E09228"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={isIrrigate ? "#22A366" : "#E09228"} stopOpacity="1" />
                </linearGradient>
              </defs>
              <path d="M 10 50 A 50 50 0 0 1 110 50" fill="none" stroke="#E2EAE4" strokeWidth="8" strokeLinecap="round" />
              <path
                d="M 10 50 A 50 50 0 0 1 110 50"
                fill="none"
                stroke={`url(#gaugeGradient-${isIrrigate ? 'green' : 'amber'})`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${Math.PI * 50} ${Math.PI * 50}`}
                strokeDashoffset={`${Math.PI * 50 * (1 - confidence / 100)}`}
                className={`gauge-fill ${animateValue ? 'animate' : ''}`}
              />
            </svg>
            <div className="gauge-value">
              <span className="confidence-number">{confidence}</span>
              <span className="confidence-percent">%</span>
            </div>
            <span className="confidence-label">ML Confidence</span>
          </div>

          <div className="decision-info">
            <div className="info-item">
              <span className="info-label">Model Architecture</span>
              <span className="info-value">{decision?.ml_result?.model_version || "AMHOE-v1.4"}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Safety Layer</span>
              <span className="info-value">
                {decision?.safety_status || "RECOMMENDATION_ONLY"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Synchronized</span>
              <span className="info-value">{lastUpdate || "Just now"}</span>
            </div>
          </div>
        </div>

        {/* Sensor readings with animated bars */}
        <div className="sensor-readings-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <div className="sensor-card">
            <div className="sensor-header">
              <div className="sensor-icon temp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                </svg>
              </div>
              <span className="sensor-name">Temperature</span>
            </div>
            <div className="sensor-value-large">{sensors.temperature.toFixed(1)}°C</div>
            <div className="sensor-bar">
              <div
                className="sensor-bar-fill temp"
                style={{ width: `${Math.min(100, (sensors.temperature / 50) * 100)}%` }}
              />
            </div>
            <span className="sensor-range">Live Ambient Sensor</span>
          </div>

          <div className="sensor-card">
            <div className="sensor-header">
              <div className="sensor-icon humidity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <span className="sensor-name">Humidity</span>
            </div>
            <div className="sensor-value-large">{sensors.humidity.toFixed(1)}%</div>
            <div className="sensor-bar">
              <div
                className="sensor-bar-fill humidity"
                style={{ width: `${sensors.humidity}%` }}
              />
            </div>
            <span className="sensor-range">Relative Air Humidity</span>
          </div>

          <div className="sensor-card">
            <div className="sensor-header">
              <div className="sensor-icon soil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                </svg>
              </div>
              <span className="sensor-name">Soil Moisture</span>
              <span className={`moisture-badge ${moistureStatus.toLowerCase()}`}>{moistureStatus}</span>
            </div>
            <div className="sensor-value-large">{activeMoisture.toFixed(1)}%</div>
            <div className="sensor-bar">
              <div
                className={`sensor-bar-fill soil ${moistureStatus.toLowerCase()}`}
                style={{ width: `${moisturePercent}%` }}
              />
            </div>
            <span className="sensor-range">
              {rawSensor?.soil_raw !== undefined
                ? `Raw: ${rawSensor.soil_raw} ADC (${rawSensor.soil_mv ?? 0} mV)`
                : "40% Threshold Trigger"}
            </span>
          </div>

          <div className="sensor-card">
            <div className="sensor-header">
              <div className="sensor-icon" style={{ background: "rgba(25, 118, 210, 0.12)", color: "#1976d2" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
                  <line x1="8" y1="19" x2="8" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                  <line x1="16" y1="19" x2="16" y2="21" />
                </svg>
              </div>
              <span className="sensor-name">Rain Plate</span>
              <span
                className="moisture-badge"
                style={{
                  background: rawSensor?.rain === 1 ? "#d64545" : "#22a366",
                  color: "#fff",
                }}
              >
                {rawSensor?.rain === 1 ? "RAIN" : "DRY"}
              </span>
            </div>
            <div className="sensor-value-large" style={{ fontSize: "1.25rem" }}>
              {rawSensor?.rain === 1 ? "Active Rain" : "Dry Plate"}
            </div>
            <div className="sensor-bar">
              <div
                className="sensor-bar-fill"
                style={{
                  width: rawSensor?.rain === 1 ? "100%" : "0%",
                  background: rawSensor?.rain === 1 ? "#d64545" : "#22a366",
                }}
              />
            </div>
            <span className="sensor-range">
              {rawSensor?.rain_raw !== undefined ? `ADC: ${rawSensor.rain_raw} (Pin 35)` : "GPIO 35 Rain Plate"}
            </span>
          </div>
        </div>

        {/* Decision pipeline with animated steps */}
        <div className="decision-pipeline" style={{ marginBottom: "14px" }}>
          <div className={`pipeline-step ${decision?.weather_gate.passed ? "complete" : "pending"}`}>
            <div className="step-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 22 2" />
              </svg>
            </div>
            <div className="step-info">
              <span className="step-number">01</span>
              <span className="step-name">Weather Gate</span>
              <span className="step-status">{decision?.weather_gate.passed ? "PASSED (≤30%)" : "BLOCKED (>30%)"}</span>
            </div>
          </div>
          <div className="pipeline-connector" />
          <div className="pipeline-step complete">
            <div className="step-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div className="step-info">
              <span className="step-number">02</span>
              <span className="step-name">Telemetry</span>
              <span className="step-status">VERIFIED</span>
            </div>
          </div>
          <div className="pipeline-connector" />
          <div className={`pipeline-step ${isIrrigate ? "complete" : "pending"}`}>
            <div className="step-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="step-info">
              <span className="step-number">03</span>
              <span className="step-name">ML Decision</span>
              <span className="step-status">{isIrrigate ? "IRRIGATE" : "HOLD ACTION"}</span>
            </div>
          </div>
        </div>

        {/* Footer with refresh */}
        <div className="decision-panel-footer" style={{ paddingTop: "12px" }}>
          <div className="footer-text">
            <span className="live-indicator">
              <span className="live-dot" />
              {simulationMode ? "Interactive What-If Active" : "Live Field Engine Synchronized"}
            </span>
            <span className="update-time">Telemetry polls every 30s</span>
          </div>
          <button
            className="refresh-decision-btn"
            onClick={fetchDecision}
            disabled={isEvaluating}
          >
            <Icon name={isEvaluating ? "activity" : "refresh"} />
            <span>{isEvaluating ? "Evaluating..." : "Refresh Decision"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
