import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { AddTeamPlayerDto } from "./dto/add-team-player.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";
import { SetTeamPlayerRoleDto } from "./dto/set-team-player-role.dto";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // Public reads — Design System §3.5 Team Page has no login wall
 @Get()
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.teamsService.findAll(includeInactive === "true");
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.teamsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string) {
    return this.teamsService.deactivate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id/reactivate")
  reactivate(@Param("id") id: string) {
    return this.teamsService.reactivate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post(":id/players")
  addPlayer(@Param("id") teamId: string, @Body() dto: AddTeamPlayerDto) {
    return this.teamsService.addPlayer(teamId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Delete(":id/players/:playerId")
  removePlayer(@Param("id") teamId: string, @Param("playerId") playerId: string) {
    return this.teamsService.removePlayer(teamId, playerId);
  }

@UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id/players/:playerId/role")
  setPlayerRole(
    @Param("id") teamId: string,
    @Param("playerId") playerId: string,
    @Body() dto: { isCaptain?: boolean; isKeeper?: boolean },
  ) {
    return this.teamsService.setPlayerRole(teamId, playerId, dto);
  }
}