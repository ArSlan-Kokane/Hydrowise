import React, { useMemo } from "react";
import { Icon } from "./Icons";

interface AquiferMovementProps {
  period: number;
  onPeriodChange: () => void;
  avgMoisture?: number;
  large?: boolean;
}

export function AquiferMovement({
  period,
  onPeriodChange,
  avgMoisture = 44.8,
  large = false,
}: AquiferMovementProps) {
  const isDrawdown = avgMoisture < 40;
  const movementVal = isDrawdown
    ? period === 7
      ? "−0.45 m"
      : period === 30
      ? "−1.15 m"
      : "−1.90 m"
    : period === 7
    ? "+0.20 m"
    : period === 30
    ? "+0.45 m"
    : "+0.85 m";

  // Generate dynamic date labels based on today's real date
  const dateLabels = useMemo(() => {
    const today = new Date();
    const result: string[] = [];
    const stepDays = Math.round(period / 4);

    for (let i = 4; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * stepDays);
      result.push(
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
    }
    result.push("Today");
    return result;
  }, [period]);

  // Generate dynamic SVG path points based on moisture trend
  const { pathD, fillD, lastY } = useMemo(() => {
    const height = large ? 180 : 120;
    // Lower moisture = downward curve (higher y in SVG)
    if (avgMoisture < 30) {
      // High stress drawdown
      const p = large
        ? "M0 50 C80 75, 160 110, 260 135 S360 160, 420 168"
        : "M0 35 C80 50, 160 75, 260 90 S360 105, 420 110";
      return { pathD: p, fillD: `${p} V${height} H0 Z`, lastY: large ? 168 : 110 };
    } else if (avgMoisture < 40) {
      // Moderate watch drawdown
      const p = large
        ? "M0 70 C70 65, 150 90, 240 105 S340 125, 420 132"
        : "M0 45 C70 42, 150 60, 240 70 S340 85, 420 90";
      return { pathD: p, fillD: `${p} V${height} H0 Z`, lastY: large ? 132 : 90 };
    } else {
      // Stable or recharging
      const p = large
        ? "M0 110 C80 100, 160 85, 250 65 S350 45, 420 38"
        : "M0 75 C80 68, 160 55, 250 42 S350 28, 420 22";
      return { pathD: p, fillD: `${p} V${height} H0 Z`, lastY: large ? 38 : 22 };
    }
  }, [avgMoisture, large]);

  return (
    <article className="bottom-card aquifer-card" aria-labelledby="trend-heading">
      <div className="bottom-card-header">
        <div className="card-title-group">
          <svg
            className="card-header-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22A366"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="card-header-label">AQUIFER RECHARGE & DRAWDOWN</span>
        </div>
        <button
          className="period-dropdown-btn"
          onClick={onPeriodChange}
          aria-label={`Change time period to ${period === 7 ? 30 : period === 30 ? 90 : 7} days`}
          title="Click to toggle time period"
        >
          <span>Last {period} days</span>
          <Icon name="chevron" />
        </button>
      </div>

      <h3 id="trend-heading" className="bottom-card-headline" style={{ marginBottom: "8px" }}>
        Aquifer Dynamics & Table Movement
      </h3>

      <div className="aquifer-stat-row" style={{ marginBottom: "14px" }}>
        <div className="stat-left">
          <b className="stat-big-val" style={{ color: isDrawdown ? "#D14343" : "#22A366" }}>
            {movementVal}
          </b>
          <span className="stat-muted-label">net movement ({period}d)</span>
        </div>
        <div className="live-reading-indicator">
          <span className="live-pulse-dot" />
          <span>Live station telemetry</span>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="chart-canvas-wrap">
        <svg
          className="aquifer-svg-chart"
          viewBox={large ? "0 0 420 180" : "0 0 420 120"}
          preserveAspectRatio="none"
          aria-label="Aquifer water table trend line"
        >
          <defs>
            <linearGradient id="aquifer-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22A366" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22A366" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Dotted horizontal grid lines */}
          <line x1="0" y1={large ? "45" : "30"} x2="420" y2={large ? "45" : "30"} stroke="#E2EAE4" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1={large ? "95" : "65"} x2="420" y2={large ? "95" : "65"} stroke="#E2EAE4" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1={large ? "145" : "95"} x2="420" y2={large ? "145" : "95"} stroke="#E2EAE4" strokeWidth="1" strokeDasharray="3 3" />

          {/* Area fill */}
          <path d={fillD} fill="url(#aquifer-fill)" />

          {/* Main stroke line */}
          <path
            d={pathD}
            fill="none"
            stroke="#22A366"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Live Node Beacon */}
          <circle cx="418" cy={lastY} r="4.5" fill="#22A366" />
          <circle cx="418" cy={lastY} r="9" fill="none" stroke="#22A366" opacity="0.35" />
        </svg>

        {/* Dynamic Calendar Dates Axis */}
        <div className="chart-date-axis">
          {dateLabels.map((lbl, idx) => (
            <span key={idx} className={idx === dateLabels.length - 1 ? "today-label" : ""}>
              {lbl}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
