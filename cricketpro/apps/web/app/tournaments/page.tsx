"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTournaments } from "../../lib/api-client";

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  UPCOMING: { color: "#8A93A6", label: "Upcoming" },
  ONGOING: { color: "#2ECC8F", label: "Live" },
  COMPLETED: { color: "#4EA1FF", label: "Completed" },
};

const FORMAT_COLORS: Record<string, string> = {
  T20: "#FF8A4E",
  ODI: "#B07CFF",
  TEST: "#4EA1FF",
  PRACTICE: "#8A93A6",
};

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, sameYear ? opts : { ...opts, year: "numeric" })}, ${e.getFullYear()}`;
}

export default function TournamentsListPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchTournaments().then(setTournaments).finally(() => setLoading(false));
  }, []);

  const filtered = tournaments.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <main style={{ padding: "32px 24px 60px", fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .cp-tours-hero { margin-bottom: 24px; }
        .cp-tours-hero h1 { font-size: 28px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.5px; }
        .cp-tours-controls {
          display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
          margin-top: 18px;
        }
        .cp-tours-search {
          flex: 1; min-width: 220px; max-width: 320px;
          background: var(--cp-bg); border: 1px solid var(--cp-surface-border);
          border-radius: var(--cp-radius-inner); padding: 10px 14px;
          color: var(--cp-text-primary); font-size: 13.5; outline: none;
          transition: border-color 0.15s ease;
        }
        .cp-tours-search:focus { border-color: var(--cp-accent-primary); }
        .cp-status-pill {
          border: 1px solid var(--cp-surface-border); background: transparent;
          color: var(--cp-text-secondary); border-radius: 999px;
          padding: 7px 14px; font-size: 12.5; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; white-space: nowrap;
        }
        .cp-status-pill.active {
          background: var(--cp-accent-primary); border-color: var(--cp-accent-primary);
          color: #06110b;
        }
        .cp-tours-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px; margin-top: 22px;
        }
        .cp-tour-card {
          position: relative; overflow: hidden;
          background: linear-gradient(155deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          border: 1px solid var(--cp-surface-border);
          border-radius: 14px; padding: 20px;
          display: flex; flex-direction: column; gap: 14px;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .cp-tour-card:hover {
          transform: translateY(-3px);
          border-color: var(--cp-accent-primary);
          box-shadow: 0 10px 28px -12px rgba(0, 200, 120, 0.3);
        }
        .cp-tour-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .cp-tour-icon {
          width: 44px; height: 44px; border-radius: 10px;
          background: var(--cp-bg); border: 1px solid var(--cp-surface-border);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .cp-tour-status {
          font-size: 10.5; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
          padding: 4px 9px; border-radius: 999px; white-space: nowrap; flex-shrink: 0;
        }
        .cp-tour-name { margin: 0; font-weight: 700; font-size: 16px; line-height: 1.3; }
        .cp-tour-dates { margin: 4px 0 0; font-size: 12.5; }
        .cp-tour-meta {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding-top: 12px; border-top: 1px solid var(--cp-surface-border);
        }
        .cp-format-badge {
          font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
          padding: 3px 9px; border-radius: 6px;
        }
        .cp-team-count { font-size: 12px; color: var(--cp-text-secondary); }
        .cp-empty { text-align: center; padding: 60px 20px; color: var(--cp-text-secondary); }
      `}</style>

      <div className="cp-tours-hero">
        <h1>Tournaments</h1>
        <p className="cp-text-secondary" style={{ margin: 0, fontSize: 14 }}>
          {tournaments.length} tournaments — past, live, and upcoming.
        </p>
        <div className="cp-tours-controls">
          <input
            className="cp-tours-search"
            placeholder="Search tournaments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={`cp-status-pill ${statusFilter === "ALL" ? "active" : ""}`} onClick={() => setStatusFilter("ALL")}>
            All
          </button>
          {Object.entries(STATUS_STYLES).map(([status, cfg]) => (
            <button
              key={status}
              className={`cp-status-pill ${statusFilter === status ? "active" : ""}`}
              onClick={() => setStatusFilter(status)}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="cp-text-secondary">Loading tournaments...</p>
      ) : filtered.length === 0 ? (
        <div className="cp-empty">
          <p style={{ fontSize: 15, margin: 0 }}>No tournaments match your filters.</p>
        </div>
      ) : (
        <div className="cp-tours-grid">
          {filtered.map((t) => {
            const statusCfg = STATUS_STYLES[t.status] ?? { color: "#8A93A6", label: t.status };
            const formatColor = FORMAT_COLORS[t.format] ?? "#8A93A6";
            return (
              <Link key={t.id} href={`/tournaments/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="cp-tour-card">
                  <div className="cp-tour-top">
                    <div
                      className="cp-tour-icon"
                      style={t.logoUrl ? { background: `url(${t.logoUrl}) center/cover`, fontSize: 0 } : undefined}
                    >
                      {!t.logoUrl && "🏆"}
                    </div>
                    <span
                      className="cp-tour-status"
                      style={{ color: statusCfg.color, background: `${statusCfg.color}1A`, border: `1px solid ${statusCfg.color}44` }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  <div>
                    <p className="cp-tour-name">{t.name}</p>
                    <p className="cp-tour-dates cp-text-secondary">{formatDateRange(t.startDate, t.endDate)}</p>
                  </div>

                  <div className="cp-tour-meta">
                    <span
                      className="cp-format-badge"
                      style={{ color: formatColor, background: `${formatColor}1A`, border: `1px solid ${formatColor}44` }}
                    >
                      {t.format}
                    </span>
                    <span className="cp-text-secondary" style={{ fontSize: 11 }}>·</span>
                    <span className="cp-team-count">{t.oversPerInnings} overs</span>
                    <span className="cp-text-secondary" style={{ fontSize: 11 }}>·</span>
                    <span className="cp-team-count">{t.teams?.length ?? 0} teams</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}