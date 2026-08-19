import { AppRole } from "../../../common/constants/roles.enum";

import { IsOptional, IsString, IsEmail, IsBoolean, MinLength, MaxLength, IsIn } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(20)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  password?: string;

  @IsOptional()
  @IsIn(["ADMIN", "SCORER", "VIEWER"])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}