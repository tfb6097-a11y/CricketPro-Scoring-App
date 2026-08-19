import { PartialType } from "@nestjs/mapped-types";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { CreateTeamDto } from "./create-team.dto";

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @IsOptional()
  @IsString()
  captainId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}