import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";

export enum PlayerRoleDto {
  BATTER = "BATTER",
  BOWLER = "BOWLER",
  ALL_ROUNDER = "ALL_ROUNDER",
  WICKET_KEEPER = "WICKET_KEEPER",
}

export class CreatePlayerDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(PlayerRoleDto)
  role?: PlayerRoleDto;

  @IsOptional()
  @IsString()
  battingStyle?: string;

  @IsOptional()
  @IsString()
  bowlingStyle?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}