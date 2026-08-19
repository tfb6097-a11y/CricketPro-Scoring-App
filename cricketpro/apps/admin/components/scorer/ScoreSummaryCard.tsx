"use client";

interface Props {
  runs: number;
  wickets: number;
  overs: string;
  extras: number;
  extrasBreakdown: string;
  crr: string;
}

export function ScoreSummaryCard({ runs, wickets, overs, extras, extrasBreakdown, crr }: Props) {
  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--cp-text-secondary)" }}>Score Summary</p>
      <Row label="Runs" value={runs} />
      <Row label="Wickets" value={wickets} />
      <Row label="Overs" value={overs} />
      <Row label="Extras" value={`${extras} (${extrasBreakdown})`} />
      <Row label="CRR" value={crr} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 12.5 }}>
      <span className="cp-text-secondary">{label}</span>
      <span className="cp-stat-number" style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}