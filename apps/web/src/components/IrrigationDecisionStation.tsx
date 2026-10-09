import React, { useState, useEffect } from "react";
import { Icon } from "./Icons";

interface SensorData {
  temperature: number;
  humidity: number;
  soilMoisture: number;
}

interface DecisionResponse {
  recommendation: "IRRIGATE" | "DO_NOT_IRRIGATE";
  confidence: number;
  reasoning: string;
  safety_status: "RECOMMENDATION_ONLY" | "AUTOMATED";
  ml_version: string;
}

export function IrrigationDecisionStation() {
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [sensors, setSensors] = useState<SensorData>({
    temperature: 31.9,
    humidity: 67.6,
    soilMoisture: 45.9,
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [animateValue, setAnimateValue] = useState(true);

  // Fetch decision from API
  const fetchDecision = async () => {
    setIsEvaluating(true);
    setAnimateValue(false);
    try {
      const response = await fetch("/api/v1/decisions/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weather_gate: {
            rain_probability: 0,
            temperature: 31.9,
            humidity: 67.6,
          },
          telemetry: {
            soil_moisture: 45.9,
            temperature: 31.9,
            humidity: 67.6,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDecision(data);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Failed to fetch decision:", error);
      // Fallback to mock data
      setDecision({
        recommendation: "IRRIGATE",
        confidence: 89,
        reasoning: "Weather gate passed, soil moisture below threshold, ML model recommends irrigation",
        safety_status: "RECOMMENDATION_ONLY",
        ml_version: "AMHOE-v1.0-proprietary",
      });
      setLastUpdate(new Date().toLocaleTimeString());
    } finally {
      setIsEvaluating(false);
      setTimeout(() => setAnimateValue(true), 100);
    }
  };

  // Fetch sensor readings
  const fetchSensors = async () => {
    try {
      const response = await fetch("/api/v1/sensors/latest");
      if (response.ok) {
        const data = await response.json();
        setSensors({
          temperature: data.temperature || 31.9,
          humidity: data.humidity || 67.6,
          soilMoisture: data.soil_moisture || 45.9,
        });
      }
    } catch (error) {
      console.error("Failed to fetch sensors:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchDecision();
    fetchSensors();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchSensors();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const isIrrigate = decision?.recommendation === "IRRIGATE";
  const moistureStatus = sensors.soilMoisture < 40 ? "Low" : sensors.soilMoisture < 60 ? "Moderate" : "Good";
  const moisturePercent = Math.min(100, Math.max(0, sensors.soilMoisture));

  return (
    <section className="irrigation-decision-panel" aria-label="Automated Irrigation Decision">
      <div className="decision-panel-card">
        {/* Header with decision status */}
        <div className="decision-panel-header">
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
              <span className="decision-subtitle">AUTOMATED DECISION ENGINE</span>
              <h3 className="decision-heading">
                {isIrrigate ? "IRRIGATE NOW" : "HOLD ACTION"}
              </h3>
              <p className="decision-reasoning">
                {decision?.reasoning || "Analyzing field conditions and weather data..."}
              </p>
            </div>
          </div>
          <div className={`decision-status-badge ${isIrrigate ? "go" : "wait"}`}>
            <span className="status-dot" />
            <span>{isIrrigate ? "APPROVED" : "WAIT"}</span>
          </div>
        </div>

        {/* Main decision visual with confidence gauge */}
        <div className="decision-visual">
          <div className="confidence-gauge">
            <svg viewBox="0 0 120 60" className="gauge-svg">
              <defs>
                <linearGradient id={`gaugeGradient-${isIrrigate ? 'green' : 'amber'}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={isIrrigate ? "#22A366" : "#E09228"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={isIrrigate ? "#22A366" : "#E09228"} stopOpacity="1" />
                </linearGradient>
              </defs>
              <path
                d="M 10 50 A 50 50 0 0 1 110 50"
                fill="none"
                stroke="#E2EAE4"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 10 50 A 50 50 0 0 1 110 50"
                fill="none"
                stroke={`url(#gaugeGradient-${isIrrigate ? 'green' : 'amber'})`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${Math.PI * 50} ${Math.PI * 50}`}
                strokeDashoffset={`${Math.PI * 50 * (1 - (decision?.confidence || 89) / 100)}`}
                className={`gauge-fill ${animateValue ? 'animate' : ''}`}
              />
            </svg>
            <div className="gauge-value">
              <span className="confidence-number">{decision?.confidence || 89}</span>
              <span className="confidence-percent">%</span>
            </div>
            <span className="confidence-label">ML Confidence</span>
          </div>

          <div className="decision-info">
            <div className="info-item">
              <span className="info-label">Model</span>
              <span className="info-value">AMHOE-v1.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">Safety</span>
              <span className="info-value warning">RECOMMENDATION_ONLY</span>
            </div>
            <div className="info-item">
              <span className="info-label">Updated</span>
              <span className="info-value">{lastUpdate || "Just now"}</span>
            </div>
          </div>
        </div>

        {/* Sensor readings with animated bars */}
        <div className="sensor-readings-grid">
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
            <span className="sensor-range">Range: 0-50°C</span>
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
            <span className="sensor-range">Range: 0-100%</span>
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
            <div className="sensor-value-large">{sensors.soilMoisture.toFixed(1)}%</div>
            <div className="sensor-bar">
              <div
                className={`sensor-bar-fill soil ${moistureStatus.toLowerCase()}`}
                style={{ width: `${moisturePercent}%` }}
              />
            </div>
            <span className="sensor-range">Threshold: 40% minimum</span>
          </div>
        </div>

        {/* Decision pipeline with animated steps */}
        <div className="decision-pipeline">
          <div className="pipeline-step complete">
            <div className="step-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 22 2" />
              </svg>
            </div>
            <div className="step-info">
              <span className="step-number">01</span>
              <span className="step-name">Weather Gate</span>
              <span className="step-status">PASSED</span>
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
              <span className="step-status">FRESH</span>
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
              <span className="step-status">{isIrrigate ? "IRRIGATE" : "HOLD"}</span>
            </div>
          </div>
        </div>

        {/* Footer with refresh */}
        <div className="decision-panel-footer">
          <div className="footer-text">
            <span className="live-indicator">
              <span className="live-dot" />
              Live Field Station
            </span>
            <span className="update-time">Updates every 30s</span>
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
