import React, { useState } from "react";
import { Icon } from "./Icons";

interface DistrictAdministrationProps {
  region: string;
  onOpenDrawer: () => void;
  onNotify: (msg: string) => void;
  onAddSignal: (signal: { reporter: string; village: string; observation: string }) => void;
}

export function DistrictAdministration({
  region,
  onOpenDrawer,
  onNotify,
  onAddSignal,
}: DistrictAdministrationProps) {
  const [tankersDeployed, setTankersDeployed] = useState(14);
  const totalTankers = 16;
  const [moratoriumActive, setMoratoriumActive] = useState(true);
  const [allocationCap, setAllocationCap] = useState(78);

  const handleDispatchTanker = () => {
    if (tankersDeployed < totalTankers) {
      const next = tankersDeployed + 1;
      setTankersDeployed(next);
      onNotify(`Emergency Tanker dispatched to priority sector. (${next}/${totalTankers} deployed)`);
    } else {
      onNotify("All emergency tankers are already in active deployment.");
    }
  };

  const handleRecallTanker = () => {
    if (tankersDeployed > 0) {
      const next = tankersDeployed - 1;
      setTankersDeployed(next);
      onNotify(`Tanker returned to standby depot. (${next}/${totalTankers} deployed)`);
    }
  };

  const handleToggleMoratorium = () => {
    const next = !moratoriumActive;
    setMoratoriumActive(next);
    onNotify(
      next
        ? "Section 144 Deep Borewell Moratorium Order RE-ENFORCED"
        : "Commercial extraction moratorium temporarily relaxed for agricultural relief"
    );
  };

  const handleBroadcastAdvisory = () => {
    onAddSignal({
      reporter: "District Water Resource Board",
      village: "All Sectors",
      observation: "OFFICIAL ADVISORY: Staggered pump scheduling in effect. Prioritize drip irrigation between 6 PM - 6 AM.",
    });
    onNotify("District Water Advisory broadcasted to all community feeds");
  };

  const handleExportPlan = () => {
    const content = `HYDRO-WISE DISTRICT GOVERNANCE PLAN\nDistrict: ${region}\nDate: ${new Date().toLocaleDateString()}\nAllocation Cap: ${allocationCap}%\nEmergency Tankers Deployed: ${tankersDeployed}/${totalTankers}\nBorewell Moratorium: ${moratoriumActive ? "ENFORCED (Sec 144)" : "LIFTED"}\n\nPanchayat Quotas:\n1. Sangli Gaonthan: 140 kL/day (Normal)\n2. Miraj Cluster: 110 kL/day (Watch)\n3. Vita Watershed: 95 kL/day (Stable)\n4. Kundal Valley: 80 kL/day (Restricted Drawdown)\n\nAuthority: Sangli District Water Resource Board`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `district-governance-plan-${region.toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify("District Governance Action Plan downloaded");
  };

  return (
    <div className="district-admin-workspace" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 3 Executive Status Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
        {/* Card 1: Allocation Cap */}
        <div className="instrument-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--text-muted)", fontWeight: 700 }}>
              ALLOCATION CAP
            </span>
            <span style={{ background: "#E7F6ED", color: "#1E8E50", fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
              SAFE CEILING
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
              {allocationCap}%
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>of permitted yield</span>
          </div>
          <div className="instrument-progress" style={{ margin: "6px 0 10px" }}>
            <div className="progress-fill" style={{ width: `${allocationCap}%`, background: "var(--green-bright)" }} />
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => {
                setAllocationCap((c) => Math.max(50, c - 5));
                onNotify("District allocation cap tightened by 5%");
              }}
              style={{ flex: 1, padding: "4px 8px", fontSize: "11px", background: "var(--bg-canvas)", border: "1px solid var(--border-default)", borderRadius: "5px", cursor: "pointer", fontWeight: 600 }}
            >
              Tighten (-5%)
            </button>
            <button
              onClick={() => {
                setAllocationCap((c) => Math.min(100, c + 5));
                onNotify("District allocation cap expanded by 5%");
              }}
              style={{ flex: 1, padding: "4px 8px", fontSize: "11px", background: "var(--bg-canvas)", border: "1px solid var(--border-default)", borderRadius: "5px", cursor: "pointer", fontWeight: 600 }}
            >
              Expand (+5%)
            </button>
          </div>
        </div>

        {/* Card 2: Emergency Tankers */}
        <div className="instrument-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--text-muted)", fontWeight: 700 }}>
              EMERGENCY TANKERS
            </span>
            <span style={{ background: "#FEF5E7", color: "#E09228", fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
              ACTIVE FLEET
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--warning-primary)" }}>
              {tankersDeployed}
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>/ {totalTankers} deployed</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "10px" }}>
            {totalTankers - tankersDeployed} tankers on standby at Sangli depot
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={handleDispatchTanker}
              style={{ flex: 1, padding: "5px 8px", fontSize: "11px", background: "#FEF5E7", color: "#B86E00", border: "1px solid #F5D399", borderRadius: "5px", cursor: "pointer", fontWeight: 700 }}
            >
              + Dispatch Tanker
            </button>
            <button
              onClick={handleRecallTanker}
              style={{ flex: 1, padding: "5px 8px", fontSize: "11px", background: "var(--bg-canvas)", border: "1px solid var(--border-default)", borderRadius: "5px", cursor: "pointer", fontWeight: 600 }}
            >
              − Recall
            </button>
          </div>
        </div>

        {/* Card 3: Borewell Moratorium */}
        <div className="instrument-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--text-muted)", fontWeight: 700 }}>
              BOREWELL MORATORIUM
            </span>
            <span style={{ background: moratoriumActive ? "#FCECEE" : "#E7F6ED", color: moratoriumActive ? "#D14343" : "#1E8E50", fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
              {moratoriumActive ? "RESTRICTED" : "UNRESTRICTED"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-mono)", color: moratoriumActive ? "#D14343" : "#22A366" }}>
              {moratoriumActive ? "ENFORCED" : "SUSPENDED"}
            </span>
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "10px" }}>
            Sec 144 Commercial Water Order
          </div>
          <button
            onClick={handleToggleMoratorium}
            style={{
              width: "100%",
              padding: "5px 8px",
              fontSize: "11px",
              background: moratoriumActive ? "var(--bg-canvas)" : "#FCECEE",
              color: moratoriumActive ? "var(--text-primary)" : "#D14343",
              border: "1px solid var(--border-default)",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {moratoriumActive ? "Relax Order" : "Enforce Moratorium"}
          </button>
        </div>
      </div>

      {/* Gram Panchayat Allocation Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <h4 style={{ margin: "0 0 2px 0", fontSize: "14px", color: "var(--text-primary)" }}>
              Gram Panchayat Water Quotas & Ward Allocations
            </h4>
            <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              Active allocation cycle across {region}
            </span>
          </div>
          <button
            onClick={handleBroadcastAdvisory}
            style={{
              padding: "6px 12px",
              fontSize: "11.5px",
              fontWeight: 600,
              background: "var(--green-primary)",
              color: "#fff",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📢</span> Broadcast Advisory
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                <th style={{ padding: "8px 10px" }}>WARD / CLUSTER</th>
                <th style={{ padding: "8px 10px" }}>POPULATION</th>
                <th style={{ padding: "8px 10px" }}>DAILY ALLOTMENT</th>
                <th style={{ padding: "8px 10px" }}>STATUS</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border-faint)" }}>
                <td style={{ padding: "10px", fontWeight: 600 }}>Sangli Gaonthan Cluster</td>
                <td style={{ padding: "10px", color: "var(--text-secondary)" }}>4,200</td>
                <td style={{ padding: "10px" }}>180 kL / day</td>
                <td style={{ padding: "10px" }}><span style={{ color: "#22A366", fontWeight: 600 }}>Stable (Canal + Well)</span></td>
                <td style={{ padding: "10px", textAlign: "right" }}>
                  <button onClick={() => onNotify("Sangli Gaonthan telemetry refreshed")} style={{ fontSize: "11px", color: "var(--green-primary)", fontWeight: 600, cursor: "pointer" }}>Verify</button>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-faint)" }}>
                <td style={{ padding: "10px", fontWeight: 600 }}>Miraj Agro-Cluster</td>
                <td style={{ padding: "10px", color: "var(--text-secondary)" }}>3,100</td>
                <td style={{ padding: "10px" }}>140 kL / day</td>
                <td style={{ padding: "10px" }}><span style={{ color: "#E09228", fontWeight: 600 }}>Watch (Drawdown)</span></td>
                <td style={{ padding: "10px", textAlign: "right" }}>
                  <button onClick={() => onNotify("Prioritized tanker route to Miraj Agro-Cluster")} style={{ fontSize: "11px", color: "var(--green-primary)", fontWeight: 600, cursor: "pointer" }}>Assign Tanker</button>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-faint)" }}>
                <td style={{ padding: "10px", fontWeight: 600 }}>Vita Watershed Belt</td>
                <td style={{ padding: "10px", color: "var(--text-secondary)" }}>2,800</td>
                <td style={{ padding: "10px" }}>115 kL / day</td>
                <td style={{ padding: "10px" }}><span style={{ color: "#D14343", fontWeight: 600 }}>Stressed (Deep Well)</span></td>
                <td style={{ padding: "10px", textAlign: "right" }}>
                  <button onClick={() => onNotify("Emergency valve opened for Vita Watershed")} style={{ fontSize: "11px", color: "var(--green-primary)", fontWeight: 600, cursor: "pointer" }}>Open Valve</button>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", fontWeight: 600 }}>Kundal Valley Settlement</td>
                <td style={{ padding: "10px", color: "var(--text-secondary)" }}>1,900</td>
                <td style={{ padding: "10px" }}>90 kL / day</td>
                <td style={{ padding: "10px" }}><span style={{ color: "#22A366", fontWeight: 600 }}>Normal Flow</span></td>
                <td style={{ padding: "10px", textAlign: "right" }}>
                  <button onClick={() => onNotify("Kundal Valley quota verified")} style={{ fontSize: "11px", color: "var(--green-primary)", fontWeight: 600, cursor: "pointer" }}>Verify</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <button
            onClick={handleExportPlan}
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              background: "var(--bg-canvas)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📄</span> Export Governance Action Plan
          </button>
          <button
            onClick={onOpenDrawer}
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              background: "var(--green-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🏛️</span> Open Detailed Administration Roster
          </button>
        </div>
      </div>
    </div>
  );
}
