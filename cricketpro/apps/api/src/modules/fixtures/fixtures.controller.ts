import { Controller, Get, Post, Param, Body, Query, UseGuards } from "@nestjs/common";
import { FixturesService } from "./fixtures.service";
import { GenerateFixturesDto } from "./dto/generate-fixtures.dto";
import { CreateFixtureDto } from "./dto/create-fixture.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";

@Controller("fixtures")
export class FixturesController {
  constructor(private readonly fixturesService: FixturesService) {}

  @Get()
  findAll(@Query("tournamentId") tournamentId?: string, @Query("teamId") teamId?: string) {
    if (tournamentId) {
      return this.fixturesService.findByTournament(tournamentId);
    }
    if (teamId) {
      return this.fixturesService.findByTeam(teamId);
    }
    return this.fixturesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post("generate")
  generate(@Body() dto: GenerateFixturesDto) {
    return this.fixturesService.generateRoundRobin(dto.tournamentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post()
  createManual(@Body() dto: CreateFixtureDto) {
    return this.fixturesService.createManual(dto);
  }
}