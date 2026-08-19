import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StatsService } from "./stats.service";

@Controller("stats")
export class StatsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService, // ← add this
  ) {}

  // ⚠️ TEMPORARY DEBUG ROUTE — bypasses the BullMQ queue entirely and runs
  // the recompute synchronously. Use this to manually fix already-completed
  // matches whose stats job never got processed. Remove or guard with
  // @UseGuards(JwtAuthGuard, RolesGuard) + @Roles(AppRole.ADMIN) once the
  // real queue issue is confirmed fixed.
  @Get("recompute/:matchId")
  async manualRecompute(@Param("matchId") matchId: string) {
    await this.statsService.recomputeForMatch(matchId);
    return { recomputed: true, matchId };
  }

  // ... baaki sab same rahega (points-table, top-scorers, etc.)
  @Get("points-table/:tournamentId")
  async getPointsTable(@Param("tournamentId") tournamentId: string) {
    return this.prisma.pointsTableRow.findMany({
      where: { tournamentId },
      include: { tournament: false },
      orderBy: [{ points: "desc" }, { nrr: "desc" }],
    }).then(async (rows) => {
      // attach team info for display (name, shortCode, logo)
      const teamIds = rows.map((r) => r.teamId);
      const teams = await this.prisma.team.findMany({ where: { id: { in: teamIds } } });
      const teamMap = new Map(teams.map((t) => [t.id, t]));
      return rows.map((r) => ({ ...r, team: teamMap.get(r.teamId) }));
    });
  }

  // Stats Hub — Top Run Scorers (Design System §3.8, §5.1 "Top Scorers" card)
  @Get("top-scorers")
  async getTopScorers(@Query("limit") limit?: string) {
    const take = limit ? parseInt(limit, 10) : 10;
    const rows = await this.prisma.playerCareerStats.findMany({
      orderBy: { runsScored: "desc" },
      take,
    });
    return this.attachPlayerInfo(rows);
  }

  // Stats Hub — Top Wicket Takers (Design System §5.1 "Top Bowlers" card)
  @Get("top-wicket-takers")
  async getTopWicketTakers(@Query("limit") limit?: string) {
    const take = limit ? parseInt(limit, 10) : 10;
    const rows = await this.prisma.playerCareerStats.findMany({
      orderBy: { wicketsTaken: "desc" },
      take,
    });
    return this.attachPlayerInfo(rows);
  }

  // Player Profile page (Design System §3.6) — career stats tab
  @Get("player/:playerId")
  async getPlayerStats(@Param("playerId") playerId: string) {
    return this.prisma.playerCareerStats.findUnique({ where: { playerId } });
  }

  // Team Profile page (Design System §3.5) — team stats card
  @Get("team/:teamId")
  async getTeamStats(@Param("teamId") teamId: string) {
    return this.prisma.teamStats.findUnique({ where: { teamId } });
  }

  private async attachPlayerInfo(rows: any[]) {
    const playerIds = rows.map((r) => r.playerId);
    const players = await this.prisma.player.findMany({ where: { id: { in: playerIds } } });
    const playerMap = new Map(players.map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, player: playerMap.get(r.playerId) }));
  }
}