"use client";

interface BowlerRow { playerName: string; overs: string; maidens: number; runs: number; wickets: number; economy: string; }

export function BowlerStatsTable({ bowlers, currentBowlerName }: { bowlers: BowlerRow[]; currentBowlerName: string }) {
  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--cp-text-secondary)" }}>Bowler Stats</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{["Bowler", "O", "M", "R", "W", "Econ"].map((h) => (
            <th key={h} className="cp-text-secondary" style={{ textAlign: "left", fontSize: 10.5, textTransform: "uppercase", padding: "6px 8px", borderBottom: "1px solid var(--cp-surface-border)" }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {bowlers.map((b) => (
            <tr key={b.playerName} style={{ background: b.playerName === currentBowlerName ? "var(--cp-bg)" : "transparent" }}>
              <td style={{ padding: "6px 8px", fontSize: 12.5, borderBottom: "1px solid var(--cp-surface-border)" }}>{b.playerName}</td>
              <td style={{ padding: "6px 8px", fontSize: 12.5, borderBottom: "1px solid var(--cp-surface-border)" }} className="cp-stat-number">{b.overs}</td>
              <td style={{ padding: "6px 8px", fontSize: 12.5, borderBottom: "1px solid var(--cp-surface-border)" }} className="cp-stat-number">{b.maidens}</td>
              <td style={{ padding: "6px 8px", fontSize: 12.5, borderBottom: "1px solid var(--cp-surface-border)" }} className="cp-stat-number">{b.runs}</td>
              <td style={{ padding: "6px 8px", fontSize: 12.5, borderBottom: "1px solid var(--cp-surface-border)" }} className="cp-stat-number">{b.wickets}</td>
              <td style={{ padding: "6px 8px", fontSize: 12.5, borderBottom: "1px solid var(--cp-surface-border)" }} className="cp-stat-number">{b.economy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}