import type { DashboardState, IrrigationDecision, SensorReading, WeatherSnapshot } from "../types/contracts";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) throw new Error(`HydroWise API error: ${response.status}`);
  return response.json() as Promise<T>;
}

export const apiClient = {
  getWeather: () => request<WeatherSnapshot>("/api/v1/weather/snapshot"),
  getLatestSensors: () => request<SensorReading>("/api/v1/sensors/latest"),
  getDecision: () => request<IrrigationDecision>("/api/v1/decisions/evaluate"),
  evaluateDecision: (payload: Pick<DashboardState, "weather" | "sensors">) =>
    request<IrrigationDecision>("/api/v1/decisions/evaluate", { method: "POST", body: JSON.stringify(payload) }),
};
