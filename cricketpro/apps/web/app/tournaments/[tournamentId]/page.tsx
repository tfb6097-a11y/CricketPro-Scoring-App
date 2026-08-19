"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  fetchTournament,
  fetchTournamentFixtures,
  fetchPointsTable,
  fetchTopScorers,
  fetchTopWicketTakers,
} from "../../../lib/api-client";

type Tab = "overview" | "fixtures" | "points-table" | "teams" | "stats";

export default function TournamentHubPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [pointsTable, setPointsTable] = useState<any[]>([]);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [topBowlers, setTopBowlers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    Promise.all([
      fetchTournament(tournamentId),
      fetchTournamentFixtures(tournamentId),
      fetchPointsTable(tournamentId),
      fetchTopScorers(5),
      fetchTopWicketTakers(5),
    ])
      .then(([t, f, pt, ts, tb]) => {
        setTournament(t);
        setFixtures(f);
        setPointsTable(pt);
        setTopScorers(ts);
        setTopBowlers(tb);
      })
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <main style={{ padding: 24, color: "var(--cp-text-secondary)" }}>Loading...</main>;
  if (!tournament) return <main style={{ padding: 24, color: "var(--cp-danger)" }}>Tournament not found.</main>;

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header with logo, matching design system §3.4 Tournament Hub */}
      <div className="cp-card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--cp-radius-inner)",
            background: tournament.logoUrl ? `url(${tournament.logoUrl}) center/cover` : "var(--cp-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            flexShrink: 0,
          }}
        >
          {!tournament.logoUrl && "🏆"}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{tournament.name}</h1>
          <p className="cp-text-secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {new Date(tournament.startDate).toLocaleDateString()} – {new Date(tournament.endDate).toLocaleDateString()} · {tournament.format} · {tournament.oversPerInnings} overs
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--cp-surface-border)" }}>
        {(["overview", "fixtures", "points-table", "teams", "stats"] as Tab[]).map((t) => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)} label={t.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")} />
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, alignItems: "start" }}>
          <PointsTableMini rows={pointsTable} />
          <div style={{ display: "grid", gap: 16 }}>
            <TopList title="Top Scorers" rows={topScorers} valueKey="runsScored" />
            <TopList title="Top Bowlers" rows={topBowlers} valueKey="wicketsTaken" />
          </div>
        </div>
      )}

      {tab === "fixtures" && (
        <div style={{ display: "grid", gap: 10 }}>
          {fixtures.map((f) => (
            <Link
              key={f.id}
              href={f.status === "COMPLETED" ? `/scorecard/${f.id}` : `/live/${f.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="cp-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{f.teamA.shortCode} vs {f.teamB.shortCode}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>{new Date(f.scheduledAt).toLocaleDateString()}</span>
                  <FixtureStatusPill status={f.status} />
                </div>
              </div>
            </Link>
          ))}
          {fixtures.length === 0 && <p className="cp-text-secondary">No fixtures yet.</p>}
        </div>
      )}

      {tab === "points-table" && <PointsTableFull rows={pointsTable} />}

      {tab === "teams" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {tournament.teams.map((tt: any) => (
            <Link key={tt.team.id} href={`/teams/${tt.team.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="cp-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--cp-radius-inner)",
                    background: tt.team.logoUrl ? `url(${tt.team.logoUrl}) center/cover` : "var(--cp-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {!tt.team.logoUrl && tt.team.shortCode}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{tt.team.name}</p>
                  <p className="cp-text-secondary" style={{ margin: "2px 0 0", fontSize: 12.5 }}>{tt.team.shortCode}</p>
                </div>
              </div>
            </Link>
          ))}
          {tournament.teams.length === 0 && <p className="cp-text-secondary">No teams registered yet.</p>}
        </div>
      )}

      {tab === "stats" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <TopList title="Top Scorers" rows={topScorers} valueKey="runsScored" />
          <TopList title="Top Bowlers" rows={topBowlers} valueKey="wicketsTaken" />
        </div>
      )}
    </main>
  );
}

function FixtureStatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = { LIVE: "var(--cp-danger)", UPCOMING: "var(--cp-text-secondary)", COMPLETED: "var(--cp-accent-secondary)", ABANDONED: "var(--cp-text-secondary)" };
  return (
    <span style={{ color: colorMap[status] ?? "var(--cp-text-secondary)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
      {status === "LIVE" && "● "}{status}
    </span>
  );
}

function PointsTableMini({ rows }: { rows: any[] }) {
  return (
    <div className="cp-card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Points Table</h3>
      </div>
      <PointsTable rows={rows.slice(0, 5)} />
    </div>
  );
}

function PointsTableFull({ rows }: { rows: any[] }) {
  return (
    <div className="cp-card">
      <PointsTable rows={rows} />
    </div>
  );
}

function PointsTable({ rows }: { rows: any[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>{["Pos", "Team", "M", "W", "L", "Pts", "NRR"].map((h) => (
          <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.teamId}>
            <td style={cellStyle}>{i + 1}</td>
            <td style={cellStyle}>{r.team?.name ?? "—"}</td>
            <td style={cellStyle} className="cp-stat-number">{r.played}</td>
            <td style={cellStyle} className="cp-stat-number">{r.won}</td>
            <td style={cellStyle} className="cp-stat-number">{r.lost}</td>
            <td style={cellStyle} className="cp-stat-number">{r.points}</td>
            <td style={{ ...cellStyle, color: r.nrr >= 0 ? "var(--cp-accent-primary)" : "var(--cp-danger)" }} className="cp-stat-number">
              {r.nrr > 0 ? "+" : ""}{r.nrr}
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={7} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No data yet.</td></tr>}
      </tbody>
    </table>
  );
}

function TopList({ title, rows, valueKey }: { title: string; rows: any[]; valueKey: string }) {
  return (
    <div className="cp-card">
      <h3 style={{ marginTop: 0, fontSize: 14 }}>{title}</h3>
      {rows.map((r, i) => (
        <div key={r.playerId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13 }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: "50%",
              background: r.player?.photoUrl ? `url(${r.player.photoUrl}) center/cover` : "var(--cp-bg)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}
          >
            {!r.player?.photoUrl && r.player?.name?.[0]}
          </div>
          <span className="cp-text-secondary" style={{ flex: 1 }}>{i + 1}. {r.player?.name ?? "—"}</span>
          <span className="cp-stat-number" style={{ fontWeight: 700 }}>{r[valueKey]}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="cp-text-secondary" style={{ fontSize: 12.5, margin: 0 }}>No data yet.</p>}
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

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "8px 10px", borderBottom: "1px solid var(--cp-surface-border)" };
const cellStyle: React.CSSProperties = { padding: "10px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };