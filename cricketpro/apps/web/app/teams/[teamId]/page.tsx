"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchTeam, fetchTeamStats, fetchTeamFixtures } from "../../../lib/api-client";

type Tab = "overview" | "squad" | "matches" | "stats";

export default function TeamProfilePage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    Promise.all([fetchTeam(teamId), fetchTeamStats(teamId).catch(() => null)])
      .then(([t, s]) => {
        setTeam(t);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    if (tab === "matches" && fixtures.length === 0 && !fixturesLoading) {
      setFixturesLoading(true);
      fetchTeamFixtures(teamId)
        .then(setFixtures)
        .catch(() => setFixtures([]))
        .finally(() => setFixturesLoading(false));
    }
  }, [tab, teamId, fixtures.length, fixturesLoading]);

  if (loading) return <main style={{ padding: 24, color: "var(--cp-text-secondary)" }}>Loading...</main>;
  if (!team) return <main style={{ padding: 24, color: "var(--cp-danger)" }}>Team not found.</main>;

  const captain = team.players.find((p: any) => p.isCaptain);

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <div className="cp-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--cp-radius-inner)",
              background: team.logoUrl ? `url(${team.logoUrl}) center/cover` : "var(--cp-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
              color: "var(--cp-accent-primary)",
            }}
          >
            {!team.logoUrl && team.shortCode}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>{team.name}</h1>
            <p className="cp-text-secondary" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
              Captain: {captain?.player?.name ?? "—"} {team.coach && `· Coach: ${team.coach}`}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--cp-surface-border)" }}>
        {(["overview", "squad", "matches", "stats"] as Tab[]).map((t) => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)} label={t[0].toUpperCase() + t.slice(1)} />
        ))}
      </div>

      {(tab === "overview" || tab === "squad") && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Players ({team.players.length})</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {team.players.map((tp: any) => (
              <Link key={tp.player.id} href={`/players/${tp.player.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="cp-card" style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: tp.player.photoUrl ? `url(${tp.player.photoUrl}) center/cover` : "var(--cp-bg)",
                      margin: "0 auto 8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "var(--cp-text-secondary)",
                    }}
                  >
                    {!tp.player.photoUrl && tp.player.name[0]}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{tp.player.name}</p>
                  <p className="cp-text-secondary" style={{ margin: "2px 0 0", fontSize: 11 }}>
                    {tp.player.role}{tp.isCaptain ? " (C)" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div>
          {fixturesLoading ? (
            <p className="cp-text-secondary" style={{ fontSize: 13 }}>Loading matches...</p>
          ) : fixtures.length === 0 ? (
            <p className="cp-text-secondary" style={{ fontSize: 13 }}>No matches found for this team.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {fixtures.map((f: any) => {
                const opponent = f.teamAId === teamId ? f.teamB : f.teamA;
                return (
                  <Link key={f.id} href={`/live/${f.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="cp-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>
                          vs {opponent?.name ?? "—"}
                        </p>
                        <p className="cp-text-secondary" style={{ margin: "2px 0 0", fontSize: 12 }}>
                          {new Date(f.scheduledAt).toLocaleDateString()} · {f.ground?.name ?? "—"}
                          {f.tournament?.name ? ` · ${f.tournament.name}` : ""}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color:
                            f.status === "LIVE"
                              ? "var(--cp-danger)"
                              : f.status === "COMPLETED"
                              ? "var(--cp-accent-secondary)"
                              : "var(--cp-text-secondary)",
                        }}
                      >
                        {f.status === "LIVE" && "● "}
                        {f.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "stats" && (
        <div className="cp-card" style={{ maxWidth: 320 }}>
          <StatRow label="Matches Played" value={stats?.matchesPlayed ?? 0} />
          <StatRow label="Wins" value={stats?.wins ?? 0} />
          <StatRow label="Losses" value={stats?.losses ?? 0} />
          <StatRow label="Ties" value={stats?.ties ?? 0} />
        </div>
      )}
    </main>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--cp-surface-border)" }}>
      <span className="cp-text-secondary" style={{ fontSize: 13 }}>{label}</span>
      <span className="cp-stat-number" style={{ fontWeight: 700 }}>{value}</span>
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