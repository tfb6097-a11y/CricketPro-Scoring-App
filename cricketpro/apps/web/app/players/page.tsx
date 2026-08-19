"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ROLE_STYLES: Record<string, { color: string; label: string }> = {
  BATTER: { color: "#4EA1FF", label: "Batter" },
  BOWLER: { color: "#FF8A4E", label: "Bowler" },
  ALL_ROUNDER: { color: "#B07CFF", label: "All-rounder" },
  WICKET_KEEPER: { color: "#2ECC8F", label: "Wicket-keeper" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PlayersListPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch(`${API_URL}/players`)
      .then((r) => r.json())
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <main style={{ padding: "32px 24px 60px", fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .cp-players-hero { margin-bottom: 24px; }
        .cp-players-hero h1 { font-size: 28px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.5px; }
        .cp-players-controls {
          display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
          margin-top: 18px;
        }
        .cp-players-search {
          flex: 1; min-width: 220px; max-width: 320px;
          background: var(--cp-bg); border: 1px solid var(--cp-surface-border);
          border-radius: var(--cp-radius-inner); padding: 10px 14px;
          color: var(--cp-text-primary); font-size: 13.5; outline: none;
          transition: border-color 0.15s ease;
        }
        .cp-players-search:focus { border-color: var(--cp-accent-primary); }
        .cp-role-pill {
          border: 1px solid var(--cp-surface-border); background: transparent;
          color: var(--cp-text-secondary); border-radius: 999px;
          padding: 7px 14px; font-size: 12.5; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; white-space: nowrap;
        }
        .cp-role-pill.active {
          background: var(--cp-accent-primary); border-color: var(--cp-accent-primary);
          color: #06110b;
        }
        .cp-players-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 14px; margin-top: 22px;
        }
        .cp-player-card {
          background: linear-gradient(155deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          border: 1px solid var(--cp-surface-border);
          border-radius: 14px; padding: 18px 14px;
          display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .cp-player-card:hover { transform: translateY(-3px); border-color: var(--role-color, var(--cp-accent-primary)); }
        .cp-player-avatar {
          width: 54px; height: 54px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px; color: #06110b;
          background: var(--role-color, var(--cp-accent-primary));
          flex-shrink: 0;
        }
        .cp-player-name { font-weight: 700; font-size: 13.5; margin: 0; line-height: 1.3; }
        .cp-player-role {
          font-size: 10.5; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
          color: var(--role-color, var(--cp-text-secondary));
        }
        .cp-empty { text-align: center; padding: 60px 20px; color: var(--cp-text-secondary); }
      `}</style>

      <div className="cp-players-hero">
        <h1>Players</h1>
        <p className="cp-text-secondary" style={{ margin: 0, fontSize: 14 }}>
          {players.length} players across all registered squads.
        </p>
        <div className="cp-players-controls">
          <input
            className="cp-players-search"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={`cp-role-pill ${roleFilter === "ALL" ? "active" : ""}`} onClick={() => setRoleFilter("ALL")}>
            All
          </button>
          {Object.entries(ROLE_STYLES).map(([role, cfg]) => (
            <button
              key={role}
              className={`cp-role-pill ${roleFilter === role ? "active" : ""}`}
              onClick={() => setRoleFilter(role)}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="cp-text-secondary">Loading players...</p>
      ) : filtered.length === 0 ? (
        <div className="cp-empty">
          <p style={{ fontSize: 15, margin: 0 }}>No players match your filters.</p>
        </div>
      ) : (
        <div className="cp-players-grid">
          {filtered.map((p) => {
            const roleCfg = ROLE_STYLES[p.role] ?? { color: "#8A93A6", label: p.role };
            return (
              <Link key={p.id} href={`/players/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="cp-player-card" style={{ ["--role-color" as any]: roleCfg.color }}>
                  <div
                    className="cp-player-avatar"
                    style={p.photoUrl ? { background: `url(${p.photoUrl}) center/cover`, fontSize: 0 } : undefined}
                  >
                    {!p.photoUrl && getInitials(p.name)}
                  </div>
                  <p className="cp-player-name">{p.name}</p>
                  <span className="cp-player-role">{roleCfg.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}