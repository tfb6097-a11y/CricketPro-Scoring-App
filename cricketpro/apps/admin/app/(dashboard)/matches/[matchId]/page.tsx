"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchScorecard, fetchMatchWithInnings, downloadScorecardPdf } from "../../../../lib/api-client";
import { AdminPageHeader } from "../../../../components/layout/AdminPageHeader";
import { Download } from "lucide-react";

// Read-only match view — used when Admin clicks "View" on a COMPLETED match.
// Never shows scoring controls (RunPad/Wicket/etc.) — just the final scorecard.
export default function MatchViewPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<any>(null);
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeInnings, setActiveInnings] = useState(0);

  useEffect(() => {
    Promise.all([fetchMatchWithInnings(matchId), fetchScorecard(matchId)])
      .then(([m, sc]) => { setMatch(m); setScorecard(sc); })
      .finally(() => setLoading(false));
  }, [matchId]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadScorecardPdf(matchId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export scorecard");
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <p style={{ color: "var(--cp-text-secondary)" }}>Loading match...</p>;
  if (!match || !scorecard) return <p style={{ color: "var(--cp-danger)" }}>Match not found.</p>;

  const innings = scorecard.innings[activeInnings];

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 480px; }
        .cp-innings-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
        .cp-innings-tabs button { white-space: nowrap; }
      `}</style>

      <AdminPageHeader
        title={`${match.teamA.name} vs ${match.teamB.name}`}
        subtitle={`${match.status} · ${new Date(match.scheduledAt).toLocaleString()}`}
        actionLabel="Export PDF"
        onAction={handleExport}
      />

      {match.isTied && (
        <p style={{ color: "var(--cp-text-secondary)", fontWeight: 700, marginBottom: 16 }}>Match Tied</p>
      )}
      {match.winnerTeamId && (
        <p style={{ color: "var(--cp-accent-primary)", fontWeight: 700, marginBottom: 16 }}>
          {match.winnerTeamId === match.teamA.id ? match.teamA.name : match.teamB.name} Won
        </p>
      )}

      {scorecard.innings.length === 0 ? (
        <p className="cp-text-secondary">No scoring data for this match yet.</p>
      ) : (
        <>
          <div className="cp-innings-tabs" style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--cp-surface-border)" }}>
            {scorecard.innings.map((inn: any, i: number) => (
              <button
                key={i}
                onClick={() => setActiveInnings(i)}
                style={{
                  background: "transparent", border: "none",
                  borderBottom: activeInnings === i ? "2px solid var(--cp-accent-primary)" : "2px solid transparent",
                  color: activeInnings === i ? "var(--cp-text-primary)" : "var(--cp-text-secondary)",
                  padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                {inn.battingTeamName} Innings
              </button>
            ))}
          </div>

          <div className="cp-card" style={{ marginBottom: 16 }}>
            <p className="cp-stat-number" style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
              {innings.totalRuns}/{innings.totalWickets}
              <span className="cp-text-secondary" style={{ fontSize: 13, fontWeight: 500, marginLeft: 8 }}>({innings.oversBowled} ov)</span>
            </p>
          </div>

          <div className="cp-card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Batting</h3>
            <div className="cp-table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Batter", "Dismissal", "R", "B", "4s", "6s", "SR"].map((h) => (
                    <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
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
          </div>

          <div className="cp-card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Bowling</h3>
            <div className="cp-table-scroll">
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
          </div>

          <div className="cp-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Fall of Wickets</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {innings.fallOfWickets.map((f: any) => (
                <span key={f.wicketNumber} className="cp-text-secondary" style={{ fontSize: 12.5 }}>
                  {f.wicketNumber}-{f.runs} ({f.playerName}, {f.over})
                </span>
              ))}
              {innings.fallOfWickets.length === 0 && <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>No wickets.</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "8px 10px", borderBottom: "1px solid var(--cp-surface-border)", whiteSpace: "nowrap" };
const cellStyle: React.CSSProperties = { padding: "10px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };