import React from "react";

interface HeroSectionProps {
  region: string;
  onExportBrief: () => void;
  onShareView: () => void;
}

export function HeroSection({ region, onExportBrief, onShareView }: HeroSectionProps) {
  return (
    <section className="intro-photographic" aria-labelledby="intro-heading">
      {/* Daylight River Landscape Background Image */}
      <img
        src="/assets/hero-landscape.jpg"
        alt="Daylight river valley landscape"
        className="intro-photo-bg"
      />
      <div className="intro-photo-overlay" aria-hidden="true" />

      {/* Hero Typography Content */}
      <div className="intro-content">
        <div className="section-kicker">
          <span className="kicker-muted">LIVING WATER SYSTEM</span>
          <span className="kicker-sep">/</span>
          <span className="kicker-region">{region}</span>
        </div>
        <h1 id="intro-heading">
          Read the landscape.<br />
          Act before scarcity.
        </h1>
        <p>
          One shared picture of groundwater, field conditions and community risk — for the people who depend on every drop.
        </p>
      </div>

      {/* Floating Action Buttons */}
      <div className="intro-actions">
        <button
          className="hero-export-button"
          onClick={onExportBrief}
          aria-label="Export situation brief"
        >
          <svg
            className="action-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export situation brief</span>
          <svg className="action-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button className="hero-share-button" onClick={onShareView} aria-label="Share public view">
          <svg
            className="action-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Share public view</span>
        </button>
      </div>
    </section>
  );
}
