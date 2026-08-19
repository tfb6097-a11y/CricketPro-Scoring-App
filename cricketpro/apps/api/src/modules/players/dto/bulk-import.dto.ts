import { IsArray, IsOptional, IsString, IsBoolean, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class BulkImportRowDto {
  @IsString()
  playerName!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  teamName?: string;

  @IsOptional()
  @IsString()
  teamShortCode?: string;

  @IsOptional()
  @IsString()
  teamLogoUrl?: string;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportRowDto)
  rows!: BulkImportRowDto[];

  @IsOptional()
  @IsBoolean()
  replaceExistingSquad?: boolean;
}