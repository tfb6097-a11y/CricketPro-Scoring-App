import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMatchDto } from "./dto/create-match.dto";
import { SetPlayingXIDto } from "./dto/set-playing-xi.dto";

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMatchDto) {
    return this.prisma.match.create({
      data: {
        tournamentId: dto.tournamentId,
        teamAId: dto.teamAId,
        teamBId: dto.teamBId,
        groundId: dto.groundId,
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        teamA: true,
        teamB: true,
        ground: true,
        tournament: true,
        playingXI: true,
        innings: { orderBy: { inningsNumber: "desc" } },
      },
    });
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    return match;
  }

  // Validates: exactly 11 players, exactly 1 captain, exactly 1 keeper,
  // every player must belong to that team's ACTIVE squad (leftAt = null),
  // and teamId must be one of the two teams actually playing this match.
  async setPlayingXI(matchId: string, dto: SetPlayingXIDto, userId: string, role: string) {
    await this.assertScorerAllowed(matchId, userId, role);

    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (dto.teamId !== match.teamAId && dto.teamId !== match.teamBId) {
      throw new BadRequestException("Team is not part of this match");
    }
    if (match.status !== "UPCOMING") {
      throw new BadRequestException("Playing XI can only be set before the match goes LIVE");
    }

    const captains = dto.players.filter((p) => p.isCaptain);
    const keepers = dto.players.filter((p) => p.isKeeper);
    if (captains.length !== 1) {
      throw new BadRequestException("Exactly one player must be flagged as captain");
    }
    if (keepers.length !== 1) {
      throw new BadRequestException("Exactly one player must be flagged as wicketkeeper");
    }

    const playerIds = dto.players.map((p) => p.playerId);
    const uniqueIds = new Set(playerIds);
    if (uniqueIds.size !== 11) {
      throw new BadRequestException("Playing XI must have 11 distinct players");
    }

    const activeMemberships = await this.prisma.teamPlayer.findMany({
      where: { teamId: dto.teamId, playerId: { in: playerIds }, leftAt: null },
    });
    if (activeMemberships.length !== 11) {
      throw new BadRequestException(
        "All 11 players must be active squad members of the selected team",
      );
    }

    const otherTeamId = dto.teamId === match.teamAId ? match.teamBId : match.teamAId;
    const conflicting = await this.prisma.matchPlayingXI.findFirst({
      where: { matchId, teamId: otherTeamId, playerId: { in: playerIds } },
    });
    if (conflicting) {
      throw new BadRequestException(
        "One or more selected players are already in the opposing team's Playing XI for this match",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.matchPlayingXI.deleteMany({ where: { matchId, teamId: dto.teamId } });

      return tx.matchPlayingXI.createMany({
        data: dto.players.map((p) => ({
          matchId,
          teamId: dto.teamId,
          playerId: p.playerId,
          isCaptain: !!p.isCaptain,
          isKeeper: !!p.isKeeper,
        })),
      });
    });
  }

  async getPlayingXI(matchId: string, teamId: string) {
    return this.prisma.matchPlayingXI.findMany({
      where: { matchId, teamId },
      include: { player: true },
    });
  }

  // Records the toss. Does NOT go live yet — that's a separate explicit action,
  // per the state machine: toss + both XIs are prerequisites, Go Live is the gate.
  async recordToss(matchId: string, dto: { tossWinnerTeamId: string; tossDecision: "BAT" | "BOWL" }, userId: string, role: string) {
    await this.assertScorerAllowed(matchId, userId, role);

    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (dto.tossWinnerTeamId !== match.teamAId && dto.tossWinnerTeamId !== match.teamBId) {
      throw new BadRequestException("Toss winner must be one of the two teams in this match");
    }
    if (match.status !== "UPCOMING") {
      throw new BadRequestException("Toss can only be recorded before the match goes LIVE");
    }

    return this.prisma.match.update({
      where: { id: matchId },
      data: {
        tossWinnerTeamId: dto.tossWinnerTeamId,
        tossDecision: dto.tossDecision as any,
      },
    });
  }

  // Go-Live guard: blocks the UPCOMING -> LIVE transition unless both Playing XIs
  // and the toss are already recorded.
  async goLive(matchId: string, userId: string, role: string) {
    await this.assertScorerAllowed(matchId, userId, role);

    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (match.status !== "UPCOMING") {
      throw new BadRequestException("Match is not in an UPCOMING state");
    }
    if (!match.tossWinnerTeamId || !match.tossDecision) {
      throw new BadRequestException("Toss must be recorded before going live");
    }

    const [teamAXI, teamBXI] = await Promise.all([
      this.prisma.matchPlayingXI.count({ where: { matchId, teamId: match.teamAId } }),
      this.prisma.matchPlayingXI.count({ where: { matchId, teamId: match.teamBId } }),
    ]);
    if (teamAXI !== 11 || teamBXI !== 11) {
      throw new BadRequestException("Both teams must have a confirmed Playing XI of 11 before going live");
    }

    const battingTeamId =
      match.tossDecision === "BAT"
        ? match.tossWinnerTeamId
        : match.tossWinnerTeamId === match.teamAId
          ? match.teamBId
          : match.teamAId;
    const bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId;

    return this.prisma.$transaction(async (tx) => {
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: { status: "LIVE" },
      });

      const innings = await tx.innings.create({
        data: {
          matchId,
          inningsNumber: 1,
          battingTeamId,
          bowlingTeamId,
        },
      });

      return { match: updatedMatch, innings };
    });
  }

  // Enforces the single-active-scoring-session lock (v1 stopgap: "last scorer to open the match wins").
  async takeOverScoring(matchId: string, userId: string, role: string) {
    await this.assertScorerAllowed(matchId, userId, role);

    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (match.status !== "LIVE") {
      throw new BadRequestException("Can only take over scoring for a LIVE match");
    }

    return this.prisma.match.update({
      where: { id: matchId },
      data: { currentScoringUserId: userId },
    });
  }

  async findLive() {
    return this.prisma.match.findMany({
      where: { status: "LIVE" },
      include: { teamA: true, teamB: true, ground: true, scoredBy: true, innings: true },
    });
  }

  // Public commentary feed — newest ball first.
  async getCommentary(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { innings: { orderBy: { inningsNumber: "desc" }, take: 1 } },
    });
    if (!match || match.innings.length === 0) {
      return [];
    }
    const currentInnings = match.innings[0];

    const overs = await this.prisma.over.findMany({
      where: { inningsId: currentInnings.id },
      orderBy: { overNumber: "desc" },
      include: { balls: { include: { wicket: true }, orderBy: { sequenceNum: "desc" } } },
    });

    const playerIds = new Set<string>();
    for (const over of overs) {
      for (const ball of over.balls) {
        playerIds.add(ball.strikerId);
        playerIds.add(ball.bowlerId);
      }
    }
    const players = await this.prisma.player.findMany({ where: { id: { in: Array.from(playerIds) } } });
    const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

    const entries: any[] = [];
    for (const over of overs) {
      for (const ball of over.balls) {
        entries.push({
          overNumber: over.overNumber,
          runsOffBat: ball.runsOffBat,
          extraType: ball.extraType,
          extraRuns: ball.extraRuns,
          isWicket: !!ball.wicket,
          strikerName: nameOf(ball.strikerId),
          bowlerName: nameOf(ball.bowlerId),
          commentary: ball.commentary,
          createdAt: ball.createdAt,
        });
      }
    }

    return entries;
  }

  // Full scorecard — batting/bowling tables + fall of wickets.
  async getScorecard(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: true,
        teamB: true,
        innings: {
          orderBy: { inningsNumber: "asc" },
          include: { overs: { include: { balls: { include: { wicket: true }, orderBy: { sequenceNum: "asc" } } }, orderBy: { overNumber: "asc" } } },
        },
      },
    });
    if (!match) {
      throw new NotFoundException("Match not found");
    }

    const playerIds = new Set<string>();
    for (const innings of match.innings) {
      for (const over of innings.overs) {
        for (const ball of over.balls) {
          playerIds.add(ball.strikerId);
          playerIds.add(ball.bowlerId);
          if (ball.wicket) playerIds.add(ball.wicket.dismissedPlayerId);
        }
      }
    }
    const players = await this.prisma.player.findMany({ where: { id: { in: Array.from(playerIds) } } });
    const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

    const inningsResults = match.innings.map((innings) => {
      const battingStats = new Map<string, { runs: number; balls: number; fours: number; sixes: number; isOut: boolean; dismissalDesc: string }>();
      const bowlingStats = new Map<string, { runs: number; balls: number; wickets: number; maidens: number }>();
      const fallOfWickets: { wicketNumber: number; runs: number; over: string; playerName: string }[] = [];

      let runningRuns = 0;
      let wicketCount = 0;

      for (const over of innings.overs) {
        for (const ball of over.balls) {
          const bStat = battingStats.get(ball.strikerId) ?? { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissalDesc: "not out" };
          bStat.runs += ball.runsOffBat;
          if (ball.isLegalDelivery) bStat.balls += 1;
          if (ball.runsOffBat === 4) bStat.fours += 1;
          if (ball.runsOffBat === 6) bStat.sixes += 1;
          battingStats.set(ball.strikerId, bStat);

          runningRuns += ball.runsOffBat + (ball.extraType === "WIDE" || ball.extraType === "NO_BALL" ? 1 : 0) + ball.extraRuns;

          if (ball.wicket) {
            bStat.isOut = true;
            wicketCount += 1;
            const dismissed = players.find((p) => p.id === ball.wicket!.dismissedPlayerId);
            bStat.dismissalDesc = `${ball.wicket.dismissalType}`;
            fallOfWickets.push({
              wicketNumber: wicketCount,
              runs: runningRuns,
              over: `${over.overNumber - 1}.${ball.sequenceNum}`,
              playerName: dismissed?.name ?? nameOf(ball.wicket.dismissedPlayerId),
            });
          }
        }

        const bowlStat = bowlingStats.get(over.bowlerId) ?? { runs: 0, balls: 0, wickets: 0, maidens: 0 };
        bowlStat.runs += over.runsConceded;
        bowlStat.balls += over.ballsBowled;
        if (over.isMaiden) bowlStat.maidens += 1;
        for (const ball of over.balls) {
          if (ball.wicket && ball.wicket.bowlerCredited) bowlStat.wickets += 1;
        }
        bowlingStats.set(over.bowlerId, bowlStat);
      }

      const battingTeam = innings.battingTeamId === match.teamAId ? match.teamA : match.teamB;

      return {
        inningsNumber: innings.inningsNumber,
        battingTeamName: battingTeam.name,
        totalRuns: innings.totalRuns,
        totalWickets: innings.totalWickets,
        oversBowled: innings.oversBowled,
        batting: Array.from(battingStats.entries()).map(([playerId, s]) => ({
          playerName: nameOf(playerId),
          runs: s.runs,
          balls: s.balls,
          fours: s.fours,
          sixes: s.sixes,
          strikeRate: s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(2) : "0.00",
          dismissal: s.isOut ? s.dismissalDesc : "not out",
        })),
        bowling: Array.from(bowlingStats.entries()).map(([playerId, s]) => ({
          playerName: nameOf(playerId),
          overs: `${Math.floor(s.balls / 6)}.${s.balls % 6}`,
          maidens: s.maidens,
          runs: s.runs,
          wickets: s.wickets,
          economy: s.balls > 0 ? ((s.runs / s.balls) * 6).toFixed(2) : "0.00",
        })),
        fallOfWickets,
      };
    });

    return {
      teamA: match.teamA,
      teamB: match.teamB,
      innings: inningsResults,
    };
  }

  // Same double-booking guard as fixtures.service.ts createManual — only
  // checks conflicts if the ground or scheduledAt is actually changing.
  async update(id: string, dto: { groundId?: string; scheduledAt?: string }) {
    const match = await this.findOne(id);

    if (dto.groundId !== undefined || dto.scheduledAt !== undefined) {
      const newGroundId = dto.groundId ?? match.groundId;
      const newScheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : match.scheduledAt;

      const conflict = await this.prisma.match.findFirst({
        where: {
          id: { not: id },
          groundId: newGroundId,
          scheduledAt: newScheduledAt,
          status: { not: "ABANDONED" },
        },
      });
      if (conflict) {
        throw new BadRequestException("This ground already has a match scheduled at the same date and time");
      }
    }

    return this.prisma.match.update({
      where: { id },
      data: {
        ...(dto.groundId !== undefined && { groundId: dto.groundId }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
      },
    });
  }

  async remove(id: string) {
    const match = await this.findOne(id);
    if (match.status === "LIVE" || match.status === "COMPLETED") {
      throw new BadRequestException("Cannot delete a match that is live or completed");
    }
    return this.prisma.match.delete({ where: { id } });
  }

  // Reconstructs "who's batting/bowling right now" purely from the ball-by-ball history.
  async getCurrentState(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { innings: { orderBy: { inningsNumber: "desc" }, take: 1 } },
    });
    if (!match) {
      throw new NotFoundException("Match not found");
    }

    const innings = match.innings[0];
    if (!innings) {
      return { hasStarted: false };
    }

    // NEW: if openers were persisted but no ball has been bowled yet,
    // restore that state instead of reporting hasStarted: false.
    const openersReady = innings.openingStrikerId && innings.openingNonStrikerId && innings.openingBowlerId;

    const lastOver = await this.prisma.over.findFirst({
      where: { inningsId: innings.id },
      orderBy: { overNumber: "desc" },
    });
    if (!lastOver) {
      if (openersReady) {
        return {
          hasStarted: true,
          inningsId: innings.id,
          strikerId: innings.openingStrikerId,
          nonStrikerId: innings.openingNonStrikerId,
          bowlerId: innings.openingBowlerId,
          needsNewBatterForId: null,
          needsNewBowler: false,
          isFreeHit: false,
          nextSequenceNum: 1,
        };
      }
      return { hasStarted: false, inningsId: innings.id };
    }

    const lastBall = await this.prisma.ball.findFirst({
      where: { overId: lastOver.id },
      orderBy: { sequenceNum: "desc" },
      include: { wicket: true },
    });
    if (!lastBall) {
      if (openersReady) {
        return {
          hasStarted: true,
          inningsId: innings.id,
          strikerId: innings.openingStrikerId,
          nonStrikerId: innings.openingNonStrikerId,
          bowlerId: lastOver.bowlerId ?? innings.openingBowlerId,
          needsNewBatterForId: null,
          needsNewBowler: false,
          isFreeHit: false,
          nextSequenceNum: 1,
        };
      }
      return { hasStarted: false, inningsId: innings.id };
    }

    const rotate =
      lastOver.isCompleted ||
      (lastBall.extraType === "WIDE" || lastBall.extraType === "NO_BALL"
        ? lastBall.runsOffBat % 2 === 1
        : lastBall.extraType === "BYE" || lastBall.extraType === "LEG_BYE"
          ? lastBall.extraRuns % 2 === 1
          : lastBall.runsOffBat % 2 === 1);

    let strikerId = lastBall.strikerId;
    let nonStrikerId = lastBall.nonStrikerId;
    if (rotate) {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
    }

    const needsNewBatterForId = lastBall.wicket ? lastBall.wicket.dismissedPlayerId : null;

    const maxSequence = await this.prisma.ball.findFirst({
      where: { over: { inningsId: innings.id } },
      orderBy: { sequenceNum: "desc" },
    });

    return {
      hasStarted: true,
      inningsId: innings.id,
      strikerId,
      nonStrikerId,
      bowlerId: lastOver.bowlerId,
      needsNewBatterForId,
      needsNewBowler: lastOver.isCompleted,
      isFreeHit: lastBall.extraType === "NO_BALL",
      nextSequenceNum: (maxSequence?.sequenceNum ?? 0) + 1,
    };
  }

  // Per-over runs for both teams — powers the Manhattan chart.
  async getManhattanData(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: true,
        teamB: true,
        innings: { orderBy: { inningsNumber: "asc" }, include: { overs: { orderBy: { overNumber: "asc" } } } },
      },
    });
    if (!match) {
      throw new NotFoundException("Match not found");
    }

    return match.innings.map((innings) => {
      const battingTeam = innings.battingTeamId === match.teamAId ? match.teamA : match.teamB;
      return {
        teamName: battingTeam.shortCode,
        inningsNumber: innings.inningsNumber,
        overs: innings.overs.map((o) => ({ over: o.overNumber, runs: o.runsConceded })),
      };
    });
  }

  async abandonMatch(matchId: string) {
    const match = await this.findOne(matchId);
    if (match.status === "COMPLETED") {
      throw new BadRequestException("Match is already completed");
    }
    return this.prisma.match.update({ where: { id: matchId }, data: { status: "ABANDONED" } });
  }

  // Admin assigns a specific SCORER to this fixture.
  async assignScorer(matchId: string, scorerId: string) {
    await this.findOne(matchId);
    const scorer = await this.prisma.user.findUnique({ where: { id: scorerId } });
    if (!scorer || scorer.role !== "SCORER") {
      throw new BadRequestException("Assigned user must have the SCORER role");
    }
    return this.prisma.match.update({ where: { id: matchId }, data: { assignedScorerId: scorerId } });
  }

  async unassignScorer(matchId: string) {
    await this.findOne(matchId);
    return this.prisma.match.update({ where: { id: matchId }, data: { assignedScorerId: null } });
  }

  // A SCORER only ever sees matches assigned to them.
  async findMyAssignedMatches(userId: string) {
    return this.prisma.match.findMany({
      where: { assignedScorerId: userId, status: { in: ["UPCOMING", "LIVE"] } },
      include: { teamA: true, teamB: true, ground: true },
      orderBy: { scheduledAt: "asc" },
    });
  }

  // Enforced before any setup/scoring action.
  async assertScorerAllowed(matchId: string, userId: string, role: string) {
    if (role === "ADMIN") return;
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException("Match not found");
    if (match.assignedScorerId && match.assignedScorerId !== userId) {
      throw new ForbiddenException("You are not the assigned scorer for this match");
    }
  }

  async setOpeners(
    matchId: string,
    dto: { strikerId: string; nonStrikerId: string; bowlerId: string },
    userId: string,
    role: string,
  ) {
    await this.assertScorerAllowed(matchId, userId, role);

    const innings = await this.prisma.innings.findFirst({
      where: { matchId, isCompleted: false },
      orderBy: { inningsNumber: "desc" },
    });
    if (!innings) {
      throw new BadRequestException("No active innings for this match");
    }
    if (dto.strikerId === dto.nonStrikerId) {
      throw new BadRequestException("Striker and non-striker must be different players");
    }

    return this.prisma.innings.update({
      where: { id: innings.id },
      data: {
        openingStrikerId: dto.strikerId,
        openingNonStrikerId: dto.nonStrikerId,
        openingBowlerId: dto.bowlerId,
      },
    });
  }

  // Full match commentary across BOTH innings — powers the Match Summary
  // "Key Moments" timeline. Unlike getCommentary() (latest innings only,
  // for the live in-progress view), this walks every innings chronologically.
  async getFullCommentary(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: true,
        teamB: true,
        innings: { orderBy: { inningsNumber: "asc" } },
      },
    });
    if (!match) {
      throw new NotFoundException("Match not found");
    }

    const allEntries: any[] = [];

    for (const innings of match.innings) {
      const battingTeam = innings.battingTeamId === match.teamAId ? match.teamA : match.teamB;

      const overs = await this.prisma.over.findMany({
        where: { inningsId: innings.id },
        orderBy: { overNumber: "asc" },
        include: { balls: { include: { wicket: true }, orderBy: { sequenceNum: "asc" } } },
      });

      const playerIds = new Set<string>();
      for (const over of overs) {
        for (const ball of over.balls) {
          playerIds.add(ball.strikerId);
          playerIds.add(ball.bowlerId);
        }
      }
      const players = await this.prisma.player.findMany({ where: { id: { in: Array.from(playerIds) } } });
      const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

      for (const over of overs) {
        for (const ball of over.balls) {
          allEntries.push({
            inningsNumber: innings.inningsNumber,
            battingTeamName: battingTeam.name,
            overNumber: over.overNumber,
            runsOffBat: ball.runsOffBat,
            extraType: ball.extraType,
            extraRuns: ball.extraRuns,
            isWicket: !!ball.wicket,
            strikerId: ball.strikerId,
            strikerName: nameOf(ball.strikerId),
            bowlerName: nameOf(ball.bowlerId),
            commentary: ball.commentary,
            createdAt: ball.createdAt,
          });
        }
      }
    }

    return allEntries; // already chronological: innings asc → over asc → ball asc
  }
}