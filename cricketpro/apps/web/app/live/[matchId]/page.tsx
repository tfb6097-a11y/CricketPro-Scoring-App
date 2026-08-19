"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  fetchMatchDetail, fetchCommentary, fetchScorecard, fetchPlayingXI, fetchManhattanData,
  computeResultLine, PublicMatch, PublicPlayingXIEntry, PublicManhattanInnings,
} from "../../../lib/api-client";
import { useSocket } from "../../../hooks/useSocket";
import { LivePill } from "@crickpro/ui";

type Tab = "commentary" | "scorecard" | "squads" | "stats" | "graphs";
type Team = PublicMatch["teamA"];

const TABS: { key: Tab; label: string }[] = [
  { key: "commentary", label: "Commentary" },
  { key: "scorecard", label: "Scorecard" },
  { key: "squads", label: "Squads" },
  { key: "stats", label: "Stats" },
  { key: "graphs", label: "Graphs" },
];

function ballStyle(c: any) {
  if (c.isWicket) return { bg: "var(--cp-danger)", fg: "#0b0e11" };
  if (c.runsOffBat === 6) return { bg: "#f5a524", fg: "#0b0e11" };
  if (c.runsOffBat === 4) return { bg: "var(--cp-accent-secondary)", fg: "#0b0e11" };
  if (c.runsOffBat > 0) return { bg: "var(--cp-accent-primary)", fg: "#0b0e11" };
  return { bg: "var(--cp-bg)", fg: "var(--cp-text-secondary)" };
}

