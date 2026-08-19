import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // Writes a single audit trail row: who did what, to what entity, before/after state.
  // Called on every mutating action per Rules.md §7 — corrections, deactivations, etc.
  async log(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before as any,
        after: params.after as any,
      },
    });
  }
}