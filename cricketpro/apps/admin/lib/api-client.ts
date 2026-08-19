const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  name: string;
  // NOTE: no `id`, no `role` here on purpose — see decodeJwtPayload below.
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshPromise: Promise<string | null> | null = null;

// Decodes the JWT payload (works for both access and refresh tokens —
// they share the same { sub, email, role, exp } shape). This is how we
// derive `role` client-side without the backend ever putting it in a
// plaintext top-level response field.
function decodeJwtPayload(token: string): { sub?: string; email?: string; role?: string; exp?: number } | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

function decodeJwtExp(token: string): number | null {
  const payload = decodeJwtPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
}

export function saveTokens(auth: AuthResponse) {
  localStorage.setItem("cp_access_token", auth.accessToken);
  localStorage.setItem("cp_refresh_token", auth.refreshToken);

  // Role comes from decoding the token itself, not from auth.role (which no
  // longer exists in the response body).
  const payload = decodeJwtPayload(auth.accessToken);
  localStorage.setItem("cp_user", JSON.stringify({ name: auth.name, role: payload?.role ?? null }));

  scheduleProactiveRefresh(auth.accessToken);
}

// Schedule refresh 1 minute before expiry
export function scheduleProactiveRefresh(accessToken: string) {
  if (refreshTimer) clearTimeout(refreshTimer);

  const expiresAt = decodeJwtExp(accessToken);
  if (!expiresAt) return;

  const refreshAt = expiresAt - Date.now() - 60_000;
  const delay = Math.max(refreshAt, 5_000);

  refreshTimer = setTimeout(async () => {
    const newToken = await tryRefreshToken();
    if (newToken) {
      scheduleProactiveRefresh(newToken);
    }
    // Agar refresh fail hua to next API request authFetch ke through logout handle karegi.
  }, delay);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_access_token");
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("cp_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearTokens() {
  localStorage.removeItem("cp_access_token");
  localStorage.removeItem("cp_refresh_token");
  localStorage.removeItem("cp_user");
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Login failed");
  }

  const data: AuthResponse = await res.json();
  saveTokens(data);
  return data;
}

export async function logout() {
  const token = getAccessToken();
  if (token) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearTokens();
}

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("cp_refresh_token");
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      if (!res.ok) return null;

      const data = await res.json();

      localStorage.setItem("cp_access_token", data.accessToken);
      localStorage.setItem("cp_refresh_token", data.refreshToken);

      // Re-derive role from the refreshed token too, in case it ever changes
      // (e.g. an admin promotes/demotes the user mid-session).
      const payload = decodeJwtPayload(data.accessToken);
      const existingUser = getCurrentUser();
      localStorage.setItem("cp_user", JSON.stringify({ name: existingUser?.name, role: payload?.role ?? existingUser?.role ?? null }));

      scheduleProactiveRefresh(data.accessToken);

      return data.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  hasBeenScorer: boolean;
}

async function authFetch(path: string, options: RequestInit = {}, isRetry = false): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // 401 on the first attempt -> the access token likely expired while the
  // tab was backgrounded (setTimeout-based proactive refresh gets throttled
  // when hidden). Try ONE silent refresh-and-retry before giving up, instead
  // of surfacing an error that some page might mishandle into a redirect.
  if (res.status === 401 && !isRetry) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return authFetch(path, options, true);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchUsers(): Promise<AdminUser[]> {
  return authFetch("/users");
}

