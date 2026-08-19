"use client";

import { useEffect, useState } from "react";
import { fetchTopScorers, fetchTopWicketTakers } from "../../lib/api-client";

type SubTab = "batting" | "bowling";

export default function StatsHubPage() {
  const [subTab, setSubTab] = useState<SubTab>("batting");
  const [batting, setBatting] = useState<any[]>([]);
  const [bowling, setBowling] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchTopScorers(20), fetchTopWicketTakers(20)])
      .then(([b, bo]) => {
        setBatting(b);
        setBowling(bo);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Stats Hub</h1>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--cp-surface-border)" }}>
        <TabButton active={subTab === "batting"} onClick={() => setSubTab("batting")} label="Batting Leaders" />
        <TabButton active={subTab === "bowling"} onClick={() => setSubTab("bowling")} label="Bowling Leaders" />
      </div>

      {loading ? (
        <p className="cp-text-secondary" style={{ fontSize: 13 }}>Loading...</p>
      ) : (
        <div className="cp-card">
          {subTab === "batting" ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Pos", "Player", "Matches", "Runs", "Avg SR", "100s", "50s"].map((h) => (
                  <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {batting.map((r, i) => {
                  const sr = r.ballsFaced > 0 ? ((r.runsScored / r.ballsFaced) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={r.playerId}>
                      <td style={cellStyle}>{i + 1}</td>
                      <td style={cellStyle}>{r.player?.name ?? "—"}</td>
                      <td style={cellStyle} className="cp-stat-number">{r.matchesPlayed}</td>
                      <td style={cellStyle} className="cp-stat-number" >{r.runsScored}</td>
                      <td style={cellStyle} className="cp-stat-number">{sr}</td>
                      <td style={cellStyle} className="cp-stat-number">{r.hundreds}</td>
                      <td style={cellStyle} className="cp-stat-number">{r.fifties}</td>
                    </tr>
                  );
                })}
                {batting.length === 0 && <tr><td colSpan={7} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No data yet.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Pos", "Player", "Matches", "Wickets"].map((h) => (
                  <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {bowling.map((r, i) => (
                  <tr key={r.playerId}>
                    <td style={cellStyle}>{i + 1}</td>
                    <td style={cellStyle}>{r.player?.name ?? "—"}</td>
                    <td style={cellStyle} className="cp-stat-number">{r.matchesPlayed}</td>
                    <td style={cellStyle} className="cp-stat-number">{r.wicketsTaken}</td>
                  </tr>
                ))}
                {bowling.length === 0 && <tr><td colSpan={4} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No data yet.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--cp-accent-primary)" : "2px solid transparent",
        color: active ? "var(--cp-text-primary)" : "var(--cp-text-secondary)",
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "10px", borderBottom: "1px solid var(--cp-surface-border)" };
const cellStyle: React.CSSProperties = { padding: "10px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };