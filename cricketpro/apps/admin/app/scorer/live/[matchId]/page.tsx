"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Wifi, WifiOff, Clock,ChevronDown, Square, Undo2, Target } from "lucide-react";
import {
  fetchMatchWithInnings, recordBallApi, fetchScorecard, fetchPlayers, fetchCurrentState,
  fetchCommentary, fetchManhattanData, getCurrentUser, startSuperOver, abandonMatch,
  MatchWithInnings, InningsInfo, RecordBallResult, setInningsOpeners,fetchFullCommentary
} from "../../../../lib/api-client";
import { RunPad } from "../../../../components/RunPad";
import { LastSixBalls } from "../../../../components/LastSixBalls";
import { BatsmanCard } from "../../../../components/BatsmanCard";
import { BowlerCard } from "../../../../components/BowlerCard";
import { WicketDialog, DismissalType } from "../../../../components/WicketDialog";
import { OverTransitionScreen } from "../../../../components/OverTransitionScreen";
import { InningsTransitionScreen } from "../../../../components/InningsTransitionScreen";
import { MatchSummaryScreen } from "../../../../components/MatchSummaryScreen";
import { CorrectLastBallDialog } from "../../../../components/CorrectLastBallDialog";
import { MatchInfoCard } from "../../../../components/scorer/MatchInfoCard";
import { PartnershipCard } from "../../../../components/scorer/PartnershipCard";
import { ScoreSummaryCard } from "../../../../components/scorer/ScoreSummaryCard";
import { FallOfWicketsCard } from "../../../../components/scorer/FallOfWicketsCard";
import { BowlerStatsTable } from "../../../../components/scorer/BowlerStatsTable";
import { CommentaryFeed } from "../../../../components/scorer/CommentaryFeed";
import { ManhattanChart } from "../../../../components/scorer/ManhattanChart";
import { RunRateChart } from "../../../../components/scorer/RunRateChart";
import { SuperOverPrompt } from "../../../../components/scorer/SuperOverPrompt";
import { useSocket } from "../../../../hooks/useSocket";

interface Player { id: string; name: string; photoUrl?: string | null; }
type ExtraType = "NONE" | "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE";

const COLS = "300px minmax(0, 1fr) 320px";

