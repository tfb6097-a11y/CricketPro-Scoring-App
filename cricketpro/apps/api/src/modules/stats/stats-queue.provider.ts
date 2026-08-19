import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";

export const STATS_QUEUE = "STATS_QUEUE";
export const STATS_QUEUE_NAME = "stats-recompute";

export const statsQueueProvider: Provider = {
  provide: STATS_QUEUE,
  useFactory: (configService: ConfigService) => {
    return new Queue(STATS_QUEUE_NAME, {
      connection: {
        host: configService.get<string>("redis.host"),
        port: configService.get<number>("redis.port"),
      },
    });
  },
  inject: [ConfigService],
};