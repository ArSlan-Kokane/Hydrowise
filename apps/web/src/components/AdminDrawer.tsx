import React from "react";
import { Icon } from "./Icons";

interface AdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
  region: string;
}

export function AdminDrawer({ isOpen, onClose, onNotify, region }: AdminDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="admin-title">
      <div className="modal-dialog" style={{ width: "min(640px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="section-kicker" style={{ marginBottom: "4px" }}>PUBLIC SYSTEMS / DISTRICT ADMINISTRATION</span>
            <h3 id="admin-title">{region} Water Resource Board</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close administration dialog">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body" style={{ gap: "20px" }}>
          {/* Executive status cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            <div style={{ background: "var(--bg-base)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-default)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "var(--text-muted)", display: "block" }}>ALLOCATION CAP</span>
              <b style={{ fontFamily: "var(--font-mono)", fontSize: "18px", color: "var(--text-primary)" }}>78%</b>
              <small style={{ display: "block", color: "var(--green-bright)", fontSize: "9.5px", marginTop: "2px" }}>Within safe limit</small>
            </div>
            <div style={{ background: "var(--bg-base)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-default)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "var(--text-muted)", display: "block" }}>EMERGENCY TANKERS</span>
              <b style={{ fontFamily: "var(--font-mono)", fontSize: "18px", color: "var(--warning-primary)" }}>14 / 16</b>
              <small style={{ display: "block", color: "var(--text-muted)", fontSize: "9.5px", marginTop: "2px" }}>Standby deployment</small>
            </div>
            <div style={{ background: "var(--bg-base)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-default)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "var(--text-muted)", display: "block" }}>BOREWELL LICENSES</span>
              <b style={{ fontFamily: "var(--font-mono)", fontSize: "18px", color: "var(--critical-primary)" }}>PAUSED</b>
              <small style={{ display: "block", color: "var(--text-muted)", fontSize: "9.5px", marginTop: "2px" }}>Sec 144 Water Order</small>
            </div>
          </div>

          {/* Panchayat Quota Table */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <b style={{ fontSize: "12.5px", color: "var(--text-primary)" }}>Gram Panchayat Quotas & Priority Wards</b>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>Cycle: Sep 2026</span>
            </div>

            <div style={{ border: "1px solid var(--border-default)", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border-default)", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>
                    <th style={{ padding: "8px 12px" }}>WARD / CLUSTER</th>
                    <th style={{ padding: "8px 12px" }}>TARGET POP.</th>
                    <th style={{ padding: "8px 12px" }}>DAILY ALLOTMENT</th>
                    <th style={{ padding: "8px 12px" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--border-faint)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 }}>Bhairavpur Cluster</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>2,400</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>140 kL / day</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--warning-primary)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>Watch (Handpump)</span></td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--border-faint)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 }}>Khera North & South</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>1,800</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>110 kL / day</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--green-bright)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>Normal (Canal)</span></td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--border-faint)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 }}>South Ward Industrial Perimeter</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>3,200</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>220 kL / day</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--critical-primary)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>Drawdown Cap</span></td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 }}>Chandpura Agricultural Belt</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>1,600</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>95 kL / day</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--green-bright)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>Stable Aquifer</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: "rgba(34, 199, 201, 0.05)", border: "1px solid rgba(34, 199, 201, 0.2)", borderRadius: "8px", padding: "12px 14px" }}>
            <b style={{ fontSize: "12px", color: "var(--aqua-bright)", display: "block", marginBottom: "4px" }}>
              District Water Magistrate Protocol Active
            </b>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.45" }}>
              Commercial extraction within 500m of monitored wells W-031 and W-057 is restricted until the monsoon arrival window stabilizes aquifer recharge.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="outline-button"
            onClick={() => {
              onNotify("Administrative roster dispatched to district office");
              onClose();
            }}
          >
            Dispatch Directives
          </button>
          <button
            className="primary-button"
            onClick={() => {
              onNotify("District Action Plan downloaded");
              onClose();
            }}
          >
            Export District Action Plan <Icon name="download" />
          </button>
        </div>
      </div>
    </div>
  );
}