export default function ScorerLivePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  const user = getCurrentUser();

  const [match, setMatch] = useState<MatchWithInnings | null>(null);
  const [scorecard, setScorecard] = useState<any>(null);
  const [commentary, setCommentary] = useState<any[]>([]);
  const [manhattanData, setManhattanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [showSuperOverPrompt, setShowSuperOverPrompt] = useState(false);
  const [fullCommentary, setFullCommentary] = useState<any[]>([]);
  const [currentInnings, setCurrentInnings] = useState<InningsInfo | null>(null);
  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [bowler, setBowler] = useState<Player | null>(null);
  const [sequenceNum, setSequenceNum] = useState(1);
  const [isFreeHit, setIsFreeHit] = useState(false);
  const [last6, setLast6] = useState<{ label: string; isWicket?: boolean; isBoundary?: boolean }[]>([]);
  const [thisOverBalls, setThisOverBalls] = useState<string[]>([]);
  const [partnership, setPartnership] = useState(0);
  const [partnershipBalls, setPartnershipBalls] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [pendingExtra, setPendingExtra] = useState<ExtraType | null>(null);
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showNextBowlerPrompt, setShowNextBowlerPrompt] = useState<{ lastOverBowlerId: string | null } | null>(null);
  const [showInningsTransition, setShowInningsTransition] = useState<{ closedInnings: InningsInfo; newInnings: InningsInfo | null } | null>(null);
  const [showMatchSummary, setShowMatchSummary] = useState<{ winnerTeamId: string | null; isTied: boolean } | null>(null);
  const [showCorrectDialog, setShowCorrectDialog] = useState(false);
  const [lastBallId, setLastBallId] = useState<string | null>(null);

  const [battingXI, setBattingXI] = useState<Player[]>([]);
  const [bowlingXI, setBowlingXI] = useState<Player[]>([]);
  const [openersChosen, setOpenersChosen] = useState(false);
  const [openStrikerId, setOpenStrikerId] = useState("");
  const [openNonStrikerId, setOpenNonStrikerId] = useState("");
  const [openBowlerId, setOpenBowlerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { connected } = useSocket(matchId);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadMatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await fetchMatchWithInnings(matchId);
      setMatch(m);
      const active = m.innings.find((i) => !i.isCompleted) ?? null;
      setCurrentInnings(active);

      const sc = await fetchScorecard(matchId).catch(() => null);
      setScorecard(sc);
      const cm = await fetchCommentary(matchId).catch(() => []);
      setCommentary(cm);
      const mh = await fetchManhattanData(matchId).catch(() => []);
      setManhattanData(mh);

      if (active) {
        const battingEntries = m.playingXI.filter((p: any) => p.teamId === active.battingTeamId);
        const bowlingEntries = m.playingXI.filter((p: any) => p.teamId === active.bowlingTeamId);
        const allPlayers = await fetchPlayers();
        const nameOf = (id: string) => allPlayers.find((p) => p.id === id)?.name ?? "Unknown";
        const photoOf = (id: string) => allPlayers.find((p) => p.id === id)?.photoUrl ?? null;
        setBattingXI(battingEntries.map((e: any) => ({ id: e.playerId, name: nameOf(e.playerId), photoUrl: photoOf(e.playerId) })));
        setBowlingXI(bowlingEntries.map((e: any) => ({ id: e.playerId, name: nameOf(e.playerId), photoUrl: photoOf(e.playerId) })));

        const state = await fetchCurrentState(matchId);
        if (state.hasStarted) {
          if (state.needsNewBatterForId) {
            const survivorId = state.strikerId === state.needsNewBatterForId ? state.nonStrikerId : state.strikerId;
            setNonStriker({ id: survivorId!, name: nameOf(survivorId!), photoUrl: photoOf(survivorId!) });
            setStriker(null);
          } else {
            setStriker({ id: state.strikerId!, name: nameOf(state.strikerId!), photoUrl: photoOf(state.strikerId!) });
            setNonStriker({ id: state.nonStrikerId!, name: nameOf(state.nonStrikerId!), photoUrl: photoOf(state.nonStrikerId!) });
          }
          if (state.needsNewBowler) {
            setShowNextBowlerPrompt({ lastOverBowlerId: state.bowlerId! });
            setBowler(null);
          } else {
            setBowler({ id: state.bowlerId!, name: nameOf(state.bowlerId!), photoUrl: photoOf(state.bowlerId!) });
          }
          setIsFreeHit(!!state.isFreeHit);
          setSequenceNum(state.nextSequenceNum ?? 1);
          setOpenersChosen(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  async function confirmOpeners() {
    const s = battingXI.find((p) => p.id === openStrikerId);
    const ns = battingXI.find((p) => p.id === openNonStrikerId);
    const b = bowlingXI.find((p) => p.id === openBowlerId);
    if (!s || !ns || !b || s.id === ns.id) {
      alert("Select two distinct batters and a bowler");
      return;
    }
    try {
      setSubmitting(true);
      await setInningsOpeners(matchId, { strikerId: s.id, nonStrikerId: ns.id, bowlerId: b.id });
      setStriker(s); setNonStriker(ns); setBowler(b);
      setOpenersChosen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save openers");
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshData() {
    const sc = await fetchScorecard(matchId).catch(() => null);
    setScorecard(sc);
    const cm = await fetchCommentary(matchId).catch(() => []);
    setCommentary(cm);
    const mh = await fetchManhattanData(matchId).catch(() => []);
    setManhattanData(mh);
    setLastSyncedAt(new Date());
  }

  async function handleStartSuperOver(battingTeamId: string) {
    try {
      await startSuperOver(matchId, battingTeamId);
      setShowSuperOverPrompt(false);
      setOpenersChosen(false);
      setStriker(null); setNonStriker(null); setBowler(null);
      setSequenceNum(1); setLast6([]); setThisOverBalls([]); setPartnership(0); setPartnershipBalls(0);
      await loadMatch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start Super Over");
    }
  }

  async function handleEndMatch() {
    if (!confirm("End this match now? This marks it ABANDONED and cannot be undone.")) return;
    try {
      await abandonMatch(matchId);
      router.push("/scorer");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to end match");
    }
  }

  async function submitBall(paramsIn: {
    runsOffBat: number; extraType: ExtraType; extraRuns: number;
    wicket?: { dismissedPlayerId: string; dismissalType: DismissalType; fielderId?: string };
  }) {
    if (!currentInnings || !striker || !nonStriker || !bowler || submitting) return;
    setSubmitting(true);
    try {
      const result: RecordBallResult = await recordBallApi({
        inningsId: currentInnings.id,
        sequenceNum,
        strikerId: striker.id,
        nonStrikerId: nonStriker.id,
        bowlerId: bowler.id,
        runsOffBat: paramsIn.runsOffBat,
        extraType: paramsIn.extraType,
        extraRuns: paramsIn.extraRuns,
        isFreeHit,
        wicket: paramsIn.wicket,
      });

      if (result.isDuplicate) { setSubmitting(false); return; }

      setSequenceNum((n) => n + 1);
      setLastBallId(result.ball.id);
      setCurrentInnings(result.innings);
      await refreshData();

      const label = paramsIn.wicket ? "W"
        : paramsIn.extraType === "WIDE" ? `${1 + paramsIn.extraRuns}wd`
        : paramsIn.extraType === "NO_BALL" ? `${1 + paramsIn.runsOffBat}nb`
        : paramsIn.extraType === "BYE" ? `${paramsIn.extraRuns}b`
        : paramsIn.extraType === "LEG_BYE" ? `${paramsIn.extraRuns}lb`
        : String(paramsIn.runsOffBat);
      const isBoundary = paramsIn.runsOffBat === 4 || paramsIn.runsOffBat === 6;
      setLast6((prev) => [...prev.slice(-5), { label, isWicket: !!paramsIn.wicket, isBoundary }]);
      setThisOverBalls((prev) => (result.over.isCompleted ? [] : [...prev, label]));
      setPartnership((prev) => (paramsIn.wicket ? 0 : prev + paramsIn.runsOffBat));
      setPartnershipBalls((prev) => (paramsIn.wicket ? 0 : paramsIn.extraType === "NONE" || paramsIn.extraType === "BYE" || paramsIn.extraType === "LEG_BYE" ? prev + 1 : prev));

      if (paramsIn.extraType === "NO_BALL") setIsFreeHit(true);
      else if (paramsIn.extraType !== "WIDE") setIsFreeHit(false);

      const currentStriker = striker;
      const currentNonStriker = nonStriker;

      if (result.rotateStrike) {
        setStriker(currentNonStriker); setNonStriker(currentStriker);
      }

      if (paramsIn.wicket) {
        const survivor = paramsIn.wicket.dismissedPlayerId !== currentStriker.id ? currentStriker : currentNonStriker;
        setStriker(null);
        setNonStriker(survivor);
        setPartnership(0);
        setPartnershipBalls(0);
      }

      const awaitingSuperOver = !!(result as any).awaitingSuperOver;

      if (result.requiresNextBowlerSelection) {
        setShowNextBowlerPrompt({ lastOverBowlerId: result.lastOverBowlerId });
        setBowler(null);
      }

      if (awaitingSuperOver) {
        setShowSuperOverPrompt(true);
      } else if (result.inningsCompleted && !result.matchCompleted) {
        setShowInningsTransition({ closedInnings: result.innings, newInnings: result.newInnings });
      }

      if (result.matchCompleted && result.matchResult) {
        const full = await fetchFullCommentary(matchId).catch(() => []);
        setFullCommentary(full);
        setShowMatchSummary({ winnerTeamId: result.matchResult.winnerTeamId, isTied: result.matchResult.isTied });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record ball");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRun(runs: number) {
    if (pendingExtra) {
      if (pendingExtra === "NO_BALL") submitBall({ runsOffBat: runs, extraType: "NO_BALL", extraRuns: 0 });
      else submitBall({ runsOffBat: 0, extraType: pendingExtra, extraRuns: runs });
      setPendingExtra(null);
    } else {
      submitBall({ runsOffBat: runs, extraType: "NONE", extraRuns: 0 });
    }
  }

  function handleExtra(type: ExtraType) { setPendingExtra(type); }

  function handleWicketConfirm(result: { dismissedPlayerId: string; dismissalType: DismissalType; fielderId?: string }) {
    setShowWicketDialog(false);
    submitBall({ runsOffBat: 0, extraType: "NONE", extraRuns: 0, wicket: result });
  }

  function handleNextBowlerConfirm(newBowlerId: string) {
    const b = bowlingXI.find((p) => p.id === newBowlerId);
    if (b) setBowler(b);
    setShowNextBowlerPrompt(null);
    setThisOverBalls([]);
  }

  function handleContinueAfterInningsTransition() {
    if (showInningsTransition?.newInnings) {
      setCurrentInnings(showInningsTransition.newInnings);
      setOpenersChosen(false);
      setBattingXI(bowlingXI);
      setBowlingXI(battingXI);
      setSequenceNum(1);
      setLast6([]);
      setThisOverBalls([]);
      setPartnership(0);
      setPartnershipBalls(0);
    }
    setShowInningsTransition(null);
  }

  if (loading) return <main className="cp-theme" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>Loading live match...</main>;
  if (error) return <main className="cp-theme" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cp-danger)", fontFamily: "Inter, system-ui, sans-serif" }}>Error: {error}</main>;
  if (!match) return null;

  const battingTeam = currentInnings?.battingTeamId === match.teamA.id ? match.teamA : match.teamB;
  const bowlingTeam = currentInnings?.bowlingTeamId === match.teamA.id ? match.teamA : match.teamB;

  const oversDecimal = currentInnings ? oversToDecimal(currentInnings.oversBowled) : 0;
  const crr = oversDecimal > 0 ? (currentInnings!.totalRuns / oversDecimal).toFixed(2) : "0.00";
  let rrr = "—";
  if (currentInnings?.targetRuns) {
    const remainingRuns = currentInnings.targetRuns - currentInnings.totalRuns;
    const remainingOvers = 20 - oversDecimal;
    rrr = remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : "0.00";
  }

  const currentScInnings = scorecard?.innings?.[scorecard.innings.length - 1];
  const strikerStat = currentScInnings?.batting.find((b: any) => b.playerName === striker?.name);
  const nonStrikerStat = currentScInnings?.batting.find((b: any) => b.playerName === nonStriker?.name);
  const bowlerStat = currentScInnings?.bowling.find((b: any) => b.playerName === bowler?.name);
  const allBowlers = currentScInnings?.bowling ?? [];

  const dismissedNames = new Set((currentScInnings?.batting ?? []).filter((b: any) => b.dismissal && b.dismissal !== "not out").map((b: any) => b.playerName));
  const dismissedIds = new Set(battingXI.filter((p) => dismissedNames.has(p.name)).map((p) => p.id));
  const takenIds = new Set([striker?.id, nonStriker?.id, ...dismissedIds].filter(Boolean));

  const recentBallsReversed = [...commentary].slice(0, 7);
  const currentOverEntries = commentary.filter((c) => c.overNumber === Math.floor(oversDecimal) + 1).slice(0, 6);
  const totalOverRuns = commentary.filter((c) => c.overNumber === Math.floor(oversDecimal) + 1).reduce((s, c) => s + c.runsOffBat + (c.extraType !== "NONE" ? c.extraRuns : 0), 0);

  const freeHitVisible = isFreeHit;

  return (
    <main className="cp-theme" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-live-topbar {
          flex-wrap: wrap;
          row-gap: 8px;
        }
        .cp-live-topbar-right { flex-wrap: wrap; row-gap: 8px; justify-content: flex-end; }
        .cp-live-score-header { flex-wrap: wrap; row-gap: 16px; }
        .cp-live-stats { flex-wrap: wrap; row-gap: 10px; justify-content: center; }
        .cp-live-grid {
          display: grid;
          gap: 20px;
          align-items: start;
        }
        .cp-live-content-pad { padding: 20px 28px 32px; }
        .cp-live-actions-row { flex-wrap: wrap; }

        @media (max-width: 1300px) {
          .cp-live-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 900px) {
          .cp-live-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .cp-live-topbar { height: auto !important; padding: 10px 16px !important; }
          .cp-live-topbar > div:nth-child(2) { order: 3; width: 100%; text-align: center; }
          .cp-live-score-header { padding: 16px !important; justify-content: center !important; text-align: center; }
          .cp-live-stats { gap: 24px !important; }
          .cp-live-content-pad { padding: 16px 16px 24px !important; }
        }
        @media (max-width: 480px) {
          .cp-live-stats { gap: 16px !important; }
        }
      `}</style>

      {/* TOP BAR */}
      {/* TOP BAR */}
      <div className="cp-live-topbar" style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--cp-bg)", flexShrink: 0, minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 28px", borderBottom: "1px solid var(--cp-surface-border)", gap: 12 }}>
        <div>
          <button onClick={() => router.push("/scorer")} style={topExitStyle}>← EXIT SCORING</button>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>SCORER CONSOLE – LIVE MATCH</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--cp-accent-primary)", fontWeight: 700, fontSize: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--cp-accent-primary)", display: "inline-block" }} /> LIVE
            </span>
          </div>
          <p className="cp-text-secondary" style={{ margin: "2px 0 0", fontSize: 11.5 }}>
            {match.tournamentName ?? "Match"} {match.matchNumber ? `- Match ${match.matchNumber}` : ""}
          </p>
        </div>

        <div className="cp-live-topbar-right" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
          <span style={pillStyle(connected)}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />} {connected ? "CONNECTED" : "OFFLINE"}
          </span>
          <span style={{ ...pillStyle(false), color: "var(--cp-text-secondary)" }}>
            <Clock size={12} /> {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span style={{ display: "flex", alignItems: "center", color: "var(--cp-text-primary)", fontSize: 13, fontWeight: 600 }}>
            {user?.name ?? "Scorer"}
          </span>
          <button onClick={handleEndMatch} style={endMatchButtonStyle}>
            <Square size={13} style={{ marginRight: 4 }} /> END MATCH
          </button>
        </div>
      </div>

      {/* SCORE HEADER */}
      <div className="cp-live-score-header" style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", borderBottom: "1px solid var(--cp-surface-border)" }}>
        <TeamHeader name={battingTeam.name} shortCode={battingTeam.shortCode} logoUrl={(battingTeam as any).logoUrl} status="Batting" />
        <div className="cp-live-stats" style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <StatBlock label="CRR" value={crr} />
          <div style={{ textAlign: "center", minWidth: 150 }}>
            <p className="cp-stat-number" style={{ margin: 0, fontSize: 38, fontWeight: 800, lineHeight: 1 }}>{currentInnings?.totalRuns ?? 0}/{currentInnings?.totalWickets ?? 0}</p>
            <p className="cp-text-secondary" style={{ margin: "6px 0 0", fontSize: 13 }}>{currentInnings?.oversBowled ?? "0.0"} Overs</p>
          </div>
          <StatBlock label="RRR" value={rrr} accent={currentInnings?.targetRuns ? "var(--cp-danger)" : undefined} sub={currentInnings?.targetRuns ? `Target ${currentInnings.targetRuns}` : undefined} />
        </div>
        <TeamHeader name={bowlingTeam.name} shortCode={bowlingTeam.shortCode} logoUrl={(bowlingTeam as any).logoUrl} status="Bowling" align="right" />
      </div>

      {freeHitVisible && (
        <div style={{ flexShrink: 0, margin: "16px 28px 0", padding: "8px 14px", background: "rgba(59,130,246,0.1)", border: "1px solid var(--cp-accent-secondary)", borderRadius: "var(--cp-radius-inner)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Target size={14} color="var(--cp-accent-secondary)" />
          <span style={{ color: "var(--cp-accent-secondary)", fontWeight: 700, fontSize: 12 }}>FREE HIT — Next ball is a free hit</span>
        </div>
      )}

      {!openersChosen ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="cp-card" style={{ maxWidth: 420, width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>Select Openers & First Bowler</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Select label="Striker" value={openStrikerId} onChange={setOpenStrikerId} options={battingXI} />
              <Select label="Non-Striker" value={openNonStrikerId} onChange={setOpenNonStrikerId} options={battingXI} />
              <Select label="Opening Bowler" value={openBowlerId} onChange={setOpenBowlerId} options={bowlingXI} />
              <button onClick={confirmOpeners} disabled={submitting} style={primaryButtonStyle}>
                {submitting ? "Starting..." : "Start Innings"}
              </button>
            </div>
          </div>
        </div>
      ) : !striker || !bowler ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="cp-card" style={{ maxWidth: 420, width: "100%" }}>
            {!striker ? (
              <>
                <h3 style={{ marginTop: 0 }}>Select New Batter</h3>
                <p className="cp-text-secondary" style={{ fontSize: 13, marginBottom: 12 }}>A wicket fell — pick who's replacing the dismissed batter.</p>
                <select onChange={(e) => { const p = battingXI.find((x) => x.id === e.target.value); if (p) setStriker(p); }} style={inputStyle} defaultValue="">
                  <option value="" disabled>Select batter...</option>
                  {battingXI.filter((p) => !takenIds.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Waiting for Bowler Selection</h3>
                <p className="cp-text-secondary" style={{ fontSize: 13, margin: 0 }}>Select the next bowler in the dialog above to continue.</p>
              </>
            )}
          </div>
        </div>
      ) : (
        // Masonry-style layout: each column stacks its own cards independently
        // (including its own chart at the bottom), so no column is forced to
        // match the height of a taller sibling and there's no dead gap.
        <div className="cp-live-content-pad">
          <div className="cp-live-grid" style={{ gridTemplateColumns: COLS }}>
            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <MatchInfoCard
                venue={match.ground?.name ?? "—"}
                tossWinnerName={match.tossWinnerTeamId === match.teamA.id ? match.teamA.name : match.teamB.name}
                tossDecision={match.tossDecision ?? "BAT"}
                scheduledAt={match.scheduledAt}
              />
              <PartnershipCard
                strikerName={striker.name} strikerRuns={strikerStat?.runs ?? 0} strikerBalls={strikerStat?.balls ?? 0}
                nonStrikerName={nonStriker!.name} nonStrikerRuns={nonStrikerStat?.runs ?? 0} nonStrikerBalls={nonStrikerStat?.balls ?? 0}
                partnershipRuns={partnership} partnershipBalls={partnershipBalls}
              />
              <div className="cp-card">
                <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--cp-text-secondary)" }}>Recent Balls</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {recentBallsReversed.length === 0 && <span className="cp-text-secondary" style={{ fontSize: 12 }}>—</span>}
                  {recentBallsReversed.map((c, i) => (
                    <span key={i} style={ballBadgeStyle(c.runsOffBat, c.isWicket)}>
                      {c.isWicket ? "W" : c.runsOffBat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="cp-card">
                <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--cp-text-secondary)", display: "flex", justifyContent: "space-between" }}>
                  <span>Over {Math.floor(oversDecimal) + 1}</span>
                  <span>{totalOverRuns} Runs</span>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {currentOverEntries.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                      <span style={ballBadgeStyle(c.runsOffBat, c.isWicket, true)}>
                        {c.isWicket ? "W" : c.runsOffBat}
                      </span>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: c.isWicket ? "var(--cp-danger)" : c.runsOffBat === 4 || c.runsOffBat === 6 ? "var(--cp-accent-primary)" : "var(--cp-text-primary)" }}>
                        {c.isWicket ? "Wicket" : c.runsOffBat === 4 ? "Boundary" : c.runsOffBat === 6 ? "Maximum" : c.runsOffBat === 0 ? "Dot Ball" : `${c.runsOffBat} Run${c.runsOffBat > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  ))}
                  {currentOverEntries.length === 0 && <p className="cp-text-secondary" style={{ fontSize: 12 }}>No balls this over yet.</p>}
                </div>
              </div>
              <CommentaryFeed entries={commentary.slice(0, 6)} />
            </div>

            {/* CENTER COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <div className="cp-card" style={{ display: "flex", justifyContent: "space-around", padding: "18px 14px", flexWrap: "wrap", gap: 12 }}>
                <BatsmanCard name={striker.name} runs={strikerStat?.runs ?? 0} balls={strikerStat?.balls ?? 0} isStriker photoUrl={striker.photoUrl} />
                <BatsmanCard name={nonStriker!.name} runs={nonStrikerStat?.runs ?? 0} balls={nonStrikerStat?.balls ?? 0} isStriker={false} photoUrl={nonStriker!.photoUrl} />
                <BowlerCard name={bowler!.name} overs={bowlerStat?.overs ?? "0.0"} maidens={bowlerStat?.maidens ?? 0} runs={bowlerStat?.runs ?? 0} wickets={bowlerStat?.wickets ?? 0} photoUrl={bowler!.photoUrl} />
              </div>

              <div className="cp-card" style={{ padding: 16 }}>
                <RunPad onRun={handleRun} onExtra={handleExtra} onWicket={() => setShowWicketDialog(true)} disabled={submitting} />
                {pendingExtra && <p className="cp-text-secondary" style={{ fontSize: 11.5, marginTop: 10, textAlign: "center" }}>{pendingExtra} selected — tap a run value to confirm (0 for none)</p>}
              </div>

              <div className="cp-card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <LastSixBalls balls={last6} />
                <div>
                  <p className="cp-text-secondary" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>This Over</p>
                  <p style={{ margin: 0, fontSize: 12.5 }}>{thisOverBalls.join(" · ") || "—"}</p>
                </div>
              </div>

              <div className="cp-live-actions-row" style={{ display: "flex", gap: 10 }}>
                <button onClick={() => lastBallId && setShowCorrectDialog(true)} disabled={!lastBallId} style={actionButtonStyle}>
                  <Undo2 size={13} style={{ marginRight: 4 }} /> Undo
                </button>
                <button onClick={() => lastBallId && setShowCorrectDialog(true)} disabled={!lastBallId} style={{ ...actionButtonStyle, borderColor: "var(--cp-accent-secondary)", color: "var(--cp-accent-secondary)" }}>Correct Last Ball</button>
                <button onClick={() => { setShowNextBowlerPrompt({ lastOverBowlerId: bowler!.id }); setBowler(null); }} style={{ ...actionButtonStyle, background: "var(--cp-accent-secondary)", color: "#fff", borderColor: "var(--cp-accent-secondary)" }}>End Over</button>
              </div>

              {manhattanData.length > 0 && (
                <ManhattanChart data={manhattanData.map((d) => ({ teamName: d.teamName, overs: d.overs }))} />
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <ScoreSummaryCard
                runs={currentInnings?.totalRuns ?? 0}
                wickets={currentInnings?.totalWickets ?? 0}
                overs={currentInnings?.oversBowled ?? "0.0"}
                extras={commentary.reduce((s, c) => s + (c.extraType !== "NONE" ? c.extraRuns + 1 : 0), 0)}
                extrasBreakdown="see commentary"
                crr={crr}
              />
              <FallOfWicketsCard fallOfWickets={currentScInnings?.fallOfWickets ?? []} />
              <BowlerStatsTable bowlers={allBowlers} currentBowlerName={bowler!.name} />
              {manhattanData.length > 0 && (
                <RunRateChart data={manhattanData.map((d) => ({ teamName: d.teamName, overs: d.overs }))} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {showWicketDialog && striker && nonStriker && (
        <WicketDialog isFreeHit={isFreeHit} striker={striker} nonStriker={nonStriker} fieldingTeamPlayers={bowlingXI} onConfirm={handleWicketConfirm} onCancel={() => setShowWicketDialog(false)} />
      )}
      {showNextBowlerPrompt && (
        <OverTransitionScreen
          overNumber={Math.floor(oversDecimal)}
          thisOverRuns={thisOverBalls.length > 0 ? partnership : 0}
          thisOverWickets={0}
          thisOverExtras={0}
          totalRuns={currentInnings?.totalRuns ?? 0}
          totalWickets={currentInnings?.totalWickets ?? 0}
          totalOvers={currentInnings?.oversBowled ?? "0.0"}
          crr={crr}
          rrr={rrr}
          target={currentInnings?.targetRuns ?? null}
          bowlingTeamPlayers={bowlingXI}
          lastOverBowlerId={showNextBowlerPrompt.lastOverBowlerId}
          onStartNextOver={handleNextBowlerConfirm}
        />
      )}
      {showInningsTransition && (
        <InningsTransitionScreen
          inningsNumber={showInningsTransition.closedInnings.inningsNumber}
          totalRuns={showInningsTransition.closedInnings.totalRuns}
          totalWickets={showInningsTransition.closedInnings.totalWickets}
          targetRuns={showInningsTransition.newInnings?.targetRuns ?? null}
          battingTeamName={battingTeam.name}
          bowlingTeamName={bowlingTeam.name}
          onContinue={handleContinueAfterInningsTransition}
        />
      )}
      {showSuperOverPrompt && (
        <SuperOverPrompt
          teamAName={match.teamA.name} teamAId={match.teamA.id}
          teamBName={match.teamB.name} teamBId={match.teamB.id}
          onStart={handleStartSuperOver}
        />
      )}
      {showMatchSummary && (
        <MatchSummaryScreen
          matchId={matchId}
          teamAName={match.teamA.name}
          teamBName={match.teamB.name}
          teamAScore={`${currentInnings?.totalRuns ?? 0}/${currentInnings?.totalWickets ?? 0}`}
          teamBScore=""
          winnerName={showMatchSummary.winnerTeamId === match.teamA.id ? match.teamA.name : showMatchSummary.winnerTeamId === match.teamB.id ? match.teamB.name : null}
          isTied={showMatchSummary.isTied}
          scorecard={scorecard}
          commentary={fullCommentary}
          publishing={false}
          onPublish={() => router.push("/scorer")}
        />
      )}
      {showCorrectDialog && lastBallId && currentInnings && striker && nonStriker && bowler && (
        <CorrectLastBallDialog
          lastBall={{ id: lastBallId, runsOffBat: 0, extraType: "NONE", extraRuns: 0 }}
          inningsId={currentInnings.id}
          nextSequenceNum={sequenceNum}
          strikerId={striker.id}
          nonStrikerId={nonStriker.id}
          bowlerId={bowler.id}
          isFreeHit={isFreeHit}
          onClose={() => setShowCorrectDialog(false)}
          onCorrected={() => { setShowCorrectDialog(false); loadMatch(); }}
        />
      )}
    </main>
  );
}

function oversToDecimal(oversStr: string): number {
  const [w, b] = oversStr.split(".");
  return (parseInt(w, 10) || 0) + (parseInt(b ?? "0", 10) || 0) / 6;
}

function ballBadgeStyle(runs: number, isWicket?: boolean, small?: boolean): React.CSSProperties {
  const size = small ? 22 : 28;
  const base: React.CSSProperties = {
    width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: small ? 10.5 : 12, fontWeight: 700, flexShrink: 0,
  };
  if (isWicket) return { ...base, background: "var(--cp-danger)", color: "#fff" };
  if (runs === 6) return { ...base, background: "var(--cp-accent-primary)", color: "#0b0e11" };
  if (runs === 4) return { ...base, background: "var(--cp-accent-secondary)", color: "#fff" };
  return { ...base, background: "var(--cp-bg)", color: "var(--cp-text-secondary)", border: "1px solid var(--cp-surface-border)" };
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 5,
    padding: "5px 10px", borderRadius: 20,
    border: `1px solid ${active ? "var(--cp-accent-primary)" : "var(--cp-surface-border)"}`,
    color: active ? "var(--cp-accent-primary)" : "var(--cp-text-secondary)",
    fontSize: 11.5, fontWeight: 600,
    whiteSpace: "nowrap",
  };
}

function TeamHeader({ name, shortCode, logoUrl, status, align }: { name: string; shortCode: string; logoUrl?: string; status: string; align?: "right" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexDirection: align ? "row-reverse" : "row" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
        background: "var(--cp-surface)",
        border: "1px solid var(--cp-surface-border)",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0,
      }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${name} logo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          shortCode
        )}
      </div>
      <div style={{ textAlign: align }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{name}</p>
        <p style={{ margin: 0, fontSize: 12.5, color: status === "Batting" ? "var(--cp-accent-primary)" : "var(--cp-accent-secondary)", fontWeight: 600 }}>{status}</p>
      </div>
    </div>
  );
}

function StatBlock({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 64 }}>
      <p className="cp-text-secondary" style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
      <p className="cp-stat-number" style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 18, color: accent ?? "var(--cp-text-primary)" }}>{value}</p>
      {sub && <p className="cp-text-secondary" style={{ margin: 0, fontSize: 10.5 }}>{sub}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Player[] }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--cp-text-secondary)", marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        <option value="">Select...</option>
        {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", background: "var(--cp-bg)", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "8px 10px", color: "var(--cp-text-primary)", fontSize: 14 };
const primaryButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#0b0e11", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const actionButtonStyle: React.CSSProperties = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--cp-surface-border)", color: "var(--cp-text-primary)", borderRadius: "var(--cp-radius-inner)", padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const topExitStyle: React.CSSProperties = { background: "transparent", border: "1px solid var(--cp-surface-border)", color: "var(--cp-text-secondary)", borderRadius: "var(--cp-radius-inner)", padding: "7px 14px", fontSize: 12, cursor: "pointer" };
const endMatchButtonStyle: React.CSSProperties = { display: "flex", alignItems: "center", background: "var(--cp-danger)", color: "#fff", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "9px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer" };