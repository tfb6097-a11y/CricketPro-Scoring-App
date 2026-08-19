"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllMatches, PublicMatch } from "../../lib/api-client";
import { LiveMatchCard } from "../../components/LiveMatchCard";

type FilterTab = "ALL" | "LIVE" | "UPCOMING" | "COMPLETED";

export default function LiveScoresPage() {
  const [matches, setMatches] = useState<PublicMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("ALL");

  useEffect(() => {
    fetchAllMatches().then(setMatches).finally(() => setLoading(false));
  }, []);

  const live = matches.filter((m) => m.status === "LIVE");
  const upcoming = matches.filter((m) => m.status === "UPCOMING");
  const completed = matches.filter((m) => m.status === "COMPLETED");

  const showLive = filter === "ALL" || filter === "LIVE";
  const showUpcoming = filter === "ALL" || filter === "UPCOMING";
  const showCompleted = filter === "ALL" || filter === "COMPLETED";

  const nothingToShow =
    (!showLive || live.length === 0) &&
    (!showUpcoming || upcoming.length === 0) &&
    (!showCompleted || completed.length === 0);

  return (
    <main style={{ padding: "32px 24px 60px", fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        .cp-live-hero { margin-bottom: 24px; }
        .cp-live-hero h1 { font-size: 28px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.5px; }
        .cp-live-tabs { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
        .cp-live-tab {
          border: 1px solid var(--cp-surface-border); background: transparent;
          color: var(--cp-text-secondary); border-radius: 999px;
          padding: 7px 14px; font-size: 12.5; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; display: flex; align-items: center; gap: 6px;
        }
        .cp-live-tab.active { background: var(--cp-accent-primary); border-color: var(--cp-accent-primary); color: #06110b; }
        .cp-live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--cp-danger);
          animation: cp-pulse 1.4s ease-in-out infinite;
        }
        @keyframes cp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        .cp-section { margin-top: 32px; }
        .cp-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
          color: var(--cp-text-secondary); margin: 0 0 14px;
        }
        .cp-section-title .cp-live-dot { width: 7px; height: 7px; }

        .cp-match-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }

        .cp-match-card {
          background: linear-gradient(155deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          border: 1px solid var(--cp-surface-border); border-radius: 14px; padding: 18px;
          display: flex; flex-direction: column; gap: 10px;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .cp-match-card:hover { transform: translateY(-3px); border-color: var(--cp-accent-primary); }
        .cp-match-status-row { display: flex; justify-content: space-between; align-items: center; }
        .cp-match-status {
          font-size: 10.5; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
          padding: 3px 9px; border-radius: 999px;
        }
        .cp-match-teams { font-size: 15px; font-weight: 700; margin: 0; }
        .cp-match-date { font-size: 12px; margin: 0; }

        .cp-empty { text-align: center; padding: 60px 20px; color: var(--cp-text-secondary); }
      `}</style>

      <div className="cp-live-hero">
        <h1>Live Scores</h1>
        <p className="cp-text-secondary" style={{ margin: 0, fontSize: 14 }}>
          {live.length > 0 ? `${live.length} match${live.length > 1 ? "es" : ""} live right now.` : "Follow every match, live and upcoming."}
        </p>
        <div className="cp-live-tabs">
          <button className={`cp-live-tab ${filter === "ALL" ? "active" : ""}`} onClick={() => setFilter("ALL")}>All</button>
          <button className={`cp-live-tab ${filter === "LIVE" ? "active" : ""}`} onClick={() => setFilter("LIVE")}>
            <span className="cp-live-dot" /> Live
          </button>
          <button className={`cp-live-tab ${filter === "UPCOMING" ? "active" : ""}`} onClick={() => setFilter("UPCOMING")}>Upcoming</button>
          <button className={`cp-live-tab ${filter === "COMPLETED" ? "active" : ""}`} onClick={() => setFilter("COMPLETED")}>Completed</button>
        </div>
      </div>

      {loading ? (
        <p className="cp-text-secondary">Loading matches...</p>
      ) : nothingToShow ? (
        <div className="cp-empty">
          <p style={{ fontSize: 15, margin: 0 }}>No matches to show here right now.</p>
        </div>
      ) : (
        <>
          {showLive && live.length > 0 && (
            <section className="cp-section">
              <p className="cp-section-title"><span className="cp-live-dot" /> Live now</p>
              <div className="cp-match-grid">
                {live.map((m) => <LiveMatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {showUpcoming && upcoming.length > 0 && (
            <section className="cp-section">
              <p className="cp-section-title">Upcoming</p>
              <div className="cp-match-grid">
                {upcoming.map((m) => (
                  <Link key={m.id} href={`/live/${m.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="cp-match-card">
                      <div className="cp-match-status-row">
                        <span className="cp-match-status" style={{ color: "#8A93A6", background: "#8A93A61A", border: "1px solid #8A93A644" }}>
                          Upcoming
                        </span>
                      </div>
                      <p className="cp-match-teams">{m.teamA.shortCode} vs {m.teamB.shortCode}</p>
                      <p className="cp-match-date cp-text-secondary">
                        {new Date(m.scheduledAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {" · "}
                        {new Date(m.scheduledAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {showCompleted && completed.length > 0 && (
            <section className="cp-section">
              <p className="cp-section-title">Completed</p>
              <div className="cp-match-grid">
                {completed.map((m) => (
                  <Link key={m.id} href={`/scorecard/${m.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="cp-match-card">
                      <div className="cp-match-status-row">
                        <span className="cp-match-status" style={{ color: "#4EA1FF", background: "#4EA1FF1A", border: "1px solid #4EA1FF44" }}>
                          Completed
                        </span>
                      </div>
                      <p className="cp-match-teams">{m.teamA.shortCode} vs {m.teamB.shortCode}</p>
                      <p className="cp-match-date cp-text-secondary">
                        {new Date(m.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}