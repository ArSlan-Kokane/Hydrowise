import React from "react";
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
  onViewAll: () => void;
  onOpenReportModal: () => void;
}

export function CommunitySignals({ signals, onViewAll, onOpenReportModal }: CommunitySignalsProps) {
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
          <span className="card-header-label">02 / COMMUNITY SIGNALS</span>
        </div>
        <button className="view-all-link" onClick={onViewAll}>
          <span>View all</span>
          <Icon name="chevron" />
        </button>
      </div>

      <h3 id="signals-heading" className="bottom-card-headline">
        People on the ground
      </h3>

      <div className="signals-feed-list" role="list">
        {signals.map((sig, index) => {
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
        })}
      </div>

      <button
        className="report-observation-btn"
        onClick={onOpenReportModal}
        aria-label="Report a local water observation"
      >
        <span>+</span> Report a local water observation
      </button>
    </article>
  );
}
