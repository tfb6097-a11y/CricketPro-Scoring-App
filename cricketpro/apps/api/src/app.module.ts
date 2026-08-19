import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health/health.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { PlayersModule } from "./modules/players/players.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { GroundsModule } from "./modules/grounds/grounds.module";
import { TournamentsModule } from "./modules/tournaments/tournaments.module";
import { FixturesModule } from "./modules/fixtures/fixtures.module";
import { MatchesModule } from "./modules/matches/matches.module";
import { ScoringModule } from "./modules/scoring/scoring.module";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";
import { StatsModule } from "./modules/stats/stats.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { MailModule } from "./modules/mail/mail.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
     ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute window
        limit: 100, // 100 requests per minute per IP, generous default for normal API use
      },
    ]),
    PrismaModule,AuthModule,UsersModule,PlayersModule,TeamsModule,GroundsModule,TournamentsModule,FixturesModule,MatchesModule,ScoringModule,AuditLogsModule,StatsModule,ReportsModule,NotificationsModule,UploadsModule,SettingsModule,MailModule
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}