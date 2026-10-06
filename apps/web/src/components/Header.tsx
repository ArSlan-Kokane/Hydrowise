import React, { useEffect, useState } from "react";
import { Icon } from "./Icons";

interface HeaderProps {
  active: string;
  region: string;
  onRegionChange: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  onOpenSidebar: () => void;
}

export function Header({
  active,
  region,
  onRegionChange,
  searchOpen,
  onToggleSearch,
  notificationsOpen,
  onToggleNotifications,
  onOpenSidebar,
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState("10:42 AM IST");

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        });
        setTimeStr(`${formatted} IST`);
      } catch {
        setTimeStr("10:42 AM IST");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header" role="banner">
      <div className="header-left">
        <button className="menu-button" onClick={onOpenSidebar} aria-label="Open navigation menu">
          <Icon name="menu" />
        </button>

        {/* Map Pin Breadcrumb */}
        <div className="crumb">
          <svg
            className="crumb-pin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22A366"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="crumb-org">District water office</span>
          <span className="crumb-sep">&gt;</span>
          <b className="crumb-active">{active}</b>
        </div>
      </div>

      <div className="header-actions">
        {/* Region Selector Pill with Green Beacon */}
        <button
          className="region-button"
          onClick={onRegionChange}
          aria-label={`Change region. Currently ${region}`}
        >
          <span className="region-dot" aria-hidden="true" />
          <span className="region-text">{region}</span>
          <Icon name="chevron" />
        </button>

        {/* Search Icon */}
        <button
          className="icon-button"
          onClick={onToggleSearch}
          aria-label="Search telemetry"
          aria-expanded={searchOpen}
        >
          <Icon name="search" />
        </button>

        {/* Notifications Icon with Amber Dot */}
        <button
          className="icon-button notification"
          onClick={onToggleNotifications}
          aria-label="Notifications - 3 unread"
          aria-expanded={notificationsOpen}
        >
          <Icon name="bell" />
          <i className="bell-dot" aria-hidden="true" />
        </button>

        {/* Date & Time */}
        <div className="header-date" aria-label="Current date and time">
          <div className="date-line">MON, 24 SEP 2026</div>
          <div className="header-time">{timeStr}</div>
        </div>
      </div>
    </header>
  );
}
