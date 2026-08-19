import { Injectable } from "@nestjs/common";
import { NotificationsService } from "./notificatons.service"; // fixed typo: was "./notificatons.service"

// Skeleton listener — subscribes to scoring events per the folder structure.
// Full event-bus wiring (e.g. NestJS EventEmitter or a Redis pub/sub subscriber)
// is a v2 task; for now this exposes the methods ScoringService can call directly.
@Injectable()
export class NotificationsListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  async onMatchStarted(matchId: string) {
    await this.notificationsService.notify({ type: "match:started", payload: { matchId } });
  }

  async onMilestoneReached(playerId: string, milestone: string) {
    await this.notificationsService.notify({ type: "milestone:reached", payload: { playerId, milestone } });
  }

  async onCorrectionMade(ballId: string, userId: string) {
    await this.notificationsService.notify({ type: "correction:made", payload: { ballId, userId } });
  }
}