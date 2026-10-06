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
    { type: "well", id: "W-014", name: "Well W-014 (Bhairavpur)", detail: "Depth 8.4m · Drinking + Irrigation" },
    { type: "well", id: "W-022", name: "Well W-022 (Khera)", detail: "Depth 11.8m · Irrigation Watch" },
    { type: "well", id: "W-031", name: "Well W-031 (South Ward)", detail: "Depth 16.2m · Stressed Drawdown" },
    { type: "well", id: "W-044", name: "Well W-044 (Chandpura)", detail: "Depth 9.1m · Stable Drinking Reserve" },
    { type: "well", id: "W-057", name: "Well W-057 (Rampur)", detail: "Depth 13.6m · Agricultural Watch" },
    { type: "well", id: "W-068", name: "Well W-068 (Sultanpur)", detail: "Depth 7.9m · High Recharge Zone" },
    { type: "village", id: "Bhairavpur", name: "Bhairavpur Village Cluster", detail: "Pop: 2,400 · Handpump yield alert" },
    { type: "village", id: "Khera", name: "Khera Ward 2", detail: "Pop: 1,800 · Canal tail-end feeder" },
    { type: "alert", id: "alert-1", name: "South-east Aquifer Drawdown Watch", detail: "Telemetry threshold crossed at 08:30" },
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
        placeholder="Search wells, villages, alerts..."
        aria-label="Search wells, villages, and alerts"
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
                  if (item.type === "well") {
                    onSelectWell(item.id);
                    onNotify(`Focused on telemetry point ${item.id}`);
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
                      color: item.type === "well" ? "var(--aqua-primary)" : item.type === "alert" ? "var(--warning-primary)" : "var(--green-bright)",
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
