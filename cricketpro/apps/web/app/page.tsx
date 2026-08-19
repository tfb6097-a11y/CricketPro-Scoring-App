"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAllMatches,
  fetchTopScorers,
  fetchTopWicketTakers,
  PublicMatch,
} from "../lib/api-client";
import { LiveMatchCard } from "../components/LiveMatchCard";
import { ResultCard } from "../components/ResultCard";
import { FixtureCard } from "../components/FixtureCard";

export default function HomePage() {
  const [matches, setMatches] = useState<PublicMatch[]>([]);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [topBowlers, setTopBowlers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllMatches(), fetchTopScorers(3), fetchTopWicketTakers(3)])
      .then(([m, ts, tb]) => {
        setMatches(m);
        setTopScorers(ts);
        setTopBowlers(tb);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="cp-text-secondary" style={{ fontSize: 14 }}>Loading...</p>
      </main>
    );
  }

  const live = matches.filter((m) => m.status === "LIVE");
  const completed = matches.filter((m) => m.status === "COMPLETED").slice(0, 4);
  const upcoming = matches.filter((m) => m.status === "UPCOMING").slice(0, 4);

  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1400, margin: "0 auto", padding: "0 24px 60px" }}>
      <style>{`
        .cp-home-hero {
          position: relative;
          padding: 28px 0 24px;
          margin-bottom: 8px;
          overflow: hidden;
        }
        .cp-home-hero::before {
          content: "";
          position: absolute;
          top: -120px;
          left: -80px;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0) 70%);
          pointer-events: none;
        }
        .cp-section { margin-bottom: 36px; position: relative; z-index: 1; }
        .cp-section-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 16px;
        }
        .cp-section-title {
          font-size: 17px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .cp-section-bar {
          width: 4px;
          height: 16px;
          border-radius: 2px;
          background: var(--cp-accent-primary);
          display: inline-block;
        }
        .cp-section-link {
          font-size: 12.5px;
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }
        .cp-section-link:hover { opacity: 0.7; }
        .cp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .cp-scroll-row {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding-bottom: 6px;
          scroll-snap-type: x proximity;
        }
        .cp-scroll-row > * { scroll-snap-align: start; flex-shrink: 0; }
        .cp-card-hover { transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
        .cp-card-hover:hover {
          transform: translateY(-3px);
          border-color: var(--cp-accent-primary);
          box-shadow: 0 10px 28px rgba(0,0,0,0.35);
        }
        .cp-empty-box {
          border: 1px dashed var(--cp-surface-border);
          border-radius: var(--cp-radius-inner, 10px);
          padding: 28px 20px;
          text-align: center;
        }
        .cp-leaders-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 640px) {
          .cp-leaders-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cp-home-hero">
        <p className="cp-text-secondary" style={{ fontSize: 12.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          {live.length > 0 ? `${live.length} match${live.length > 1 ? "es" : ""} in progress` : "Today's cricket, live"}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.02em" }}>
          Scores, stats &amp; fixtures — all in one place
        </h1>
      </div>

      <SectionHeader title="Live Matches" href="/live" />
      {live.length > 0 ? (
        <div className="cp-section">
          <div className="cp-grid">
            {live.map((m) => <LiveMatchCard key={m.id} match={m} />)}
          </div>
        </div>
      ) : (
        <div className="cp-section">
          <Empty text="No live matches right now — check back during match hours." />
        </div>
      )}

      <SectionHeader title="Recent Results" href="/live" />
      <div className="cp-section">
        {completed.length > 0 ? (
          <div className="cp-scroll-row">
            {completed.map((m) => <ResultCard key={m.id} match={m} />)}
          </div>
        ) : (
          <Empty text="No completed matches yet." />
        )}
      </div>

      <SectionHeader title="Upcoming Fixtures" href="/live" />
      <div className="cp-section">
        {upcoming.length > 0 ? (
          <div className="cp-scroll-row">
            {upcoming.map((m) => <FixtureCard key={m.id} match={m} />)}
          </div>
        ) : (
          <Empty text="No upcoming fixtures scheduled." />
        )}
      </div>

      <div className="cp-leaders-grid">
        <LeadersCard title="Top Scorers" rows={topScorers} valueKey="runsScored" />
        <LeadersCard title="Top Wicket Takers" rows={topBowlers} valueKey="wicketsTaken" />
      </div>
    </main>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="cp-section-head">
      <h2 className="cp-section-title">
        <span className="cp-section-bar" />
        {title}
      </h2>
      <Link href={href} className="cp-section-link cp-text-secondary">
        View All →
      </Link>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="cp-empty-box">
      <p className="cp-text-secondary" style={{ fontSize: 13, margin: 0 }}>{text}</p>
    </div>
  );
}

function LeadersCard({ title, rows, valueKey }: { title: string; rows: any[]; valueKey: "runsScored" | "wicketsTaken" }) {
  return (
    <div className="cp-card">
      <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="cp-section-bar" />
        {title}
      </h3>
      {rows.length > 0 ? (
        rows.map((s, i) => (
          <RankRow key={s.playerId} rank={i + 1} name={s.player?.name ?? "—"} value={s[valueKey]} />
        ))
      ) : (
        <p className="cp-text-secondary" style={{ fontSize: 13 }}>No stats yet.</p>
      )}
    </div>
  );
}

function RankRow({ rank, name, value }: { rank: number; name: string; value: number }) {
  const isTop = rank === 1;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--cp-surface-border)",
        fontSize: 13.5,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            background: isTop ? "var(--cp-accent-primary)" : "rgba(255,255,255,0.06)",
            color: isTop ? "#03130a" : "var(--cp-text-secondary)",
          }}
        >
          {rank}
        </span>
        <span className={isTop ? "" : "cp-text-secondary"} style={{ fontWeight: isTop ? 600 : 400 }}>
          {name}
        </span>
      </span>
      <span className="cp-stat-number" style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}