import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ScoringService } from "./scoring.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EventsGateway } from "../../gateways/events.gateway";
import { AuditLogsService } from "../audit-logs/audit-logs,service";
import { STATS_QUEUE } from "../stats/stats-queue.provider";

describe("ScoringService — wicket & free-hit handling", () => {
  let service: ScoringService;
  let prisma: any;

  const mockInnings = { id: "innings-1", matchId: "match-1", inningsNumber: 1, isCompleted: false, targetRuns: null };
  const mockOver = {
    id: "over-1",
    inningsId: "innings-1",
    overNumber: 1,
    bowlerId: "bowler-1",
    runsConceded: 0,
    ballsBowled: 0,
    isCompleted: false,
    isMaiden: false,
  };
  const mockMatch = { id: "match-1", tournamentId: null };

  beforeEach(async () => {
    prisma = {
      innings: { findUnique: jest.fn(), update: jest.fn() },
      over: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      ball: { create: jest.fn(), count: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      wicket: { create: jest.fn() },
      match: { findUnique: jest.fn(), update: jest.fn() },
      tournament: { findUnique: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: { broadcastToRoom: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
        { provide: STATS_QUEUE, useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
  });

  it("throws NotFoundException if innings does not exist", async () => {
    prisma.innings.findUnique.mockResolvedValue(null);

    await expect(
      service.recordBall({
        inningsId: "missing",
        sequenceNum: 1,
        strikerId: "s1",
        nonStrikerId: "s2",
        bowlerId: "b1",
        runsOffBat: 0,
        extraType: "NONE" as any,
        extraRuns: 0,
        isFreeHit: false,
      }, "test-user-id", "ADMIN"),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException if innings is already completed", async () => {
    prisma.innings.findUnique.mockResolvedValue({ ...mockInnings, isCompleted: true });

    await expect(
      service.recordBall({
        inningsId: "innings-1",
        sequenceNum: 1,
        strikerId: "s1",
        nonStrikerId: "s2",
        bowlerId: "b1",
        runsOffBat: 0,
        extraType: "NONE" as any,
        extraRuns: 0,
        isFreeHit: false,
      }, "test-user-id", "ADMIN"),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a BOWLED dismissal on a free hit", async () => {
    prisma.innings.findUnique.mockResolvedValue(mockInnings);
    prisma.ball.findFirst.mockResolvedValue(null);

    await expect(
      service.recordBall({
        inningsId: "innings-1",
        sequenceNum: 1,
        strikerId: "s1",
        nonStrikerId: "s2",
        bowlerId: "b1",
        runsOffBat: 0,
        extraType: "NONE" as any,
        extraRuns: 0,
        isFreeHit: true,
        wicket: { dismissedPlayerId: "s1", dismissalType: "BOWLED" as any },
      }, "test-user-id", "ADMIN"),
    ).rejects.toThrow(BadRequestException);
  });

  it("allows a RUN_OUT dismissal on a free hit and records the wicket", async () => {
    prisma.innings.findUnique.mockResolvedValue(mockInnings);
    prisma.ball.findFirst.mockResolvedValue(null);
    prisma.over.findFirst.mockResolvedValue(mockOver);
    prisma.ball.create.mockResolvedValue({ id: "ball-1" });
    prisma.wicket.create.mockResolvedValue({ id: "wicket-1" });
    prisma.over.update.mockResolvedValue({ ...mockOver, ballsBowled: 1 });
    prisma.ball.count.mockResolvedValue(1);
    prisma.innings.update.mockResolvedValue({
      ...mockInnings,
      totalRuns: 1,
      totalWickets: 1,
    });
    prisma.match.findUnique.mockResolvedValue(mockMatch);

    const result = await service.recordBall({
      inningsId: "innings-1",
      sequenceNum: 1,
      strikerId: "s1",
      nonStrikerId: "s2",
      bowlerId: "b1",
      runsOffBat: 0,
      extraType: "NONE" as any,
      extraRuns: 0,
      isFreeHit: true,
      wicket: { dismissedPlayerId: "s1", dismissalType: "RUN_OUT" as any },
    }, "test-user-id", "ADMIN");

    expect(prisma.wicket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ballId: "ball-1",
        dismissalType: "RUN_OUT",
        bowlerCredited: false, // run-outs never credited to the bowler
      }),
    });
    expect(result.innings.totalWickets).toBe(1);
  });

  it("credits the bowler for a BOWLED dismissal (not a free hit)", async () => {
    prisma.innings.findUnique.mockResolvedValue(mockInnings);
    prisma.ball.findFirst.mockResolvedValue(null);
    prisma.over.findFirst.mockResolvedValue(mockOver);
    prisma.ball.create.mockResolvedValue({ id: "ball-2" });
    prisma.wicket.create.mockResolvedValue({ id: "wicket-2" });
    prisma.over.update.mockResolvedValue({ ...mockOver, ballsBowled: 1 });
    prisma.ball.count.mockResolvedValue(1);
    prisma.innings.update.mockResolvedValue({
      ...mockInnings,
      totalWickets: 1,
    });
    prisma.match.findUnique.mockResolvedValue(mockMatch);

    await service.recordBall({
      inningsId: "innings-1",
      sequenceNum: 1,
      strikerId: "s1",
      nonStrikerId: "s2",
      bowlerId: "b1",
      runsOffBat: 0,
      extraType: "NONE" as any,
      extraRuns: 0,
      isFreeHit: false,
      wicket: { dismissedPlayerId: "s1", dismissalType: "BOWLED" as any },
    }, "test-user-id", "ADMIN");

    expect(prisma.wicket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ bowlerCredited: true }),
    });
  });
});