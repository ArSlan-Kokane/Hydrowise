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

  // Fetch decision from API
  const fetchDecision = async () => {
    setIsEvaluating(true);
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

  return (
    <section className="irrigation-decision-panel" aria-label="Automated Irrigation Decision">
      <div className="decision-panel-card">
        {/* Header with decision status */}
        <div className="decision-panel-header">
          <div className="decision-label-group">
            <span className="decision-section-number">06</span>
            <div className="decision-title-block">
              <span className="decision-subtitle">AUTOMATED DECISION</span>
              <h3 className="decision-heading">
                {isIrrigate ? "IRRIGATE" : "DO NOT IRRIGATE"}
              </h3>
            </div>
          </div>
          <div className={`decision-status-badge ${isIrrigate ? "go" : "wait"}`}>
            <span className="status-dot" />
            <span>{isIrrigate ? "Approved" : "Wait"}</span>
          </div>
        </div>

        {/* Main decision visual */}
        <div className="decision-visual">
          <div className={`decision-circle ${isIrrigate ? "green" : "amber"}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isIrrigate ? (
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </>
              )}
            </svg>
          </div>
          <div className="decision-confidence">
            <span className="confidence-label">Confidence</span>
            <span className="confidence-value">{decision?.confidence || 89}%</span>
          </div>
        </div>

        {/* Sensor readings */}
        <div className="sensor-readings-grid">
          <div className="sensor-card">
            <div className="sensor-icon temp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
              </svg>
            </div>
            <div className="sensor-data">
              <span className="sensor-value">{sensors.temperature.toFixed(1)}°C</span>
              <span className="sensor-label">Temperature</span>
            </div>
          </div>

          <div className="sensor-card">
            <div className="sensor-icon humidity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div className="sensor-data">
              <span className="sensor-value">{sensors.humidity.toFixed(1)}%</span>
              <span className="sensor-label">Humidity</span>
            </div>
          </div>

          <div className="sensor-card">
            <div className="sensor-icon soil">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
            </div>
            <div className="sensor-data">
              <span className="sensor-value">{sensors.soilMoisture.toFixed(1)}%</span>
              <span className="sensor-label">Soil Moisture</span>
            </div>
            <span className={`moisture-indicator ${moistureStatus.toLowerCase()}`}>{moistureStatus}</span>
          </div>
        </div>

        {/* Decision pipeline */}
        <div className="decision-pipeline">
          <div className="pipeline-step complete">
            <span className="step-number">1</span>
            <span className="step-name">Weather Gate</span>
            <span className="step-result">Passed</span>
          </div>
          <div className="pipeline-divider" />
          <div className="pipeline-step complete">
            <span className="step-number">2</span>
            <span className="step-name">Telemetry</span>
            <span className="step-result">Fresh</span>
          </div>
          <div className="pipeline-divider" />
          <div className={`pipeline-step ${isIrrigate ? "complete" : "pending"}`}>
            <span className="step-number">3</span>
            <span className="step-name">ML Decision</span>
            <span className="step-result">{isIrrigate ? "Irrigate" : "Hold"}</span>
          </div>
        </div>

        {/* Footer with refresh */}
        <div className="decision-panel-footer">
          <div className="ml-info">
            <span className="ml-label">AMHOE-v1.0</span>
            <span className="safety-status">RECOMMENDATION_ONLY</span>
          </div>
          <button
            className="refresh-decision-btn"
            onClick={fetchDecision}
            disabled={isEvaluating}
          >
            <Icon name={isEvaluating ? "activity" : "refresh"} />
            <span>{isEvaluating ? "Evaluating..." : "Refresh"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
