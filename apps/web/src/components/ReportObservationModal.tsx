import React, { useState } from "react";
import { Icon } from "./Icons";

interface ReportObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: { reporter: string; village: string; observation: string }) => void;
}

export function ReportObservationModal({ isOpen, onClose, onSubmit }: ReportObservationModalProps) {
  const [village, setVillage] = useState("Bhairavpur");
  const [reporter, setReporter] = useState("");
  const [sourceType, setSourceType] = useState("Handpump");
  const [severity, setSeverity] = useState("Yield Reduced");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReporter = reporter.trim() || "Field Observer";
    const observationText = notes.trim()
      ? `${sourceType}: ${severity} — ${notes.trim()}`
      : `${sourceType} yield decreased; monitored threshold watch`;
    onSubmit({
      reporter: finalReporter,
      village,
      observation: observationText,
    });
    setNotes("");
    setReporter("");
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="section-kicker" style={{ marginBottom: "4px" }}>Field Telemetry Ingestion</span>
            <h3 id="report-modal-title">Report a Local Water Observation</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-field">
              <label htmlFor="rep-name">Observer Name / Designation</label>
              <input
                id="rep-name"
                placeholder="e.g. Sunita Devi (Water Warden)"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="modal-field">
                <label htmlFor="rep-village">Village Cluster</label>
                <select id="rep-village" value={village} onChange={(e) => setVillage(e.target.value)}>
                  <option value="Bhairavpur">Bhairavpur (Sector 1)</option>
                  <option value="Khera">Khera (Sector 2)</option>
                  <option value="South Ward">South Ward (Sector 3)</option>
                  <option value="Chandpura">Chandpura (Sector 4)</option>
                  <option value="Rampur">Rampur (Sector 5)</option>
                  <option value="Sultanpur">Sultanpur (Sector 6)</option>
                </select>
              </div>

              <div className="modal-field">
                <label htmlFor="rep-source">Water Source Type</label>
                <select id="rep-source" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                  <option value="Handpump">Community Handpump</option>
                  <option value="Open Well">Agricultural Open Well</option>
                  <option value="Borewell">Deep Borewell</option>
                  <option value="Canal Branch">Irrigation Canal Branch</option>
                </select>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="rep-condition">Observed Condition</label>
              <select id="rep-condition" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="Yield Reduced">Yield Reduced significantly</option>
                <option value="Water Table Dropped">Sudden Water Table Drawdown</option>
                <option value="Discolored / Turbid">Turbid / Sandy Water</option>
                <option value="Salinity Taste">Salinity / Odor Change</option>
                <option value="Normal Flow">Normal Flow Restored</option>
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="rep-notes">Field Notes & Impact</label>
              <textarea
                id="rep-notes"
                rows={3}
                placeholder="Describe extraction pressure, hours pumped, or affected households..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Submit Observation <Icon name="chevron" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