function colorForCode(code: string) {
  const palette = ["#2dd4bf", "#f59e0b", "#60a5fa", "#f472b6", "#a78bfa", "#4ade80"];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function LiveMatchPage() {
  const params = useParams();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<PublicMatch | null>(null);
  const [commentary, setCommentary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("commentary");

  // Lazily loaded per-tab data — fetched once, on first visit to that tab.
  const [scorecard, setScorecard] = useState<any>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [squadA, setSquadA] = useState<PublicPlayingXIEntry[] | null>(null);
  const [squadB, setSquadB] = useState<PublicPlayingXIEntry[] | null>(null);
  const [squadsLoading, setSquadsLoading] = useState(false);
  const [manhattan, setManhattan] = useState<PublicManhattanInnings[] | null>(null);
  const [manhattanLoading, setManhattanLoading] = useState(false);

  const { socketRef } = useSocket(matchId);

  const loadData = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([fetchMatchDetail(matchId), fetchCommentary(matchId)]);
      setMatch(m);
      setCommentary(c);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = () => loadData();
    socket.on("ball:update", handler);
    return () => {
      socket.off("ball:update", handler);
    };
  }, [socketRef, loadData]);

  // Load Scorecard/Squads/Graphs data only when the person actually opens
  // that tab — no point fetching it upfront on every page load.
  useEffect(() => {
    if (tab === "scorecard" && !scorecard && !scorecardLoading) {
      setScorecardLoading(true);
      fetchScorecard(matchId).then(setScorecard).finally(() => setScorecardLoading(false));
    }
    if (tab === "squads" && !squadA && !squadsLoading && match) {
      setSquadsLoading(true);
      Promise.all([fetchPlayingXI(matchId, match.teamA.id), fetchPlayingXI(matchId, match.teamB.id)])
        .then(([a, b]) => { setSquadA(a); setSquadB(b); })
        .finally(() => setSquadsLoading(false));
    }
    if ((tab === "stats" || tab === "graphs") && !manhattan && !manhattanLoading) {
      setManhattanLoading(true);
      fetchManhattanData(matchId).then(setManhattan).finally(() => setManhattanLoading(false));
    }
    // Stats tab also needs the scorecard for batting/bowling breakdowns.
    if (tab === "stats" && !scorecard && !scorecardLoading) {
      setScorecardLoading(true);
      fetchScorecard(matchId).then(setScorecard).finally(() => setScorecardLoading(false));
    }
  }, [tab, matchId, match, scorecard, scorecardLoading, squadA, squadsLoading, manhattan, manhattanLoading]);

  if (loading) return <main style={{ padding: 24, color: "var(--cp-text-secondary)" }}>Loading match...</main>;
  if (!match) return <main style={{ padding: 24, color: "var(--cp-danger)" }}>Match not found.</main>;

  const innings = match.innings ?? [];
  const sortedInnings = [...innings].sort((a, b) => (a.inningsNumber ?? 0) - (b.inningsNumber ?? 0));
  const currentInnings = sortedInnings.find((i) => !i.isCompleted) ?? sortedInnings[sortedInnings.length - 1];
  const currentIdx = sortedInnings.findIndex((i) => i.id === currentInnings?.id);
  const priorInnings = currentIdx > 0 ? sortedInnings[currentIdx - 1] : undefined;

  const battingTeam: Team = currentInnings?.battingTeamId === match.teamA.id ? match.teamA : match.teamB;
  const bowlingTeam: Team = battingTeam.id === match.teamA.id ? match.teamB : match.teamA;

  const oversLimit = match.tournament?.oversPerInnings ?? 20;
  const oversDecimal = currentInnings ? oversToDecimal(currentInnings.oversBowled) : 0;
  const crr = currentInnings && oversDecimal > 0 ? (currentInnings.totalRuns / oversDecimal).toFixed(2) : "0.00";

  let rrr = "—";
  let statusLine = "";
  const resultLine = computeResultLine(match);

  if (match.status === "COMPLETED" && resultLine) {
    statusLine = resultLine;
  } else if (currentInnings?.targetRuns != null) {
    const remainingRuns = currentInnings.targetRuns - currentInnings.totalRuns;
    const remainingOvers = oversLimit - oversDecimal;
    rrr = remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : "0.00";
    const ballsRemaining = Math.max(oversLimit * 6 - oversToBalls(currentInnings.oversBowled), 0);
    statusLine =
      remainingRuns > 0
        ? `${battingTeam.shortCode} need ${remainingRuns} run${remainingRuns === 1 ? "" : "s"} in ${ballsRemaining} ball${ballsRemaining === 1 ? "" : "s"}`
        : `${battingTeam.shortCode} have won the match`;
  }

  const lastBalls = commentary.slice(0, 6).slice().reverse();

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .cp-live-header {
          position: relative;
          overflow: hidden;
          background: linear-gradient(160deg, rgba(46, 204, 143, 0.06), rgba(255,255,255,0.02));
          border: 1px solid var(--cp-surface-border);
        }
        .cp-live-header::before {
          content: "";
          position: absolute; top: -60px; right: -60px;
          width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(46,204,143,0.14), transparent 70%);
          pointer-events: none;
        }
        .cp-live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--cp-danger);
          animation: cp-pulse 1.4s ease-in-out infinite;
        }
        @keyframes cp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .cp-share-btn {
          background: var(--cp-bg); border: 1px solid var(--cp-surface-border);
          border-radius: 999px; width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          color: var(--cp-text-secondary); cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .cp-share-btn:hover { border-color: var(--cp-accent-primary); color: var(--cp-accent-primary); }
        .cp-score-block { display: flex; flex-direction: column; gap: 8px; }
        .cp-vs-divider {
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: var(--cp-text-secondary);
          background: var(--cp-bg); border: 1px solid var(--cp-surface-border);
          border-radius: 50%; width: 34px; height: 34px; flex-shrink: 0;
        }
        .cp-last-ball {
          min-width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;
          box-shadow: 0 2px 6px -2px rgba(0,0,0,0.4);
        }
        .cp-tab-row { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--cp-surface-border); }
        .cp-tab-btn {
          background: transparent; border: none; position: relative;
          padding: 10px 16px; font-size: 13.5; font-weight: 600; cursor: pointer;
          color: var(--cp-text-secondary); transition: color 0.15s ease;
        }
        .cp-tab-btn.active { color: var(--cp-text-primary); }
        .cp-tab-btn.active::after {
          content: ""; position: absolute; left: 16px; right: 16px; bottom: -1px; height: 2px;
          background: var(--cp-accent-primary); border-radius: 2px 2px 0 0;
        }
        .cp-content-card {
          background: linear-gradient(155deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
          border: 1px solid var(--cp-surface-border); border-radius: 14px;
        }
      `}</style>

      {/* Match header card */}
      <div className="cp-card cp-live-header" style={{ marginBottom: 16, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {match.status === "LIVE" ? (
              <LivePill />
            ) : (
              <span className="cp-text-secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700 }}>
                {match.status}
              </span>
            )}
            <span className="cp-text-secondary" style={{ fontSize: 13 }}>
              {new Date(match.scheduledAt).toLocaleDateString()}
              {match.ground?.name ? ` · ${match.ground.name}` : ""}
            </span>
          </div>
        </div>

        {match.tossWinnerTeamId && match.tossDecision && (
          <p className="cp-text-secondary" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
            {match.tossWinnerTeamId === match.teamA.id ? match.teamA.name : match.teamB.name} won the toss and chose to {match.tossDecision === "BAT" ? "bat" : "bowl"}
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginTop: 22, gap: 12 }}>
          <TeamScore
            team={battingTeam}
            score={currentInnings ? `${currentInnings.totalRuns}/${currentInnings.totalWickets}` : "—"}
            caption={currentInnings ? `${currentInnings.oversBowled} Overs` : undefined}
          />
          <span className="cp-vs-divider">vs</span>
          <TeamScore
            team={bowlingTeam}
            score={priorInnings ? `${priorInnings.totalRuns}/${priorInnings.totalWickets}` : ""}
            caption={priorInnings ? `${priorInnings.oversBowled} Overs` : undefined}
            align="right"
          />
        </div>

        {statusLine && (
          <p
            style={{
              textAlign: "center",
              fontSize: 13.5,
              fontWeight: match.status === "COMPLETED" ? 700 : 500,
              color: match.status === "COMPLETED" ? "var(--cp-accent-primary)" : "var(--cp-text-primary)",
              margin: "18px 0 0",
              paddingTop: 16,
              borderTop: "1px solid var(--cp-surface-border)",
            }}
          >
            {statusLine}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.6fr",
            marginTop: 16,
            paddingTop: 16,
            borderTop: statusLine ? "none" : "1px solid var(--cp-surface-border)",
          }}
        >
          <StatCell label="CRR" value={crr} />
          <StatCell label="RRR" value={rrr} border />
          <div style={{ paddingLeft: 16, borderLeft: "1px solid var(--cp-surface-border)" }}>
            <p className="cp-text-secondary" style={{ margin: "0 0 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Last {lastBalls.length || 6} Balls
            </p>
            <div style={{ display: "flex", gap: 7 }}>
              {lastBalls.length === 0 && <span className="cp-text-secondary" style={{ fontSize: 12 }}>—</span>}
              {lastBalls.map((c, i) => {
                const s = ballStyle(c);
                return (
                  <span key={i} className="cp-last-ball" style={{ background: s.bg, color: s.fg }}>
                    {c.isWicket ? "W" : c.runsOffBat}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="cp-tab-row">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`cp-tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "commentary" && (
        <div className="cp-content-card" style={{ maxHeight: 520, overflowY: "auto", padding: 18 }}>
          {commentary.map((c, i) => {
            const s = ballStyle(c);
            return (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--cp-surface-border)" }}>
                <span
                  style={{
                    minWidth: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11.5, fontWeight: 800, background: s.bg, color: s.fg, flexShrink: 0,
                    boxShadow: "0 2px 6px -2px rgba(0,0,0,0.4)",
                  }}
                >
                  {c.isWicket ? "W" : c.runsOffBat}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5 }}>
                    {c.bowlerName} to {c.strikerName}
                    {c.extraType !== "NONE" && <span className="cp-text-secondary"> ({c.extraType})</span>}
                  </p>
                  {c.commentary && <p className="cp-text-secondary" style={{ margin: "3px 0 0", fontSize: 12.5 }}>{c.commentary}</p>}
                </div>
              </div>
            );
          })}
          {commentary.length === 0 && <p className="cp-text-secondary" style={{ fontSize: 13 }}>No balls bowled yet.</p>}
        </div>
      )}

      {tab === "scorecard" && (
        <div>
          {scorecardLoading || !scorecard ? (
            <div className="cp-content-card" style={{ padding: 18 }}><p className="cp-text-secondary" style={{ fontSize: 13 }}>Loading scorecard...</p></div>
          ) : (
            scorecard.innings.map((inn: any, i: number) => (
              <div key={i} className="cp-content-card" style={{ padding: 18, marginBottom: 14 }}>
                <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14.5 }}>
                  {inn.battingTeamName} — {inn.totalRuns}/{inn.totalWickets} ({inn.oversBowled})
                </p>
                <MiniTable
                  headers={["Batter", "Dismissal", "R", "B", "4s", "6s", "SR"]}
                  rows={inn.batting.map((b: any) => [b.playerName, b.dismissal, b.runs, b.balls, b.fours, b.sixes, b.strikeRate])}
                />
                <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", margin: "16px 0 8px" }}>Bowling</p>
                <MiniTable
                  headers={["Bowler", "O", "M", "R", "W", "Econ"]}
                  rows={inn.bowling.map((b: any) => [b.playerName, b.overs, b.maidens, b.runs, b.wickets, b.economy])}
                />
                {inn.fallOfWickets.length > 0 && (
                  <p className="cp-text-secondary" style={{ fontSize: 12, marginTop: 12 }}>
                    <strong>Fall of Wickets:</strong>{" "}
                    {inn.fallOfWickets.map((f: any) => `${f.wicketNumber}-${f.runs} (${f.playerName}, ${f.over})`).join(", ")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "squads" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {squadsLoading || !squadA || !squadB ? (
            <div className="cp-content-card" style={{ gridColumn: "1 / -1", padding: 18 }}>
              <p className="cp-text-secondary" style={{ fontSize: 13 }}>Loading squads...</p>
            </div>
          ) : (
            <>
              <SquadCard team={match.teamA} players={squadA} />
              <SquadCard team={match.teamB} players={squadB} />
            </>
          )}
        </div>
      )}

      {tab === "stats" && (
        <div className="cp-content-card" style={{ padding: 18 }}>
          {scorecardLoading || !scorecard ? (
            <p className="cp-text-secondary" style={{ fontSize: 13 }}>Loading stats...</p>
          ) : (
            <MatchStats scorecard={scorecard} />
          )}
        </div>
      )}

      {tab === "graphs" && (
        <div className="cp-content-card" style={{ padding: 18 }}>
          {manhattanLoading || !manhattan ? (
            <p className="cp-text-secondary" style={{ fontSize: 13 }}>Loading graphs...</p>
          ) : manhattan.length === 0 ? (
            <p className="cp-text-secondary" style={{ fontSize: 13 }}>No overs bowled yet.</p>
          ) : (
            <ManhattanGraph data={manhattan} />
          )}
        </div>
      )}
    </main>
  );
}

function oversToDecimal(oversStr: string): number {
  const [w, b] = oversStr.split(".");
  return (parseInt(w, 10) || 0) + (parseInt(b ?? "0", 10) || 0) / 6;
}

function oversToBalls(oversStr: string): number {
  const [w, b] = oversStr.split(".");
  return (parseInt(w, 10) || 0) * 6 + (parseInt(b ?? "0", 10) || 0);
}

function TeamScore({ team, score, caption, align }: { team: Team; score: string; caption?: string; align?: "right" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "right" ? "flex-end" : "flex-start", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: align === "right" ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
        <TeamBadge team={team} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{team.name}</p>
      </div>
      {score && (
        <p className="cp-stat-number" style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{score}</p>
      )}
      {caption && <p className="cp-text-secondary" style={{ margin: 0, fontSize: 12 }}>{caption}</p>}
    </div>
  );
}

function TeamBadge({ team }: { team: Team }) {
  const [failed, setFailed] = useState(false);
  const showLogo = team.logoUrl && !failed;

  if (showLogo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.logoUrl!}
        alt={team.name}
        onError={() => setFailed(true)}
        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--cp-surface-border)" }}
      />
    );
  }

  return (
    <span
      style={{
        width: 32, height: 32, borderRadius: "50%", background: colorForCode(team.shortCode), color: "#0b0e11",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 800, flexShrink: 0,
      }}
    >
      {team.shortCode.toUpperCase()}
    </span>
  );
}

