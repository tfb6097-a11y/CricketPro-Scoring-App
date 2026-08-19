import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { calculateNRR, oversStringToDecimal } from "./nrr.calculator";

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Called by StatsProcessor when a "match:completed" job is consumed.
  async recomputeForMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { innings: { include: { overs: { include: { balls: { include: { wicket: true } } } } } } },
    });
    if (!match) {
      this.logger.warn(`recomputeForMatch: match ${matchId} not found`);
      return;
    }

    await this.recomputePlayerCareerStats(match);
    await this.recomputeTeamStats(match);
    if (match.tournamentId) {
      await this.recomputePointsTable(match.tournamentId);
    }

    this.logger.log(`Stats recomputed for match ${matchId}`);
  }

  private async recomputePlayerCareerStats(match: any) {
    // Gather every player who batted, bowled, or was dismissed in this match.
    const playerIds = new Set<string>();
    for (const innings of match.innings) {
      for (const over of innings.overs) {
        for (const ball of over.balls) {
          playerIds.add(ball.strikerId);
          playerIds.add(ball.bowlerId);
        }
      }
    }

    for (const playerId of playerIds) {
      let runsScored = 0;
      let ballsFaced = 0;
      let wicketsTaken = 0;
      let hundreds = 0;
      let fifties = 0;

      // Recompute career totals from EVERY match this player has appeared in
      // (not just this one) — full career recompute, since a single match
      // completing can push a player over a century/fifty threshold.
      const allBalls = await this.prisma.ball.findMany({
        where: { OR: [{ strikerId: playerId }, { bowlerId: playerId }] },
        include: { wicket: true, over: { include: { innings: true } } },
      });

      // Group by innings to detect per-innings 50s/100s.
      const runsByInnings = new Map<string, number>();
      for (const ball of allBalls) {
        if (ball.strikerId === playerId) {
          runsScored += ball.runsOffBat;
          if (ball.isLegalDelivery) ballsFaced += 1;
          const key = ball.over.inningsId;
          runsByInnings.set(key, (runsByInnings.get(key) ?? 0) + ball.runsOffBat);
        }
        if (ball.bowlerId === playerId && ball.wicket && ball.wicket.bowlerCredited) {
          wicketsTaken += 1;
        }
      }
      for (const inningsRuns of runsByInnings.values()) {
        if (inningsRuns >= 100) hundreds += 1;
        else if (inningsRuns >= 50) fifties += 1;
      }

      const matchesPlayed = await this.prisma.match.count({
        where: {
          status: "COMPLETED",
          OR: [
            { playingXI: { some: { playerId } } },
          ],
        },
      });

      await this.prisma.playerCareerStats.upsert({
        where: { playerId },
        create: { playerId, matchesPlayed, runsScored, ballsFaced, hundreds, fifties, wicketsTaken },
        update: { matchesPlayed, runsScored, ballsFaced, hundreds, fifties, wicketsTaken },
      });
    }
  }

  private async recomputeTeamStats(match: any) {
    for (const teamId of [match.teamAId, match.teamBId]) {
      const matches = await this.prisma.match.findMany({
        where: { status: "COMPLETED", OR: [{ teamAId: teamId }, { teamBId: teamId }] },
      });

      const matchesPlayed = matches.length;
      const wins = matches.filter((m) => m.winnerTeamId === teamId).length;
      const ties = matches.filter((m) => m.isTied).length;
      const losses = matchesPlayed - wins - ties;

      await this.prisma.teamStats.upsert({
        where: { teamId },
        create: { teamId, matchesPlayed, wins, losses, ties },
        update: { matchesPlayed, wins, losses, ties },
      });
    }
  }

  private async recomputePointsTable(tournamentId: string) {
    const tournamentTeams = await this.prisma.tournamentTeam.findMany({ where: { tournamentId } });

    for (const tt of tournamentTeams) {
      const teamId = tt.teamId;
      const matches = await this.prisma.match.findMany({
        where: {
          tournamentId,
          status: "COMPLETED",
          OR: [{ teamAId: teamId }, { teamBId: teamId }],
        },
        include: { innings: true },
      });

      let played = 0, won = 0, lost = 0, tied = 0, points = 0;
      let runsScored = 0, oversFaced = 0, runsConceded = 0, oversBowled = 0;

      for (const m of matches) {
        played += 1;
        if (m.isTied) {
          tied += 1;
          points += 1;
        } else if (m.winnerTeamId === teamId) {
          won += 1;
          points += 2;
        } else {
          lost += 1;
        }

        for (const innings of m.innings) {
          if (innings.battingTeamId === teamId) {
            runsScored += innings.totalRuns;
            oversFaced += oversStringToDecimal(innings.oversBowled.toString());
          } else if (innings.bowlingTeamId === teamId) {
            runsConceded += innings.totalRuns;
            oversBowled += oversStringToDecimal(innings.oversBowled.toString());
          }
        }
      }

      const nrr = calculateNRR(runsScored, oversFaced, runsConceded, oversBowled);

      await this.prisma.pointsTableRow.upsert({
        where: { tournamentId_teamId: { tournamentId, teamId } },
        create: { tournamentId, teamId, played, won, lost, tied, points, nrr },
        update: { played, won, lost, tied, points, nrr },
      });
    }
  }
}