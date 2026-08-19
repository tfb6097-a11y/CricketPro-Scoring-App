import { Module } from "@nestjs/common";
import { StatsService } from "./stats.service";
import { StatsProcessor } from "./stats.processor";
import { StatsController } from "./stats.controller";
import { statsQueueProvider } from "./stats-queue.provider";

@Module({
  controllers: [StatsController],
  providers: [StatsService, StatsProcessor, statsQueueProvider],
  exports: [StatsService, statsQueueProvider],
})
export class StatsModule {}