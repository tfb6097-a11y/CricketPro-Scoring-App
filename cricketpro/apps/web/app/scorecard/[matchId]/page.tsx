"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchScorecard, fetchMatchDetail, computeResultLine, PublicMatch } from "../../../lib/api-client";

export default function ScorecardPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const [match, setMatch] = useState<PublicMatch | null>(null);
  const [data, setData] = useState<any>(null);
  const [activeInnings, setActiveInnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  Promise.all([fetchScorecard(matchId), fetchMatchDetail(matchId)])
    .then(([sc, m]) => { setData(sc); setMatch(m); })
    .finally(() => setLoading(false));
}, [matchId]);

  if (loading) return <main style={{ padding: 24, color: "var(--cp-text-secondary)" }}>Loading scorecard...</main>;
  if (!data || data.innings.length === 0) return <main style={{ padding: 24, color: "var(--cp-text-secondary)" }}>No scorecard data yet.</main>;

  const innings = data.innings[activeInnings];

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--cp-surface-border)" }}>
        {data.innings.map((inn: any, i: number) => (
          <button
            key={i}
            onClick={() => setActiveInnings(i)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: activeInnings === i ? "2px solid var(--cp-accent-primary)" : "2px solid transparent",
              color: activeInnings === i ? "var(--cp-text-primary)" : "var(--cp-text-secondary)",
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {inn.battingTeamName} Innings
          </button>
        ))}
      </div>

      <div className="cp-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{innings.battingTeamName}</h2>
        <p className="cp-stat-number" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
          {innings.totalRuns}/{innings.totalWickets}
          <span className="cp-text-secondary" style={{ fontSize: 14, fontWeight: 500, marginLeft: 8 }}>({innings.oversBowled} ov)</span>
        </p>
      </div>

      <div className="cp-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Batting</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Batter", "Dismissal", "R", "B", "4s", "6s", "SR"].map((h) => (
              <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {match && (
  <div style={{ marginBottom: 16 }}>
    {match.tossWinnerTeamId && match.tossDecision && (
      <p className="cp-text-secondary" style={{ fontSize: 13, margin: "0 0 4px" }}>
        {match.tossWinnerTeamId === match.teamA.id ? match.teamA.name : match.teamB.name} won the toss and chose to {match.tossDecision === "BAT" ? "bat" : "bowl"}
      </p>
    )}
    {computeResultLine(match) && (
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--cp-accent-primary)", margin: 0 }}>
        {computeResultLine(match)}
      </p>
    )}
  </div>
)}
            {innings.batting.map((b: any) => (
              <tr key={b.playerName}>
                <td style={cellStyle}>{b.playerName}</td>
                <td style={cellStyle} className="cp-text-secondary">{b.dismissal}</td>
                <td style={cellStyle} className="cp-stat-number">{b.runs}</td>
                <td style={cellStyle} className="cp-stat-number">{b.balls}</td>
                <td style={cellStyle} className="cp-stat-number">{b.fours}</td>
                <td style={cellStyle} className="cp-stat-number">{b.sixes}</td>
                <td style={cellStyle} className="cp-stat-number">{b.strikeRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cp-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Bowling</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Bowler", "O", "M", "R", "W", "Econ"].map((h) => (
              <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {innings.bowling.map((b: any) => (
              <tr key={b.playerName}>
                <td style={cellStyle}>{b.playerName}</td>
                <td style={cellStyle} className="cp-stat-number">{b.overs}</td>
                <td style={cellStyle} className="cp-stat-number">{b.maidens}</td>
                <td style={cellStyle} className="cp-stat-number">{b.runs}</td>
                <td style={cellStyle} className="cp-stat-number">{b.wickets}</td>
                <td style={cellStyle} className="cp-stat-number">{b.economy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cp-card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Fall of Wickets</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {innings.fallOfWickets.map((fow: any) => (
            <span key={fow.wicketNumber} className="cp-text-secondary" style={{ fontSize: 12.5 }}>
              {fow.wicketNumber}-{fow.runs} ({fow.playerName}, {fow.over})
            </span>
          ))}
          {innings.fallOfWickets.length === 0 && <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>No wickets yet.</span>}
        </div>
      </div>
    </main>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "8px 10px", borderBottom: "1px solid var(--cp-surface-border)" };
const cellStyle: React.CSSProperties = { padding: "10px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };