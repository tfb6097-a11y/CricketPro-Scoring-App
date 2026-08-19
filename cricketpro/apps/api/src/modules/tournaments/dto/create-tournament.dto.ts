import { IsString, IsEnum, IsInt, Min, IsDateString,IsOptional} from "class-validator";

export enum MatchFormatDto {
  T20 = "T20",
  ODI = "ODI",
  TEST = "TEST",
}

export class CreateTournamentDto {
  @IsString()
  name!: string;

  @IsEnum(MatchFormatDto)
  format!: MatchFormatDto;

  @IsInt()
  @Min(1)
  oversPerInnings!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}