export async function updateUserRole(id: string, role: string) {
  return authFetch(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function deactivateUser(id: string) {
  return authFetch(`/users/${id}/deactivate`, { method: "PATCH" });
}
export interface AdminPlayer {
  id: string;
  name: string;
  dob: string | null;
  country: string | null;
  role: string;
  battingStyle: string | null;
  bowlingStyle: string | null;
  photoUrl: string | null;
  isActive: boolean;
}

export async function fetchPlayers(): Promise<AdminPlayer[]> {
  return authFetch("/players");
}

export async function createPlayer(data: {
  name: string;
  country?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  photoUrl?: string;
}) {
  return authFetch("/players", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deactivatePlayer(id: string) {
  return authFetch(`/players/${id}/deactivate`, { method: "PATCH" });
}
export interface TeamPlayerEntry {
  id: string;
  isCaptain: boolean;
  isKeeper: boolean;
  player: {
    id: string;
    name: string;
    country: string | null;
    role: string;
  };
}

export interface AdminTeam {
  id: string;
  name: string;
  shortCode: string;
  logoUrl: string | null;
  coach: string | null;
  manager: string | null;
  isActive: boolean;
  players: TeamPlayerEntry[];
}

export async function createTeam(data: { name: string; shortCode: string; coach?: string; logoUrl?: string; }) {
  return authFetch("/teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function addPlayerToTeam(teamId: string, playerId: string, isCaptain = false, isKeeper = false) {
  return authFetch(`/teams/${teamId}/players`, {
    method: "POST",
    body: JSON.stringify({ playerId, isCaptain, isKeeper }),
  });
}

export async function removePlayerFromTeam(teamId: string, playerId: string) {
  return authFetch(`/teams/${teamId}/players/${playerId}`, { method: "DELETE" });
}
export interface AdminGround {
  id: string;
  name: string;
  city: string;
  capacity: number | null;
  photoUrl: string | null;
}

export async function fetchGrounds(): Promise<AdminGround[]> {
  return authFetch("/grounds");
}

export async function createGround(data: { name: string; city: string; capacity?: number; photoUrl?: string }) {
  return authFetch("/grounds", { method: "POST", body: JSON.stringify(data) });
}

export async function updateGround(id: string, data: { name?: string; city?: string; capacity?: number; photoUrl?: string }) {
  return authFetch(`/grounds/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteGround(id: string) {
  return authFetch(`/grounds/${id}`, { method: "DELETE" });
}
export interface AdminTournament {
  id: string;
  name: string;
  format: string;
  oversPerInnings: number;
  startDate: string;
  endDate: string;
  status: string;
  logoUrl: string | null;
  teams: { team: AdminTeam }[];
}

export async function fetchTournaments(): Promise<AdminTournament[]> {
  return authFetch("/tournaments");
}

export async function fetchTournament(id: string): Promise<AdminTournament> {
  return authFetch(`/tournaments/${id}`);
}

export async function createTournament(data: { name: string; format: string; oversPerInnings: number; startDate: string; endDate: string; logoUrl?: string }) {
  return authFetch("/tournaments", { method: "POST", body: JSON.stringify(data) });
}

export async function addTeamToTournament(tournamentId: string, teamId: string) {
  return authFetch(`/tournaments/${tournamentId}/teams`, {
    method: "POST",
    body: JSON.stringify({ teamId }),
  });
}

export async function removeTeamFromTournament(tournamentId: string, teamId: string) {
  return authFetch(`/tournaments/${tournamentId}/teams/${teamId}`, { method: "DELETE" });
}
export interface AdminFixture {
  id: string;
  scheduledAt: string;
  status: string;
  teamA: { id: string; name: string; shortCode: string };
  teamB: { id: string; name: string; shortCode: string };
  ground: { id: string; name: string; city: string };
  tournament?: { id: string; name: string } | null;
  assignedScorer?: { id: string; name: string } | null;
}

export async function fetchFixtures(tournamentId?: string): Promise<AdminFixture[]> {
  const query = tournamentId ? `?tournamentId=${tournamentId}` : "";
  return authFetch(`/fixtures${query}`);
}

export async function generateFixtures(tournamentId: string) {
  return authFetch("/fixtures/generate", {
    method: "POST",
    body: JSON.stringify({ tournamentId }),
  });
}

export async function createFixture(data: {
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  groundId: string;
  scheduledAt: string;
}) {
  return authFetch("/fixtures", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export interface MatchDetail {
  id: string;
  status: string;
  teamA: { id: string; name: string; shortCode: string };
  teamB: { id: string; name: string; shortCode: string };
  ground: { id: string; name: string };
  scheduledAt: string;
}

export async function fetchMatch(matchId: string): Promise<MatchDetail> {
  return authFetch(`/matches/${matchId}`);
}

export interface PlayingXIEntry {
  playerId: string;
  isCaptain?: boolean;
  isKeeper?: boolean;
}

export async function submitPlayingXI(matchId: string, teamId: string, players: PlayingXIEntry[]) {
  return authFetch(`/matches/${matchId}/playing-xi`, {
    method: "POST",
    body: JSON.stringify({ teamId, players }),
  });
}

export async function fetchTeamSquad(teamId: string): Promise<AdminTeam> {
  return authFetch(`/teams/${teamId}`);
}
export async function recordToss(matchId: string, tossWinnerTeamId: string, tossDecision: "BAT" | "BOWL") {
  return authFetch(`/matches/${matchId}/toss`, {
    method: "POST",
    body: JSON.stringify({ tossWinnerTeamId, tossDecision }),
  });
}

export async function goLive(matchId: string) {
  return authFetch(`/matches/${matchId}/go-live`, { method: "POST" });
}
export interface CorrectBallPayload {
  originalBallId: string;
  inningsId: string;
  sequenceNum: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: number;
  extraType: "NONE" | "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE";
  extraRuns: number;
  isFreeHit: boolean;
  wicket?: {
    dismissedPlayerId: string;
    dismissalType: string;
    fielderId?: string;
  };
  reason?: string;
}


export async function correctBall(payload: CorrectBallPayload) {
  return authFetch("/scoring/correct-ball", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function fetchDashboardSummary() {
  const [users, players, teams, fixtures, tournaments, liveMatchesData] = await Promise.all([
    fetchUsers(),
    fetchPlayers(),
    fetchTeams(),
    fetchFixtures(),
    fetchTournaments(),
    fetchLiveMatches(),
  ]);

  const liveMatches = liveMatchesData;
  const recentMatches = [...fixtures]
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5);

  const tournamentMatchCounts = tournaments.map((t) => ({
    name: t.name,
    matches: fixtures.filter((f) => f.tournament?.id === t.id).length,
  }));

  return {
    totalUsers: users.length,
    totalPlayers: players.length,
    totalMatches: fixtures.length,
    liveMatchesCount: liveMatches.length,
    liveMatches,
    recentMatches,
    tournamentMatchCounts,
  };
}
export interface LiveMatch {
  id: string;
  status: string;
  teamA: { id: string; name: string; shortCode: string };
  teamB: { id: string; name: string; shortCode: string };
  ground: { name: string };
  scoredBy: { name: string } | null;
  innings: { totalRuns: number; totalWickets: number; oversBowled: string; inningsNumber: number }[];
}

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  return authFetch("/matches");
}

export async function takeOverScoring(matchId: string) {
  return authFetch(`/matches/${matchId}/take-over`, { method: "POST" });
}
export interface PlayerStatRow {
  playerId: string;
  runsScored: number;
  ballsFaced: number;
  wicketsTaken: number;
  matchesPlayed: number;
  hundreds: number;
  fifties: number;
  player?: { id: string; name: string; country: string | null };
}

export async function fetchTopScorersAdmin(limit = 20): Promise<PlayerStatRow[]> {
  return authFetch(`/stats/top-scorers?limit=${limit}`);
}

export async function fetchTopWicketTakersAdmin(limit = 20): Promise<PlayerStatRow[]> {
  return authFetch(`/stats/top-wicket-takers?limit=${limit}`);
}
export interface InningsInfo {
  id: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  oversBowled: string;
  targetRuns: number | null;
  isCompleted: boolean;
}

export interface MatchWithInnings extends MatchDetail {
  innings: InningsInfo[];
}

export async function fetchMatchWithInnings(matchId: string): Promise<MatchWithInnings> {
  return authFetch(`/matches/${matchId}`);
}

export interface RecordBallResult {
  ball: { id: string };
  over: { overNumber: number; ballsBowled: number; runsConceded: number; isCompleted: boolean };
  innings: InningsInfo;
  rotateStrike: boolean;
  overComplete: boolean;
  requiresNextBowlerSelection: boolean;
  lastOverBowlerId: string | null;
  inningsCompleted: boolean;
  matchCompleted: boolean;
  newInnings: InningsInfo | null;
  matchResult: { match: { winnerTeamId: string | null; isTied: boolean }; winnerTeamId: string | null; isTied: boolean } | null;
  isDuplicate?: boolean;
}

export async function recordBallApi(payload: {
  inningsId: string;
  sequenceNum: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: number;
  extraType: string;
  extraRuns: number;
  isFreeHit: boolean;
  wicket?: { dismissedPlayerId: string; dismissalType: string; fielderId?: string };
  commentary?: string;
}): Promise<RecordBallResult> {
  return authFetch("/scoring/ball", { method: "POST", body: JSON.stringify(payload) });
}
export async function createUser(data: { email: string; name: string; password: string; role: string; avatarUrl?: string }) {
  return authFetch("/users", { method: "POST", body: JSON.stringify(data) });
}
export async function uploadImage(file: File, type: "players" | "teams" | "users"): Promise<string> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/uploads/image?type=${type}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Upload failed");
  }
  const data = await res.json();
  return data.url;
}
export async function updateUser(id: string, data: { name?: string; email?: string; password?: string; role?: string; avatarUrl?: string }) {
  return authFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function updatePlayer(id: string, data: {
  name?: string;
  country?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  photoUrl?: string;
}) {
  return authFetch(`/players/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function updateTeam(id: string, data: {
  name?: string;
  shortCode?: string;
  coach?: string;
  manager?: string;
  logoUrl?: string;
}) {
  return authFetch(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function setPlayerRole(teamId: string, playerId: string, data: { isCaptain?: boolean; isKeeper?: boolean }) {
  return authFetch(`/teams/${teamId}/players/${playerId}/role`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function updateTournament(id: string, data: Partial<{ name: string; format: string; oversPerInnings: number; startDate: string; endDate: string; logoUrl: string }>) {
  return authFetch(`/tournaments/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteTournament(id: string) {
  return authFetch(`/tournaments/${id}`, { method: "DELETE" });
}
export async function updateFixture(id: string, data: { groundId?: string; scheduledAt?: string }) {
  return authFetch(`/matches/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteFixture(id: string) {
  return authFetch(`/matches/${id}`, { method: "DELETE" });
}

export async function fetchPlayerTeamMap(): Promise<Map<string, string>> {
  const teams = await fetchTeams();
  const map = new Map<string, string>();
  for (const team of teams) {
    for (const tp of team.players) {
      map.set(tp.player.id, team.shortCode);
    }
  }
  return map;
}
export interface AdminNotification {
  id: string;
  title: string;
  type: "MATCH" | "SYSTEM" | "TOURNAMENT" | "ANNOUNCEMENT";
  audience: "ALL_USERS" | "SCORERS" | "VIEWERS" | "ADMINS";
  status: "SENT" | "SCHEDULED" | "FAILED";
  createdAt: string;
}

export interface NotificationsPage {
  items: AdminNotification[];
  total: number;
}

export async function fetchNotifications(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<NotificationsPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    ...(params.search ? { search: params.search } : {}),
  });
  return authFetch(`/notifications?${query.toString()}`);
}

export async function createNotification(data: {
  title: string;
  type: AdminNotification["type"];
  audience: AdminNotification["audience"];
}) {
  return authFetch("/notifications", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNotification(
  id: string,
  data: Partial<{ title: string; type: AdminNotification["type"]; audience: AdminNotification["audience"] }>
) {
  return authFetch(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteNotification(id: string) {
  return authFetch(`/notifications/${id}`, { method: "DELETE" });
}
export interface SystemSettings {
  siteName: string;
  siteTagline: string;
  adminEmail: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  emailEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPassword: string | null;
  emailFromAddress: string | null;
  defaultFormat: string;
  defaultOversPerInnings: number;
  freeHitEnabled: boolean;
  autoStrikeRotation: boolean;
  sessionTimeoutMinutes: number;
  requireStrongPassword: boolean;
  twoFactorEnabled: boolean;
  autoBackupEnabled: boolean;
  backupFrequency: string;
  slackWebhookUrl: string | null;
  googleAnalyticsId: string | null;
}

export interface SystemInfo {
  apiVersion: string;
  nodeEnv: string;
  uptimeSeconds: number;
  dbStatus: string;
  counts: { userCount: number; playerCount: number; teamCount: number; matchCount: number; liveMatchCount: number };
}

export async function fetchSettings(): Promise<SystemSettings> {
  return authFetch("/settings");
}

export async function updateSettings(data: Partial<SystemSettings>) {
  return authFetch("/settings", { method: "PATCH", body: JSON.stringify(data) });
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  return authFetch("/settings/system-info");
}
export interface CurrentUserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

export async function fetchMyProfile(): Promise<CurrentUserProfile> {
  return authFetch("/users/me");
}

export async function updateMyProfile(data: { name?: string; avatarUrl?: string }) {
  return authFetch("/users/me", { method: "PATCH", body: JSON.stringify(data) });
}
export async function reactivatePlayer(id: string) {
  return authFetch(`/players/${id}/reactivate`, { method: "PATCH" });
}
export async function fetchScorecard(matchId: string) {
  return authFetch(`/matches/${matchId}/scorecard`);
}

export async function undoLastBall(matchId: string) {
  // Placeholder wiring — see note below about backend support needed.
  return authFetch(`/scoring/undo`, { method: "POST", body: JSON.stringify({ matchId }) });
}
export async function downloadScorecardPdf(matchId: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/reports/scorecard/${matchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to generate report");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scorecard-${matchId}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}
export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
) {
  return authFetch("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}
export interface BulkImportRow {
  playerName: string;
  country?: string;
  role?: string;
  photoUrl?: string;
  teamName?: string;
  teamShortCode?: string;
  teamLogoUrl?: string;
}

export interface BulkImportResult {
  playersCreated: number;
  playersUpdated: number;
  teamsCreated: number;
  squadsReplaced: number;
  errors: string[];
}

export async function bulkImportPlayers(rows: BulkImportRow[], replaceExistingSquad = false): Promise<BulkImportResult> {
  return authFetch("/players/bulk-import", { method: "POST", body: JSON.stringify({ rows, replaceExistingSquad }) });
}
export async function deactivateTeam(id: string) {
  return authFetch(`/teams/${id}/deactivate`, { method: "PATCH" });
}
export async function reactivateTeam(id: string) {
  return authFetch(`/teams/${id}/reactivate`, { method: "PATCH" });
}
export async function fetchTeams(includeInactive = false): Promise<AdminTeam[]> {
  const query = includeInactive ? "?includeInactive=true" : "";
  return authFetch(`/teams${query}`);
}
export interface MatchCurrentState {
  hasStarted: boolean;
  inningsId?: string;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  needsNewBatterForId?: string | null;
  needsNewBowler?: boolean;
  isFreeHit?: boolean;
  nextSequenceNum?: number;
}

export async function fetchCurrentState(matchId: string): Promise<MatchCurrentState> {
  return authFetch(`/matches/${matchId}/current-state`);
}

export async function fetchCommentary(matchId: string) {
  return authFetch(`/matches/${matchId}/commentary`);
}

export async function fetchManhattanData(matchId: string) {
  return authFetch(`/matches/${matchId}/manhattan`);
}

export async function startSuperOver(matchId: string, battingTeamId: string) {
  return authFetch("/scoring/super-over/start", { method: "POST", body: JSON.stringify({ matchId, battingTeamId }) });
}

export async function abandonMatch(matchId: string) {
  return authFetch(`/matches/${matchId}/abandon`, { method: "POST" });
}

export async function fetchScorerUsers(): Promise<AdminUser[]> {
  const all = await fetchUsers();
  return all.filter((u) => u.role === "SCORER" && u.isActive);
}

export async function assignScorer(matchId: string, scorerId: string) {
  return authFetch(`/matches/${matchId}/assign-scorer`, { method: "PATCH", body: JSON.stringify({ scorerId }) });
}

export async function unassignScorer(matchId: string) {
  return authFetch(`/matches/${matchId}/unassign-scorer`, { method: "PATCH" });
}

export async function fetchMyAssignedMatches(): Promise<AdminFixture[]> {
  return authFetch("/matches/my-assigned");
}

export async function setInningsOpeners(
  matchId: string,
  dto: { strikerId: string; nonStrikerId: string; bowlerId: string },
): Promise<InningsInfo> {
  return authFetch(`/matches/${matchId}/openers`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
export async function fetchFullCommentary(matchId: string): Promise<any[]> {
  return authFetch(`/matches/${matchId}/full-commentary`);
}