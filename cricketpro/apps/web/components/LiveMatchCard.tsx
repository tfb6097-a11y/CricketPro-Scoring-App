"use client";

import Link from "next/link";
import { PublicMatch } from "../lib/api-client";
import { LivePill } from "@crickpro/ui";
import { TeamBadge } from "./TeamBadge";

export function LiveMatchCard({ match }: { match: PublicMatch }) {
  const latestInnings = match.innings?.[match.innings.length - 1];

  const scoreFor = (teamId: string) =>
    latestInnings?.battingTeamId === teamId
      ? `${latestInnings.totalRuns}/${latestInnings.totalWickets} (${latestInnings.oversBowled})`
      : null;

  const chaseLine = (() => {
    if (!latestInnings || latestInnings.targetRuns == null) return null;
    const battingTeam = latestInnings.battingTeamId === match.teamA.id ? match.teamA : match.teamB;
    const runsNeeded = latestInnings.targetRuns - latestInnings.totalRuns;
    if (runsNeeded <= 0) return null;
    return `${battingTeam.shortCode} need ${runsNeeded} runs`;
  })();

  return (
    <Link href={`/live/${match.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="cp-card cp-card-hover">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <LivePill />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <TeamRow shortCode={match.teamA.shortCode} logoUrl={match.teamA.logoUrl} score={scoreFor(match.teamA.id)} />
<span className="cp-text-secondary" style={{ fontSize: 11, fontWeight: 600 }}>VS</span>
<TeamRow shortCode={match.teamB.shortCode} logoUrl={match.teamB.logoUrl} score={scoreFor(match.teamB.id)} align="right" />
        </div>

        {chaseLine && (
          <p className="cp-text-secondary" style={{ margin: "12px 0 0", fontSize: 12, textAlign: "center" }}>
            {chaseLine}
          </p>
        )}
      </div>
    </Link>
  );
}

function TeamRow({
  shortCode,
  logoUrl,
  score,
  align = "left",
}: {
  shortCode: string;
  logoUrl?: string | null;
  score: string | null;
  align?: "left" | "right";
}) {
  return (
    <div style={{ display: "flex", flexDirection: align === "right" ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
      <TeamBadge shortCode={shortCode} logoUrl={logoUrl} size={36} />
      <div style={{ textAlign: align }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{shortCode}</p>
        {score && (
          <p className="cp-stat-number" style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800 }}>
            {score}
          </p>
        )}
      </div>
    </div>
  );
}