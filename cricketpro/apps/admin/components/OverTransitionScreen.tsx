"use client";

import { useState } from "react";

interface Props {
  overNumber: number;
  thisOverRuns: number;
  thisOverWickets: number;
  thisOverExtras: number;
  totalRuns: number;
  totalWickets: number;
  totalOvers: string;
  crr: string;
  rrr: string;
  target: number | null;
  bowlingTeamPlayers: { id: string; name: string }[];
  lastOverBowlerId: string | null;
  onStartNextOver: (bowlerId: string) => void;
}

export function OverTransitionScreen({
  overNumber, thisOverRuns, thisOverWickets, thisOverExtras,
  totalRuns, totalWickets, totalOvers, crr, rrr, target,
  bowlingTeamPlayers, lastOverBowlerId, onStartNextOver,
}: Props) {
  const [selectedBowlerId, setSelectedBowlerId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!selectedBowlerId) {
      setError("Select the next bowler");
      return;
    }
    if (selectedBowlerId === lastOverBowlerId) {
      setError("This bowler just finished the last over — pick someone else");
      return;
    }
    onStartNextOver(selectedBowlerId);
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span className="cp-text-secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>End of Over</span>
          <span style={{ color: "var(--cp-accent-primary)", fontSize: 12, fontWeight: 700 }}>Over {overNumber} Completed ✓</span>
        </div>

        <h2 style={{ textAlign: "center", margin: "12px 0 4px", fontSize: 20 }}>{overNumber} Overs Completed</h2>
        <p className="cp-stat-number" style={{ textAlign: "center", margin: "0 0 20px", fontSize: 22, fontWeight: 800 }}>
          {totalRuns}/{totalWickets}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div className="cp-card" style={{ background: "var(--cp-bg)" }}>
            <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>Over Summary</p>
            <SummaryRow label="Runs" value={thisOverRuns} />
            <SummaryRow label="Wickets" value={thisOverWickets} />
            <SummaryRow label="Extras" value={thisOverExtras} />
            <SummaryRow label="Total" value={totalRuns} bold />
          </div>
          <div className="cp-card" style={{ background: "var(--cp-bg)" }}>
            <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>Match Summary</p>
            <SummaryRow label="Total Overs" value={totalOvers} />
            <SummaryRow label="Total Runs" value={totalRuns} />
            <SummaryRow label="Wickets" value={totalWickets} />
            <SummaryRow label="CRR" value={crr} />
            <SummaryRow label="RRR" value={rrr} />
            {target && <SummaryRow label="Target" value={target} />}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--cp-text-secondary)", marginBottom: 6 }}>Next Bowler</label>
          <select
            value={selectedBowlerId}
            onChange={(e) => { setSelectedBowlerId(e.target.value); setError(null); }}
            style={inputStyle}
          >
            <option value="">Select next bowler...</option>
            {bowlingTeamPlayers.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === lastOverBowlerId}>
                {p.name} {p.id === lastOverBowlerId ? "(bowled last over)" : ""}
              </option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="cp-text-secondary" style={{ fontSize: 12 }}>Next Over: {overNumber + 1}</span>
          <button onClick={handleConfirm} style={confirmButtonStyle}>START NEXT OVER</button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string | number; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
      <span className="cp-text-secondary">{label}</span>
      <span className="cp-stat-number" style={{ fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 65, fontFamily: "Inter, system-ui, sans-serif" };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--cp-surface)", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "9px 10px", color: "var(--cp-text-primary)", fontSize: 13 };
const confirmButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#0b0e11", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 };