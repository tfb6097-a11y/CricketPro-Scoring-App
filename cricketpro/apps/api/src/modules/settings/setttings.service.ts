import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

const SETTINGS_ID = "singleton";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    return this.prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  async update(dto: UpdateSettingsDto) {
    await this.get();
    return this.prisma.systemSettings.update({
      where: { id: SETTINGS_ID },
      data: dto,
    });
  }

  // System Info tab — real, computed data (not user-editable settings).
  async getSystemInfo() {
    const [userCount, playerCount, teamCount, matchCount, liveMatchCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.player.count(),
      this.prisma.team.count(),
      this.prisma.match.count(),
      this.prisma.match.count({ where: { status: "LIVE" } }),
    ]);

    let dbStatus = "Healthy";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "Unreachable";
    }

    return {
      apiVersion: process.env.npm_package_version ?? "0.1.0",
      nodeEnv: process.env.NODE_ENV ?? "development",
      uptimeSeconds: Math.floor(process.uptime()),
      dbStatus,
      counts: { userCount, playerCount, teamCount, matchCount, liveMatchCount },
    };
  }
}