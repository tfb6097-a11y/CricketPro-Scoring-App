import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("TeamsService", () => {
  let service: TeamsService;
  let prisma: { team: any; player: any; teamPlayer: any };

  const mockTeam = { id: "team-1", name: "Karachi Kings", shortCode: "KK", isActive: true };
  const mockPlayer = { id: "player-1", name: "Babar Azam" };

  beforeEach(async () => {
    prisma = {
      team: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      player: {
        findUnique: jest.fn(),
      },
      teamPlayer: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe("create", () => {
    it("throws ConflictException if shortCode already exists", async () => {
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      await expect(
        service.create({ name: "Karachi Kings", shortCode: "KK" }),
      ).rejects.toThrow(ConflictException);
    });

    it("creates a team when shortCode is free", async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockResolvedValue(mockTeam);

      const result = await service.create({ name: "Karachi Kings", shortCode: "KK" });

      expect(result).toEqual(mockTeam);
    });
  });

  describe("addPlayer — one active membership per team rule", () => {
    it("throws NotFoundException if team does not exist", async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await expect(
        service.addPlayer("missing-team", { playerId: "player-1" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException if player already has an active membership", async () => {
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.player.findUnique.mockResolvedValue(mockPlayer);
      prisma.teamPlayer.findFirst.mockResolvedValue({ id: "membership-1", leftAt: null });

      await expect(
        service.addPlayer("team-1", { playerId: "player-1" }),
      ).rejects.toThrow(ConflictException);
    });

    it("adds the player when no active membership exists", async () => {
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.player.findUnique.mockResolvedValue(mockPlayer);
      prisma.teamPlayer.findFirst.mockResolvedValue(null);
      prisma.teamPlayer.create.mockResolvedValue({
        id: "membership-1",
        teamId: "team-1",
        playerId: "player-1",
        isCaptain: false,
        isKeeper: false,
      });

      const result = await service.addPlayer("team-1", { playerId: "player-1" });

      expect(result.playerId).toBe("player-1");
      expect(prisma.teamPlayer.create).toHaveBeenCalled();
    });
  });

  describe("removePlayer", () => {
    it("throws NotFoundException if no active membership found", async () => {
      prisma.teamPlayer.findFirst.mockResolvedValue(null);

      await expect(service.removePlayer("team-1", "player-1")).rejects.toThrow(NotFoundException);
    });

    it("soft-closes membership with leftAt instead of deleting", async () => {
      prisma.teamPlayer.findFirst.mockResolvedValue({ id: "membership-1", leftAt: null });
      prisma.teamPlayer.update.mockResolvedValue({ id: "membership-1", leftAt: new Date() });

      const result = await service.removePlayer("team-1", "player-1");

      expect(result.leftAt).not.toBeNull();
    });
  });
});