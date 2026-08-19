import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePlayerDto } from "./dto/create-player.dto";
import { UpdatePlayerDto } from "./dto/update-player.dto";

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlayerDto) {
    return this.prisma.player.create({
      data: {
        ...dto,
        dob: dto.dob ? new Date(dto.dob) : undefined,
      },
    });
  }

  async bulkImport(rows: import("./dto/bulk-import.dto").BulkImportRowDto[], replaceExistingSquad = false) {
    const result = { playersCreated: 0, playersUpdated: 0, teamsCreated: 0, squadsReplaced: 0, errors: [] as string[] };
    const teamCache = new Map<string, string>(); // normalized team name -> team id
    const clearedTeams = new Set<string>(); // team ids whose old squad we've already wiped this run

    for (const [index, row] of rows.entries()) {
      const rowNum = index + 2;
      try {
        if (!row.playerName?.trim()) {
          result.errors.push(`Row ${rowNum}: missing player name — skipped`);
          continue;
        }

        let teamId: string | undefined;

        if (row.teamName?.trim()) {
          const key = row.teamName.trim().toLowerCase();
          if (teamCache.has(key)) {
            teamId = teamCache.get(key);
          } else {
            let team = await this.prisma.team.findFirst({
              where: { name: { equals: row.teamName.trim(), mode: "insensitive" } },
            });
            if (!team) {
              const shortCode = await this.resolveShortCode(row.teamShortCode, row.teamName);
              team = await this.prisma.team.create({
                data: {
                  name: row.teamName.trim(),
                  shortCode,
                  logoUrl: row.teamLogoUrl?.trim() || undefined,
                },
              });
              result.teamsCreated++;
            } else if (row.teamLogoUrl?.trim()) {
              // Team already exists — refresh its logo if a new one was provided.
              await this.prisma.team.update({
                where: { id: team.id },
                data: { logoUrl: row.teamLogoUrl.trim() },
              });
            }
            teamId = team.id;
            teamCache.set(key, team.id);

            // Replace mode: wipe this team's current squad ONCE per import run,
            // right before we start adding the new file's players to it.
            if (replaceExistingSquad && !clearedTeams.has(team.id)) {
              await this.prisma.teamPlayer.updateMany({
                where: { teamId: team.id, leftAt: null },
                data: { leftAt: new Date() },
              });
              clearedTeams.add(team.id);
              result.squadsReplaced++;
            }
          }
        }

        // Match existing player by name (case-insensitive) to avoid duplicates —
        // update their details instead of creating a second record.
        const existingPlayer = await this.prisma.player.findFirst({
          where: { name: { equals: row.playerName.trim(), mode: "insensitive" } },
        });

        let player;
        if (existingPlayer) {
          player = await this.prisma.player.update({
            where: { id: existingPlayer.id },
            data: {
              country: row.country?.trim() || existingPlayer.country,
              role: (row.role?.trim().toUpperCase().replace(/\s+/g, "_") as any) || existingPlayer.role,
              photoUrl: row.photoUrl?.trim() || existingPlayer.photoUrl,
            },
          });
          result.playersUpdated++;
        } else {
          player = await this.prisma.player.create({
            data: {
              name: row.playerName.trim(),
              country: row.country?.trim() || undefined,
              role: (row.role?.trim().toUpperCase().replace(/\s+/g, "_") as any) || "BATTER",
              photoUrl: row.photoUrl?.trim() || undefined,
            },
          });
          result.playersCreated++;
        }

        if (teamId) {
          const activeMembership = await this.prisma.teamPlayer.findFirst({
            where: { teamId, playerId: player.id, leftAt: null },
          });
          if (!activeMembership) {
            await this.prisma.teamPlayer.create({
              data: { teamId, playerId: player.id, isCaptain: false, isKeeper: false },
            });
          }
        }
      } catch (err) {
        result.errors.push(`Row ${rowNum} (${row.playerName ?? "?"}): ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    return result;
  }

  private async resolveShortCode(provided: string | undefined, teamName: string): Promise<string> {
    const base = (provided?.trim() || teamName.replace(/[^a-zA-Z]/g, "").slice(0, 4) || "TM").toUpperCase();
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.team.findUnique({ where: { shortCode: candidate } })) {
      candidate = `${base}${suffix}`;
      suffix++;
    }
    return candidate;
  }

  async findAll(filters?: { country?: string; role?: string; isActive?: boolean }) {
    return this.prisma.player.findMany({
      where: {
        ...(filters?.country && { country: filters.country }),
        ...(filters?.role && { role: filters.role as any }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) {
      throw new NotFoundException("Player not found");
    }
    return player;
  }

  async update(id: string, dto: UpdatePlayerDto) {
    await this.findOne(id);
    return this.prisma.player.update({
      where: { id },
      data: {
        ...dto,
        dob: dto.dob ? new Date(dto.dob) : undefined,
      },
    });
  }

  // Soft delete only — per Rules.md §7
  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.player.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reactivate(id: string) {
    await this.findOne(id);
    return this.prisma.player.update({
      where: { id },
      data: { isActive: true },
    });
  }
}