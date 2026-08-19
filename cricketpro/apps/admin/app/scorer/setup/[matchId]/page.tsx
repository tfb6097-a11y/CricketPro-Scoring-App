"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchMatch, fetchTeamSquad, submitPlayingXI, recordToss, goLive,
  MatchDetail, AdminTeam,
} from "../../../../lib/api-client";
import { PlayingXIPicker } from "../../../../components/PlayingXIPicker";
import { TossScreen } from "../../../../components/TossScreen";
import { SetupStepper } from "../../../../components/SetupStepper";

export default function ScorerSetupPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [teamASquad, setTeamASquad] = useState<AdminTeam | null>(null);
  const [teamBSquad, setTeamBSquad] = useState<AdminTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tossDone, setTossDone] = useState(false);
  const [teamAXIDone, setTeamAXIDone] = useState(false);
  const [teamBXIDone, setTeamBXIDone] = useState(false);

  const [goLiveError, setGoLiveError] = useState<string | null>(null);
  const [goingLive, setGoingLive] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const m = await fetchMatch(matchId);
      setMatch(m);
      const [teamA, teamB] = await Promise.all([fetchTeamSquad(m.teamA.id), fetchTeamSquad(m.teamB.id)]);
      setTeamASquad(teamA);
      setTeamBSquad(teamB);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [matchId]);

  async function handleGoLive() {
    setGoLiveError(null);
    setGoingLive(true);
    try {
      await goLive(matchId);
      router.push(`/scorer/live/${matchId}`);
    } catch (err) {
      setGoLiveError(err instanceof Error ? err.message : "Failed to go live");
    } finally {
      setGoingLive(false);
    }
  }

  if (loading) return <main style={{ padding: 24, color: "var(--cp-text-secondary)" }}>Loading match setup...</main>;
  if (error) return <main style={{ padding: 24, color: "var(--cp-danger)" }}>Error: {error}</main>;
  if (!match || !teamASquad || !teamBSquad) return null;

  const allDone = tossDone && teamAXIDone && teamBXIDone;
  // Single source of truth for which panel is active — drives both the
  // stepper indicator AND which content actually renders, so only one
  // step is ever on screen at a time instead of everything stacked.
  const currentStep = allDone ? 5 : !tossDone ? 2 : !teamAXIDone ? 3 : !teamBXIDone ? 4 : 5;

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif", background: "var(--cp-bg)" }}>
      <style>{`
        .cp-setup-header { flex-wrap: wrap; row-gap: 6px; }
        .cp-setup-content { padding: 0 24px 20px; }
        .cp-setup-actions { flex-wrap: wrap; }
        @media (max-width: 640px) {
          .cp-setup-header { padding: 16px 16px 0 !important; }
          .cp-setup-stepper-wrap { padding: 12px 16px !important; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .cp-setup-content { padding: 0 16px 16px !important; }
          .cp-setup-actions { flex-direction: column; }
          .cp-setup-actions button { width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="cp-setup-header" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "16px 24px 0" }}>
        <button onClick={() => router.push("/scorer")} style={backButtonStyle}>←</button>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>New Match Setup</h1>
        <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>
          {match.teamA.name} vs {match.teamB.name}
        </span>
      </div>

      {/* Stepper */}
      <div className="cp-setup-stepper-wrap" style={{ flexShrink: 0, padding: "12px 24px" }}>
        <SetupStepper currentStep={currentStep} />
      </div>

      {/* Active step content */}
      <div className="cp-setup-content" style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 640, minHeight: 0, display: "flex", flexDirection: "column" }}>

          {currentStep === 2 && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <TossScreen
                teamA={{ id: match.teamA.id, name: match.teamA.name }}
                teamB={{ id: match.teamB.id, name: match.teamB.name }}
                onSubmit={async (winnerId, decision) => {
                  await recordToss(matchId, winnerId, decision);
                  setTossDone(true);
                }}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <PlayingXIPicker
                teamName={`${match.teamA.name} (XI)`}
                squad={teamASquad.players}
                onSubmit={async (players) => {
                  await submitPlayingXI(matchId, match.teamA.id, players);
                  setTeamAXIDone(true);
                }}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <PlayingXIPicker
                teamName={`${match.teamB.name} (XI)`}
                squad={teamBSquad.players}
                onSubmit={async (players) => {
                  await submitPlayingXI(matchId, match.teamB.id, players);
                  setTeamBXIDone(true);
                }}
              />
            </div>
          )}

          {currentStep === 5 && (
            <div className="cp-card" style={{ display: "flex", flexDirection: "column" }}>
              <p className="cp-text-secondary" style={{ fontSize: 12, textTransform: "uppercase", textAlign: "center", marginBottom: 14, letterSpacing: 0.5 }}>
                Confirm & Start Match
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <TeamSummary name={match.teamA.name} />
                <span className="cp-text-secondary" style={{ fontSize: 13 }}>vs</span>
                <TeamSummary name={match.teamB.name} align="right" />
              </div>

              <div className="cp-card" style={{ background: "var(--cp-bg)", marginBottom: 14, padding: 14 }}>
                <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 10 }}>Pre Match Checklist</p>
                <ChecklistRow label="Match Details" done={true} />
                <ChecklistRow label="Toss Completed" done={tossDone} />
                <ChecklistRow label="Team A (XI) Selected" done={teamAXIDone} />
                <ChecklistRow label="Team B (XI) Selected" done={teamBXIDone} />
              </div>

              {goLiveError && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginBottom: 10 }}>{goLiveError}</p>}

              <div className="cp-setup-actions" style={{ display: "flex", gap: 10 }}>
                <button onClick={() => router.push("/scorer")} style={backFullButtonStyle}>Back</button>
                <button
                  onClick={handleGoLive}
                  disabled={!allDone || goingLive}
                  style={{ ...startMatchButtonStyle, opacity: allDone ? 1 : 0.5, cursor: allDone ? "pointer" : "not-allowed" }}
                >
                  {goingLive ? "Starting..." : "START MATCH"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TeamSummary({ name, align }: { name: string; align?: "right" }) {
  return (
    <div style={{ textAlign: align, flex: 1 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{name}</p>
    </div>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
      <span style={{ color: done ? "var(--cp-accent-primary)" : "var(--cp-text-secondary)" }}>{done ? "✓" : "○"}</span>
      <span style={{ color: done ? "var(--cp-text-primary)" : "var(--cp-text-secondary)" }}>{label}</span>
    </div>
  );
}

const backButtonStyle: React.CSSProperties = { background: "transparent", border: "none", color: "var(--cp-text-secondary)", fontSize: 18, cursor: "pointer" };
const backFullButtonStyle: React.CSSProperties = { flex: 1, background: "transparent", border: "1px solid var(--cp-surface-border)", color: "var(--cp-text-primary)", borderRadius: "var(--cp-radius-inner)", padding: "12px", fontWeight: 600, cursor: "pointer", fontSize: 14 };
const startMatchButtonStyle: React.CSSProperties = { flex: 2, background: "var(--cp-accent-primary)", color: "#0b0e11", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "12px", fontWeight: 700, fontSize: 14 };