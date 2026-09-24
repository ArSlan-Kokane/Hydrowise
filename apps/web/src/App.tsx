import { useMemo, useState } from "react";
import type { DashboardState, IrrigationDecision, Recommendation, SafetyStatus, SensorReading, WeatherSnapshot } from "./types/contracts";
import { backendEndpoints } from "./types/contracts";

const now = new Date().toISOString();
const baseSensors: SensorReading = { device_id: "esp32dev-field-01", captured_at: now, "temperature_C": 38, "humidity_%": 42, "soil_moisture_%": 18 };
const baseWeather: WeatherSnapshot = { observed_at: now, forecast_horizon_hours: 6, "rain_probability_%": 5, provider: "Mock weather adapter" };

function evaluate(weather: WeatherSnapshot, sensors: SensorReading, stale = false, emergencyStop = false): IrrigationDecision {
  const rain = weather["rain_probability_%"];
  const gatePassed = rain <= 30;
  const mlRecommendation: Recommendation = sensors["soil_moisture_%"] < 35 && sensors["temperature_C"] > 28 && sensors["humidity_%"] < 65 ? "IRRIGATE" : "DO_NOT_IRRIGATE";
  const recommendation = gatePassed ? mlRecommendation : "DO_NOT_IRRIGATE";
  const safety_status: SafetyStatus = emergencyStop || stale ? "ACTUATION_BLOCKED" : "RECOMMENDATION_ONLY";
  return {
    decided_at: new Date().toISOString(),
    recommendation,
    weather_gate: { "rain_probability_%": rain, "threshold_%": 30, passed: gatePassed },
    ml_result: gatePassed ? { recommendation: mlRecommendation, model_version: "mock-v0.1" } : null,
    safety_status,
  };
}

const scenarios = {
  downpour: { label: "Impending downpour", detail: "Weather gate blocks", weather: 70, temp: 28, humidity: 78, soil: 36 },
  drought: { label: "Summer heatwave", detail: "ML recommends irrigation", weather: 5, temp: 38, humidity: 42, soil: 18 },
  moist: { label: "Well hydrated", detail: "ML recommends waiting", weather: 10, temp: 24, humidity: 68, soil: 68 },
  stale: { label: "Stale telemetry", detail: "Safety lockout", weather: 5, temp: 38, humidity: 42, soil: 18 },
} as const;

type ScenarioKey = keyof typeof scenarios;

function Gauge({ value, color, label, unit }: { value: number; color: string; label: string; unit: string }) {
  return <div className="gauge-wrap"><div className="gauge" style={{ "--value": `${Math.min(Math.max(value, 0), 100) * 3.6}deg`, "--gauge-color": color } as React.CSSProperties}><div className="gauge-inner"><strong>{Math.round(value)}{unit}</strong><span>{label}</span></div></div></div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="eyebrow">{children}</p>; }
function StatusDot({ tone = "lime" }: { tone?: "lime" | "blue" | "amber" }) { return <span className={`status-dot ${tone}`} aria-hidden="true" />; }

function Header({ simulation, onSimulation }: { simulation: boolean; onSimulation: () => void }) {
  return <header className="topbar"><div className="brand"><div className="brand-mark">⌁</div><div><strong>HYDRO<span>WISE</span></strong><small>SMART IRRIGATION CONTROL ROOM</small></div></div><div className="system-pills"><div className="status-pill"><StatusDot /> API ONLINE</div><div className="status-pill"><StatusDot tone="blue" /> ESP32 LINKED</div><button className={`sim-pill ${simulation ? "active" : ""}`} onClick={onSimulation}><span className="sim-icon">◉</span> SIMULATION {simulation ? "ON" : "OFF"}</button></div></header>;
}

