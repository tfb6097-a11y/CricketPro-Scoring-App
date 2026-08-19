import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from "class-validator";
import { AppRole } from "../../../common/constants/roles.enum";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(AppRole)
  role!: AppRole;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}