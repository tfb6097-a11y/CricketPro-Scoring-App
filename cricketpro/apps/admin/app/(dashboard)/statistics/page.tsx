"use client";

import { useEffect, useState } from "react";
import { fetchTopScorersAdmin, fetchTopWicketTakersAdmin, fetchTournaments, fetchPlayerTeamMap, PlayerStatRow, AdminTournament } from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";

type Tab = "batting" | "bowling" | "milestones";
const PAGE_SIZE = 5;

interface StatsData {
  battingRows: PlayerStatRow[];
  bowlingRows: PlayerStatRow[];
  teamMap: Map<string, string>;
  tournaments: AdminTournament[];
}

interface StatsFilters {
  tab: Tab;
  tournamentFilter: string;
  formatFilter: string;
  page: number;
}

export default function StatisticsPage() {
  // Data loaded together on mount, grouped into one object
  const [data, setData] = useState<StatsData>({ battingRows: [], bowlingRows: [], teamMap: new Map(), tournaments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab + filter + pagination state grouped together
  const [filters, setFilters] = useState<StatsFilters>({ tab: "batting", tournamentFilter: "All", formatFilter: "All", page: 1 });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [batting, bowling, tMap, tours] = await Promise.all([
        fetchTopScorersAdmin(100),
        fetchTopWicketTakersAdmin(100),
        fetchPlayerTeamMap(),
        fetchTournaments(),
      ]);
      setData({ battingRows: batting, bowlingRows: bowling, teamMap: tMap, tournaments: tours });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  if (loading) return <p style={{ color: "var(--cp-text-secondary)" }}>Loading statistics...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  const { battingRows, bowlingRows, teamMap, tournaments } = data;
  const { tab, tournamentFilter, formatFilter, page } = filters;

  const battingTotalPages = Math.max(1, Math.ceil(battingRows.length / PAGE_SIZE));
  const battingPaginated = battingRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const bowlingTotalPages = Math.max(1, Math.ceil(bowlingRows.length / PAGE_SIZE));
  const bowlingPaginated = bowlingRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function setTab(newTab: Tab) {
    setFilters((p) => ({ ...p, tab: newTab, page: 1 }));
  }
  function setPage(n: number) {
    setFilters((p) => ({ ...p, page: n }));
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 520px; }
        .cp-stats-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
        .cp-stats-tabs button { white-space: nowrap; }
        .cp-stats-filters { flex-wrap: wrap; }
        .cp-stats-filters > * { flex: 1; min-width: 140px; }
        .cp-stats-footer { flex-wrap: wrap; gap: 10px; }
      `}</style>

      <AdminPageHeader title="Statistics" subtitle="View and manage all statistics." />

      {/* Tabs */}
      <div className="cp-stats-tabs" style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--cp-surface-border)" }}>
        <TabButton active={tab === "batting"} onClick={() => setTab("batting")} label="Batting Leaders" />
        <TabButton active={tab === "bowling"} onClick={() => setTab("bowling")} label="Bowling Leaders" />
        <TabButton active={tab === "milestones"} onClick={() => setTab("milestones")} label="Milestones" />
      </div>

      {/* Filters */}
      <div className="cp-stats-filters" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={tournamentFilter} onChange={(e) => setFilters((p) => ({ ...p, tournamentFilter: e.target.value }))} style={inputStyle}>
          <option>All</option>
          {tournaments.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <select value={formatFilter} onChange={(e) => setFilters((p) => ({ ...p, formatFilter: e.target.value }))} style={inputStyle}>
          <option>All</option>
          <option>T20</option>
          <option>ODI</option>
          <option>TEST</option>
        </select>
      </div>

      {(tournamentFilter !== "All" || formatFilter !== "All") && (
        <p className="cp-text-secondary" style={{ fontSize: 12, marginBottom: 10 }}>
          Note: career stats are currently career-wide — per-tournament/format breakdown is a future enhancement.
        </p>
      )}

      <div className="cp-card">
        {tab === "batting" && (
          <>
            <div className="cp-table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Rank", "Player", "Team", "Runs", "Matches", "Average", "SR"].map((h) => (
                    <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {battingPaginated.map((r, i) => {
                    const sr = r.ballsFaced > 0 ? ((r.runsScored / r.ballsFaced) * 100).toFixed(1) : "0.0";
                    const avg = r.matchesPlayed > 0 ? (r.runsScored / r.matchesPlayed).toFixed(2) : "0.00";
                    return (
                      <tr key={r.playerId}>
                        <td style={cellStyle}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td style={cellStyle} className="cp-text-primary" >{r.player?.name ?? "—"}</td>
                        <td style={cellStyle} className="cp-text-secondary">{teamMap.get(r.playerId) ?? "—"}</td>
                        <td style={cellStyle} className="cp-stat-number">{r.runsScored}</td>
                        <td style={cellStyle} className="cp-stat-number">{r.matchesPlayed}</td>
                        <td style={cellStyle} className="cp-stat-number">{avg}</td>
                        <td style={cellStyle} className="cp-stat-number">{sr}</td>
                      </tr>
                    );
                  })}
                  {battingPaginated.length === 0 && (
                    <tr><td colSpan={7} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No batting stats yet — complete a match first.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter total={battingRows.length} page={page} setPage={setPage} totalPages={battingTotalPages} label="players" />
          </>
        )}

        {tab === "bowling" && (
          <>
            <div className="cp-table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Rank", "Player", "Team", "Matches", "Wickets"].map((h) => (
                    <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {bowlingPaginated.map((r, i) => (
                    <tr key={r.playerId}>
                      <td style={cellStyle}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td style={cellStyle}>{r.player?.name ?? "—"}</td>
                      <td style={cellStyle} className="cp-text-secondary">{teamMap.get(r.playerId) ?? "—"}</td>
                      <td style={cellStyle} className="cp-stat-number">{r.matchesPlayed}</td>
                      <td style={cellStyle} className="cp-stat-number">{r.wicketsTaken}</td>
                    </tr>
                  ))}
                  {bowlingPaginated.length === 0 && (
                    <tr><td colSpan={5} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No bowling stats yet — complete a match first.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter total={bowlingRows.length} page={page} setPage={setPage} totalPages={bowlingTotalPages} label="players" />
          </>
        )}
        {tab === "milestones" && (
          <div className="cp-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Player", "Team", "100s", "50s"].map((h) => (
                  <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {battingRows.filter((r) => r.hundreds > 0 || r.fifties > 0).map((r) => (
                  <tr key={r.playerId}>
                    <td style={cellStyle}>{r.player?.name ?? "—"}</td>
                    <td style={cellStyle} className="cp-text-secondary">{teamMap.get(r.playerId) ?? "—"}</td>
                    <td style={cellStyle} className="cp-stat-number">{r.hundreds}</td>
                    <td style={cellStyle} className="cp-stat-number">{r.fifties}</td>
                  </tr>
                ))}
                {battingRows.filter((r) => r.hundreds > 0 || r.fifties > 0).length === 0 && (
                  <tr><td colSpan={4} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No milestones reached yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PaginationFooter({ total, page, setPage, totalPages, label }: { total: number; page: number; setPage: (n: number) => void; totalPages: number; label: string }) {
  return (
    <div className="cp-stats-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
      <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>
        Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} {label}
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
          <button key={n} onClick={() => setPage(n)} style={{ ...pageButtonStyle, background: n === page ? "var(--cp-accent-primary)" : "var(--cp-bg)", color: n === page ? "#0b0e11" : "var(--cp-text-secondary)" }}>
            {n}
          </button>
        ))}
      </div>
    </div>
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
        padding: "10px 16px",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid var(--cp-surface-border)", whiteSpace: "nowrap" };
const cellStyle: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };
const inputStyle: React.CSSProperties = { background: "var(--cp-bg)", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "8px 10px", color: "var(--cp-text-primary)", fontSize: 13 };
const pageButtonStyle: React.CSSProperties = { border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "4px 9px", fontSize: 12, cursor: "pointer" };