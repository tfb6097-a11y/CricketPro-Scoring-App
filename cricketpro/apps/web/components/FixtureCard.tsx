"use client";

import { PublicMatch, formatFixtureDate } from "../lib/api-client";
import { TeamBadge } from "./TeamBadge";

export function FixtureCard({ match }: { match: PublicMatch }) {
  return (
    <div className="cp-card cp-card-hover" style={{ minWidth: 200 }}>
      <p className="cp-text-secondary" style={{ fontSize: 11, fontWeight: 600, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {formatFixtureDate(match.scheduledAt)}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TeamBadge shortCode={match.teamA.shortCode} logoUrl={match.teamA.logoUrl} size={30} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{match.teamA.shortCode}</span>
        </div>
        <span className="cp-text-secondary" style={{ fontSize: 11, fontWeight: 600 }}>vs</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{match.teamB.shortCode}</span>
          <TeamBadge shortCode={match.teamB.shortCode} logoUrl={match.teamB.logoUrl} size={30} />
        </div>
      </div>
    </div>
  );
}