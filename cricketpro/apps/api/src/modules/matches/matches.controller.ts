import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { MatchesService } from "./matches.service";
import { CreateMatchDto } from "./dto/create-match.dto";
import { SetPlayingXIDto } from "./dto/set-playing-xi.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("matches")
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  // IMPORTANT: literal-path routes (findLive, my-assigned) must come BEFORE
  // ":id" wildcard routes, or Nest will treat "my-assigned" as an :id value.
  @Get()
  findLive() {
    return this.matchesService.findLive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.SCORER)
  @Get("my-assigned")
  findMyAssigned(@CurrentUser("userId") userId: string) {
    return this.matchesService.findMyAssignedMatches(userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.matchesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post()
  create(@Body() dto: CreateMatchDto) {
    return this.matchesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.SCORER)
  @Post(":id/playing-xi")
  setPlayingXI(
    @Param("id") matchId: string,
    @Body() dto: SetPlayingXIDto,
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.matchesService.setPlayingXI(matchId, dto, userId, role);
  }

  @Get(":id/playing-xi")
  getPlayingXI(@Param("id") matchId: string, @Query("teamId") teamId: string) {
    return this.matchesService.getPlayingXI(matchId, teamId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.SCORER)
  @Post(":id/toss")
  recordToss(
    @Param("id") matchId: string,
    @Body() dto: { tossWinnerTeamId: string; tossDecision: "BAT" | "BOWL" },
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.matchesService.recordToss(matchId, dto, userId, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.SCORER)
  @Post(":id/go-live")
  goLive(
    @Param("id") matchId: string,
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.matchesService.goLive(matchId, userId, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.SCORER)
  @Post(":id/take-over")
  takeOverScoring(
    @Param("id") matchId: string,
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.matchesService.takeOverScoring(matchId, userId, role);
  }

  @Get(":id/commentary")
  getCommentary(@Param("id") matchId: string) {
    return this.matchesService.getCommentary(matchId);
  }

  @Get(":id/scorecard")
  getScorecard(@Param("id") matchId: string) {
    return this.matchesService.getScorecard(matchId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: { groundId?: string; scheduledAt?: string }) {
    return this.matchesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.matchesService.remove(id);
  }

  @Get(":id/current-state")
  getCurrentState(@Param("id") matchId: string) {
    return this.matchesService.getCurrentState(matchId);
  }

  @Get(":id/manhattan")
  getManhattanData(@Param("id") matchId: string) {
    return this.matchesService.getManhattanData(matchId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.SCORER)
  @Post(":id/abandon")
  abandonMatch(@Param("id") matchId: string) {
    return this.matchesService.abandonMatch(matchId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id/assign-scorer")
  assignScorer(@Param("id") matchId: string, @Body("scorerId") scorerId: string) {
    return this.matchesService.assignScorer(matchId, scorerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id/unassign-scorer")
  unassignScorer(@Param("id") matchId: string) {
    return this.matchesService.unassignScorer(matchId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.SCORER)
  @Post(":id/openers")
  setOpeners(
    @Param("id") matchId: string,
    @Body() dto: { strikerId: string; nonStrikerId: string; bowlerId: string },
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.matchesService.setOpeners(matchId, dto, userId, role);
  }

  @Get(":id/full-commentary")
  getFullCommentary(@Param("id") matchId: string) {
    return this.matchesService.getFullCommentary(matchId);
  }
}