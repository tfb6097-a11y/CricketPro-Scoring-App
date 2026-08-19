"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Map common shortCodes to flag emoji — extend as more teams get added
const FLAG_MAP: Record<string, string> = {
  AFG: "🇦🇫", AUS: "🇦🇺", BAN: "🇧🇩", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  IND: "🇮🇳", NZ: "🇳🇿", PAK: "🇵🇰", RSA: "🇿🇦",
  SL: "🇱🇰", ZIM: "🇿🇼", WI: "🌴", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  IRE: "🇮🇪", NED: "🇳🇱", UAE: "🇦🇪", NEP: "🇳🇵",
};

function getFlag(shortCode: string) {
  return FLAG_MAP[shortCode?.toUpperCase()] ?? "🏏";
}

export default function TeamsListPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/teams`)
      .then((r) => r.json())
      .then(setTeams)
      .finally(() => setLoading(false));
  }, []);

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.shortCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main style={{ padding: "32px 24px 60px", fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .cp-teams-hero { margin-bottom: 28px; }
        .cp-teams-hero h1 {
          font-size: 28px; font-weight: 800; margin: 0 0 6px;
          letter-spacing: -0.5px;
        }
        .cp-teams-search {
          width: 100%; max-width: 320px; margin-top: 18px;
          background: var(--cp-bg); border: 1px solid var(--cp-surface-border);
          border-radius: var(--cp-radius-inner); padding: 10px 14px;
          color: var(--cp-text-primary); font-size: 13.5; outline: none;
          transition: border-color 0.15s ease;
        }
        .cp-teams-search:focus { border-color: var(--cp-accent-primary); }
        .cp-teams-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .cp-team-card {
          position: relative; overflow: hidden;
          background: linear-gradient(155deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          border: 1px solid var(--cp-surface-border);
          border-radius: 14px; padding: 22px 18px;
          display: flex; flex-direction: column; gap: 14px;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .cp-team-card:hover {
          transform: translateY(-3px);
          border-color: var(--cp-accent-primary);
          box-shadow: 0 10px 28px -12px rgba(0, 200, 120, 0.35);
        }
        .cp-team-flag {
          width: 52px; height: 52px; border-radius: 12px;
          background: var(--cp-bg); border: 1px solid var(--cp-surface-border);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; flex-shrink: 0;
        }
        .cp-team-name {
          font-weight: 700; font-size: 15px; line-height: 1.3; margin: 0;
        }
        .cp-team-code {
          display: inline-block; margin-top: 6px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.6px;
          color: var(--cp-accent-primary); text-transform: uppercase;
        }
        .cp-empty {
          text-align: center; padding: 60px 20px; color: var(--cp-text-secondary);
        }
      `}</style>

      <div className="cp-teams-hero">
        <h1>Teams</h1>
        <p className="cp-text-secondary" style={{ margin: 0, fontSize: 14 }}>
          {teams.length} national squads competing across active tournaments.
        </p>
        <input
          className="cp-teams-search"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="cp-text-secondary">Loading teams...</p>
      ) : filtered.length === 0 ? (
        <div className="cp-empty">
          <p style={{ fontSize: 15, margin: 0 }}>No teams match "{search}".</p>
        </div>
      ) : (
        <div className="cp-teams-grid">
          {filtered.map((t) => (
            <Link key={t.id} href={`/teams/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="cp-team-card">
                <div
                  className="cp-team-flag"
                  style={t.logoUrl ? { background: `url(${t.logoUrl}) center/cover`, fontSize: 0 } : undefined}
                >
                  {!t.logoUrl && getFlag(t.shortCode)}
                </div>
                <div>
                  <p className="cp-team-name">{t.name}</p>
                  <span className="cp-team-code">{t.shortCode}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}