import React from "react";

export type ScenarioKey = "normal" | "heat" | "rain" | "stress";

export interface ScenarioItem {
  label: string;
  rain: number;
  level: number;
  risk: string;
  note: string;
}

interface ScenarioBarProps {
  scenarios: Record<ScenarioKey, ScenarioItem>;
  currentScenario: ScenarioKey;
  onSelectScenario: (key: ScenarioKey) => void;
}

export function ScenarioBar({ scenarios, currentScenario, onSelectScenario }: ScenarioBarProps) {
  const scenarioKeys = Object.keys(scenarios) as ScenarioKey[];

  return (
    <article className="bottom-card explore-system-card" aria-labelledby="scenario-heading">
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
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
            <path d="M9 21v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5" />
          </svg>
          <span className="card-header-label">EXPLORE THE SYSTEM</span>
        </div>
      </div>

      <p id="scenario-heading" className="explore-description">
        Change the conditions to see how risk moves across the map.
      </p>

      {/* 4 Scenario Pill Tabs */}
      <div className="scenario-pills-wrap" role="tablist" aria-label="Environmental scenarios">
        {scenarioKeys.map((key) => {
          const item = scenarios[key];
          const isSelected = currentScenario === key;

          return (
            <button
              className={`scenario-pill-btn ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectScenario(key)}
              key={key}
              role="tab"
              aria-selected={isSelected}
              aria-controls="main-content"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Subtle Topographic Elevation Contour Artwork */}
      <div className="explore-terrain-canvas" aria-hidden="true">
        <img
          src="/assets/terrain-wireframe.jpg"
          alt=""
          className="explore-terrain-img"
        />
        <div className="explore-terrain-overlay" />
      </div>
    </article>
  );
}
