import React from "react";
import { Icon } from "./Icons";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export function NotificationsModal({ isOpen, onClose, onNotify }: NotificationsModalProps) {
  if (!isOpen) return null;

  const alerts = [
    {
      id: "a1",
      title: "Well W-031 Watch Exceeded",
      detail: "Static water level dipped to 16.2m below surface. Drawdown rate +18% over 72h.",
      time: "24 min ago",
      level: "critical",
      source: "Telemetry Service",
    },
    {
      id: "a2",
      title: "Community Yield Reduction Reported",
      detail: "Anita Meena reported handpump yield in Bhairavpur dropped below 40%.",
      time: "1 hr ago",
      level: "warning",
      source: "Field App (Farmer)",
    },
    {
      id: "a3",
      title: "Kalu River Canal Gate Flow Restored",
      detail: "Gate maintenance completed at Sector 4. Inflow stabilized at 14.2 m³/s.",
      time: "3 hr ago",
      level: "good",
      source: "Irrigation Dept",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        right: "clamp(20px, 4vw, 56px)",
        top: "76px",
        zIndex: 110,
        width: "min(380px, calc(100vw - 32px))",
        background: "var(--bg-surface-overlay)",
        border: "1px solid var(--border-strong)",
        borderRadius: "12px",
        boxShadow: "var(--shadow-popover)",
        overflow: "hidden",
        animation: "searchSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      role="region"
      aria-label="Active environmental notifications"
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <b style={{ fontSize: "13px", color: "var(--text-primary)" }}>Environmental Signals</b>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              background: "var(--warning-primary)",
              color: "#04141E",
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: "10px",
            }}
          >
            3 active
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ color: "var(--text-muted)", padding: "4px", borderRadius: "4px" }}
          aria-label="Close notifications"
        >
          <Icon name="close" />
        </button>
      </div>

      <div style={{ maxHeight: "340px", overflowY: "auto", padding: "8px" }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              padding: "12px",
              borderRadius: "8px",
              background: "var(--bg-surface-elevated)",
              marginBottom: "6px",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  color:
                    alert.level === "critical"
                      ? "var(--critical-primary)"
                      : alert.level === "warning"
                      ? "var(--warning-primary)"
                      : "var(--green-bright)",
                  background:
                    alert.level === "critical"
                      ? "var(--critical-dim)"
                      : alert.level === "warning"
                      ? "var(--warning-dim)"
                      : "var(--green-dim)",
                }}
              >
                {alert.source}
              </span>
              <time style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "var(--text-muted)" }}>
                {alert.time}
              </time>
            </div>
            <b style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "2px" }}>{alert.title}</b>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              {alert.detail}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border-default)",
          background: "var(--bg-base)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            onNotify("All 3 active alerts acknowledged");
            onClose();
          }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10.5px",
            color: "var(--aqua-primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Acknowledge all
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-muted)" }}>
          Kalyanpur Alert Cell
        </span>
      </div>
    </div>
  );
}
