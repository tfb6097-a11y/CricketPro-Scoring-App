import { IsString, IsOptional, IsInt, Min } from "class-validator";

export class CreateGroundDto {
  @IsString()
  name!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}