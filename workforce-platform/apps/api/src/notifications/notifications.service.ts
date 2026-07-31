import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, limit = 100) {
    return this.prisma.$queryRawUnsafe(
      `SELECT * FROM "NotificationQueue" WHERE "companyId"=$1::uuid ORDER BY "createdAt" DESC LIMIT $2`,
      companyId,
      Math.min(Math.max(limit, 1), 300),
    );
  }

  async queue(
    actor: any,
    data: {
      channel: string;
      priority?: string;
      recipientType?: string;
      recipientValue?: string;
      title: string;
      message: string;
    },
  ) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `INSERT INTO "NotificationQueue"("companyId","createdByUserId","channel","priority","recipientType","recipientValue","title","message","status")
       VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,'PENDING') RETURNING *`,
      actor.companyId,
      actor.userId || null,
      data.channel,
      data.priority || 'NORMAL',
      data.recipientType || 'ROLE',
      data.recipientValue || null,
      data.title,
      data.message,
    );

    await this.prisma.auditLog.create({
      data: {
        companyId: actor.companyId,
        actorUserId: actor.userId,
        action: 'CREATE',
        entityType: 'NOTIFICATION_QUEUE',
        entityId: rows[0]?.id,
        metadata: {
          channel: data.channel,
          priority: data.priority || 'NORMAL',
          status: 'PENDING',
        },
      },
    });

    return rows[0];
  }
}
