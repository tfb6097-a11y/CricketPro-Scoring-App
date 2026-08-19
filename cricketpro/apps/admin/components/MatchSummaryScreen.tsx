"use client";

import { useState, useMemo } from "react";
import { Trophy, Target, Zap, PartyPopper, Award } from "lucide-react";
import { downloadScorecardPdf } from "../lib/api-client";

interface Props {
  matchId: string;
  teamAName: string;
  teamBName: string;
  teamAScore: string;
  teamBScore: string;
  winnerName: string | null;
  isTied: boolean;
  scorecard: any; // full scorecard response from /matches/:id/scorecard
  commentary?: any[]; // chronological, both innings — from /matches/:id/full-commentary
  onPublish: () => void;
  publishing: boolean;
}

type Tab = "summary" | "scorecard" | "keymoments";
type MomentIconKey = "wicket" | "six" | "four" | "fifty" | "hundred";

interface KeyMoment {
  key: string;
  iconKey: MomentIconKey;
  label: string;
  overLabel: string;
  accent: string;
}

// Builds a chronological timeline: wickets, boundaries, and 50/100 milestones.
// Personal batter totals are tracked per striker per innings using runsOffBat
// only (extras never count toward a batter's individual score).
function buildKeyMoments(commentary: any[]): KeyMoment[] {
  const moments: KeyMoment[] = [];
  const personalRuns = new Map<string, number>(); // key: `${inningsNumber}:${strikerId}`
  const milestonesHit = new Set<string>(); // key: `${inningsNumber}:${strikerId}:50` etc.

  for (const c of commentary) {
    const overLabel = `Inn ${c.inningsNumber} · Over ${c.overNumber}`;
    const runKey = `${c.inningsNumber}:${c.strikerId}`;

    if (c.isWicket) {
      moments.push({
        key: `${runKey}-${c.overNumber}-wkt-${moments.length}`,
        iconKey: "wicket",
        label: `OUT! ${c.strikerName} dismissed — ${c.bowlerName}`,
        overLabel,
        accent: "var(--cp-danger)",
      });
      personalRuns.set(runKey, 0);
      continue;
    }

    if (c.runsOffBat === 6) {
      moments.push({
        key: `${runKey}-${c.overNumber}-6-${moments.length}`,
        iconKey: "six",
        label: `SIX! ${c.strikerName} off ${c.bowlerName}`,
        overLabel,
        accent: "#f5a524",
      });
    } else if (c.runsOffBat === 4) {
      moments.push({
        key: `${runKey}-${c.overNumber}-4-${moments.length}`,
        iconKey: "four",
        label: `FOUR! ${c.strikerName} off ${c.bowlerName}`,
        overLabel,
        accent: "var(--cp-accent-secondary)",
      });
    }

    const prevTotal = personalRuns.get(runKey) ?? 0;
    const newTotal = prevTotal + c.runsOffBat;
    personalRuns.set(runKey, newTotal);

    for (const threshold of [50, 100]) {
      const milestoneKey = `${runKey}:${threshold}`;
      if (prevTotal < threshold && newTotal >= threshold && !milestonesHit.has(milestoneKey)) {
        milestonesHit.add(milestoneKey);
        moments.push({
          key: `${milestoneKey}-${moments.length}`,
          iconKey: threshold === 100 ? "hundred" : "fifty",
          label: `${threshold}! ${c.strikerName} brings up his ${threshold === 100 ? "century" : "half-century"}`,
          overLabel,
          accent: "var(--cp-accent-primary)",
        });
      }
    }
  }

  return moments;
}

function MomentIcon({ iconKey, size = 15 }: { iconKey: MomentIconKey; size?: number }) {
  switch (iconKey) {
    case "wicket": return <Target size={size} color="var(--cp-danger)" />;
    case "six": return <Zap size={size} color="#f5a524" />;
    case "four": return <Zap size={size} color="var(--cp-accent-secondary)" />;
    case "fifty": return <PartyPopper size={size} color="var(--cp-accent-primary)" />;
    case "hundred": return <Award size={size} color="var(--cp-accent-primary)" />;
  }
}

