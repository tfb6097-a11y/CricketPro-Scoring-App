import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { NotificationType, NotificationAudience } from "@prisma/client";

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsOptional()
  @IsEnum(NotificationAudience)
  audience?: NotificationAudience;

  @IsOptional()
  payload?: Record<string, unknown>;
}