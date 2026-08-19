import { IsString, IsInt, IsEnum, IsBoolean, IsOptional, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ExtraTypeDto, WicketInfoDto } from "./record-ball.dto";

export class CorrectBallDto {
  @IsString()
  originalBallId!: string; // the ball being corrected — never edited, only referenced

  @IsString()
  inningsId!: string;

  @IsInt()
  @Min(1)
  sequenceNum!: number; // new sequence number for the correcting entry

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
  reason?: string; // why the correction was made — goes into the audit log
}