import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RecordBallDto } from "./dto/record-ball.dto";
import { EventsGateway } from "../../gateways/events.gateway";
import { CorrectBallDto } from "./dto/correct-ball.dto";
import { AuditLogsService } from "../audit-logs/audit-logs,service";
import { Queue } from "bullmq";
import { STATS_QUEUE } from "../stats/stats-queue.provider";
import {
  isLegalDelivery,
  calculateBallRuns,
  calculateBowlerConcededRuns,
  shouldRotateStrikeForRuns,
  isDismissalAllowedOnFreeHit,
  formatOversBowled,
  isOverComplete,
  isMaidenOver,
  isBowlerEligibleForNextOver,
} from "./scoring.rules";

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditLogsService: AuditLogsService,
    @Inject(STATS_QUEUE) private readonly statsQueue: Queue,
  ) {}

  async recordBall(dto: RecordBallDto, userId: string, role: string) {
    const innings = await this.prisma.innings.findUnique({ where: { id: dto.inningsId } });
    if (!innings) {
      throw new NotFoundException("Innings not found");
    }
    if (innings.isCompleted) {
      throw new BadRequestException("Innings is already completed");
    }

    // Scorer-assignment guard: only the assigned scorer (or any ADMIN) may score this match.
    if (role !== "ADMIN") {
      const match = await this.prisma.match.findUnique({ where: { id: innings.matchId } });
      if (match?.assignedScorerId && match.assignedScorerId !== userId) {
        throw new ForbiddenException("You are not the assigned scorer for this match");
      }
    }

    const existingBall = await this.prisma.ball.findFirst({
      where: { over: { inningsId: dto.inningsId }, sequenceNum: dto.sequenceNum },
      include: { over: true },
    });
    if (existingBall) {
      const currentInnings = await this.prisma.innings.findUnique({ where: { id: dto.inningsId } });
      return {
        ball: existingBall,
        over: existingBall.over,
        innings: currentInnings,
        rotateStrike: false,
        overComplete: existingBall.over.isCompleted,
        requiresNextBowlerSelection: false,
        lastOverBowlerId: null,
        inningsCompleted: currentInnings?.isCompleted ?? false,
        matchCompleted: false,
        newInnings: null,
        matchResult: null,
        isDuplicate: true,
      };
    }

    if (dto.wicket && dto.isFreeHit && !isDismissalAllowedOnFreeHit(dto.wicket.dismissalType)) {
      throw new BadRequestException("Only a run-out is allowed as a dismissal on a free hit");
    }

    const legal = isLegalDelivery(dto.extraType);

    return this.prisma.$transaction(async (tx) => {
      let currentOver = await tx.over.findFirst({
        where: { inningsId: dto.inningsId, isCompleted: false },
        orderBy: { overNumber: "desc" },
      });

      if (!currentOver) {
        const lastOver = await tx.over.findFirst({
          where: { inningsId: dto.inningsId },
          orderBy: { overNumber: "desc" },
        });
        const nextOverNumber = lastOver ? lastOver.overNumber + 1 : 1;

        currentOver = await tx.over.create({
          data: {
            inningsId: dto.inningsId,
            overNumber: nextOverNumber,
            bowlerId: dto.bowlerId,
          },
        });
      }

      const ball = await tx.ball.create({
        data: {
          overId: currentOver.id,
          sequenceNum: dto.sequenceNum,
          strikerId: dto.strikerId,
          nonStrikerId: dto.nonStrikerId,
          bowlerId: dto.bowlerId,
          runsOffBat: dto.runsOffBat,
          extraType: dto.extraType as any,
          extraRuns: dto.extraRuns,
          isLegalDelivery: legal,
          isFreeHit: dto.isFreeHit,
          commentary: dto.commentary,
        },
      });

      if (dto.wicket) {
        await tx.wicket.create({
          data: {
            ballId: ball.id,
            dismissedPlayerId: dto.wicket.dismissedPlayerId,
            dismissalType: dto.wicket.dismissalType as any,
            fielderId: dto.wicket.fielderId,
            bowlerCredited: dto.wicket.dismissalType !== "RUN_OUT",
          },
        });
      }

      const bowlerConceded = calculateBowlerConcededRuns(dto.runsOffBat, dto.extraType, dto.extraRuns);
      const newBallsBowled = currentOver.ballsBowled + (legal ? 1 : 0);
      const newRunsConceded = currentOver.runsConceded + bowlerConceded;
      const overNowComplete = isOverComplete(newBallsBowled);

      const updatedOver = await tx.over.update({
        where: { id: currentOver.id },
        data: {
          runsConceded: newRunsConceded,
          ballsBowled: newBallsBowled,
          isCompleted: overNowComplete,
          isMaiden: overNowComplete ? isMaidenOver(newRunsConceded) : currentOver.isMaiden,
        },
      });

      const totalLegalBallsResult = await tx.ball.count({
        where: { over: { inningsId: dto.inningsId }, isLegalDelivery: true },
      });
      const oversBowledStr = formatOversBowled(totalLegalBallsResult);

      const ballRuns = calculateBallRuns(dto.runsOffBat, dto.extraType, dto.extraRuns);
      const wicketIncrement = dto.wicket ? 1 : 0;

      const updatedInnings = await tx.innings.update({
        where: { id: dto.inningsId },
        data: {
          totalRuns: { increment: ballRuns },
          totalWickets: { increment: wicketIncrement },
          oversBowled: oversBowledStr,
        },
      });

      const transitionResult = await this.handleInningsAndMatchTransitions(
        tx,
        updatedInnings,
        totalLegalBallsResult,
      );

      const rotateStrike = shouldRotateStrikeForRuns(dto.runsOffBat, dto.extraType, dto.extraRuns);
      const finalRotateStrike = overNowComplete ? true : rotateStrike;

      this.eventsGateway.broadcastToRoom(`match:${innings.matchId}`, "ball:update", {
        matchId: innings.matchId,
        inningsId: dto.inningsId,
        overNumber: updatedOver.overNumber,
        ballsBowled: updatedOver.ballsBowled,
        totalRuns: transitionResult.innings.totalRuns,
        totalWickets: transitionResult.innings.totalWickets,
        oversBowled: oversBowledStr,
        overComplete: overNowComplete,
        inningsCompleted: transitionResult.inningsCompleted,
        matchCompleted: transitionResult.matchCompleted,
      });

      if (transitionResult.matchCompleted) {
        await this.statsQueue.add("recompute", { matchId: innings.matchId });
      }

      return {
        ball,
        over: updatedOver,
        innings: transitionResult.innings,
        rotateStrike: finalRotateStrike,
        overComplete: overNowComplete,
        requiresNextBowlerSelection: overNowComplete && !transitionResult.matchCompleted,
        lastOverBowlerId: overNowComplete ? currentOver.bowlerId : null,
        inningsCompleted: transitionResult.inningsCompleted,
        matchCompleted: transitionResult.matchCompleted,
        newInnings: transitionResult.newInnings,
        matchResult: transitionResult.matchResult,
        awaitingSuperOver: transitionResult.awaitingSuperOver,
      };
    });
  }

  async validateNextBowler(inningsId: string, candidateBowlerId: string) {
    const lastOver = await this.prisma.over.findFirst({
      where: { inningsId, isCompleted: true },
      orderBy: { overNumber: "desc" },
    });

    const eligible = isBowlerEligibleForNextOver(lastOver?.bowlerId ?? null, candidateBowlerId);
    return { eligible, lastOverBowlerId: lastOver?.bowlerId ?? null };
  }

  private async handleInningsAndMatchTransitions(
    tx: any,
    innings: any,
    totalLegalBallsBowled: number,
  ) {
    const match = await tx.match.findUnique({ where: { id: innings.matchId } });

    const tournament = match.tournamentId
      ? await tx.tournament.findUnique({ where: { id: match.tournamentId } })
      : null;
    const maxOvers = innings.maxOversOverride ?? tournament?.oversPerInnings ?? 20;
    const maxWickets = innings.maxWicketsOverride ?? 10;

    const maxLegalBalls = maxOvers * 6;
    const allOut = innings.totalWickets >= maxWickets;
    const oversUp = totalLegalBallsBowled >= maxLegalBalls;
    const targetReached = innings.targetRuns !== null && innings.totalRuns >= innings.targetRuns;

    const inningsShouldClose = allOut || oversUp || targetReached;

    if (!inningsShouldClose) {
      return { innings, inningsCompleted: false, matchCompleted: false, newInnings: null, matchResult: null, awaitingSuperOver: false };
    }

    const closedInnings = await tx.innings.update({
      where: { id: innings.id },
      data: { isCompleted: true },
    });

    if (innings.inningsNumber % 2 === 1) {
      const targetRuns = innings.totalRuns + 1;

      await tx.innings.update({ where: { id: innings.id }, data: { targetRuns } });

      const newInnings = await tx.innings.create({
        data: {
          matchId: match.id,
          inningsNumber: innings.inningsNumber + 1,
          battingTeamId: innings.bowlingTeamId,
          bowlingTeamId: innings.battingTeamId,
          targetRuns,
          maxOversOverride: innings.maxOversOverride,
          maxWicketsOverride: innings.maxWicketsOverride,
        },
      });

      return { innings: closedInnings, inningsCompleted: true, matchCompleted: false, newInnings, matchResult: null, awaitingSuperOver: false };
    }

    let winnerTeamId: string | null = null;
    let isTied = false;

    if (targetReached) {
      winnerTeamId = innings.battingTeamId;
    } else if (innings.totalRuns === (innings.targetRuns ?? 0) - 1) {
      isTied = true;
    } else {
      winnerTeamId = innings.bowlingTeamId;
    }

    const isSuperOverPair = innings.inningsNumber >= 4;

    if (isTied && !isSuperOverPair) {
      return { innings: closedInnings, inningsCompleted: true, matchCompleted: false, newInnings: null, matchResult: null, awaitingSuperOver: true };
    }

    if (isTied && isSuperOverPair) {
      const updatedMatch = await tx.match.update({
        where: { id: match.id },
        data: { status: "COMPLETED", winnerTeamId: null, isTied: true },
      });
      return { innings: closedInnings, inningsCompleted: true, matchCompleted: true, newInnings: null, matchResult: { match: updatedMatch, winnerTeamId: null, isTied: true }, awaitingSuperOver: false };
    }

    const updatedMatch = await tx.match.update({
      where: { id: match.id },
      data: { status: "COMPLETED", winnerTeamId, isTied: false },
    });

    return { innings: closedInnings, inningsCompleted: true, matchCompleted: true, newInnings: null, matchResult: { match: updatedMatch, winnerTeamId, isTied: false }, awaitingSuperOver: false };
  }

  async correctBall(dto: CorrectBallDto, userId: string) {
    const originalBall = await this.prisma.ball.findUnique({
      where: { id: dto.originalBallId },
      include: { over: true, wicket: true },
    });
    if (!originalBall) {
      throw new NotFoundException("Original ball not found");
    }

    const before = { ...originalBall };

    return this.prisma.$transaction(async (tx) => {
      const legal = isLegalDelivery(dto.extraType);

      const correctingBall = await tx.ball.create({
        data: {
          overId: originalBall.overId,
          sequenceNum: dto.sequenceNum,
          strikerId: dto.strikerId,
          nonStrikerId: dto.nonStrikerId,
          bowlerId: dto.bowlerId,
          runsOffBat: dto.runsOffBat,
          extraType: dto.extraType as any,
          extraRuns: dto.extraRuns,
          isLegalDelivery: legal,
          isFreeHit: dto.isFreeHit,
          correctsBallId: originalBall.id,
        },
      });

      if (dto.wicket) {
        await tx.wicket.create({
          data: {
            ballId: correctingBall.id,
            dismissedPlayerId: dto.wicket.dismissedPlayerId,
            dismissalType: dto.wicket.dismissalType as any,
            fielderId: dto.wicket.fielderId,
            bowlerCredited: dto.wicket.dismissalType !== "RUN_OUT",
          },
        });
      }

      const overBalls = await tx.ball.findMany({
        where: { overId: originalBall.overId, id: { not: originalBall.id } },
      });

      let overRunsConceded = 0;
      let overBallsBowledCount = 0;
      for (const b of overBalls) {
        overRunsConceded += calculateBowlerConcededRuns(b.runsOffBat, b.extraType as any, b.extraRuns);
        if (b.isLegalDelivery) overBallsBowledCount += 1;
      }

      const updatedOver = await tx.over.update({
        where: { id: originalBall.overId },
        data: {
          runsConceded: overRunsConceded,
          ballsBowled: overBallsBowledCount,
          isMaiden: isMaidenOver(overRunsConceded),
        },
      });

      const inningsBalls = await tx.ball.findMany({
        where: { over: { inningsId: originalBall.over.inningsId }, id: { not: originalBall.id } },
        include: { wicket: true },
      });

      let inningsTotalRuns = 0;
      let inningsTotalWickets = 0;
      let inningsLegalBalls = 0;
      for (const b of inningsBalls) {
        inningsTotalRuns += calculateBallRuns(b.runsOffBat, b.extraType as any, b.extraRuns);
        if (b.wicket) inningsTotalWickets += 1;
        if (b.isLegalDelivery) inningsLegalBalls += 1;
      }

      const updatedInnings = await tx.innings.update({
        where: { id: originalBall.over.inningsId },
        data: {
          totalRuns: inningsTotalRuns,
          totalWickets: inningsTotalWickets,
          oversBowled: formatOversBowled(inningsLegalBalls),
        },
      });

      await this.auditLogsService.log({
        userId,
        action: "CORRECT_BALL",
        entityType: "Ball",
        entityId: originalBall.id,
        before,
        after: correctingBall,
      });

      this.eventsGateway.broadcastToRoom(`match:${dto.inningsId}`, "ball:corrected", {
        inningsId: originalBall.over.inningsId,
        totalRuns: updatedInnings.totalRuns,
        totalWickets: updatedInnings.totalWickets,
        oversBowled: updatedInnings.oversBowled,
      });

      return { correctingBall, over: updatedOver, innings: updatedInnings };
    });
  }

  async startSuperOver(matchId: string, battingTeamId: string) {
    const lastInnings = await this.prisma.innings.findFirst({
      where: { matchId },
      orderBy: { inningsNumber: "desc" },
    });
    if (!lastInnings || !lastInnings.isCompleted) {
      throw new BadRequestException("Cannot start a Super Over before the current innings pair is complete");
    }

    const bowlingTeamId = battingTeamId === lastInnings.battingTeamId ? lastInnings.bowlingTeamId : lastInnings.battingTeamId;

    return this.prisma.innings.create({
      data: {
        matchId,
        inningsNumber: lastInnings.inningsNumber + 1,
        battingTeamId,
        bowlingTeamId,
        maxOversOverride: 1,
        maxWicketsOverride: 2,
      },
    });
  }
}