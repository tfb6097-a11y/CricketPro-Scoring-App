import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { generateRoundRobinFixtures } from "./fixtures.generator";
import { CreateFixtureDto } from "./dto/create-fixture.dto";

@Injectable()
export class FixturesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateRoundRobin(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true },
    });
    if (!tournament) {
      throw new NotFoundException("Tournament not found");
    }
    if (tournament.teams.length < 2) {
      throw new BadRequestException("Tournament needs at least 2 teams to generate fixtures");
    }

    const teamIds = tournament.teams.map((t) => t.teamId);
    const pairings = generateRoundRobinFixtures(teamIds);

    const defaultGround = await this.prisma.ground.findFirst();
    if (!defaultGround) {
      throw new BadRequestException("Create at least one ground before generating fixtures");
    }

    const created = await this.prisma.$transaction(
      pairings.map((pairing, index) =>
        this.prisma.match.create({
          data: {
            tournamentId,
            teamAId: pairing.teamAId,
            teamBId: pairing.teamBId,
            groundId: defaultGround.id,
            scheduledAt: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
          },
        }),
      ),
    );

    return created;
  }

  async createManual(dto: CreateFixtureDto) {
    // Prevent double-booking: same ground can't have two matches scheduled
    // at the exact same time.
    const conflict = await this.prisma.match.findFirst({
      where: {
        groundId: dto.groundId,
        scheduledAt: new Date(dto.scheduledAt),
        status: { not: "ABANDONED" }, // an abandoned/cancelled slot can be reused
      },
    });
    if (conflict) {
      throw new BadRequestException("This ground already has a match scheduled at the same date and time");
    }

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

async findByTournament(tournamentId: string) {
    return this.prisma.match.findMany({
      where: { tournamentId },
      include: { teamA: true, teamB: true, ground: true, tournament: true, innings: true, scoredBy: true, assignedScorer: true },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async findAll() {
    return this.prisma.match.findMany({
      include: { teamA: true, teamB: true, ground: true, tournament: true, innings: true, scoredBy: true, assignedScorer: true },
      orderBy: { scheduledAt: "asc" },
    });
  }
  async findByTeam(teamId: string) {
    return this.prisma.match.findMany({
      where: { OR: [{ teamAId: teamId }, { teamBId: teamId }] },
      include: { teamA: true, teamB: true, ground: true, tournament: true, innings: true, scoredBy: true, assignedScorer: true },
      orderBy: { scheduledAt: "desc" },
    });
  }
}