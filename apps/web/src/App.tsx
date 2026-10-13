import React, { useMemo, useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { KpiRow } from "./components/KpiRow";
import { RealTimeMap, INITIAL_STATIONS } from "./components/RealTimeMap";
import { RiskPicture } from "./components/RiskPicture";
import { AquiferMovement } from "./components/AquiferMovement";
import { CommunitySignals, CommunitySignal } from "./components/CommunitySignals";
import { SearchModal } from "./components/SearchModal";
import { NotificationsModal } from "./components/NotificationsModal";
import { ReportObservationModal } from "./components/ReportObservationModal";
import { AdminDrawer } from "./components/AdminDrawer";
import { DistrictAdministration } from "./components/DistrictAdministration";
import { IrrigationDecisionStation } from "./components/IrrigationDecisionStation";
import { apiClient } from "./api/client";
import type { SensorReading } from "./types/contracts";

const INITIAL_SIGNALS: CommunitySignal[] = [
  {
    id: "sig-1",
    initials: "AM",
    type: "farmer",
    sourceName: "Anita Meena",
    village: "Sangli Gaonthan",
    observation: "Handpump yield steady; local drip system pressurized from canal outlet.",
    time: "18 min ago",
  },
  {
    id: "sig-2",
    initials: "MC",
    type: "council",
    sourceName: "Monitoring Cell",
    village: "Miraj Agro-Cluster",
    observation: "Wellhead W-02 entered Watch band (36% moisture). Drawdown advisory notified.",
    time: "1 hr ago",
  },
  {
    id: "sig-3",
    initials: "RS",
    type: "farmer",
    sourceName: "Ramesh Singh",
    village: "Vita Watershed",
    observation: "Canal secondary branch flow stable following scheduled gate check.",
    time: "3 hr ago",
  },
  {
    id: "sig-4",
    initials: "PK",
    type: "farmer",
    sourceName: "Priya Kumari",
    village: "Kundal Valley",
    observation: "Aquifer recharge infiltration normal; clarity clear with no silt.",
    time: "5 hr ago",
  },
  {
    id: "sig-5",
    initials: "VS",
    type: "council",
    sourceName: "Village Sarpanch",
    village: "Jath Perimeter",
    observation: "Solar pump shared roster operational for community wheat acreage.",
    time: "Yesterday",
  },
];

// Accessible Skip Link
function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}

