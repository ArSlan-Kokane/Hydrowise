# Graph Report - Hydrowise  (2026-10-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 487 nodes · 1038 edges · 29 communities (15 shown, 14 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.94)
- Token cost: 21,144 input · 1,917 output

## Graph Freshness
- Built from commit: `89af8361`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Telemetry Data Models
- React Frontend Application
- FastAPI Entry Point
- ML Adapter Layer
- Dataset Generation Tool
- SQLite Storage Layer
- Web Package Configuration
- Decision Engine Core
- Arduino Device Firmware
- TypeScript Configuration
- Weather Gate Logic
- Application Settings
- Weather Provider Adapters
- API Package Scripts
- PostgreSQL Storage Layer
- TypeScript API Client
- ML Inference Engine
- Open-Meteo Weather API
- Mock Weather Provider
- Keep-Alive Script
- hydrowise-api Package
- hydrowise-ml Package

## God Nodes (most connected - your core abstractions)
1. `Settings` - 63 edges
2. `SensorReading` - 51 edges
3. `WeatherSnapshot` - 34 edges
4. `Icon()` - 27 edges
5. `DecisionEngine` - 20 edges
6. `SqliteTelemetryStore` - 19 edges
7. `App()` - 19 edges
8. `react` - 18 edges
9. `TelemetryStore` - 15 edges
10. `MLResult` - 15 edges

## Surprising Connections (you probably didn't know these)
- `IngestionResult` --uses--> `SensorReading`  [INFERRED]
  services/api/app/ingestion/telemetry.py → services/api/app/models/schemas.py
- `IngestionService` --uses--> `Settings`  [INFERRED]
  services/api/app/ingestion/telemetry.py → services/api/app/config.py
- `IngestionService` --uses--> `SensorReading`  [INFERRED]
  services/api/app/ingestion/telemetry.py → services/api/app/models/schemas.py
- `TelemetryStore` --uses--> `SensorReading`  [INFERRED]
  services/api/app/ingestion/telemetry.py → services/api/app/models/schemas.py
- `DecisionEngine` --uses--> `IrrigationDecision`  [INFERRED]
  services/api/app/decision/engine.py → services/api/app/models/schemas.py

## Import Cycles
- None detected.

## Communities (29 total, 14 thin omitted)

### Community 0 - "Telemetry Data Models"
Cohesion: 0.05
Nodes (22): apply_safety(), device_secret_dep(), IngestionResult, IngestionService, IngestionStatus, TelemetryStore, evaluate(), history() (+14 more)

### Community 1 - "React Frontend Application"
Cohesion: 0.08
Nodes (42): App(), initialScenarios, initialSignals, initialWells, SkipLink(), AdminDrawer(), AdminDrawerProps, AquiferMovement() (+34 more)

### Community 2 - "FastAPI Entry Point"
Cohesion: 0.06
Nodes (16): create_app(), _lifespan(), api_client(), base_settings(), boundary_30_snapshot(), boundary_31_snapshot(), dry_sensor_reading(), high_rain_snapshot() (+8 more)

### Community 3 - "ML Adapter Layer"
Cohesion: 0.10
Nodes (11): get_ml_adapter(), MLAdapter, MockMLAdapter, ProprietaryMLAdapter, SklearnMLAdapter, MLResult, SensorReading, test_ml_adapter_factory_routing() (+3 more)

### Community 4 - "Dataset Generation Tool"
Cohesion: 0.09
Nodes (10): generate_dataset(), extract_features(), load_dataset(), sigmoid(), train_model(), main(), ping_server(), generate_reading() (+2 more)

### Community 5 - "SQLite Storage Layer"
Cohesion: 0.14
Nodes (7): SqliteTelemetryStore, _build_engine(), test_decision_engine_fallback_when_store_empty(), test_decision_engine_gate_passes_do_not_irrigate(), test_decision_engine_gate_passes_irrigate(), test_decision_engine_pulls_latest_from_telemetry_store(), test_decision_engine_weather_gate_blocks_skipping_ml()

### Community 6 - "Web Package Configuration"
Cohesion: 0.08
Nodes (23): dependencies, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript, vite (+15 more)

### Community 7 - "Decision Engine Core"
Cohesion: 0.13
Nodes (6): get_settings(), DecisionEngine, engine_dep(), ingestion_dep(), settings_dep(), get_telemetry_store()

### Community 8 - "Arduino Device Firmware"
Cohesion: 0.18
Nodes (9): connectToWiFi(), getIso8601Time(), loop(), postReading(), readSensors(), setLedConnecting(), setLedFastBlink(), setLedSolidSuccess() (+1 more)

### Community 9 - "TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, isolatedModules, jsx, lib, module (+8 more)

### Community 10 - "Weather Gate Logic"
Cohesion: 0.21
Nodes (5): GateResult, WeatherSnapshot, _make_snapshot(), test_weather_gate_architecture_constraint_fixed_30(), test_weather_gate_threshold_boundaries()

### Community 12 - "Weather Provider Adapters"
Cohesion: 0.18
Nodes (3): get_weather_provider(), HttpWeatherProvider, WeatherProvider

### Community 13 - "API Package Scripts"
Cohesion: 0.14
Nodes (13): description, name, packageManager, private, scripts, api:dev, check, keep-alive (+5 more)

### Community 15 - "TypeScript API Client"
Cohesion: 0.23
Nodes (9): apiClient, BackendEndpointMeta, backendEndpoints, DashboardState, IrrigationDecision, Recommendation, SafetyStatus, SensorReading (+1 more)

### Community 17 - "Open-Meteo Weather API"
Cohesion: 0.29
Nodes (3): OpenMeteoWeatherProvider, test_open_meteo_fallback_on_unreachable_endpoint(), test_weather_provider_factory()

## Knowledge Gaps
- **5 isolated node(s):** `hydrowise-api`, `hydrowise-ml`, `@types/react`, `@types/react-dom`, `typescript`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 230 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Settings` connect `Application Settings` to `Telemetry Data Models`, `FastAPI Entry Point`, `ML Adapter Layer`, `SQLite Storage Layer`, `Decision Engine Core`, `Weather Gate Logic`, `Weather Provider Adapters`, `Open-Meteo Weather API`, `Mock Weather Provider`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `Settings` (e.g. with `DecisionEngine` and `GateResult`) actually correct?**
  _`Settings` has 31 INFERRED edges - model-reasoned connections that need verification._
- **What connects `hydrowise-api`, `hydrowise-ml`, `@types/react` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Telemetry Data Models` be split into smaller, more focused modules?**
  _Cohesion score 0.05300207039337474 - nodes in this community are weakly interconnected._
- **Why does `SensorReading` connect `ML Adapter Layer` to `Telemetry Data Models`, `FastAPI Entry Point`, `SQLite Storage Layer`, `Decision Engine Core`, `Weather Gate Logic`, `PostgreSQL Storage Layer`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `SensorReading` (e.g. with `DecisionEngine` and `MLAdapter`) actually correct?**
  _`SensorReading` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Should `React Frontend Application` be split into smaller, more focused modules?**
  _Cohesion score 0.08032786885245902 - nodes in this community are weakly interconnected._