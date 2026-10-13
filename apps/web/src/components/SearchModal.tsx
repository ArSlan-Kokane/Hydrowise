import React, { useState } from "react";
import { Icon } from "./Icons";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWell: (wellId: string) => void;
  onNotify: (msg: string) => void;
}

export function SearchModal({ isOpen, onClose, onSelectWell, onNotify }: SearchModalProps) {
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const mockEntities = [
    { type: "sensor", id: "sensor-1", name: "Sensor: Sangli Central", detail: "16.85°N, 74.58°E · Real-time telemetry" },
    { type: "sensor", id: "sensor-2", name: "Sensor: Miraj North", detail: "16.88°N, 74.55°E · Real-time telemetry" },
    { type: "sensor", id: "sensor-3", name: "Sensor: Vita East", detail: "16.82°N, 74.62°E · Real-time telemetry" },
    { type: "sensor", id: "sensor-4", name: "Sensor: Kundal South", detail: "16.78°N, 74.65°E · Real-time telemetry" },
    { type: "sensor", id: "sensor-5", name: "Sensor: Jath West", detail: "16.92°N, 74.48°E · Real-time telemetry" },
    { type: "location", id: "sangli", name: "Sangli, Maharashtra", detail: "District headquarters · Monitoring region" },
    { type: "alert", id: "alert-1", name: "Sensor Network Status", detail: "All sensors operational · Data flowing" },
  ];

  const filtered = query.trim()
    ? mockEntities.filter(
        (e) =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.detail.toLowerCase().includes(query.toLowerCase()) ||
          e.id.toLowerCase().includes(query.toLowerCase())
      )
    : mockEntities.slice(0, 5);

  return (
    <div className="search-panel" role="search" aria-label="Search interface">
      <Icon name="search" />
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sensors, locations, alerts..."
        aria-label="Search sensors, locations, and alerts"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
      <button
        onClick={onClose}
        style={{ color: "var(--text-muted)", fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}
        aria-label="Close search"
      >
        <kbd>ESC</kbd>
      </button>

      {query.trim() && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--bg-surface-overlay)",
            border: "1px solid var(--border-strong)",
            borderRadius: "0 0 10px 10px",
            marginTop: "4px",
            maxHeight: "260px",
            overflowY: "auto",
            boxShadow: "var(--shadow-popover)",
            zIndex: 120,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              No water telemetry matching "{query}"
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.type === "sensor") {
                    onSelectWell(item.id);
                    onNotify(`Focused on sensor ${item.id}`);
                  } else {
                    onNotify(`Filtered view for ${item.name}`);
                  }
                  onClose();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border-faint)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: "12.5px", color: "var(--text-primary)" }}>{item.name}</b>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      textTransform: "uppercase",
                      color: item.type === "sensor" ? "var(--aqua-primary)" : item.type === "alert" ? "var(--warning-primary)" : "var(--green-bright)",
                      background: "rgba(255,255,255,0.06)",
                      padding: "2px 5px",
                      borderRadius: "4px",
                    }}
                  >
                    {item.type}
                  </span>
                </div>
                <small style={{ color: "var(--text-muted)", fontSize: "10.5px" }}>{item.detail}</small>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
