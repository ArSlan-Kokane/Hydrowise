import React from "react";
import { Icon } from "./Icons";

interface SidebarProps {
  active: string;
  setActive: (value: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin: () => void;
}

export function Sidebar({ active, setActive, isOpen, onClose, onOpenAdmin }: SidebarProps) {
  const nav: [string, string][] = [
    ["overview", "Overview"],
    ["map", "Groundwater map"],
    ["field", "Field conditions"],
    ["alerts", "Community alerts"],
    ["council", "Local administration"],
  ];

  const handleNavClick = (label: string) => {
    setActive(label);
    onClose();

    // Special handling for Local administration - open drawer instead of scrolling
    if (label === "Local administration") {
      onOpenAdmin();
      return;
    }

    const sectionIdMap: { [key: string]: string } = {
      "Overview": "section-overview",
      "Groundwater map": "section-groundwater",
      "Field conditions": "section-field-conditions",
      "Community alerts": "section-community-alerts",
    };

    const sectionId = sectionIdMap[label];
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`} aria-label="Main navigation">
      {/* Brand Header with Hexagonal HydroWise Logo */}
      <div className="side-brand">
        <a
          href="#"
          className="brand-logo-wrap"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick("Overview");
          }}
          aria-label="HydroWise Home"
        >
          <div className="brand-icon-hex" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22 2 L39 12 L39 32 L22 42 L5 32 L5 12 Z"
                stroke="#1EA6A8"
                strokeWidth="2.5"
                fill="#0F2D25"
              />
              {/* Inner isometric letter H and W */}
              <path
                d="M14 14 L14 30 M14 22 L22 22 M22 14 L22 30"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M22 22 L26 30 L30 22 L34 30"
                stroke="#32D5D7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="brand-text-block">
            <div className="brand-title">
              <span className="brand-title-hydro">Hydro</span>
              <span className="brand-title-wise">Wise</span>
            </div>
            <span className="brand-tagline">INTELLIGENT WATER SYSTEM</span>
          </div>
        </a>
      </div>

      <button className="sidebar-close" onClick={onClose} aria-label="Close navigation">
        <Icon name="close" />
      </button>

      {/* Primary Navigation */}
      <nav aria-label="Primary navigation" className="nav-main">
        {nav.map(([icon, label]) => {
          const isActive = active === label;
          return (
            <button
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => handleNavClick(label)}
              key={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {label === "Community alerts" && (
                <span className="nav-badge-amber" aria-label="6 alerts">
                  6
                </span>
              )}
            </button>
          );
        })}
      </nav>



      {/* Subtle Topographic Terrain Artwork in lower sidebar */}
      <div className="sidebar-mesh-backdrop" aria-hidden="true">
        <img src="/assets/sidebar-mesh.jpg" alt="" className="sidebar-mesh-img" />
      </div>

      {/* Sidebar Footer Profile */}
      <div className="side-foot">
        <div className="side-user" onClick={onOpenAdmin} role="button" tabIndex={0}>
          <div className="avatar-pill">RK</div>
          <div className="user-details">
            <b>Ravi Kumar</b>
            <small>Field coordinator</small>
          </div>
          <Icon name="chevron" />
        </div>
      </div>
    </aside>
  );
}
