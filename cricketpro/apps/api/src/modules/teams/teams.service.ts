import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { AddTeamPlayerDto } from "./dto/add-team-player.dto";

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeamDto) {
    const existing = await this.prisma.team.findUnique({
      where: { shortCode: dto.shortCode },
    });
    if (existing) {
      throw new ConflictException("Short code already in use");
    }
    return this.prisma.team.create({ data: dto });
  }

  async findAll(includeInactive = false) {
    return this.prisma.team.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        players: {
          where: { leftAt: null },
          include: { player: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        players: {
          where: { leftAt: null },
          include: { player: true },
        },
      },
    });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    return team;
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);
    return this.prisma.team.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.team.update({ where: { id }, data: { isActive: false } });
  }

  async reactivate(id: string) {
    await this.findOne(id);
    return this.prisma.team.update({ where: { id }, data: { isActive: true } });
  }

  // Squad management — enforces "one active membership per team" rule:
  // a player cannot be added twice to the same team's active squad.
  async addPlayer(teamId: string, dto: AddTeamPlayerDto) {
    await this.findOne(teamId);

    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) {
      throw new NotFoundException("Player not found");
    }

    const existingActive = await this.prisma.teamPlayer.findFirst({
      where: { teamId, playerId: dto.playerId, leftAt: null },
    });
    if (existingActive) {
      throw new ConflictException("Player already has an active membership on this team");
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCaptain) {
        await tx.teamPlayer.updateMany({
          where: { teamId, leftAt: null, isCaptain: true },
          data: { isCaptain: false },
        });
      }
      if (dto.isKeeper) {
        await tx.teamPlayer.updateMany({
          where: { teamId, leftAt: null, isKeeper: true },
          data: { isKeeper: false },
        });
      }

      return tx.teamPlayer.create({
        data: {
          teamId,
          playerId: dto.playerId,
          isCaptain: dto.isCaptain ?? false,
          isKeeper: dto.isKeeper ?? false,
        },
      });
    });
  }

  // Removing a player = soft-close membership (leftAt = now), never delete the row.
  async removePlayer(teamId: string, playerId: string) {
    const membership = await this.prisma.teamPlayer.findFirst({
      where: { teamId, playerId, leftAt: null },
    });
    if (!membership) {
      throw new NotFoundException("Active membership not found");
    }
    return this.prisma.teamPlayer.update({
      where: { id: membership.id },
      data: { leftAt: new Date() },
    });
  }

  // Toggle captain/keeper flag on a player's active membership

  // Atomically enforces "one captain / one keeper per team" — replaces the
  // fragile frontend pattern of two separate sequential API calls, which can
  // race or partially fail and leave two players both marked as captain.
  async setPlayerRole(teamId: string, playerId: string, dto: { isCaptain?: boolean; isKeeper?: boolean }) {
    const membership = await this.prisma.teamPlayer.findFirst({
      where: { teamId, playerId, leftAt: null },
    });
    if (!membership) {
      throw new NotFoundException("Active squad membership not found");
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCaptain === true) {
        await tx.teamPlayer.updateMany({
          where: { teamId, leftAt: null, isCaptain: true, NOT: { id: membership.id } },
          data: { isCaptain: false },
        });
      }
      if (dto.isKeeper === true) {
        await tx.teamPlayer.updateMany({
          where: { teamId, leftAt: null, isKeeper: true, NOT: { id: membership.id } },
          data: { isKeeper: false },
        });
      }

      return tx.teamPlayer.update({
        where: { id: membership.id },
        data: {
          ...(dto.isCaptain !== undefined && { isCaptain: dto.isCaptain }),
          ...(dto.isKeeper !== undefined && { isKeeper: dto.isKeeper }),
        },
      });
    });
  }
}