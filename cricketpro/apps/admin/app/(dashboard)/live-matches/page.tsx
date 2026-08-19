"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchFixtures, takeOverScoring, AdminFixture } from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";

export default function LiveMatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<AdminFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMatches() {
    setLoading(true);
    setError(null);
    try {
      setMatches(await fetchFixtures());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMatches(); }, []);

  async function handleOpen(matchId: string) {
    try {
      await takeOverScoring(matchId);
      router.push(`/scorer/live/${matchId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to open match");
    }
  }

  function handleView(matchId: string) {
    router.push(`/matches/${matchId}`);
  }

  if (loading) return <p style={{ color: "var(--cp-text-secondary)" }}>Loading matches...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  // Sort: LIVE first, then UPCOMING, then COMPLETED — matches reference ordering.
  const sorted = [...matches].sort((a, b) => {
    const order: Record<string, number> = { LIVE: 0, UPCOMING: 1, COMPLETED: 2, ABANDONED: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 560px; }
      `}</style>

      <AdminPageHeader title="Live Matches" subtitle="Monitor and manage all live matches." />

      <div className="cp-card">
        <div className="cp-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Match", "Score", "Status", "Scorer", "Actions"].map((h) => (
                <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.id}>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{m.teamA.shortCode} vs {m.teamB.shortCode}</td>
                  <td style={cellStyle} className="cp-stat-number">
                    {(m as any).innings?.length ? formatScore((m as any).innings) : "—"}
                  </td>
                  <td style={cellStyle}><StatusPill status={m.status} /></td>
                  <td style={cellStyle} className="cp-text-secondary">{(m as any).scoredBy?.name ?? "—"}</td>
                  <td style={cellStyle}>
    {m.status === "LIVE" ? (
      <button onClick={() => handleOpen(m.id)} style={primaryButtonStyle}>Open</button>
    ) : m.status === "COMPLETED" ? (
      <button onClick={() => handleView(m.id)} style={secondaryButtonStyle}>View</button>
    ) : (
      <span className="cp-text-secondary" style={{ fontSize: 13 }}>—</span>
    )}
  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={5} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No matches yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatScore(innings: any[]) {
  const latest = innings[innings.length - 1];
  return `${latest.totalRuns}/${latest.totalWickets} (${latest.oversBowled} ov)`;
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = { LIVE: "var(--cp-danger)", UPCOMING: "var(--cp-text-secondary)", COMPLETED: "var(--cp-accent-secondary)", ABANDONED: "var(--cp-text-secondary)" };
  return <span style={{ color: colorMap[status] ?? "var(--cp-text-secondary)", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase" }}>{status === "LIVE" && "● "}{status}</span>;
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid var(--cp-surface-border)", whiteSpace: "nowrap" };
const cellStyle: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };
const primaryButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#0b0e11", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: 12.5 };
const secondaryButtonStyle: React.CSSProperties = { background: "transparent", border: "1px solid var(--cp-surface-border)", color: "var(--cp-text-primary)", borderRadius: "var(--cp-radius-inner)", padding: "6px 14px", fontSize: 12.5, cursor: "pointer" };