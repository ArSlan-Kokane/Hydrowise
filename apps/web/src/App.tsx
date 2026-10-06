import React, { useMemo, useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { KpiRow } from "./components/KpiRow";
import { GroundwaterMap, WellData } from "./components/GroundwaterMap";
import { RiskPicture } from "./components/RiskPicture";
import { AquiferMovement } from "./components/AquiferMovement";
import { CommunitySignals, CommunitySignal } from "./components/CommunitySignals";
import { ScenarioBar, ScenarioKey } from "./components/ScenarioBar";
import { SearchModal } from "./components/SearchModal";
import { NotificationsModal } from "./components/NotificationsModal";
import { ReportObservationModal } from "./components/ReportObservationModal";
import { AdminDrawer } from "./components/AdminDrawer";
import { Icon } from "./components/Icons";

const initialScenarios = {
  normal: { label: "Current conditions", rain: 18, level: 61, risk: "Watch", note: "Water demand is rising in the western fields." },
  heat: { label: "Heatwave week", rain: 4, level: 43, risk: "High", note: "Evaporation pressure is spreading across the block." },
  rain: { label: "Monsoon arrival", rain: 72, level: 68, risk: "Moderate", note: "Recharge potential is improving, but runoff is uneven." },
  stress: { label: "Extraction stress", rain: 9, level: 27, risk: "Critical", note: "Well drawdown and crop demand are converging." },
} as const;

const initialWells: WellData[] = [
  { id: "W-014", x: 27, y: 34, level: "Good", value: "8.4 m", color: "good", village: "Bhairavpur", population: "2,400", usage: "Drinking + Irrigation" },
  { id: "W-022", x: 46, y: 27, level: "Watch", value: "11.8 m", color: "watch", village: "Khera", population: "1,800", usage: "Irrigation" },
  { id: "W-031", x: 61, y: 51, level: "Stressed", value: "16.2 m", color: "risk", village: "South Ward", population: "3,200", usage: "Drinking + Industry" },
  { id: "W-044", x: 76, y: 38, level: "Good", value: "9.1 m", color: "good", village: "Chandpura", population: "1,600", usage: "Drinking" },
  { id: "W-057", x: 72, y: 73, level: "Watch", value: "13.6 m", color: "watch", village: "Rampur", population: "2,100", usage: "Irrigation" },
  { id: "W-068", x: 34, y: 72, level: "Good", value: "7.9 m", color: "good", village: "Sultanpur", population: "1,900", usage: "Drinking + Irrigation" },
];

const initialSignals: CommunitySignal[] = [
  {
    id: "sig-1",
    initials: "AM",
    type: "farmer",
    sourceName: "Anita Meena",
    village: "Bhairavpur",
    observation: "Handpump yield has reduced since Monday",
    time: "18 min",
  },
  {
    id: "sig-2",
    initials: "MC",
    type: "council",
    sourceName: "Monitoring cell",
    village: "South ward",
    observation: "Well W-031 crossed the watch threshold",
    time: "2 hr",
  },
  {
    id: "sig-3",
    initials: "RS",
    type: "farmer",
    sourceName: "Ramesh Singh",
    village: "Khera",
    observation: "Canal flow is normal after maintenance",
    time: "Yesterday",
  },
  {
    id: "sig-4",
    initials: "PK",
    type: "farmer",
    sourceName: "Priya Kumari",
    village: "Chandpura",
    observation: "Water quality is clear, no sediment observed",
    time: "3 hr",
  },
  {
    id: "sig-5",
    initials: "VS",
    type: "council",
    sourceName: "Village Sarpanch",
    village: "Sultanpur",
    observation: "Community well renovation completed successfully",
    time: "5 hr",
  },
  {
    id: "sig-6",
    initials: "BJ",
    type: "farmer",
    sourceName: "Bijendra",
    village: "Rampur",
    observation: "Irrigation demand increasing for wheat crop",
    time: "Yesterday",
  },
];

// Skip link component for keyboard accessibility
function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}

