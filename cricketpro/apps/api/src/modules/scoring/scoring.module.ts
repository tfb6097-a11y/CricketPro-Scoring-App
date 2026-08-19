import { Module } from "@nestjs/common";
import { ScoringController } from "./scoring.controller";
import { ScoringService } from "./scoring.service";
import { EventsGateway } from "../../gateways/events.gateway";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { StatsModule } from "../stats/stats.module";

@Module({
  imports: [AuditLogsModule, StatsModule],
  controllers: [ScoringController],
  providers: [ScoringService, EventsGateway],
  exports: [ScoringService],
})
export class ScoringModule {}