import { IsString, IsOptional } from "class-validator";

export class CreateTeamDto {
  @IsString()
  name!: string;

  @IsString()
  shortCode!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coach?: string;

  @IsOptional()
  @IsString()
  manager?: string;
}