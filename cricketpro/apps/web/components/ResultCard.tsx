"use client";

import { PublicMatch, formatResultDate } from "../lib/api-client";
import { TeamBadge } from "./TeamBadge";

export function ResultCard({ match }: { match: PublicMatch }) {
  const winner =
    match.winnerTeamId === match.teamA.id
      ? match.teamA
      : match.winnerTeamId === match.teamB.id
      ? match.teamB
      : null;

  return (
    <div className="cp-card cp-card-hover" style={{ minWidth: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="cp-text-secondary" style={{ fontSize: 11, fontWeight: 600 }}>
          {match.teamA.shortCode} vs {match.teamB.shortCode}
        </span>
        <span className="cp-text-secondary" style={{ fontSize: 11 }}>
          {formatResultDate(match.scheduledAt)}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <TeamBadge shortCode={match.teamA.shortCode} logoUrl={match.teamA.logoUrl} size={28} />
        <span className="cp-text-secondary" style={{ fontSize: 11 }}>vs</span>
        <TeamBadge shortCode={match.teamB.shortCode} logoUrl={match.teamB.logoUrl} size={28} />
      </div>

      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--cp-accent-primary)" }}>
        {match.isTied ? "Match Tied" : winner ? `${winner.shortCode} Won` : "Result Pending"}
      </p>
    </div>
  );
}