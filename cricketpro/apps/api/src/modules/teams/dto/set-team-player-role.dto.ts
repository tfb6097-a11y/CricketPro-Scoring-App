import { IsBoolean, IsOptional } from "class-validator";

export class SetTeamPlayerRoleDto {
  @IsOptional()
  @IsBoolean()
  isCaptain?: boolean;

  @IsOptional()
  @IsBoolean()
  isKeeper?: boolean;
}