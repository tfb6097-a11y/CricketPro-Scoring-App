import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ScoringService } from "./scoring.service";
import { RecordBallDto } from "./dto/record-ball.dto";
import { CorrectBallDto } from "./dto/correct-ball.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("scoring")
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.SCORER, AppRole.ADMIN)
  @Post("ball")
  recordBall(
    @Body() dto: RecordBallDto,
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.scoringService.recordBall(dto, userId, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.SCORER, AppRole.ADMIN)
  @Post("validate-next-bowler")
  validateNextBowler(@Body() dto: { inningsId: string; candidateBowlerId: string }) {
    return this.scoringService.validateNextBowler(dto.inningsId, dto.candidateBowlerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.SCORER, AppRole.ADMIN)
  @Post("correct-ball")
  correctBall(@Body() dto: CorrectBallDto, @CurrentUser("userId") userId: string) {
    return this.scoringService.correctBall(dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.SCORER, AppRole.ADMIN)
  @Post("super-over/start")
  startSuperOver(@Body() dto: { matchId: string; battingTeamId: string }) {
    return this.scoringService.startSuperOver(dto.matchId, dto.battingTeamId);
  }
}