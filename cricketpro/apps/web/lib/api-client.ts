const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function publicFetch(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export interface PublicMatch {
  id: string;
  status: string;
  scheduledAt: string;
  matchNumber?: number | null;
  tossWinnerTeamId?: string | null;
  tossDecision?: "BAT" | "BOWL" | null;
  teamA: { id: string; name: string; shortCode: string; logoUrl: string | null };
  teamB: { id: string; name: string; shortCode: string; logoUrl: string | null };
  ground?: { id: string; name: string; city?: string } | null;
  tournament?: { id: string; name: string; oversPerInnings: number } | null;
  winnerTeamId: string | null;
  isTied: boolean;
  innings?: {
    id: string;
    inningsNumber: number;
    totalRuns: number;
    totalWickets: number;
    oversBowled: string;
    battingTeamId: string;
    targetRuns: number | null;
    isCompleted: boolean;
  }[];
}

export async function fetchAllMatches(): Promise<PublicMatch[]> {
  return publicFetch("/fixtures");
}

export async function fetchMatchDetail(matchId: string): Promise<PublicMatch> {
  return publicFetch(`/matches/${matchId}`);
}

export interface PublicPointsRow {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;
  team: { name: string; shortCode: string; logoUrl: string | null };
}

export async function fetchPointsTable(tournamentId: string): Promise<PublicPointsRow[]> {
  return publicFetch(`/stats/points-table/${tournamentId}`);
}

export async function fetchTopScorers(limit = 5) {
  return publicFetch(`/stats/top-scorers?limit=${limit}`);
}

export async function fetchTopWicketTakers(limit = 5) {
  return publicFetch(`/stats/top-wicket-takers?limit=${limit}`);
}

export async function fetchTournaments() {
  return publicFetch("/tournaments");
}

export async function fetchTeam(teamId: string) {
  return publicFetch(`/teams/${teamId}`);
}

export async function fetchPlayer(playerId: string) {
  return publicFetch(`/players/${playerId}`);
}

export async function fetchPlayerStats(playerId: string) {
  return publicFetch(`/stats/player/${playerId}`);
}

export async function fetchCommentary(matchId: string) {
  return publicFetch(`/matches/${matchId}/commentary`);
}

export async function fetchScorecard(matchId: string) {
  return publicFetch(`/matches/${matchId}/scorecard`);
}

export async function fetchTournament(tournamentId: string) {
  return publicFetch(`/tournaments/${tournamentId}`);
}

export async function fetchTournamentFixtures(tournamentId: string) {
  return publicFetch(`/fixtures?tournamentId=${tournamentId}`);
}

export async function fetchTeamStats(teamId: string) {
  return publicFetch(`/stats/team/${teamId}`);
}

export async function fetchAllTournaments() {
  return publicFetch("/tournaments");
}

// NEW — full playing XI with player details (name/photo/role), for the
// Squads tab on the live match page.
export interface PublicPlayingXIEntry {
  id: string;
  isCaptain: boolean;
  isKeeper: boolean;
  player: {
    id: string;
    name: string;
    photoUrl: string | null;
    role: string;
    battingStyle: string | null;
    bowlingStyle: string | null;
  };
}

export async function fetchPlayingXI(matchId: string, teamId: string): Promise<PublicPlayingXIEntry[]> {
  return publicFetch(`/matches/${matchId}/playing-xi?teamId=${teamId}`);
}

// NEW — per-over runs for each innings, for the Graphs tab.
export interface PublicManhattanInnings {
  teamName: string;
  inningsNumber: number;
  overs: { over: number; runs: number }[];
}

export async function fetchManhattanData(matchId: string): Promise<PublicManhattanInnings[]> {
  return publicFetch(`/matches/${matchId}/manhattan`);
}

/* ============================================================
   Date formatting helpers — used by ResultCard / FixtureCard
   ============================================================ */

export function formatFixtureDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
}

export function formatResultDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

// NEW — standard cricket result line, computed purely from data we already
// have (winnerTeamId/isTied/innings totals) — no backend migration needed.
// Assumes a 10-wicket team (standard XI), which holds regardless of format.
export function computeResultLine(match: PublicMatch): string | null {
  if (match.status !== "COMPLETED") return null;
  if (match.isTied) return "Match Tied";
  if (!match.winnerTeamId) return null;

  const winner = match.winnerTeamId === match.teamA.id ? match.teamA : match.teamB;
  const innings = match.innings ?? [];
  if (innings.length < 2) return `${winner.name} won`;

  const sorted = [...innings].sort((a, b) => a.inningsNumber - b.inningsNumber);
  const first = sorted[0];
  const second = sorted[sorted.length - 1];

  if (match.winnerTeamId === second.battingTeamId) {
    const wicketsLeft = Math.max(10 - second.totalWickets, 0);
    return `${winner.name} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}`;
  }

  const runMargin = first.totalRuns - second.totalRuns;
  return `${winner.name} won by ${runMargin} run${runMargin === 1 ? "" : "s"}`;
}
export async function fetchTeamFixtures(teamId: string) {
  return publicFetch(`/fixtures?teamId=${teamId}`);
}
/* ============================================================
   Public Notifications — bell icon on TopNav
   ============================================================ */

export type PublicNotificationType = "MATCH" | "SYSTEM" | "TOURNAMENT" | "ANNOUNCEMENT";

export interface PublicNotification {
  id: string;
  title: string;
  type: PublicNotificationType;
  createdAt: string;
}

// ⚠️ Confirm this path matches your backend route — adjust if different
export async function fetchPublicNotifications(): Promise<PublicNotification[]> {
  return publicFetch(`/notifications/public`);
}