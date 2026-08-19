import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, NotificationType, NotificationAudience } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationDto } from "./dto/update-notification.dto";

interface FindAllParams {
  search?: string;
  type?: NotificationType;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Admin panel CRUD -----------------------------------------------

  async findAll({ search, type, page = 1, pageSize = 5 }: FindAllParams) {
    const where: Prisma.NotificationWhereInput = {
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(type ? { type } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { sentBy: { select: { id: true, name: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    return notification;
  }

  async create(dto: CreateNotificationDto, sentByUserId?: string) {
    return this.prisma.notification.create({
      data: {
        title: dto.title,
        type: dto.type,
        audience: dto.audience ?? NotificationAudience.ALL_USERS,
        payload: dto.payload as Prisma.InputJsonValue | undefined,
        status: "SENT",
        sentByUserId,
      },
    });
  }

  async update(id: string, dto: UpdateNotificationDto) {
    await this.findOne(id); // 404s if missing
    return this.prisma.notification.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.payload !== undefined ? { payload: dto.payload as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // 404s if missing
    await this.prisma.notification.delete({ where: { id } });
    return { id, deleted: true };
  }

  // --- Internal event hook, used by NotificationsListener --------------
  // Called from scoring/match events (system-generated, so sentByUserId stays
  // null — there's no human sender). Persists a row AND logs it. Fan-out to
  // push/email providers is still v2 — logged here as a placeholder.

  async notify(event: { type: string; payload: unknown }) {
    this.logger.log(`[notification] ${event.type}: ${JSON.stringify(event.payload)}`);

    const { title, type } = this.mapEventToNotification(event.type);

    await this.prisma.notification.create({
      data: {
        title,
        type,
        audience: NotificationAudience.ALL_USERS,
        payload: event.payload as Prisma.InputJsonValue,
        status: "SENT",
      },
    });

    // v2: fan out to push/email providers here
  }

  private mapEventToNotification(eventType: string): { title: string; type: NotificationType } {
    switch (eventType) {
      case "match:started":
        return { title: "A match has started", type: NotificationType.MATCH };
      case "milestone:reached":
        return { title: "Player milestone reached", type: NotificationType.MATCH };
      case "correction:made":
        return { title: "A scoring correction was made", type: NotificationType.SYSTEM };
      default:
        return { title: eventType, type: NotificationType.SYSTEM };
    }
  }
}