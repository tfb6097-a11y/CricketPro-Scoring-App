"use client";

interface Props {
  venue: string;
  tossWinnerName: string;
  tossDecision: string;
  scheduledAt: string;
}

export function MatchInfoCard({ venue, tossWinnerName, tossDecision, scheduledAt }: Props) {
  const date = new Date(scheduledAt);
  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--cp-text-secondary)" }}>Match Info</p>
      <Row label="Venue" value={venue} />
      <Row label="Toss" value={`${tossWinnerName} won the toss`} />
      <Row label="Decision" value={`Chose to ${tossDecision === "BAT" ? "bat" : "bowl"}`} />
      <Row label="Date" value={date.toLocaleDateString()} />
      <Row label="Time" value={date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 12.5 }}>
      <span className="cp-text-secondary">{label}</span>
      <span>{value}</span>
    </div>
  );
}