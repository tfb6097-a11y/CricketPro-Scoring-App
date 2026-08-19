import { IsString, IsOptional, IsBoolean } from "class-validator";

export class AddTeamPlayerDto {
  @IsString()
  playerId!: string;

  @IsOptional()
  @IsBoolean()
  isCaptain?: boolean;

  @IsOptional()
  @IsBoolean()
  isKeeper?: boolean;
}