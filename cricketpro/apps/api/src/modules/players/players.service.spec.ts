import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PlayersService } from "./players.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("PlayersService", () => {
  let service: PlayersService;
  let prisma: { player: any };

  const mockPlayer = {
    id: "player-1",
    name: "Babar Azam",
    country: "Pakistan",
    role: "BATTER",
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      player: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
  });

  it("creates a player", async () => {
    prisma.player.create.mockResolvedValue(mockPlayer);

    const result = await service.create({ name: "Babar Azam", country: "Pakistan" } as any);

    expect(result).toEqual(mockPlayer);
    expect(prisma.player.create).toHaveBeenCalled();
  });

  it("throws NotFoundException when player does not exist", async () => {
    prisma.player.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing-id")).rejects.toThrow(NotFoundException);
  });

  it("soft-deactivates a player instead of deleting", async () => {
    prisma.player.findUnique.mockResolvedValue(mockPlayer);
    prisma.player.update.mockResolvedValue({ ...mockPlayer, isActive: false });

    const result = await service.deactivate("player-1");

    expect(result.isActive).toBe(false);
    expect(prisma.player.update).toHaveBeenCalledWith({
      where: { id: "player-1" },
      data: { isActive: false },
    });
  });
});