function StatCell({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div style={{ paddingLeft: border ? 16 : 0, borderLeft: border ? "1px solid var(--cp-surface-border)" : "none" }}>
      <p className="cp-text-secondary" style={{ margin: "0 0 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</p>
      <p className="cp-stat-number" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>{headers.map((h) => <th key={h} className="cp-text-secondary" style={{ textAlign: "left", fontSize: 10.5, textTransform: "uppercase", padding: "6px 8px", borderBottom: "1px solid var(--cp-surface-border)" }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "7px 8px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 12.5 }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SquadCard({ team, players }: { team: Team; players: PublicPlayingXIEntry[] }) {
  const validPlayers = players.filter((p) => p?.player);

  return (
    <div className="cp-content-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <TeamBadge team={team} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5 }}>{team.name}</p>
      </div>
      {validPlayers.length === 0 ? (
        <p className="cp-text-secondary" style={{ fontSize: 13 }}>Playing XI not announced yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {validPlayers.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                background: "var(--cp-bg)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11.5, fontWeight: 700, border: "1px solid var(--cp-surface-border)",
              }}>
                {p.player.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.player.photoUrl} alt={p.player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  p.player.name[0]?.toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>
                  {p.player.name}
                  {p.isCaptain && <span className="cp-text-secondary" style={{ fontSize: 11, marginLeft: 5 }}>(C)</span>}
                  {p.isKeeper && <span className="cp-text-secondary" style={{ fontSize: 11, marginLeft: 5 }}>(WK)</span>}
                </p>
                <p className="cp-text-secondary" style={{ margin: 0, fontSize: 11.5 }}>{p.player.role.replace("_", " ")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchStats({ scorecard }: { scorecard: any }) {
  const allBatting = (scorecard.innings ?? []).flatMap((inn: any) => inn.batting.map((b: any) => ({ ...b, team: inn.battingTeamName })));
  const allBowling = (scorecard.innings ?? []).flatMap((inn: any) => inn.bowling);
  const topScorer = [...allBatting].sort((a, b) => b.runs - a.runs)[0];
  const topBowler = [...allBowling].sort((a, b) => b.wickets - a.wickets)[0];
  const mostSixes = [...allBatting].sort((a, b) => b.sixes - a.sixes)[0];
  const mostFours = [...allBatting].sort((a, b) => b.fours - a.fours)[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {topScorer && <StatHighlight label="Top Scorer" name={topScorer.playerName} value={`${topScorer.runs} (${topScorer.balls}b)`} />}
      {topBowler && <StatHighlight label="Best Bowling" name={topBowler.playerName} value={`${topBowler.wickets}/${topBowler.runs}`} />}
      {mostSixes && mostSixes.sixes > 0 && <StatHighlight label="Most Sixes" name={mostSixes.playerName} value={String(mostSixes.sixes)} />}
      {mostFours && mostFours.fours > 0 && <StatHighlight label="Most Fours" name={mostFours.playerName} value={String(mostFours.fours)} />}
    </div>
  );
}

function StatHighlight({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div style={{ background: "var(--cp-bg)", borderRadius: "var(--cp-radius-inner)", padding: 16, border: "1px solid var(--cp-surface-border)" }}>
      <p className="cp-text-secondary" style={{ margin: "0 0 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{name}</p>
      <p className="cp-stat-number" style={{ margin: "3px 0 0", fontSize: 19, fontWeight: 800 }}>{value}</p>
    </div>
  );
}

// Simple dependency-free bar chart (no recharts assumption) — one row per
// innings, one bar per over, height scaled to that innings' highest over.
function ManhattanGraph({ data }: { data: PublicManhattanInnings[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {data.map((inn) => {
        const maxRuns = Math.max(1, ...inn.overs.map((o) => o.runs));
        return (
          <div key={inn.inningsNumber}>
            <p style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700 }}>{inn.teamName} — Innings {inn.inningsNumber}</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
              {inn.overs.map((o) => (
                <div key={o.over} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max((o.runs / maxRuns) * 100, 4)}%`,
                      background: o.runs >= 10 ? "#f5a524" : "var(--cp-accent-primary)",
                      borderRadius: "3px 3px 0 0",
                    }}
                    title={`Over ${o.over}: ${o.runs} runs`}
                  />
                  <span className="cp-text-secondary" style={{ fontSize: 9 }}>{o.over}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </svg>
  );
}