function Pipeline({ decision, stale }: { decision: IrrigationDecision; stale: boolean }) {
  const steps = [
    ["01", "WEATHER GATE", decision.weather_gate.passed ? "PASS · ≤ 30%" : "BLOCK · > 30%", decision.weather_gate.passed ? "complete" : "blocked"],
    ["02", "ESP32 TELEMETRY", stale ? "STALE SIGNAL" : "LIVE · 1.2s", stale ? "blocked" : "complete"],
    ["03", "ML CLASSIFIER", decision.ml_result ? "EVALUATED" : "BYPASSED", decision.ml_result ? "complete" : "muted"],
    ["04", "SAFETY LAYER", decision.safety_status.replaceAll("_", " "), decision.safety_status === "RECOMMENDATION_ONLY" ? "complete" : "blocked"],
    ["05", "PUMP RELAY", "HARDWARE LOCKED", "muted"],
  ] as const;
  return <section className="pipeline" aria-label="Decision pipeline">{steps.map(([num, title, detail, state], index) => <div className="pipeline-step" key={title}><div className={`step-node ${state}`}>{num}</div><div><span>{title}</span><small>{detail}</small></div>{index < steps.length - 1 && <i className={`connector ${state === "complete" ? "lit" : ""}`} />}</div>)}</section>;
}

function WeatherCard({ weather, decision }: { weather: WeatherSnapshot; decision: IrrigationDecision }) {
  const rain = weather["rain_probability_%"];
  return <article className="card weather-card"><div className="card-head"><div><Eyebrow>01 / WEATHER INTELLIGENCE</Eyebrow><h2>Rain gate <span>· next 6 hours</span></h2></div><span className={`badge ${decision.weather_gate.passed ? "success" : "danger"}`}>{decision.weather_gate.passed ? "GATE PASSED" : "GATE BLOCKED"}</span></div><div className="weather-content"><Gauge value={rain} color={rain > 30 ? "#f59e0b" : "#38bdf8"} label="rain probability" unit="%" /><div className="threshold-copy"><div className="metric-line"><strong>{rain}%</strong><span>forecast probability</span></div><div className="threshold-bar"><span style={{ width: `${rain}%` }} /><i style={{ left: "30%" }} /></div><div className="threshold-labels"><span>0%</span><span className="threshold-marker">30% threshold</span><span>100%</span></div><p>{decision.weather_gate.passed ? "Rain risk is within the safe window. The sensor path may continue to ML." : "Significant rain is expected. Irrigation is blocked before ML inference."}</p></div></div><div className="card-foot"><span><StatusDot tone="blue" /> Provider: {weather.provider}</span><span>Updated just now</span></div></article>;
}

function SensorCard({ sensors, stale }: { sensors: SensorReading; stale: boolean }) {
  const soil = sensors["soil_moisture_%"];
  return <article className="card sensor-card"><div className="card-head"><div><Eyebrow>02 / FIELD TELEMETRY</Eyebrow><h2>Sensor hub <span>· live node</span></h2></div><span className={`badge ${stale ? "danger" : "success"}`}><StatusDot tone={stale ? "amber" : "lime"} /> {stale ? "STALE" : "LIVE"}</span></div><div className="sensor-main"><Gauge value={soil} color="#a3e635" label="soil moisture" unit="%" /><div className="sensor-values"><div><span className="value-icon temp">°</span><strong>{sensors["temperature_C"]}<em>°C</em></strong><small>temperature</small></div><div><span className="value-icon humid">≈</span><strong>{sensors["humidity_%"]}<em>%</em></strong><small>humidity</small></div></div></div><div className="device-meta"><span><b>DEVICE</b> {sensors.device_id}</span><span><b>LATENCY</b> {stale ? "—" : "1.2 sec"}</span><span><b>CAPTURED</b> {stale ? "12m ago" : "just now"}</span></div></article>;
}