export function MatchSummaryScreen({
  matchId, teamAName, teamBName, teamAScore, teamBScore,
  winnerName, isTied, scorecard, commentary, onPublish, publishing,
}: Props) {
  const [tab, setTab] = useState<Tab>("summary");
  const [exporting, setExporting] = useState(false);

  const keyMoments = useMemo(() => buildKeyMoments(commentary ?? []), [commentary]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadScorecardPdf(matchId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export scorecard");
    } finally {
      setExporting(false);
    }
  }

  function handleShare() {
    const text = `${teamAName} ${teamAScore} vs ${teamBName} ${teamBScore} — ${isTied ? "Match Tied" : `${winnerName} won`}`;
    if (navigator.share) {
      navigator.share({ title: "CrickPro Match Summary", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("Summary copied to clipboard");
    }
  }

  const allBatting = (scorecard?.innings ?? []).flatMap((inn: any) => inn.batting.map((b: any) => ({ ...b, team: inn.battingTeamName })));
  const allBowling = (scorecard?.innings ?? []).flatMap((inn: any) => inn.bowling.map((b: any) => ({ ...b })));
  const topScorer = [...allBatting].sort((a, b) => b.runs - a.runs)[0];
  const topBowler = [...allBowling].sort((a, b) => b.wickets - a.wickets)[0];

  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 640, maxHeight: "90vh", overflowY: "auto" }}>
        <p style={{ textAlign: "center", color: isTied ? "var(--cp-text-secondary)" : "var(--cp-accent-primary)", fontWeight: 800, fontSize: 16, margin: 0, textTransform: "uppercase" }}>
          Match Completed
        </p>
        <p style={{ textAlign: "center", margin: "4px 0 20px", fontSize: 14 }}>
          {isTied ? "Match Tied" : `${winnerName} Won`}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <ScoreBlock name={teamAName} score={teamAScore} highlight={winnerName === teamAName} />
          <Trophy size={22} color="var(--cp-accent-primary)" />
          <ScoreBlock name={teamBName} score={teamBScore} align="right" highlight={winnerName === teamBName} />
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--cp-surface-border)" }}>
          <TabButton active={tab === "summary"} onClick={() => setTab("summary")} label="Summary" />
          <TabButton active={tab === "scorecard"} onClick={() => setTab("scorecard")} label="Scorecard" />
          <TabButton active={tab === "keymoments"} onClick={() => setTab("keymoments")} label="Key Moments" />
        </div>

        {tab === "summary" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="cp-card" style={{ background: "var(--cp-bg)" }}>
              <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>Match Summary</p>
              <SummaryRow label="Result" value={isTied ? "Tied" : `${winnerName} Won`} />
              {topScorer && <SummaryRow label="Top Scorer" value={`${topScorer.playerName} (${topScorer.runs})`} />}
              {topBowler && <SummaryRow label="Best Bowler" value={`${topBowler.playerName} (${topBowler.wickets}w)`} />}
            </div>
            <div className="cp-card" style={{ background: "var(--cp-bg)" }}>
              <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>Top Performers</p>
              {topScorer && (
                <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, margin: "4px 0" }}>
                  <Zap size={13} color="var(--cp-accent-secondary)" /> {topScorer.playerName} — {topScorer.runs} ({topScorer.balls}b)
                </p>
              )}
              {topBowler && (
                <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, margin: "4px 0" }}>
                  <Target size={13} color="var(--cp-danger)" /> {topBowler.playerName} — {topBowler.wickets}/{topBowler.runs}
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "scorecard" && (
          <div style={{ display: "grid", gap: 14 }}>
            {(scorecard?.innings ?? []).map((inn: any, i: number) => (
              <div key={i} className="cp-card" style={{ background: "var(--cp-bg)" }}>
                <p style={{ fontWeight: 700, marginBottom: 8 }}>{inn.battingTeamName} — {inn.totalRuns}/{inn.totalWickets} ({inn.oversBowled})</p>
                <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>Fall of Wickets</p>
                <p style={{ fontSize: 12.5 }}>
                  {inn.fallOfWickets.map((f: any) => `${f.wicketNumber}-${f.runs} (${f.playerName})`).join(", ") || "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "keymoments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflowY: "auto" }}>
            {keyMoments.length === 0 ? (
              <p className="cp-text-secondary" style={{ fontSize: 13 }}>No notable moments recorded for this match.</p>
            ) : (
              keyMoments.map((m) => (
                <div
                  key={m.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 4px",
                    borderBottom: "1px solid var(--cp-surface-border)",
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: "var(--cp-bg)",
                      border: `1px solid ${m.accent}`,
                    }}
                  >
                    <MomentIcon iconKey={m.iconKey} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: m.accent }}>{m.label}</p>
                    <p className="cp-text-secondary" style={{ margin: "2px 0 0", fontSize: 11.5 }}>{m.overLabel}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={handleExport} disabled={exporting} style={secondaryButtonStyle}>
            {exporting ? "Exporting..." : "⬇ Export Scorecard"}
          </button>
          <button onClick={handleShare} style={secondaryButtonStyle}>↗ Share Summary</button>
          <button onClick={onPublish} disabled={publishing} style={primaryButtonStyle}>
            {publishing ? "Closing..." : "Close Match"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBlock({ name, score, align, highlight }: { name: string; score: string; align?: "right"; highlight?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: align }}>
      <p className="cp-text-secondary" style={{ margin: 0, fontSize: 12 }}>{name}</p>
      <p className="cp-stat-number" style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: highlight ? "var(--cp-accent-primary)" : "var(--cp-text-primary)" }}>
        {score || "—"}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
      <span className="cp-text-secondary">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent", border: "none",
        borderBottom: active ? "2px solid var(--cp-accent-primary)" : "2px solid transparent",
        color: active ? "var(--cp-text-primary)" : "var(--cp-text-secondary)",
        padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, fontFamily: "Inter, system-ui, sans-serif" };
const primaryButtonStyle: React.CSSProperties = { flex: 1, background: "var(--cp-accent-primary)", color: "#0b0e11", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "11px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { flex: 1, background: "transparent", border: "1px solid var(--cp-surface-border)", color: "var(--cp-text-primary)", borderRadius: "var(--cp-radius-inner)", padding: "11px", fontSize: 13, cursor: "pointer" };