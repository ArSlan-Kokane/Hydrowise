import React from "react";
import { Icon } from "./Icons";

interface SidebarProps {
  active: string;
  setActive: (value: string) => void;
  isOpen: boolean;
  dashboardVisible: boolean;
  onSidebarEnter: () => void;
  onSidebarLeave: () => void;
  onSidebarFocus: () => void;
  onClose: () => void;
  onOpenAdmin: () => void;
}

export function Sidebar({
  active,
  setActive,
  isOpen,
  dashboardVisible,
  onSidebarEnter,
  onSidebarLeave,
  onSidebarFocus,
  onClose,
  onOpenAdmin,
}: SidebarProps) {
  const nav: [string, string][] = [
    ["overview", "Overview"],
    ["map", "Real-time map"],
    ["field", "Field conditions"],
    ["alerts", "Community alerts"],
    ["council", "Local administration"],
  ];

  const handleNavClick = (label: string) => {
    setActive(label);
    onClose();

    const sectionIdMap: { [key: string]: string } = {
      "Overview": "section-overview",
      "Real-time map": "section-realtime-map",
      "Field conditions": "section-field-conditions",
      "Community alerts": "section-community-alerts",
    };

    const sectionId = sectionIdMap[label];
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <aside
      className={`sidebar ${isOpen ? "open" : ""} ${dashboardVisible ? "dashboard-visible" : "dashboard-hidden"}`}
      aria-label="Main navigation"
      onMouseEnter={onSidebarEnter}
      onMouseLeave={onSidebarLeave}
      onFocus={onSidebarFocus}
    >
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
          <img
            src="/HydroWise_Logo.svg"
            alt="HydroWise Logo"
            className="brand-logo-image"
            style={{
              width: "44px",
              height: "44px",
            }}
          />
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
