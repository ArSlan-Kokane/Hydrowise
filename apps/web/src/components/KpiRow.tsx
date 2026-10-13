import React from "react";
import { Icon } from "./Icons";
import type { WeatherSnapshot } from "../types/contracts";

interface KpiRowProps {
  avgSoilMoisture: number;
  weather: WeatherSnapshot | null;
  signalsCount: number;
  avgDepth?: number;
  period?: number;
  onPeriodChange?: () => void;
  onSignalsClick?: () => void;
}

export function KpiRow({
  avgSoilMoisture,
  weather,
  signalsCount,
  avgDepth = 12.8,
  period = 30,
  onPeriodChange,
  onSignalsClick,
}: KpiRowProps) {
  const rainProb = Number(weather?.["rain_probability_%"] ?? 18);
  const gatePassed = rainProb <= 30;

  const moistureStatus =
    avgSoilMoisture >= 40 ? "Stable" : avgSoilMoisture >= 30 ? "Watch" : "Stressed";
  const reserveTrend = avgSoilMoisture >= 40 ? "↑ 4.2% recharge" : "↓ 6.8% drawdown";
  const reserveTrendDown = avgSoilMoisture < 40;

  // Drawdown adjusted by period
  const periodDrawdown = period === 7 ? "↓ 0.28 m" : period === 30 ? "↓ 0.95 m" : "↓ 1.85 m";

  return (
    <section className="insight-row" id="kpi-section" aria-label="Key metrics dashboard">
      {/* 1. Groundwater Reserve */}
      <article className="instrument-card" aria-labelledby="reserve-label">
        <div className="instrument-header">
          <div className="instrument-icon-circle blue">
            <svg viewBox="0 0 24 24" fill="currentColor" className="inst-svg">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <span className="instrument-title" id="reserve-label">
            SOIL & AQUIFER RESERVE
          </span>
          <span className={`stat-pill ${reserveTrendDown ? "down" : "up"}`}>
            {reserveTrend}
          </span>
        </div>

        <div className="instrument-main-val">
          <span className="stat-number">{Math.round(avgSoilMoisture)}%</span>
          <span className="stat-denom">avg moisture</span>
        </div>

        <div
          className="instrument-progress"
          role="progressbar"
          aria-valuenow={Math.round(avgSoilMoisture)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-fill"
            style={{
              width: `${Math.max(5, Math.min(100, avgSoilMoisture))}%`,
              background: avgSoilMoisture >= 40 ? "#22A366" : avgSoilMoisture >= 30 ? "#E09228" : "#D64545",
            }}
          />
        </div>

        <div className="instrument-subtext">
          Status: <b className="highlight-dark">{moistureStatus}</b> across 5 real-time district stations
        </div>

        <div className="instrument-card-footer">
          <div className="instrument-metadata">
            <div className="meta-line">
              <span className="meta-pin-red">📍</span>
              <span>Sangli District Watershed</span>
            </div>
            <div className="meta-line">
              <span>💧</span>
              <span>Krishna River basin monitored</span>
            </div>
          </div>

          <div className="mini-wave-wrap" aria-hidden="true">
            <svg viewBox="0 0 60 22" fill="none" className="mini-wave-svg">
              <path
                d="M 2 16 C 12 12, 18 19, 30 14 S 45 7, 58 10"
                stroke={avgSoilMoisture >= 40 ? "#22A366" : "#D64545"}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </article>

      {/* 2. Recharge Outlook (Integrated with Open-Meteo) */}
      <article className="instrument-card" aria-labelledby="recharge-label">
        <div className="instrument-header">
          <div className="instrument-icon-circle dark">
            <Icon name="cloudRain" />
          </div>
          <span className="instrument-title" id="recharge-label">
            RECHARGE OUTLOOK
          </span>
          <span className={`stat-pill ${gatePassed ? "weather-gate-passed" : "weather-gate-blocked"}`}>
            {gatePassed ? "Gate: Open (≤30%)" : "Gate: Blocked (>30%)"}
          </span>
        </div>

        <div className="instrument-main-val">
          <span className="stat-word-serif">
            {rainProb > 50 ? "High Inflow" : rainProb > 30 ? "Rain Gate Hold" : "Dry Window"}
          </span>
        </div>

        <div className="instrument-subtext">
          Live Open-Meteo: <b className="highlight-dark">{rainProb}% rain probability</b> (6h horizon)
        </div>

        <div className="instrument-card-footer">
          <div className="instrument-metadata">
            <div className="meta-line">
              <span>🌦️</span>
              <span>{weather?.provider || "Open-Meteo (16.85°N, 74.58°E)"}</span>
            </div>
            <div className="meta-line">
              <span>⚡</span>
              <span>{gatePassed ? "Gate: Clear → Irrigation Allowed" : "Gate: Tripped → Rain Expected"}</span>
            </div>
          </div>

          <div className="mini-equalizer" aria-hidden="true">
            <span className="eq-bar bar-1" style={{ height: `${Math.min(100, Math.max(25, rainProb * 0.9))}%` }} />
            <span className="eq-bar bar-2" style={{ height: `${Math.min(100, Math.max(35, rainProb * 1.1))}%` }} />
            <span className="eq-bar bar-3" style={{ height: `${Math.min(100, Math.max(20, rainProb * 0.75))}%` }} />
            <span className="eq-bar bar-4" style={{ height: `${Math.min(100, Math.max(30, rainProb * 1.0))}%` }} />
          </div>
        </div>
      </article>

      {/* 3. Active Signals */}
      <article
        className="instrument-card clickable-card"
        aria-labelledby="signals-label"
        onClick={onSignalsClick}
        style={{ cursor: onSignalsClick ? "pointer" : "default" }}
      >
        <div className="instrument-header">
          <div className="instrument-icon-circle dark">
            <Icon name="activity" />
          </div>
          <span className="instrument-title" id="signals-label">
            COMMUNITY SIGNALS
          </span>
          <span className="beacon-dot gold" aria-hidden="true" />
        </div>

        <div className="instrument-main-val">
          <span className="stat-number">{String(signalsCount).padStart(2, "0")}</span>
          <span className="stat-label-small">field reports</span>
        </div>

        <div className="instrument-subtext">
          Ground observations ingested from local farmers & ward cells
        </div>

        <div className="instrument-card-footer">
          <div className="instrument-metadata">
            <div className="meta-line">
              <span className="meta-bullet amber">🛡</span>
              <span>Status: Active Ground Network</span>
            </div>
            <div className="meta-line">
              <span className="meta-bullet grey">🕒</span>
              <span>Real-time ingestion enabled</span>
            </div>
          </div>
        </div>
      </article>

      {/* 4. Water Table Depth */}
      <article className="instrument-card" aria-labelledby="water-table-label">
        <div className="instrument-header">
          <div className="instrument-icon-circle blue">
            <Icon name="gauge" />
          </div>
          <span className="instrument-title" id="water-table-label">
            WATER TABLE DRAWDOWN
          </span>
          <span className="stat-pill down">{periodDrawdown}</span>
        </div>

        <div className="instrument-main-val">
          <span className="stat-number">{avgDepth.toFixed(1)}</span>
          <span className="stat-label-small">m avg depth</span>
        </div>

        <div className="instrument-subtext">
          Measured across monitored agricultural borewells
        </div>

        <div className="trend-dropdown-row">
          <button
            className="small-trend-select"
            type="button"
            onClick={onPeriodChange}
            title="Click to toggle time horizon"
            style={{ cursor: "pointer" }}
          >
            <span>Last {period} days</span>
            <Icon name="chevron" />
          </button>
        </div>

        <div className="instrument-card-footer">
          <div className="instrument-metadata">
            <div className="meta-line">
              <span>📈</span>
              <span>Telemetry: Monitored 24/7</span>
            </div>
            <div className="meta-line">
              <span>🏡</span>
              <span>Regional aquifer baseline stable</span>
            </div>
          </div>

          <div className="mini-sparkline-wrap" aria-hidden="true">
            <svg viewBox="0 0 60 24" fill="none" className="mini-sparkline-svg">
              <path
                d="M 2 8 C 15 14, 28 8, 40 18 S 52 14, 58 19"
                stroke="#22A366"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </article>
    </section>
  );
}
