import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import { STATS_QUEUE_NAME } from "./stats-queue.provider";
import { StatsService } from "./stats.service";

@Injectable()
export class StatsProcessor implements OnModuleInit, OnModuleDestroy {
  private worker!: Worker;
  private readonly logger = new Logger(StatsProcessor.name);

  constructor(
    private readonly statsService: StatsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      STATS_QUEUE_NAME,
      async (job) => {
        const { matchId } = job.data as { matchId: string };
        await this.statsService.recomputeForMatch(matchId);
      },
      {
        connection: {
          host: this.configService.get<string>("redis.host"),
          port: this.configService.get<number>("redis.port"),
        },
      },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Stats job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}