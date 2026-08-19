"use client";

interface Entry { overNumber: number; runsOffBat: number; extraType: string; isWicket: boolean; strikerName: string; bowlerName: string; commentary?: string | null; }

export function CommentaryFeed({ entries }: { entries: Entry[] }) {
  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--cp-text-secondary)" }}>Commentary</p>
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {entries.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--cp-surface-border)" }}>
            <span className="cp-text-secondary" style={{ width: 24, flexShrink: 0, fontSize: 11, paddingTop: 4 }}>{e.overNumber}</span>
            <span
              style={{
                minWidth: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: e.isWicket ? "var(--cp-danger)" : e.runsOffBat === 6 ? "var(--cp-accent-primary)" : e.runsOffBat === 4 ? "var(--cp-accent-secondary)" : "var(--cp-bg)",
                color: e.isWicket || e.runsOffBat === 6 ? "#0b0e11" : e.runsOffBat === 4 ? "#fff" : "var(--cp-text-secondary)",
                border: !e.isWicket && e.runsOffBat !== 4 && e.runsOffBat !== 6 ? "1px solid var(--cp-surface-border)" : "none",
              }}
            >
              {e.isWicket ? "W" : e.runsOffBat === 0 ? "•" : e.runsOffBat}
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 12.5 }}>
                {e.isWicket ? "WICKET! " : e.runsOffBat === 4 ? "FOUR! " : e.runsOffBat === 6 ? "SIX! " : ""}
                {e.commentary || `${e.bowlerName} to ${e.strikerName}`}
              </p>
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="cp-text-secondary" style={{ fontSize: 12 }}>No balls bowled yet.</p>}
      </div>
    </div>
  );
}