function MLCard({ decision, sensors }: { decision: IrrigationDecision; sensors: SensorReading }) {
  const result = decision.ml_result;
  return <article className="card ml-card"><div className="card-head"><div><Eyebrow>03 / MACHINE LEARNING</Eyebrow><h2>Inference engine <span>· sklearn adapter</span></h2></div><span className="model-tag">{result?.model_version ?? "BYPASSED"}</span></div><div className={`recommendation ${result?.recommendation === "IRRIGATE" ? "irrigate" : "wait"}`}><div className="recommendation-icon">{result?.recommendation === "IRRIGATE" ? "↗" : "⊘"}</div><div><small>MODEL RECOMMENDATION</small><strong>{result?.recommendation.replaceAll("_", " ") ?? "NOT EVALUATED"}</strong></div></div><div className="feature-row"><span>FEATURE VECTOR <b>3 / 3</b></span><div><code>{sensors["temperature_C"]}°C</code><code>{sensors["humidity_%"]}% RH</code><code>{sensors["soil_moisture_%"]}% soil</code></div></div><p className="architecture-note">Rain probability is intentionally excluded. The weather gate remains a separate rule-based layer upstream.</p></article>;
}

function SafetyCard({ decision, emergencyStop, onStop }: { decision: IrrigationDecision; emergencyStop: boolean; onStop: () => void }) {
  const blocked = decision.safety_status !== "ACTUATION_ALLOWED" || emergencyStop;
  return <article className="card safety-card"><div className="card-head"><div><Eyebrow>04 / CONTROL SAFETY</Eyebrow><h2>Safety & relay <span>· final authority</span></h2></div><span className="badge warning">{emergencyStop ? "E-STOP ACTIVE" : "PUMP LOCKED"}</span></div><div className="safety-status"><div className={`relay-orb ${blocked ? "locked" : "flowing"}`}><span>◌</span></div><div><small>SERVER SAFETY STATUS</small><strong>{emergencyStop ? "EMERGENCY STOP" : decision.safety_status.replaceAll("_", " ")}</strong><p>ML output never directly controls the pump.</p></div></div><div className="safety-controls"><div><span>RELAY STATE</span><b className="locked-text">{blocked ? "LOCKED" : "READY"}</b></div><button className="stop-button" onClick={onStop}>{emergencyStop ? "RESET E-STOP" : "EMERGENCY STOP"}</button></div></article>;
}

