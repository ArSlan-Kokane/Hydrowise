import React, { useState } from "react";
import { Icon } from "./Icons";

export interface CommunitySignal {
  id: string;
  initials: string;
  type: "farmer" | "council";
  sourceName: string;
  village: string;
  observation: string;
  time: string;
  dotColor?: "amber" | "red" | "green";
}

interface CommunitySignalsProps {
  signals: CommunitySignal[];
  onOpenReportModal: () => void;
}

export function CommunitySignals({ signals, onOpenReportModal }: CommunitySignalsProps) {
  const [filterType, setFilterType] = useState<"all" | "farmer" | "council">("all");

  const filteredSignals = signals.filter((s) => {
    if (filterType === "all") return true;
    return s.type === filterType;
  });

  const farmerCount = signals.filter((s) => s.type === "farmer").length;
  const councilCount = signals.filter((s) => s.type === "council").length;

  return (
    <article className="bottom-card signals-card" id="signals" aria-labelledby="signals-heading">
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="card-header-label">COMMUNITY GROUND SIGNALS</span>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setFilterType("all")}
            style={{
              fontSize: "11px",
              fontWeight: filterType === "all" ? 700 : 500,
              padding: "3px 8px",
              borderRadius: "5px",
              background: filterType === "all" ? "var(--green-primary)" : "var(--bg-canvas)",
              color: filterType === "all" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
            }}
          >
            All ({signals.length})
          </button>
          <button
            onClick={() => setFilterType("farmer")}
            style={{
              fontSize: "11px",
              fontWeight: filterType === "farmer" ? 700 : 500,
              padding: "3px 8px",
              borderRadius: "5px",
              background: filterType === "farmer" ? "var(--green-primary)" : "var(--bg-canvas)",
              color: filterType === "farmer" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
            }}
          >
            Farmers ({farmerCount})
          </button>
          <button
            onClick={() => setFilterType("council")}
            style={{
              fontSize: "11px",
              fontWeight: filterType === "council" ? 700 : 500,
              padding: "3px 8px",
              borderRadius: "5px",
              background: filterType === "council" ? "var(--green-primary)" : "var(--bg-canvas)",
              color: filterType === "council" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
            }}
          >
            Council ({councilCount})
          </button>
        </div>
      </div>

      <h3 id="signals-heading" className="bottom-card-headline" style={{ marginBottom: "8px" }}>
        Field Truth & Community Observations
      </h3>

      <div className="signals-feed-list" role="list" style={{ maxHeight: "320px", overflowY: "auto" }}>
        {filteredSignals.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
            No signals found for this filter.
          </div>
        ) : (
          filteredSignals.map((sig, index) => {
            const dot = sig.dotColor || (index === 0 ? "amber" : index === 1 ? "red" : "green");
            return (
              <div className="signal-entry" role="listitem" key={sig.id}>
                <span className={`signal-avatar-round ${sig.type}`} aria-hidden="true">
                  {sig.initials}
                </span>
                <div className="signal-entry-body">
                  <b>
                    {sig.sourceName} · {sig.village}
                  </b>
                  <small>{sig.observation}</small>
                </div>
                <div className="signal-entry-meta">
                  <time className="signal-entry-time">{sig.time}</time>
                  <span className={`signal-status-dot ${dot}`} aria-hidden="true" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        className="report-observation-btn"
        onClick={onOpenReportModal}
        aria-label="Report a local water observation"
        style={{ marginTop: "12px" }}
      >
        <span>+</span> Report a local water observation
      </button>
    </article>
  );
}
