import { IsString, IsDateString, IsOptional } from "class-validator";

export class CreateMatchDto {
  @IsOptional()
  @IsString()
  tournamentId?: string;

  @IsString()
  teamAId!: string;

  @IsString()
  teamBId!: string;

  @IsString()
  groundId!: string;

  @IsDateString()
  scheduledAt!: string;
}