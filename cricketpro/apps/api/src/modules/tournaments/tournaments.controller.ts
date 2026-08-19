import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { TournamentsService } from "./tournaments.service";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { AddTournamentTeamDto } from "./dto/add-tournament-team.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";
import { UpdateTournamentDto } from "./dto/update-tournament.dto";

@Controller("tournaments")
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  // Public reads — Design System §3.4 Tournament Hub has no login wall
  @Get()
  findAll() {
    return this.tournamentsService.findAll();
  }

   @Get("sync-status-all")
  async syncAllTournamentStatuses() {
    const tournaments = await this.tournamentsService.findAll();
    for (const t of tournaments) {
      await this.tournamentsService.syncTournamentStatus(t.id);
    }
    return { synced: tournaments.length };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.tournamentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post(":id/teams")
  addTeam(@Param("id") id: string, @Body() dto: AddTournamentTeamDto) {
    return this.tournamentsService.addTeam(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Delete(":id/teams/:teamId")
  removeTeam(@Param("id") id: string, @Param("teamId") teamId: string) {
    return this.tournamentsService.removeTeam(id, teamId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body("status") status: "UPCOMING" | "ONGOING" | "COMPLETED") {
    return this.tournamentsService.updateStatus(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTournamentDto) {
    return this.tournamentsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.tournamentsService.remove(id);
  }
}