import React from "react";
import { Icon } from "./Icons";

interface ScenarioData {
  label: string;
  rain: number;
  level: number;
  risk: string;
  note: string;
}

interface KpiRowProps {
  current: ScenarioData;
  weather?: {
    rain: number;
    provider: string;
    gatePassed: boolean;
  } | null;
}

export function KpiRow({ current, weather }: KpiRowProps) {
  const isStressed = current.risk === "Critical" || current.risk === "High";

  const reserveTrend = isStressed ? "↓ 6.8%" : "↑ 4.2%";
  const reserveTrendDown = isStressed;
  const rechargeStatus =
    current.risk === "Critical"
      ? "Below normal"
      : current.risk === "High"
      ? "Depleted"
      : "Moderate";
  const rechargeWord =
    current.risk === "High" || current.risk === "Critical" ? "At risk" : "Balanced";
  const waterTableTrend =
    current.risk === "Critical"
      ? "↓ 1.80 m"
      : current.risk === "High"
      ? "↓ 0.95 m"
      : "↓ 0.42 m";
  const waterTableVal =
    current.risk === "Critical" ? "14.2" : current.risk === "High" ? "12.8" : "11.6";

  const effectiveRain = weather ? weather.rain : current.rain;
  const gatePassed = weather ? weather.gatePassed : current.rain <= 30;

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
            GROUNDWATER RESERVE
          </span>
          <span className={`stat-pill ${reserveTrendDown ? "down" : "up"}`}>
            {reserveTrend}
          </span>
        </div>

        <div className="instrument-main-val">
          <span className="stat-number">{current.level}</span>
          <span className="stat-denom">/ 100</span>
        </div>

        <div
          className="instrument-progress"
          role="progressbar"
          aria-valuenow={current.level}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-fill" style={{ width: `${current.level}%` }} />
        </div>

        <div className="instrument-subtext">
          {effectiveRain > 30
            ? `Active rain recharge boost: +${Math.round(effectiveRain * 0.12)}% natural infiltration`
            : "Compared with the same period last year"}
        </div>

        <div className="instrument-card-footer">
          <div className="instrument-metadata">
            <div className="meta-line">
              <span className="meta-pin-red">📍</span>
              <span>Kalyanpur Block Region</span>
            </div>
            <div className="meta-line">
              <span className="meta-icon-people">👥</span>
              <span>Affects 12,400 people</span>
            </div>
            <div className="meta-line">
              <span className="meta-icon-wells">💧</span>
              <span>68 monitored wells</span>
            </div>
          </div>

          {/* Mini Wave Vector Graphic */}
          <div className="mini-wave-wrap" aria-hidden="true">
            <svg viewBox="0 0 60 22" fill="none" className="mini-wave-svg">
              <path
                d="M 2 16 C 12 12, 18 19, 30 14 S 45 7, 58 10"
                stroke="#22A366"
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
            {effectiveRain > 50 ? "High Inflow" : effectiveRain > 30 ? "Rain Inflow" : "Dry Window"}
          </span>
        </div>

        <div className="instrument-subtext">
          Live Open-Meteo: <b className="highlight-dark">{effectiveRain}% rain probability</b> in next 6h
        </div>

        <div className="instrument-card-footer">
          <div className="instrument-metadata">
            <div className="meta-line">
              <span>🌦️</span>
              <span>{weather?.provider ? `Grid: ${weather.provider}` : "Open-Meteo (18.52°N, 73.86°E)"}</span>
            </div>
            <div className="meta-line">
              <span>⚡</span>
              <span>{gatePassed ? "Gate: Passed → ML Irrigation Eligible" : "Gate: Triggered → Irrigation Suspended"}</span>
            </div>
            <div className="meta-line">
              <span>💧</span>
              <span>{effectiveRain > 30 ? "Aquifer Infiltration: High Natural Inflow" : "Aquifer Infiltration: Normal Baseline"}</span>
            </div>
          </div>

          {/* Mini 4 Equalizer Bars */}
          <div className="mini-equalizer" aria-hidden="true">
            <span className="eq-bar bar-1" style={{ height: `${Math.min(100, Math.max(25, effectiveRain * 0.9))}%` }} />
            <span className="eq-bar bar-2" style={{ height: `${Math.min(100, Math.max(35, effectiveRain * 1.1))}%` }} />
            <span className="eq-bar bar-3" style={{ height: `${Math.min(100, Math.max(20, effectiveRain * 0.75))}%` }} />
            <span className="eq-bar bar-4" style={{ height: `${Math.min(100, Math.max(30, effectiveRain * 1.0))}%` }} />
          </div>
        </div>
      </article>

      {/* 3. Active Signals */}
      <article className="instrument-card" aria-labelledby="signals-label">
        <div className="instrument-header">
          <div className="instrument-icon-circle dark">
            <Icon name="activity" />
          </div>
          <span className="instrument-title" id="signals-label">
            ACTIVE SIGNALS
          </span>
          <span className="beacon-dot gold" aria-hidden="true" />
        </div>

        <div className="instrument-main-val">
          <span className="stat-number">06</span>
          <span className="stat-label-small">needs review</span>
        </div>

        <div className="instrument-subtext">4 field reports · 2 aquifer watch</div>

        <div className="instrument-metadata">
          <div className="meta-line">
            <span className="meta-bullet amber">🛡</span>
            <span>Priority: Medium</span>
          </div>
          <div className="meta-line">
            <span className="meta-bullet grey">🕒</span>
            <span>Last updated: 2 hours ago</span>
          </div>
          <div className="meta-line">
            <span className="meta-bullet red">📍</span>
            <span>South-east cluster affected</span>
          </div>
        </div>
      </article>

      {/* 4. Water Table */}
      <article className="instrument-card" aria-labelledby="water-table-label">
        <div className="instrument-header">
          <div className="instrument-icon-circle blue">
            <Icon name="gauge" />
          </div>
          <span className="instrument-title" id="water-table-label">
            WATER TABLE
          </span>
          <span className="stat-pill down">{waterTableTrend}</span>
        </div>

        <div className="instrument-main-val">
          <span className="stat-number">{waterTableVal}</span>
          <span className="stat-label-small">m avg depth</span>
        </div>

        <div className="instrument-subtext">Across 68 monitored wells</div>

        <div className="trend-dropdown-row">
          <button className="small-trend-select" type="button">
            <span>Last 30 days</span>
            <Icon name="chevron" />
          </button>
        </div>

        <div className="instrument-card-footer">
          <div className="instrument-metadata">
            <div className="meta-line">
              <span>📈</span>
              <span>Trend: Declining slowly</span>
            </div>
            <div className="meta-line">
              <span>🏡</span>
              <span>85% wells stable</span>
            </div>
            <div className="meta-line">
              <span>⚠️</span>
              <span>3 wells need attention</span>
            </div>
          </div>

          {/* Mini Sparkline Graphic */}
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
