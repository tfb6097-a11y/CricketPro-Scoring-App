export type MatchStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "ABANDONED";
export type TossDecision = "BAT" | "BOWL";

export interface MatchSummary {
  id: string;
  teamA: { id: string; name: string; shortCode: string };
  teamB: { id: string; name: string; shortCode: string };
  status: MatchStatus;
  scheduledAt: string;
  tournamentId?: string;
}