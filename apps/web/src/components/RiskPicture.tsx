import React from "react";
import { Icon } from "./Icons";

interface ScenarioData {
  label: string;
  rain: number;
  level: number;
  risk: string;
  note: string;
}

interface RiskPictureProps {
  current: ScenarioData;
  riskText: string;
  onOpenDetail: () => void;
}

export function RiskPicture({ current, riskText, onOpenDetail }: RiskPictureProps) {
  const riskClass = current.risk.toLowerCase();

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
          <span className="risk-header-label">RISK PICTURE</span>
        </div>
        <span className={`risk-badge ${riskClass}`}>{current.risk}</span>
      </div>

      {/* Headings */}
      <h3 id="risk-heading" className="risk-headline">
        {riskText}
      </h3>
      <p className="risk-description">
        South-east aquifer stress is the most important change since last week.
      </p>

      {/* Water Security Progress Gauge */}
      <div className="water-security-section">
        <div className="security-labels">
          <span className="security-title">WATER SECURITY</span>
          <span className="security-pct">{current.level}%</span>
        </div>
        <div
          className="security-progress-bar"
          role="progressbar"
          aria-valuenow={current.level}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="security-fill" style={{ width: `${current.level}%` }} />
        </div>
      </div>

      {/* 3 Intelligence Feed Rows */}
      <div className="risk-feed-list">
        {/* Row 1: Crop demand */}
        <div className="risk-feed-item">
          <div className="risk-feed-icon green-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="7 17 17 7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </div>
          <div className="risk-feed-body">
            <b>Crop demand</b>
            <small>High in 3 village clusters</small>
          </div>
          <div className="risk-feed-action amber">
            <span>Rising</span>
            <Icon name="chevron" />
          </div>
        </div>

        {/* Row 2: Rain outlook */}
        <div className="risk-feed-item">
          <div className="risk-feed-icon cyan-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12c3-4 6-4 9 0s6 4 9 0" />
            </svg>
          </div>
          <div className="risk-feed-body">
            <b>Rain outlook</b>
            <small>{current.rain}% probability · 6 hours</small>
          </div>
          <div className="risk-feed-action green">
            <span>{current.rain > 30 ? "Favorable" : "Useful"}</span>
            <Icon name="chevron" />
          </div>
        </div>

        {/* Row 3: Community reports */}
        <div className="risk-feed-item">
          <div className="risk-feed-icon blue-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="risk-feed-body">
            <b>Community reports</b>
            <small>2 new observations today</small>
          </div>
          <div className="risk-feed-action amber">
            <span>Review</span>
            <Icon name="chevron" />
          </div>
        </div>
      </div>

      {/* Bottom Link */}
      <button className="risk-detail-link" onClick={onOpenDetail}>
        <span>Open aquifer detail</span>
        <Icon name="chevron" />
      </button>
    </aside>
  );
}
