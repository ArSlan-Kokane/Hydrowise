import React from "react";
import { Icon } from "./Icons";

interface AquiferMovementProps {
  period: number;
  scenario: string;
  onPeriodChange: () => void;
  large?: boolean;
}

export function AquiferMovement({ period, scenario, onPeriodChange, large = false }: AquiferMovementProps) {
  const stressed = scenario === "stress" || scenario === "heat";
  const movementVal =
    scenario === "stress"
      ? "−1.80 m"
      : scenario === "heat"
      ? "−1.15 m"
      : scenario === "rain"
      ? "+0.65 m"
      : "−0.42 m";

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
          <span className="card-header-label">01 / AQUIFER MOVEMENT</span>
        </div>
        <button
          className="period-dropdown-btn"
          onClick={onPeriodChange}
          aria-label={`Change time period to ${period === 7 ? 30 : period === 30 ? 90 : 7} days`}
        >
          <span>{period} days</span>
          <Icon name="chevron" />
        </button>
      </div>

      <h3 id="trend-heading" className="bottom-card-headline">
        The water table is a story, not a number.
      </h3>

      <div className="aquifer-stat-row">
        <div className="stat-left">
          <b className="stat-big-val">{movementVal}</b>
          <span className="stat-muted-label">average movement</span>
        </div>
        <div className="live-reading-indicator">
          <span className="live-pulse-dot" />
          <span>Live reading</span>
        </div>
      </div>

      {/* Clean Light Green Chart */}
      <div className="chart-canvas-wrap">
        <svg
          className="aquifer-svg-chart"
          viewBox={large ? "0 0 420 180" : "0 0 420 110"}
          preserveAspectRatio="none"
          aria-label="Aquifer water table trend line"
        >
          <defs>
            <linearGradient id="aquifer-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22A366" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#22A366" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Dotted horizontal grid lines */}
          <line x1="0" y1={large ? "40" : "25"} x2="420" y2={large ? "40" : "25"} stroke="#E2EAE4" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1={large ? "90" : "55"} x2="420" y2={large ? "90" : "55"} stroke="#E2EAE4" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1={large ? "140" : "85"} x2="420" y2={large ? "140" : "85"} stroke="#E2EAE4" strokeWidth="1" strokeDasharray="3 3" />

          {/* Area under curve */}
          <path
            d={
              stressed
                ? large
                  ? "M0 40 C60 65, 140 85, 220 115 S340 155, 420 168 V180 H0 Z"
                  : "M0 25 C60 40, 140 50, 220 70 S340 95, 420 102 V110 H0 Z"
                : scenario === "rain"
                ? large
                  ? "M0 105 C60 90, 140 75, 220 50 S340 30, 420 20 V180 H0 Z"
                  : "M0 65 C60 55, 140 45, 220 30 S340 18, 420 12 V110 H0 Z"
                : large
                  ? "M0 75 C70 70, 140 95, 220 85 S340 115, 420 100 V180 H0 Z"
                  : "M0 45 C70 42, 140 55, 220 50 S340 70, 420 62 V110 H0 Z"
            }
            fill="url(#aquifer-fill)"
          />

          {/* Stroke Line */}
          <path
            d={
              stressed
                ? large
                  ? "M0 40 C60 65, 140 85, 220 115 S340 155, 420 168"
                  : "M0 25 C60 40, 140 50, 220 70 S340 95, 420 102"
                : scenario === "rain"
                ? large
                  ? "M0 105 C60 90, 140 75, 220 50 S340 30, 420 20"
                  : "M0 65 C60 55, 140 45, 220 30 S340 18, 420 12"
                : large
                  ? "M0 75 C70 70, 140 95, 220 85 S340 115, 420 100"
                  : "M0 45 C70 42, 140 55, 220 50 S340 70, 420 62"
            }
            fill="none"
            stroke="#22A366"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Live Node Beacon */}
          <circle
            cx="418"
            cy={
              stressed
                ? large
                  ? 168
                  : 102
                : scenario === "rain"
                ? large
                  ? 20
                  : 12
                : large
                  ? 100
                  : 62
            }
            r="4"
            fill="#22A366"
          />
          <circle
            cx="418"
            cy={
              stressed
                ? large
                  ? 168
                  : 102
                : scenario === "rain"
                ? large
                  ? 20
                  : 12
                : large
                  ? 100
                  : 62
            }
            r="8"
            fill="none"
            stroke="#22A366"
            opacity="0.3"
          />
        </svg>

        <div className="chart-date-axis">
          <span>Aug 26</span>
          <span>Sep 02</span>
          <span>Sep 09</span>
          <span>Sep 16</span>
          <span className="today-label">Today</span>
        </div>
      </div>
    </article>
  );
}
