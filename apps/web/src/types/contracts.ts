export type Recommendation = "IRRIGATE" | "DO_NOT_IRRIGATE";
export type SafetyStatus = "RECOMMENDATION_ONLY" | "ACTUATION_BLOCKED" | "ACTUATION_ALLOWED";

export interface SensorReading {
  device_id: string;
  captured_at: string;
  temperature_C: number;
  "humidity_%": number;
  "soil_moisture_%": number;
}

export interface WeatherSnapshot {
  observed_at: string;
  forecast_horizon_hours: 6;
  "rain_probability_%": number;
  provider: string;
}

export interface IrrigationDecision {
  decided_at: string;
  recommendation: Recommendation;
  weather_gate: {
    "rain_probability_%": number;
    "threshold_%": 30;
    passed: boolean;
  };
  ml_result: {
    recommendation: Recommendation;
    model_version: string;
  } | null;
  safety_status: SafetyStatus;
}

export interface DashboardState {
  weather: WeatherSnapshot;
  sensors: SensorReading;
  decision: IrrigationDecision;
  telemetryStale: boolean;
  emergencyStop: boolean;
}

export interface BackendEndpointMeta {
  method: "GET" | "POST";
  path: string;
  owner: string;
  purpose: string;
  status: "MOCKED IN PHASE 1" | "REAL IN LATER PHASE";
}

export const backendEndpoints: BackendEndpointMeta[] = [
  { method: "GET", path: "/api/v1/weather/snapshot", owner: "Weather adapter", purpose: "Six-hour rain probability and weather gate input.", status: "MOCKED IN PHASE 1" },
  { method: "GET", path: "/api/v1/sensors/latest", owner: "Telemetry service", purpose: "Most recent ESP32 sensor reading.", status: "MOCKED IN PHASE 1" },
  { method: "POST", path: "/api/v1/sensors/telemetry", owner: "ESP32 ingestion", purpose: "Validate and accept a sensor reading.", status: "MOCKED IN PHASE 1" },
  { method: "POST", path: "/api/v1/decisions/evaluate", owner: "Decision engine", purpose: "Weather gate → ML inference → safety result.", status: "MOCKED IN PHASE 1" },
  { method: "GET", path: "/api/v1/decisions/history", owner: "Decision log", purpose: "Recent recommendation records for the dashboard.", status: "MOCKED IN PHASE 1" },
  { method: "POST", path: "/api/v1/safety/actuate", owner: "Safety layer", purpose: "Future guarded relay command; never called by ML directly.", status: "REAL IN LATER PHASE" },
];
