import { IsString } from "class-validator";

export class GenerateFixturesDto {
  @IsString()
  tournamentId!: string;
}