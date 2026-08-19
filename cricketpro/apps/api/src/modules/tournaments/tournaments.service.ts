import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { AddTournamentTeamDto } from "./dto/add-tournament-team.dto";

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        format: dto.format as any,
        oversPerInnings: dto.oversPerInnings,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });
  }

  async findAll() {
    return this.prisma.tournament.findMany({
      orderBy: { startDate: "desc" },
      include: {
        teams: { include: { team: true } },
      },
    });
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        teams: { include: { team: true } },
      },
    });
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }
    return tournament;
  }

  // Validation: team must be a registered (active) team before it can join a tournament,
  // per the sequencing rule "Tournaments reference Teams" from the roadmap notes.
  async addTeam(tournamentId: string, dto: AddTournamentTeamDto) {
    await this.findOne(tournamentId); // 404 if tournament missing

    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team || !team.isActive) {
      throw new BadRequestException("Team must be an active, registered team");
    }

    const existing = await this.prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId: dto.teamId } },
    });
    if (existing) {
      throw new ConflictException("Team is already registered in this tournament");
    }

    return this.prisma.tournamentTeam.create({
      data: { tournamentId, teamId: dto.teamId },
    });
  }

  async removeTeam(tournamentId: string, teamId: string) {
    const entry = await this.prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId } },
    });
    if (!entry) {
      throw new NotFoundException("Team is not registered in this tournament");
    }
    return this.prisma.tournamentTeam.delete({ where: { id: entry.id } });
  }

  async updateStatus(id: string, status: "UPCOMING" | "ONGOING" | "COMPLETED") {
    await this.findOne(id);
    return this.prisma.tournament.update({ where: { id }, data: { status } });
  }

  async update(id: string, dto: Partial<CreateTournamentDto>) {
    await this.findOne(id);
    return this.prisma.tournament.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.format !== undefined && { format: dto.format as any }),
        ...(dto.oversPerInnings !== undefined && { oversPerInnings: dto.oversPerInnings }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const matchCount = await this.prisma.match.count({ where: { tournamentId: id } });
    if (matchCount > 0) {
      throw new BadRequestException("Cannot delete a tournament with matches scheduled against it");
    }
    await this.prisma.tournamentTeam.deleteMany({ where: { tournamentId: id } });
    return this.prisma.tournament.delete({ where: { id } });
  }
  async syncTournamentStatus(tournamentId: string) {
  const matches = await this.prisma.match.findMany({ where: { tournamentId } });
  if (matches.length === 0) return;

  const hasLive = matches.some((m) => m.status === "LIVE");
  const allDone = matches.every((m) => m.status === "COMPLETED" || m.status === "ABANDONED");
  const anyCompleted = matches.some((m) => m.status === "COMPLETED");

  let status: "UPCOMING" | "ONGOING" | "COMPLETED";
  if (allDone) status = "COMPLETED";
  else if (hasLive || anyCompleted) status = "ONGOING";
  else status = "UPCOMING";

  await this.prisma.tournament.update({ where: { id: tournamentId }, data: { status } });
}
}