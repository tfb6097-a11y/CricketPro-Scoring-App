import { IsString, IsOptional, IsEmail, IsBoolean, IsInt, Min, Max } from "class-validator";

export class UpdateSettingsDto {
  // General
  @IsOptional() @IsString() siteName?: string;
  @IsOptional() @IsString() siteTagline?: string;
  @IsOptional() @IsEmail() adminEmail?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() dateFormat?: string;
  @IsOptional() @IsString() timeFormat?: string;

  // Email Settings
  @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @IsOptional() @IsString() smtpHost?: string;
  @IsOptional() @IsInt() @Min(1) @Max(65535) smtpPort?: number;
  @IsOptional() @IsString() smtpUsername?: string;
  @IsOptional() @IsString() smtpPassword?: string;
  @IsOptional() @IsEmail() emailFromAddress?: string;

  // Live Scoring
  @IsOptional() @IsString() defaultFormat?: string;
  @IsOptional() @IsInt() @Min(1) defaultOversPerInnings?: number;
  @IsOptional() @IsBoolean() freeHitEnabled?: boolean;
  @IsOptional() @IsBoolean() autoStrikeRotation?: boolean;

  // Security
  @IsOptional() @IsInt() @Min(1) sessionTimeoutMinutes?: number;
  @IsOptional() @IsBoolean() requireStrongPassword?: boolean;
  @IsOptional() @IsBoolean() twoFactorEnabled?: boolean;

  // Backup
  @IsOptional() @IsBoolean() autoBackupEnabled?: boolean;
  @IsOptional() @IsString() backupFrequency?: string;

  // Integrations
  @IsOptional() @IsString() slackWebhookUrl?: string;
  @IsOptional() @IsString() googleAnalyticsId?: string;
}