export function App() {
  const [active, setActive] = useState("Overview");
  const [scenario, setScenario] = useState<ScenarioKey>("normal");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);

  const [mapZoom, setMapZoom] = useState(1);
  const [layers, setLayers] = useState(true);
  const [satellite, setSatellite] = useState(false);
  const [period, setPeriod] = useState(30);
  const [notice, setNotice] = useState("");
  const [region, setRegion] = useState("KALYANPUR BLOCK");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [signals, setSignals] = useState<CommunitySignal[]>(initialSignals);

  const current = initialScenarios[scenario];

  const riskText = useMemo(() => {
    if (current.risk === "Critical") return "Multiple pressure signals need attention";
    if (current.risk === "High") return "Demand is outpacing natural recharge";
    return "Conditions are stable, with local variation";
  }, [current.risk]);

  // IntersectionObserver for scroll-based active section detection
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            const sectionName = sectionIdToName(sectionId);
            if (sectionName) {
              setActive(sectionName);
            }
          }
        });
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    Object.values(sectionRefs.current).forEach((section) => {
      if (section) observerRef.current?.observe(section);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const sectionIdToName = (id: string): string | null => {
    const mapping: { [key: string]: string } = {
      "section-overview": "Overview",
      "section-groundwater": "Groundwater map",
      "section-field-conditions": "Field conditions",
      "section-community-alerts": "Community alerts",
      "section-administration": "Local administration",
    };
    return mapping[id] || null;
  };

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const exportBrief = () => {
    const body = `HydroWise situation brief\nRegion: ${region}\nScenario: ${current.label}\nGroundwater reserve: ${current.level}/100\nRisk: ${current.risk}\nRain outlook: ${current.rain}%\nGenerated: ${new Date().toISOString()}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    link.download = `hydrowise-situation-brief-${region.toLowerCase().replace(/\s+/g, "-")}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify("Situation brief downloaded");
  };

  const shareView = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      notify("Public view link copied to clipboard");
    } catch {
      notify("Public view is ready to share");
    }
  };

  const handleRegionChange = () => {
    const next =
      region === "KALYANPUR BLOCK"
        ? "SOUTH WARD"
        : region === "SOUTH WARD"
        ? "BHAVANIPUR BLOCK"
        : "KALYANPUR BLOCK";
    setRegion(next);
    notify(`Region changed to ${next}`);
  };

  const handleZoom = (delta: number) => {
    setMapZoom((val) => Math.min(1.55, Math.max(0.82, Number((val + delta).toFixed(2)))));
  };

  const handleLayersToggle = () => {
    setLayers((prev) => {
      notify(!prev ? "Field and well layers shown" : "Field and well layers hidden");
      return !prev;
    });
  };

  const handleSatelliteToggle = () => {
    setSatellite((prev) => {
      notify(!prev ? "Satellite multi-spectral view enabled" : "Tactical terrain view restored");
      return !prev;
    });
  };

  const handlePeriodChange = () => {
    const next = period === 7 ? 30 : period === 30 ? 90 : 7;
    setPeriod(next);
    notify(`Showing ${next}-day aquifer movement`);
  };

  const handleNewReport = (newRep: { reporter: string; village: string; observation: string }) => {
    const initials = newRep.reporter
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FO";

    const added: CommunitySignal = {
      id: `sig-${Date.now()}`,
      initials,
      type: "farmer",
      sourceName: newRep.reporter,
      village: newRep.village,
      observation: newRep.observation,
      time: "Just now",
    };

    setSignals([added, ...signals]);
    notify(`Observation from ${newRep.village} ingested`);
  };

  const handleSelectWell = (wellId: string) => {
    setSelectedWellId(wellId);
    document.getElementById("section-groundwater")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="app">
      <SkipLink />

      {/* Main Sidebar */}
      <Sidebar
        active={active}
        setActive={setActive}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="content">
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

        {/* Local Administration Drawer */}
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
            ref={(el) => (sectionRefs.current["section-overview"] = el)}
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

            {/* 4 Instrument KPI Cards */}
            <KpiRow current={current} />

            {/* Compact Risk Preview */}
            <div className="compact-risk-preview">
              <RiskPicture
                current={current}
                riskText={riskText}
                onOpenDetail={() => {
                  document.getElementById("section-groundwater")?.scrollIntoView({ behavior: "smooth" });
                  notify("Scrolling to detailed groundwater analysis");
                }}
              />
            </div>

            {/* Scroll indicator */}
            <div className="scroll-indicator">
              <span>Detailed intelligence below</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </section>

          {/* SECTION 02: GROUNDWATER MAP */}
          <section
            ref={(el) => (sectionRefs.current["section-groundwater"] = el)}
            id="section-groundwater"
            className="content-section"
            aria-label="Groundwater Map"
          >
            <div className="section-header">
              <span className="section-number">02</span>
              <div className="section-title-group">
                <h2 className="section-heading">GROUNDWATER MAP</h2>
                <p className="section-subheading">What is happening beneath us?</p>
              </div>
            </div>

            <div className="groundwater-map-workspace">
              <GroundwaterMap
                wells={initialWells}
                scenario={scenario}
                zoom={mapZoom}
                satellite={satellite}
                layers={layers}
                onZoom={handleZoom}
                onLayersToggle={handleLayersToggle}
                onSatelliteToggle={handleSatelliteToggle}
                selectedWellId={selectedWellId}
                onSelectWell={setSelectedWellId}
              />

              <RiskPicture
                current={current}
                riskText={riskText}
                onOpenDetail={() =>
                  notify("Aquifer detail telemetry synchronized with district workspace")
                }
              />
            </div>
          </section>

          {/* SECTION 03: FIELD CONDITIONS */}
          <section
            ref={(el) => (sectionRefs.current["section-field-conditions"] = el)}
            id="section-field-conditions"
            className="content-section"
            aria-label="Field Conditions"
          >
            <div className="section-header">
              <span className="section-number">03</span>
              <div className="section-title-group">
                <h2 className="section-heading">FIELD CONDITIONS</h2>
                <p className="section-subheading">The water table is a story, not a number.</p>
              </div>
            </div>

            <div className="field-conditions-workspace">
              <AquiferMovement
                period={period}
                scenario={scenario}
                onPeriodChange={handlePeriodChange}
                large={true}
              />

              <ScenarioBar
                scenarios={initialScenarios}
                currentScenario={scenario}
                onSelectScenario={(newScen) => {
                  setScenario(newScen);
                  notify(`Switched to "${initialScenarios[newScen].label}" scenario`);
                }}
              />
            </div>
          </section>

          {/* SECTION 04: COMMUNITY ALERTS */}
          <section
            ref={(el) => (sectionRefs.current["section-community-alerts"] = el)}
            id="section-community-alerts"
            className="content-section"
            aria-label="Community Alerts"
          >
            <div className="section-header">
              <span className="section-number">04</span>
              <div className="section-title-group">
                <h2 className="section-heading">COMMUNITY SIGNALS</h2>
                <p className="section-subheading">People on the ground.</p>
              </div>
            </div>

            <div className="community-alerts-workspace">
              <CommunitySignals
                signals={signals}
                onViewAll={() => {
                  notify("Already viewing all community signals");
                }}
                onOpenReportModal={() => setReportModalOpen(true)}
              />
            </div>
          </section>

          {/* SECTION 05: LOCAL ADMINISTRATION */}
          <section
            ref={(el) => (sectionRefs.current["section-administration"] = el)}
            id="section-administration"
            className="content-section"
            aria-label="Local Administration"
          >
            <div className="section-header">
              <span className="section-number">05</span>
              <div className="section-title-group">
                <h2 className="section-heading">LOCAL ADMINISTRATION</h2>
                <p className="section-subheading">Coordinate the response.</p>
              </div>
            </div>

            <div className="administration-workspace">
              <button
                className="open-admin-panel-btn"
                onClick={() => setAdminOpen(true)}
              >
                <Icon name="council" />
                <span>Open Administration Panel</span>
                <Icon name="chevron" />
              </button>
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
