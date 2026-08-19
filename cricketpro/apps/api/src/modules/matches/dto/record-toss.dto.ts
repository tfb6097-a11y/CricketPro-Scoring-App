import { IsString, IsEnum } from "class-validator";

export enum TossDecisionDto {
  BAT = "BAT",
  BOWL = "BOWL",
}

export class RecordTossDto {
  @IsString()
  tossWinnerTeamId!: string;

  @IsEnum(TossDecisionDto)
  tossDecision!: TossDecisionDto;
}