import { IsString, IsDateString } from "class-validator";

export class CreateFixtureDto {
  @IsString()
  tournamentId!: string;

  @IsString()
  teamAId!: string;

  @IsString()
  teamBId!: string;

  @IsString()
  groundId!: string;

  @IsDateString()
  scheduledAt!: string;
}