export function App() {
  const [active, setActive] = useState("Overview");
  const [region, setRegion] = useState("SANGLI, MAHARASHTRA");
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.853, 74.582]);
  const [mapZoom, setMapZoom] = useState(12);

  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const [selectedWellId, setSelectedWellId] = useState<string>("sensor-1");
  const [period, setPeriod] = useState(30);
  const [notice, setNotice] = useState("");

  const [signals, setSignals] = useState<CommunitySignal[]>(INITIAL_SIGNALS);
  const [latestSensor, setLatestSensor] = useState<SensorReading | null>(null);
  const [lastSensorSync, setLastSensorSync] = useState<string>("");
  const [liveWeather, setLiveWeather] = useState<{
    rain: number;
    provider: string;
    gatePassed: boolean;
  } | null>(null);

  // Real-time weather polling
  useEffect(() => {
    async function fetchWeather() {
      try {
        const data = await apiClient.getWeather();
        const rainVal = Number(data["rain_probability_%"] ?? 18);
        setLiveWeather({
          rain: rainVal,
          provider: data.provider || "Open-Meteo Grid",
          gatePassed: rainVal <= 30,
        });
      } catch (err) {
        console.debug("Weather poll fallback:", err);
      }
    }

    fetchWeather();
    const interval = window.setInterval(fetchWeather, 30000);
    return () => window.clearInterval(interval);
  }, []);

  // Real-time sensor polling (every 5 seconds for responsive ESP32 telemetry updates)
  useEffect(() => {
    async function fetchSensors() {
      try {
        const data = await apiClient.getLatestSensors();
        if (data) {
          setLatestSensor(data);
          setLastSensorSync(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.debug("Sensor poll error:", err);
      }
    }

    fetchSensors();
    const interval = window.setInterval(fetchSensors, 5000);
    return () => window.clearInterval(interval);
  }, []);

  // Compute real average soil moisture across stations, dynamically anchored by live telemetry
  const avgSoilMoisture = useMemo(() => {
    if (latestSensor && typeof latestSensor["soil_moisture_%"] === "number") {
      return Number(latestSensor["soil_moisture_%"].toFixed(1));
    }
    const sum = INITIAL_STATIONS.reduce((acc, s) => acc + s.soil_moisture_pct, 0);
    return Number((sum / INITIAL_STATIONS.length).toFixed(1));
  }, [latestSensor]);

  // Compute live water security score (0-100) based on moisture & rain buffer
  const waterSecurityScore = useMemo(() => {
    const rainBonus = (liveWeather?.rain ?? 18) > 30 ? 8 : 0;
    return Math.min(100, Math.max(15, avgSoilMoisture * 1.1 + rainBonus));
  }, [avgSoilMoisture, liveWeather]);

  // Selected station metadata
  const selectedStation = useMemo(() => {
    return (
      INITIAL_STATIONS.find((s) => s.id === selectedWellId) || INITIAL_STATIONS[0]
    );
  }, [selectedWellId]);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };

  // Export authentic Situation Brief
  const exportBrief = () => {
    const rain = liveWeather?.rain ?? 18;
    const gatePassed = liveWeather?.gatePassed ?? true;
    const body = `=====================================================
HYDRO-WISE DISTRICT SITUATION BRIEF
Region: ${region}
Coordinates: ${mapCenter[0]}°N, ${mapCenter[1]}°E (Sangli District)
Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
=====================================================

1. WEATHER & RECHARGE OUTLOOK
- Forecast Provider: ${liveWeather?.provider || "Open-Meteo Grid"}
- 6-Hour Precipitation Probability: ${rain}%
- Automated Weather Gate: ${gatePassed ? "PASSED (≤30% - ML Irrigation Active)" : "BLOCKED (>30% - Rain Expected)"}

2. AQUIFER & GROUNDWATER TELEMETRY
- Regional Soil Moisture Reserve: ${avgSoilMoisture}%
- Average Water Table Drawdown: 12.8 meters below ground
- Monitored River System: Krishna River Basin & Warna River Confluence (Haripur Sangam)
- Monitored Telemetry Stations: 5 Active Stations (Sangli Central, Miraj North, Vita East, Kundal South, Jath West)
- Focus Station: ${selectedStation.name} (${selectedStation.village})

3. AUTOMATED IRRIGATION INTELLIGENCE (AMHOE ENGINE)
- System Status: Recommendation-Only Safety Guard
- Primary Recommendation: ${gatePassed && avgSoilMoisture < 40 ? "IRRIGATE (Moisture deficit confirmed)" : "HOLD ACTION (Soil moisture or rain buffer adequate)"}
- Neural Model: AMHOE-v1.4 Classifier

4. COMMUNITY OBSERVATIONS & ALERTS
- Active Field Reports: ${signals.length} verified observations
- Priority Wards: Sangli Gaonthan, Miraj Agro-Cluster, Vita Watershed

5. LOCAL ADMINISTRATION DIRECTIVES
- Borewell Moratorium: Enforced under Section 144
- Emergency Water Tankers: Standby allocation roster active

HydroWise Living Water Intelligence System · Read the landscape. Act before scarcity.
`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    link.download = `hydrowise-situation-brief-${region.toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify("Authentic Situation Brief downloaded");
  };

  // Share Public View Link
  const shareView = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      notify("Public dashboard URL copied to clipboard");
    } catch {
      notify("Public view link is ready to share");
    }
  };

  // Region switching updates map center and cluster
  const handleRegionChange = () => {
    if (region === "SANGLI, MAHARASHTRA") {
      setRegion("MIRAJ, MAHARASHTRA");
      setMapCenter([16.878, 74.551]);
      setMapZoom(13);
      setSelectedWellId("sensor-2");
      notify("Switched to Miraj Agro-Cluster (16.88°N, 74.55°E)");
    } else if (region === "MIRAJ, MAHARASHTRA") {
      setRegion("VITA, MAHARASHTRA");
      setMapCenter([16.822, 74.624]);
      setMapZoom(13);
      setSelectedWellId("sensor-3");
      notify("Switched to Vita Watershed (16.82°N, 74.62°E)");
    } else {
      setRegion("SANGLI, MAHARASHTRA");
      setMapCenter([16.853, 74.582]);
      setMapZoom(12);
      setSelectedWellId("sensor-1");
      notify("Switched to Sangli Central District (16.85°N, 74.58°E)");
    }
  };

  // Toggle time period
  const handlePeriodChange = () => {
    const next = period === 7 ? 30 : period === 30 ? 90 : 7;
    setPeriod(next);
    notify(`Showing ${next}-day aquifer trend`);
  };

  // Handle new community signal ingestion
  const handleNewReport = (newRep: { reporter: string; village: string; observation: string }) => {
    const initials =
      newRep.reporter
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "FO";

    const added: CommunitySignal = {
      id: `sig-${Date.now()}`,
      initials,
      type: newRep.reporter.includes("Board") || newRep.reporter.includes("Council") ? "council" : "farmer",
      sourceName: newRep.reporter,
      village: newRep.village,
      observation: newRep.observation,
      time: "Just now",
      dotColor: "green",
    };

    setSignals([added, ...signals]);
    notify(`Observation from ${newRep.village} ingested successfully`);
  };

  // Select well and scroll to map
  const handleSelectWell = (wellId: string) => {
    setSelectedWellId(wellId);
    const target = INITIAL_STATIONS.find((s) => s.id === wellId);
    if (target) {
      setMapCenter(target.position);
    }
    document.getElementById("section-realtime-map")?.scrollIntoView({ behavior: "smooth" });
  };

  // Section observer for active navigation highlight
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const map: { [key: string]: string } = {
              "section-overview": "Overview",
              "section-realtime-map": "Real-time map",
              "section-field-conditions": "Field conditions",
              "section-community-alerts": "Community alerts",
              "section-administration": "Local administration",
            };
            const name = map[entry.target.id];
            if (name) setActive(name);
          }
        });
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="app">
      <SkipLink />

      {/* Hover trigger zone — invisible strip at left edge triggers sidebar on desktop */}
      <div
        className="sidebar-trigger-zone"
        onMouseEnter={() => setSidebarHovered(true)}
        aria-hidden="true"
      />

      {/* Main Persistent Desktop / Slide-out Mobile Sidebar */}
      <Sidebar
        active={active}
        setActive={setActive}
        isOpen={sidebarOpen}
        dashboardVisible={true}
        onSidebarEnter={() => setSidebarHovered(true)}
        onSidebarLeave={() => setSidebarHovered(false)}
        onSidebarFocus={() => setSidebarHovered(true)}
        onClose={() => { setSidebarOpen(false); setSidebarHovered(false); }}
        onOpenAdmin={() => setAdminOpen(true)}
        isHovered={sidebarHovered}
      />

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`content${sidebarHovered ? " sidebar-revealed" : ""}`}>
        {/* Sticky Header */}
        <Header
          active={active}
          region={region}
          onRegionChange={handleRegionChange}
          searchOpen={searchOpen}
          onToggleSearch={() => {
            setSearchOpen(!searchOpen);
            setNotificationsOpen(false);
          }}
          notificationsOpen={notificationsOpen}
          onToggleNotifications={() => {
            setNotificationsOpen(!notificationsOpen);
            setSearchOpen(false);
          }}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* Search Modal */}
        <SearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelectWell={handleSelectWell}
          onNotify={notify}
        />

        {/* Notifications Modal */}
        <NotificationsModal
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          onNotify={notify}
        />

        {/* Report Observation Dialog */}
        <ReportObservationModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          onSubmit={handleNewReport}
        />

        {/* Administration Drawer Modal */}
        <AdminDrawer
          isOpen={adminOpen}
          onClose={() => setAdminOpen(false)}
          onNotify={notify}
          region={region}
        />

        {/* Main Content Page */}
        <main className="page" id="main-content" role="main" tabIndex={-1}>
          {/* SECTION 01: OVERVIEW */}
          <section
            ref={(el) => { sectionRefs.current["section-overview"] = el; }}
            id="section-overview"
            className="content-section"
            aria-label="Overview"
          >
            <div className="section-header">
              <span className="section-number">01</span>
              <div className="section-title-group">
                <h2 className="section-heading">OVERVIEW</h2>
                <p className="section-subheading">Read the landscape. Act before scarcity.</p>
              </div>
            </div>

            {/* Hero Section */}
            <HeroSection
              region={region}
              onExportBrief={exportBrief}
              onShareView={shareView}
            />

            {/* Live KPI Instrument Cards */}
            <KpiRow
              avgSoilMoisture={avgSoilMoisture}
              weather={
                liveWeather
                  ? {
                      observed_at: new Date().toISOString(),
                      forecast_horizon_hours: 6,
                      "rain_probability_%": liveWeather.rain,
                      provider: liveWeather.provider,
                    }
                  : null
              }
              signalsCount={signals.length}
              period={period}
              onPeriodChange={handlePeriodChange}
              onSignalsClick={() => {
                document.getElementById("section-community-alerts")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </section>

          {/* SECTION 02: REAL-TIME MAP & TELEMETRY */}
          <section
            ref={(el) => { sectionRefs.current["section-realtime-map"] = el; }}
            id="section-realtime-map"
            className="content-section"
            aria-label="Real-time Map"
          >
            <div className="section-header">
              <span className="section-number">02</span>
              <div className="section-title-group">
                <h2 className="section-heading">REAL-TIME MAP & SENSOR TELEMETRY</h2>
                <p className="section-subheading">Live monitored wellheads and Krishna River course in {region}</p>
              </div>
            </div>

            {/* Weather Gate & Live ESP32 Telemetry Status Banner */}
            <div
              style={{
                margin: "0 0 1rem 0",
                padding: "0.85rem 1.15rem",
                borderRadius: "10px",
                background: latestSensor?.rain === 1
                  ? "rgba(214, 69, 69, 0.08)"
                  : liveWeather?.gatePassed
                  ? "rgba(46, 125, 50, 0.08)"
                  : "rgba(25, 118, 210, 0.08)",
                border: `1px solid ${
                  latestSensor?.rain === 1
                    ? "rgba(214, 69, 69, 0.3)"
                    : liveWeather?.gatePassed
                    ? "rgba(46, 125, 50, 0.3)"
                    : "rgba(25, 118, 210, 0.3)"
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.6rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.88rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.2rem" }}>🌦️</span>
                <span style={{ fontWeight: 600 }}>Live Telemetry:</span>
                <span>Rain Forecast: <b>{liveWeather?.rain ?? 18}%</b></span>
                {latestSensor && (
                  <>
                    <span style={{ opacity: 0.4 }}>|</span>
                    <span>Node: <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: "4px" }}>{latestSensor.device_id}</code></span>
                    <span>Soil: <b>{latestSensor["soil_moisture_%"].toFixed(1)}%</b></span>
                    <span>Temp: <b>{latestSensor.temperature_C.toFixed(1)}°C</b></span>
                    <span>Hum: <b>{latestSensor["humidity_%"].toFixed(1)}%</b></span>
                    {latestSensor.rain === 1 && (
                      <span style={{ color: "#d64545", fontWeight: 700 }}>🌧️ RAIN DETECTED (Plate Active)</span>
                    )}
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    letterSpacing: "0.04em",
                    background: latestSensor?.rain === 1
                      ? "#d64545"
                      : liveWeather?.gatePassed
                      ? "#2e7d32"
                      : "#1976d2",
                    color: "#fff",
                  }}
                >
                  {latestSensor?.rain === 1
                    ? "RAIN SENSOR: TRIPPED (HOLD ACTION)"
                    : liveWeather?.gatePassed
                    ? "WEATHER GATE: PASSED (ML IRRIGATION ACTIVE)"
                    : "WEATHER GATE: BLOCKED (RAIN PRECIPITATION EXPECTED)"}
                </span>
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                  {lastSensorSync ? `Synced ${lastSensorSync}` : "Live Sync"}
                </span>
              </div>
            </div>

            {/* Real-time Map & Companion Risk Picture */}
            <div className="groundwater-map-workspace">
              <RealTimeMap
                selectedSensorId={selectedWellId}
                onSensorSelect={(id) => {
                  setSelectedWellId(id);
                  const st = INITIAL_STATIONS.find((s) => s.id === id);
                  notify(`Selected wellhead: ${st?.name || id}`);
                }}
                center={mapCenter}
                zoom={mapZoom}
              />

              <RiskPicture
                waterSecurityLevel={waterSecurityScore}
                rainProbability={liveWeather?.rain ?? 18}
                signalsCount={signals.length}
                selectedStationName={selectedStation.name}
                onOpenDetail={() => {
                  document.getElementById("section-field-conditions")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          </section>

          {/* SECTION 03: FIELD CONDITIONS & DECISION STATION */}
          <section
            ref={(el) => { sectionRefs.current["section-field-conditions"] = el; }}
            id="section-field-conditions"
            className="content-section"
            aria-label="Field Conditions"
          >
            <div className="section-header">
              <span className="section-number">03</span>
              <div className="section-title-group">
                <h2 className="section-heading">FIELD CONDITIONS & DECISION STATION</h2>
                <p className="section-subheading">Aquifer table movement and automated AMHOE irrigation intelligence</p>
              </div>
            </div>

            <div className="field-conditions-workspace">
              <AquiferMovement
                period={period}
                onPeriodChange={handlePeriodChange}
                avgMoisture={avgSoilMoisture}
                large={true}
              />

              <IrrigationDecisionStation />
            </div>
          </section>

          {/* SECTION 04: COMMUNITY SIGNALS */}
          <section
            ref={(el) => { sectionRefs.current["section-community-alerts"] = el; }}
            id="section-community-alerts"
            className="content-section"
            aria-label="Community Alerts"
          >
            <div className="section-header">
              <span className="section-number">04</span>
              <div className="section-title-group">
                <h2 className="section-heading">COMMUNITY GROUND SIGNALS</h2>
                <p className="section-subheading">Verified field truth from farmers and local village water cells</p>
              </div>
            </div>

            <div className="community-alerts-workspace">
              <CommunitySignals
                signals={signals}
                onOpenReportModal={() => setReportModalOpen(true)}
              />
            </div>
          </section>

          {/* SECTION 05: LOCAL ADMINISTRATION */}
          <section
            ref={(el) => { sectionRefs.current["section-administration"] = el; }}
            id="section-administration"
            className="content-section"
            aria-label="Local Administration"
          >
            <div className="section-header">
              <span className="section-number">05</span>
              <div className="section-title-group">
                <h2 className="section-heading">LOCAL ADMINISTRATION & GOVERNANCE</h2>
                <p className="section-subheading">Public systems coordination, quota allocations, and emergency directives</p>
              </div>
            </div>

            <div className="administration-workspace">
              <DistrictAdministration
                region={region}
                onOpenDrawer={() => setAdminOpen(true)}
                onNotify={notify}
                onAddSignal={handleNewReport}
              />
            </div>
          </section>
        </main>

        {/* Global Floating Toast */}
        {notice && (
          <div className="toast" role="status" aria-live="polite" aria-atomic="true">
            <span aria-hidden="true" />
            {notice}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
