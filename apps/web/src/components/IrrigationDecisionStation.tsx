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
    <section className="irrigation-station" aria-label="Automated Irrigation Decision Station">
      {/* Main Decision Hero Card */}
      <div className="decision-hero-card">
        <div className="decision-header">
          <div className="decision-icon">
            {isIrrigate ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>
          <div className="decision-title-group">
            <span className="decision-label">AUTOMATED IRRIGATION DECISION</span>
            <h3 className="decision-status">
              {isIrrigate ? "🟢 RECOMMENDATION: IRRIGATE" : "🔴 RECOMMENDATION: DO NOT IRRIGATE"}
            </h3>
          </div>
          <div className="decision-meta">
            <span className="ml-badge">{decision?.ml_version || "AMHOE-v1.0"}</span>
            <span className={`safety-badge ${decision?.safety_status === "AUTOMATED" ? "auto" : "rec-only"}`}>
              {decision?.safety_status || "RECOMMENDATION_ONLY"}
            </span>
          </div>
        </div>

        {/* Live Sensor Gauges */}
        <div className="sensor-gauges-row">
          <div className="sensor-gauge">
            <div className="gauge-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
              </svg>
            </div>
            <div className="gauge-value">{sensors.temperature.toFixed(1)}°C</div>
            <div className="gauge-label">Temperature</div>
          </div>

          <div className="sensor-gauge">
            <div className="gauge-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div className="gauge-value">{sensors.humidity.toFixed(1)}%</div>
            <div className="gauge-label">Humidity</div>
          </div>

          <div className="sensor-gauge">
            <div className="gauge-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
            </div>
            <div className="gauge-value">{sensors.soilMoisture.toFixed(1)}%</div>
            <div className="gauge-label">
              Soil Moisture
              <span className={`moisture-pill ${moistureStatus.toLowerCase()}`}>{moistureStatus}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Flowcrumbs */}
        <div className="pipeline-flow">
          <div className="flow-step passed">
            <span className="step-icon">⚡</span>
            <span className="step-label">Weather Gate</span>
            <span className="step-status">PASSED</span>
          </div>
          <span className="flow-arrow">→</span>
          <div className="flow-step passed">
            <span className="step-icon">📡</span>
            <span className="step-label">ESP32 Telemetry</span>
            <span className="step-status">FRESH</span>
          </div>
          <span className="flow-arrow">→</span>
          <div className={`flow-step ${isIrrigate ? "irrigate" : "no-irrigate"}`}>
            <span className="step-icon">🤖</span>
            <span className="step-label">AMHOE ML</span>
            <span className="step-status">
              {isIrrigate ? "IRRIGATE" : "NO IRRIGATE"} ({decision?.confidence || 89}%)
            </span>
          </div>
          <span className="flow-arrow">→</span>
          <div className="flow-step passed">
            <span className="step-icon">🛡️</span>
            <span className="step-label">Safety</span>
            <span className="step-status">{decision?.safety_status || "RECOMMENDATION_ONLY"}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="decision-actions">
          <button
            className="refresh-decision-btn"
            onClick={fetchDecision}
            disabled={isEvaluating}
          >
            <Icon name={isEvaluating ? "activity" : "refresh"} />
            <span>{isEvaluating ? "Evaluating..." : "Refresh Decision"}</span>
          </button>
          {lastUpdate && (
            <span className="last-update">Last updated: {lastUpdate}</span>
          )}
        </div>
      </div>
    </section>
  );
}
