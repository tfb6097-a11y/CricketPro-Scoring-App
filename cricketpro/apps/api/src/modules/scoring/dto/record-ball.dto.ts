import { IsString, IsInt, IsEnum, IsBoolean, IsOptional, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum ExtraTypeDto {
  NONE = "NONE",
  WIDE = "WIDE",
  NO_BALL = "NO_BALL",
  BYE = "BYE",
  LEG_BYE = "LEG_BYE",
}

export enum DismissalTypeDto {
  BOWLED = "BOWLED",
  CAUGHT = "CAUGHT",
  LBW = "LBW",
  RUN_OUT = "RUN_OUT",
  STUMPED = "STUMPED",
  HIT_WICKET = "HIT_WICKET",
  RETIRED_HURT = "RETIRED_HURT",
  OTHER = "OTHER",
}

export class WicketInfoDto {
  @IsString()
  dismissedPlayerId!: string;

  @IsEnum(DismissalTypeDto)
  dismissalType!: DismissalTypeDto;

  @IsOptional()
  @IsString()
  fielderId?: string;
}

export class RecordBallDto {
  @IsString()
  inningsId!: string;

  // Client-generated, monotonically increasing per innings — used for idempotency
  // (Week 4 Thursday hardens this against retries; for now it just orders balls).
  @IsInt()
  @Min(1)
  sequenceNum!: number;

  @IsString()
  strikerId!: string;

  @IsString()
  nonStrikerId!: string;

  @IsString()
  bowlerId!: string;

  @IsInt()
  @Min(0)
  runsOffBat!: number;

  @IsEnum(ExtraTypeDto)
  extraType!: ExtraTypeDto;

  @IsInt()
  @Min(0)
  extraRuns!: number;

  @IsBoolean()
  isFreeHit!: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => WicketInfoDto)
  wicket?: WicketInfoDto;

  @IsOptional()
  @IsString()
  commentary?: string;
}