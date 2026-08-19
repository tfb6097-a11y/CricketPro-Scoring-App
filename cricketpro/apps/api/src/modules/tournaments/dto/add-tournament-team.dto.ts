import { IsString } from "class-validator";

export class AddTournamentTeamDto {
  @IsString()
  teamId!: string;
}