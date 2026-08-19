"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchPlayer, fetchPlayerStats } from "../../../lib/api-client";

type Tab = "overview" | "career" | "milestones";

// Matches PlayersService.findOne() — raw Prisma Player row.
interface PlayerDetail {
  id: string;
  name: string;
  country: string | null;
  role: string | null; // e.g. "BATTER" | "BOWLER" | "ALL_ROUNDER" | "WICKET_KEEPER"
  photoUrl: string | null;
  dob: string | null;
  isActive: boolean;
}

// Matches the PlayerCareerStats model shape used in StatsService's upsert.
interface PlayerCareerStats {
  playerId: string;
  matchesPlayed: number;
  runsScored: number;
  ballsFaced: number;
  hundreds: number;
  fifties: number;
  wicketsTaken: number;
}

const ROLE_LABELS: Record<string, string> = {
  BATTER: "Batter",
  BOWLER: "Bowler",
  ALL_ROUNDER: "All-Rounder",
  WICKET_KEEPER: "Wicket-Keeper",
};

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = params.playerId as string;

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [stats, setStats] = useState<PlayerCareerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPlayer(playerId)
      .then((p) => {
        if (cancelled) return;
        setPlayer(p);
        // Stats may not exist yet for a player with no completed matches —
        // fetch separately so a missing stats row doesn't blank the whole page.
        return fetchPlayerStats(playerId)
          .then((s) => !cancelled && setStats(s))
          .catch(() => !cancelled && setStats(null));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load player.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (loading) {
    return (
      <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="cp-text-secondary" style={{ fontSize: 14 }}>Loading player...</p>
      </main>
    );
  }

  if (error || !player) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <div className="cp-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Player not found</p>
          <p className="cp-text-secondary" style={{ margin: "6px 0 0", fontSize: 13 }}>
            {error ?? "We couldn't find a player with this ID."}
          </p>
        </div>
      </main>
    );
  }

  const roleLabel = player.role ? ROLE_LABELS[player.role] ?? player.role : null;
  const isBowlingRole = player.role === "BOWLER" || player.role === "ALL_ROUNDER";
  const strikeRate =
    stats && stats.ballsFaced > 0 ? ((stats.runsScored / stats.ballsFaced) * 100).toFixed(1) : null;

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        .cp-pp-header { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 22px; }
        .cp-pp-avatar { width: 96px; height: 96px; border-radius: 14px; object-fit: cover; border: 1px solid var(--cp-surface-border); flex-shrink: 0; }
        .cp-pp-avatar-fallback {
          width: 96px; height: 96px; border-radius: 14px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(34,197,94,0.12); color: var(--cp-accent-primary);
          font-size: 28px; font-weight: 800; border: 1px solid var(--cp-surface-border);
        }
        .cp-pp-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--cp-surface-border); margin-bottom: 18px; overflow-x: auto; }
        .cp-pp-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 16px; margin-top: 14px; }
        .cp-pp-share-btn { background: transparent; border: 1px solid var(--cp-surface-border); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--cp-text-secondary); }
      `}</style>

      {/* Header */}
      <div className="cp-pp-header">
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photoUrl} alt={player.name} className="cp-pp-avatar" />
        ) : (
          <div className="cp-pp-avatar-fallback">
            {player.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
              {player.name}
            </h1>
            <button className="cp-pp-share-btn" aria-label="Share">
              <ShareIcon />
            </button>
          </div>

          {roleLabel && (
            <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "var(--cp-accent-primary)", fontWeight: 600 }}>
              {roleLabel}
            </p>
          )}

          {player.country && (
            <p className="cp-text-secondary" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
              {player.country}
            </p>
          )}

          {!player.isActive && (
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(148,163,184,0.15)",
                color: "var(--cp-text-secondary)",
              }}
            >
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="cp-pp-tabs">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")} label="Overview" />
        <TabButton active={tab === "career"} onClick={() => setTab("career")} label="Career Stats" />
        <TabButton active={tab === "milestones"} onClick={() => setTab("milestones")} label="Milestones" />
      </div>

      {tab === "overview" && (
        <div className="cp-card">
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Player Info</h3>
          <div className="cp-pp-stat-grid">
            <InfoBox label="Role" value={roleLabel ?? "—"} />
            <InfoBox label="Country" value={player.country ?? "—"} />
            <InfoBox
              label="Date of Birth"
              value={player.dob ? new Date(player.dob).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            />
            <InfoBox label="Status" value={player.isActive ? "Active" : "Inactive"} />
          </div>

          {stats && (
            <>
              <h3 style={{ margin: "22px 0 0", fontSize: 15, fontWeight: 700 }}>Career Snapshot</h3>
              <div className="cp-pp-stat-grid">
                <InfoBox label="Matches" value={stats.matchesPlayed} />
                <InfoBox label="Runs" value={stats.runsScored} />
                <InfoBox label="Wickets" value={stats.wicketsTaken} />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "career" && (
        <div className="cp-card">
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Career Statistics</h3>

          {!stats ? (
            <p className="cp-text-secondary" style={{ fontSize: 13, marginTop: 16 }}>
              No stats recorded yet — this player hasn't appeared in a completed match.
            </p>
          ) : (
            <>
              <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", margin: "18px 0 0" }}>
                Batting
              </p>
              <div className="cp-pp-stat-grid">
                <StatBox label="Matches" value={stats.matchesPlayed} />
                <StatBox label="Runs" value={stats.runsScored} />
                <StatBox label="Balls Faced" value={stats.ballsFaced} />
                <StatBox label="Strike Rate" value={strikeRate ?? "—"} />
                <StatBox label="100s" value={stats.hundreds} />
                <StatBox label="50s" value={stats.fifties} />
              </div>

              {isBowlingRole && (
                <>
                  <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", margin: "20px 0 0" }}>
                    Bowling
                  </p>
                  <div className="cp-pp-stat-grid">
                    <StatBox label="Matches" value={stats.matchesPlayed} />
                    <StatBox label="Wickets" value={stats.wicketsTaken} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {tab === "milestones" && (
        <div className="cp-card">
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Milestones</h3>
          {!stats || (stats.hundreds === 0 && stats.fifties === 0) ? (
            <p className="cp-text-secondary" style={{ fontSize: 13, marginTop: 14 }}>
              No century or half-century milestones yet.
            </p>
          ) : (
            <div className="cp-pp-stat-grid">
              <StatBox label="Centuries" value={stats.hundreds} />
              <StatBox label="Half-Centuries" value={stats.fifties} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="cp-text-secondary" style={{ margin: "0 0 4px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="cp-text-secondary" style={{ margin: "0 0 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </p>
      <p className="cp-stat-number" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
        {value}
      </p>
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
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </svg>
  );
}