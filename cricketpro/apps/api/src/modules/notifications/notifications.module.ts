import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notificatons.service"; // <-- typo check karo
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationsPublicController } from "./notifications.controller";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsPublicController,NotificationsController], // ye missing to nahi?
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}