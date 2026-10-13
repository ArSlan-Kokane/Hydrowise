import React from "react";
import { Icon } from "./Icons";

interface RiskPictureProps {
  waterSecurityLevel: number;
  rainProbability: number;
  signalsCount: number;
  selectedStationName?: string;
  onOpenDetail?: () => void;
}

export function RiskPicture({
  waterSecurityLevel,
  rainProbability,
  signalsCount,
  selectedStationName = "Sangli Central Station",
  onOpenDetail,
}: RiskPictureProps) {
  const riskClass =
    waterSecurityLevel < 35 ? "critical" : waterSecurityLevel < 55 ? "watch" : "good";
  const riskLabel =
    waterSecurityLevel < 35 ? "Critical" : waterSecurityLevel < 55 ? "Watch" : "Stable";

  const riskHeadline =
    waterSecurityLevel < 35
      ? "Severe moisture deficit across southern wellhead cluster"
      : waterSecurityLevel < 55
      ? "Moderate drawdown: natural recharge and extraction balancing"
      : "Aquifer levels stable with favorable recharge buffer";

  return (
    <aside className="risk-card" aria-labelledby="risk-heading">
      {/* Header */}
      <div className="risk-card-header">
        <div className="risk-title-wrap">
          <svg
            className="risk-header-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22C7C9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className="risk-header-label">AQUIFER RISK ASSESSMENT</span>
        </div>
        <span className={`risk-badge ${riskClass}`}>{riskLabel.toUpperCase()}</span>
      </div>

      {/* Headings */}
      <h3 id="risk-heading" className="risk-headline">
        {riskHeadline}
      </h3>
      <p className="risk-description">
        Telemetry focused on <b>{selectedStationName}</b>.
      </p>

      {/* Water Security Progress Gauge */}
      <div className="water-security-section">
        <div className="security-labels">
          <span className="security-title">REGIONAL WATER SECURITY</span>
          <span className="security-pct">{Math.round(waterSecurityLevel)}%</span>
        </div>
        <div
          className="security-progress-bar"
          role="progressbar"
          aria-valuenow={Math.round(waterSecurityLevel)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="security-fill"
            style={{
              width: `${Math.max(5, Math.min(100, waterSecurityLevel))}%`,
              background:
                waterSecurityLevel < 35 ? "#D64545" : waterSecurityLevel < 55 ? "#E09228" : "#22A366",
            }}
          />
        </div>
      </div>

      {/* 3 Intelligence Feed Rows */}
      <div className="risk-feed-list">
        {/* Row 1: Crop demand */}
        <div className="risk-feed-item">
          <div className="risk-feed-icon green-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 17 17 7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </div>
          <div className="risk-feed-body">
            <b>Crop Water Demand</b>
            <small>{waterSecurityLevel < 40 ? "High demand in wheat & cane tracts" : "Normal seasonal irrigation rate"}</small>
          </div>
          <div className={`risk-feed-action ${waterSecurityLevel < 40 ? "amber" : "green"}`}>
            <span>{waterSecurityLevel < 40 ? "Elevated" : "Optimal"}</span>
          </div>
        </div>

        {/* Row 2: Rain outlook */}
        <div className="risk-feed-item">
          <div className="risk-feed-icon cyan-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12c3-4 6-4 9 0s6 4 9 0" />
            </svg>
          </div>
          <div className="risk-feed-body">
            <b>Rain Infiltration Outlook</b>
            <small>{rainProbability}% probability · 6-hour horizon</small>
          </div>
          <div className={`risk-feed-action ${rainProbability > 30 ? "green" : "amber"}`}>
            <span>{rainProbability > 30 ? "Rain Gate Blocked" : "Dry Window"}</span>
          </div>
        </div>

        {/* Row 3: Community reports */}
        <div className="risk-feed-item">
          <div className="risk-feed-icon blue-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="risk-feed-body">
            <b>Groundwater Field Signals</b>
            <small>{signalsCount} active community observations recorded</small>
          </div>
          <div className="risk-feed-action amber">
            <span>Verified</span>
          </div>
        </div>
      </div>

      {/* Bottom Link */}
      {onOpenDetail && (
        <button className="risk-detail-link" onClick={onOpenDetail}>
          <span>Inspect decision engine telemetry</span>
          <Icon name="chevron" />
        </button>
      )}
    </aside>
  );
}
