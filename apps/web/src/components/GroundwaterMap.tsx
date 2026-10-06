import React, { useState, useRef, useEffect } from "react";
import { Icon } from "./Icons";

export interface WellData {
  id: string;
  x: number;
  y: number;
  level: string;
  value: string;
  color: "good" | "watch" | "risk";
  village: string;
  population: string;
  usage: string;
}

interface GroundwaterMapProps {
  wells: WellData[];
  scenario: string;
  zoom: number;
  satellite: boolean;
  layers: boolean;
  onZoom: (delta: number) => void;
  onLayersToggle: () => void;
  onSatelliteToggle: () => void;
  selectedWellId?: string | null;
  onSelectWell?: (wellId: string) => void;
}

export function GroundwaterMap({
  wells,
  scenario,
  zoom,
  satellite,
  layers,
  onZoom,
  onLayersToggle,
  onSatelliteToggle,
  selectedWellId,
  onSelectWell,
}: GroundwaterMapProps) {
  const [activeWell, setActiveWell] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [layerDropdownOpen, setLayerDropdownOpen] = useState(false);
  const [showWells, setShowWells] = useState(true);
  const [showRiver, setShowRiver] = useState(true);
  const [showStressZone, setShowStressZone] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [showVillages, setShowVillages] = useState(true);

  // Pan state for dragging the map
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const stressed = scenario === "stress" || scenario === "heat";

  // Natural River Path mapped to the topographic landscape
  const riverD =
    "M 0 195 C 60 215, 80 265, 130 255 S 200 185, 270 215 S 330 235, 400 195 S 470 140, 505 160 S 525 205, 570 180 S 640 160, 680 235 S 730 220, 760 150";

  // Reset zoom & pan when compass rose is clicked
  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    onZoom(1 - zoom);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".map-node") || (e.target as HTMLElement).closest("button")) {
      return;
    }
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Filtered wells
  const visibleWells = wells.filter((w) => {
    if (!showWells) return false;
    if (!statusFilter) return true;
    return w.color === statusFilter;
  });

  // Calculate dynamic scale text based on zoom
  const currentScaleKm = (2 / zoom).toFixed(1).replace(".0", "");

  return (
    <div
      className="map-card"
      ref={mapContainerRef}
      role="region"
      aria-label="Interactive Groundwater GIS Map"
    >
      {/* Map Card Header */}
      <div className="map-card-header">
        <div className="map-heading-text">
          <div className="map-title-row">
            <svg
              className="map-header-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22A366"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <span className="map-kicker">01 / GROUNDWATER MAP</span>
          </div>
          <h2 className="map-headline">What is happening beneath us?</h2>
          <p className="map-subheadline">
            Live interpretation of monitored wells, aquifer pressure and field reports.
          </p>
        </div>

        {/* All layers Dropdown Button */}
        <div className="map-header-actions">
          <div className="layers-dropdown-wrap">
            <button
              className={`layer-selector-button ${layerDropdownOpen ? "open" : ""}`}
              onClick={() => setLayerDropdownOpen(!layerDropdownOpen)}
              aria-expanded={layerDropdownOpen}
              aria-haspopup="true"
            >
              <Icon name="layers" />
              <span>All layers</span>
              <Icon name="chevron" />
            </button>

            {layerDropdownOpen && (
              <div className="layers-dropdown-menu" role="menu">
                <div className="dropdown-title">Map Layers</div>
                <label className="layer-checkbox-item">
                  <input
                    type="checkbox"
                    checked={showWells}
                    onChange={(e) => setShowWells(e.target.checked)}
                  />
                  <span>Monitored Wells ({wells.length})</span>
                </label>
                <label className="layer-checkbox-item">
                  <input
                    type="checkbox"
                    checked={showRiver}
                    onChange={(e) => setShowRiver(e.target.checked)}
                  />
                  <span>Kalyan River & Canals</span>
                </label>
                <label className="layer-checkbox-item">
                  <input
                    type="checkbox"
                    checked={showStressZone}
                    onChange={(e) => setShowStressZone(e.target.checked)}
                  />
                  <span>Aquifer Stress Boundary</span>
                </label>
                <label className="layer-checkbox-item">
                  <input
                    type="checkbox"
                    checked={showContours}
                    onChange={(e) => setShowContours(e.target.checked)}
                  />
                  <span>Elevation Contours</span>
                </label>
                <label className="layer-checkbox-item">
                  <input
                    type="checkbox"
                    checked={showVillages}
                    onChange={(e) => setShowVillages(e.target.checked)}
                  />
                  <span>Settlement Labels</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Canvas with Topographic Aerial Backdrop & Interactive Elements */}
      <div
        className="map-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
      >
        {/* Transformable Canvas Group */}
        <div
          className="map-transformable-layer"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging.current ? "none" : "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Topographic Satellite Terrain Image */}
          <img
            src="/assets/satellite-terrain.jpg"
            alt="Topographic satellite terrain map"
            className="map-satellite-photo"
            draggable={false}
          />

          {/* Interactive Vector River, Canals, Zones, and Labels */}
          <svg
            className="map-vector-overlay"
            viewBox="0 0 760 410"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              {/* Soft water ambient glow */}
              <filter id="river-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Natural blue water gradient matching the reference */}
              <linearGradient id="natural-river-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8CCBE5" />
                <stop offset="35%" stopColor="#75BFDF" />
                <stop offset="70%" stopColor="#63B4D8" />
                <stop offset="100%" stopColor="#7AC3E1" />
              </linearGradient>

              {/* River canal gradient */}
              <linearGradient id="canal-flow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8CCBE5" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#63B4D8" stopOpacity="0.3" />
              </linearGradient>

              {/* River path definition for textPath */}
              <path id="kalyan-river-path" d={riverD} fill="none" />
            </defs>

            {/* 1. Subtle River Bed Outer Glow */}
            {showRiver && (
              <>
                <path
                  d={riverD}
                  fill="none"
                  stroke="#5EA8CA"
                  strokeWidth="22"
                  opacity="0.25"
                  filter="url(#river-soft-glow)"
                />

                {/* 2. Main River Channel */}
                <path
                  d={riverD}
                  fill="none"
                  stroke="url(#natural-river-grad)"
                  strokeWidth="12"
                  opacity="0.92"
                  strokeLinecap="round"
                />

                {/* 3. Subtle Inner Water Current Highlights */}
                <path
                  d={riverD}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  opacity="0.65"
                  strokeLinecap="round"
                />

                {/* 4. Animated Flow Ripple Dashes */}
                <path
                  className="water-flow"
                  d={riverD}
                  fill="none"
                  stroke="#EBF7FC"
                  strokeWidth="1.8"
                  strokeDasharray="4 24"
                  strokeLinecap="round"
                />

                {/* 5. Feeder Canal Branches */}
                <path
                  d="M 270 215 C 285 170, 335 145, 410 135"
                  fill="none"
                  stroke="url(#canal-flow-grad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 505 160 C 530 210, 565 240, 630 260"
                  fill="none"
                  stroke="url(#canal-flow-grad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* 6. Clean Kalyan River Text Label Along Channel */}
                <text
                  dy="-8"
                  fill="#2A6178"
                  fontFamily="var(--font-mono)"
                  fontSize="9.5"
                  fontWeight="700"
                  letterSpacing="0.2em"
                  opacity="0.85"
                >
                  <textPath href="#kalyan-river-path" startOffset="68%">
                    KALYAN RIVER
                  </textPath>
                </text>
              </>
            )}

            {/* Elevation Contours */}
            {showContours && (
              <>
                <path
                  d="M 20 80 C 140 50, 260 90, 420 60 S 580 40, 740 60"
                  fill="none"
                  stroke="rgba(44, 98, 68, 0.18)"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <path
                  d="M 30 330 C 180 300, 310 350, 490 320 S 620 280, 740 310"
                  fill="none"
                  stroke="rgba(44, 98, 68, 0.18)"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
              </>
            )}

            {/* Stressed Aquifer Zone Anomaly Boundary */}
            {showStressZone && stressed && (
              <g className="stress-zone-group">
                <ellipse
                  cx="490"
                  cy="245"
                  rx="105"
                  ry="60"
                  fill="rgba(214, 69, 69, 0.10)"
                  stroke="#D64545"
                  strokeWidth="1.4"
                  strokeDasharray="4 4"
                />
                <text
                  x="490"
                  y="248"
                  textAnchor="middle"
                  fill="#D64545"
                  fontFamily="var(--font-mono)"
                  fontSize="8.5"
                  fontWeight="700"
                  letterSpacing="0.1em"
                  opacity="0.8"
                >
                  SOUTH-EAST STRESS ZONE
                </text>
              </g>
            )}
          </svg>

          {/* Settlement Village Labels on Map */}
          {showVillages && (
            <div className="map-village-labels" aria-hidden="true">
              <div className="village-marker" style={{ left: "37%", top: "54%" }}>
                <span className="village-dot" />
                <span className="village-name">Kalyanpur</span>
              </div>
              <div className="village-marker" style={{ left: "21%", top: "31%" }}>
                <span className="village-dot" />
                <span className="village-name">Bhairavpur</span>
              </div>
              <div className="village-marker" style={{ left: "70%", top: "35%" }}>
                <span className="village-dot" />
                <span className="village-name">Chandpura</span>
              </div>
            </div>
          )}

          {/* Monitored Well Nodes */}
          {visibleWells.map((well) => {
            const isSelected = selectedWellId === well.id;
            const isHovered = activeWell === well.id;

            return (
              <div
                className={`map-node ${well.color} ${isHovered || isSelected ? "focused" : ""}`}
                key={well.id}
                style={{ left: `${well.x}%`, top: `${well.y}%` }}
                onMouseEnter={() => setActiveWell(well.id)}
                onMouseLeave={() => setActiveWell(null)}
                onClick={() => {
                  onSelectWell?.(well.id);
                  setActiveWell(well.id);
                }}
                tabIndex={0}
                role="button"
                aria-label={`${well.id} in ${well.village}, depth ${well.value}, status ${well.level}`}
              >
                <span className="node-glow-ring" />
                <span className="node-center-dot" />

                {/* Demographic Popover */}
                <div className="node-popover">
                  <div className="popover-header">
                    <b>{well.id}</b>
                    <span className={`popover-badge ${well.color}`}>{well.level}</span>
                  </div>
                  <div className="popover-depth">{well.value} below ground</div>
                  <div className="popover-meta">
                    <div>📍 {well.village}</div>
                    <div>👥 {well.population} residents</div>
                    <div>💧 {well.usage}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top-Left: North Compass Rose with Reset Click */}
        <button
          className="map-north-rose"
          onClick={handleResetView}
          title="Reset map view to True North"
          aria-label="Reset map view to True North"
        >
          <span>N</span>
        </button>

        {/* Top-Right: Zoom & Layers Floating Controls */}
        <div className="map-controls-panel">
          <div className="zoom-buttons-group">
            <button
              aria-label="Zoom in"
              onClick={() => onZoom(0.15)}
              title="Zoom in"
            >
              +
            </button>
            <div className="zoom-btn-divider" />
            <button
              aria-label="Zoom out"
              onClick={() => onZoom(-0.15)}
              title="Zoom out"
            >
              −
            </button>
          </div>

          <button
            className={`map-quick-layer-btn ${layers ? "active" : ""}`}
            aria-label="Toggle map layers"
            onClick={onLayersToggle}
            title="Toggle All Layers"
          >
            <Icon name="layers" />
          </button>
        </div>

        {/* Bottom-Left: Interactive Status Legend Filter */}
        <div className="map-footer-legend" role="group" aria-label="Filter wells by status">
          <button
            className={`legend-item ${statusFilter === "good" ? "active-filter" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "good" ? null : "good")}
            title="Click to filter Healthy wells"
          >
            <i className="legend-dot green" /> Healthy
          </button>
          <button
            className={`legend-item ${statusFilter === "watch" ? "active-filter" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "watch" ? null : "watch")}
            title="Click to filter Watch wells"
          >
            <i className="legend-dot amber" /> Watch
          </button>
          <button
            className={`legend-item ${statusFilter === "risk" ? "active-filter" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "risk" ? null : "risk")}
            title="Click to filter Stressed wells"
          >
            <i className="legend-dot red" /> Stressed
          </button>
          {statusFilter && (
            <button
              className="legend-clear-btn"
              onClick={() => setStatusFilter(null)}
              title="Clear filter"
            >
              ×
            </button>
          )}
        </div>

        {/* Bottom-Right: Dynamic Distance Scale */}
        <div className="map-footer-scale" aria-hidden="true">
          <span className="scale-line" />
          <span className="scale-text">0&nbsp;&nbsp;1&nbsp;&nbsp;{currentScaleKm} km</span>
        </div>
      </div>
    </div>
  );
}
