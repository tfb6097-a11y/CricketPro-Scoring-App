"use client";

interface FOW { wicketNumber: number; runs: number; over: string; playerName: string; dismissal?: string; }

export function FallOfWicketsCard({ fallOfWickets }: { fallOfWickets: FOW[] }) {
  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--cp-text-secondary)" }}>Fall of Wickets</p>
      {fallOfWickets.map((f) => (
        <div key={f.wicketNumber} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 12.5 }}>
          <span>{f.wicketNumber}-{f.runs} <span className="cp-text-secondary">({f.over})</span></span>
          <span className="cp-text-secondary" style={{ textAlign: "right" }}>
            {f.playerName}
            {f.dismissal && <><br /><span style={{ fontSize: 11 }}>{f.dismissal}</span></>}
          </span>
        </div>
      ))}
      {fallOfWickets.length === 0 && <p className="cp-text-secondary" style={{ fontSize: 12 }}>No wickets yet.</p>}
    </div>
  );
}