function Playground({ state, onApply }: { state: DashboardState; onApply: (key: ScenarioKey) => void }) {
  const [custom, setCustom] = useState({ rain: state.weather["rain_probability_%"], temp: state.sensors["temperature_C"], humidity: state.sensors["humidity_%"], soil: state.sensors["soil_moisture_%"] });
  const fields = [["rain", "RAIN PROBABILITY", "%", 100], ["temp", "TEMPERATURE", "°C", 50], ["humidity", "HUMIDITY", "%", 100], ["soil", "SOIL MOISTURE", "%", 100]] as const;
  return <section className="playground"><div className="section-heading"><div><Eyebrow>05 / WHAT-IF ENGINE</Eyebrow><h2>Scenario playground</h2><p>Move the environment through the decision pipeline before real data arrives.</p></div><span className="live-chip"><StatusDot /> LOCAL SIMULATION</span></div><div className="scenario-buttons">{(Object.keys(scenarios) as ScenarioKey[]).map((key) => <button key={key} onClick={() => onApply(key)}><span>{scenarios[key].label}</span><small>{scenarios[key].detail}</small></button>)}</div><div className="sliders">{fields.map(([key, label, unit, max]) => <label key={key}><span>{label}<b>{custom[key]}{unit}</b></span><input type="range" min="0" max={max} value={custom[key]} onChange={(event) => setCustom((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div></section>;
}

function BackendDrawer({ open, onClose, state }: { open: boolean; onClose: () => void; state: DashboardState }) {
  const payload = useMemo(() => ({ weather_snapshot: state.weather, sensor_reading: state.sensors, decision: state.decision }), [state]);
  return <><button className="backend-trigger" onClick={onClose}>{open ? "× CLOSE CONTRACT MAP" : "⌘ VIEW BACKEND CONTRACTS"}</button>{open && <div className="drawer-backdrop" onClick={onClose}><aside className="drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><Eyebrow>06 / DEVELOPER SURFACE</Eyebrow><h2>Backend contract map</h2><p>Phase 1 mocks the seams. Later phases replace each adapter behind the same shapes.</p></div><button onClick={onClose}>×</button></div><div className="endpoint-list">{backendEndpoints.map((endpoint) => <div className="endpoint" key={`${endpoint.method}-${endpoint.path}`}><span className={`method ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span><code>{endpoint.path}</code><small>{endpoint.purpose}</small><em>{endpoint.status}</em></div>)}</div><div className="payload"><div className="payload-title"><span>LIVE MOCK PAYLOAD</span><span>JSON</span></div><pre>{JSON.stringify(payload, null, 2)}</pre></div></aside></div>}</>;
}

export default function App() {
  const [simulation, setSimulation] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [scenario, setScenario] = useState<ScenarioKey>("drought");
  const [state, setState] = useState<DashboardState>({ weather: baseWeather, sensors: baseSensors, decision: evaluate(baseWeather, baseSensors), telemetryStale: false, emergencyStop: false });
  const applyScenario = (key: ScenarioKey) => { const item = scenarios[key]; const weather = { ...baseWeather, "rain_probability_%": item.weather, observed_at: new Date().toISOString() }; const sensors = { ...baseSensors, "temperature_C": item.temp, "humidity_%": item.humidity, "soil_moisture_%": item.soil }; const stale = key === "stale"; setScenario(key); setEmergencyStop(false); setState({ weather, sensors, decision: evaluate(weather, sensors, stale), telemetryStale: stale, emergencyStop: false }); };
  const toggleStop = () => { const next = !emergencyStop; setEmergencyStop(next); setState((current) => ({ ...current, emergencyStop: next, decision: evaluate(current.weather, current.sensors, current.telemetryStale, next) })); };
  return <div className="app-shell"><Header simulation={simulation} onSimulation={() => setSimulation((value) => !value)} /><main><div className="hero-row"><div><Eyebrow>FIELD OPERATIONS / NODE 01</Eyebrow><h1>Should we irrigate <span>now?</span></h1><p>Hydro-Wise separates weather intelligence from sensor-based ML to make a safer water decision.</p></div><div className="hero-meta"><span>LAST DECISION</span><strong>{new Date(state.decision.decided_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><small>Auto-refresh · 10 sec</small></div></div><Pipeline decision={state.decision} stale={state.telemetryStale} /><div className="decision-strip"><div className={`decision-icon ${state.decision.recommendation === "IRRIGATE" ? "irrigate" : "wait"}`}>{state.decision.recommendation === "IRRIGATE" ? "↗" : "⊘"}</div><div><Eyebrow>FINAL RECOMMENDATION</Eyebrow><h2>{state.decision.recommendation.replaceAll("_", " ")}</h2><p>{state.decision.weather_gate.passed ? "Weather gate passed; recommendation is based on the three sensor features." : "Significant rain is expected; the weather gate stopped the flow before ML."}</p></div><div className="decision-context"><span>ACTIVE SCENARIO</span><strong>{scenarios[scenario].label}</strong><small>Decision-support mode only</small></div></div><div className="cards-grid"><WeatherCard weather={state.weather} decision={state.decision} /><SensorCard sensors={state.sensors} stale={state.telemetryStale} /><MLCard decision={state.decision} sensors={state.sensors} /><SafetyCard decision={state.decision} emergencyStop={emergencyStop} onStop={toggleStop} /></div><Playground state={state} onApply={applyScenario} /></main><BackendDrawer open={drawerOpen} onClose={() => setDrawerOpen((value) => !value)} state={state} /></div>;
}
