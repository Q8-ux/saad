import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { isEmail } from 'class-validator';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { companyId: string; userId: string };
type QueueInput = {
  channel: 'APP' | 'WHATSAPP' | 'EMAIL';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  recipientType?: 'ROLE' | 'EMPLOYEE' | 'STATION' | 'ALL' | 'DIRECT';
  recipientValue?: string;
  title: string;
  message: string;
};

type QueueRow = {
  id: string;
  companyId: string;
  channel: string;
  recipientType: string;
  recipientValue: string | null;
  title: string;
  message: string;
  status: string;
  lastAttemptAt: Date | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private storageReady?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async list(companyId: string, limit = 100) {
    await this.ensureStorage();
    await this.recoverStaleDeliveries(companyId);
    return this.prisma.$queryRawUnsafe(
      `SELECT * FROM "NotificationQueue" WHERE "companyId"=$1::uuid ORDER BY "createdAt" DESC LIMIT $2`,
      companyId,
      Math.min(Math.max(limit, 1), 300),
    );
  }

  async queue(actor: Actor, data: QueueInput) {
    await this.ensureStorage();
    const recipientType = data.recipientType || 'ROLE';
    const recipients = data.channel === 'EMAIL'
      ? await this.resolveEmailRecipients(actor.companyId, recipientType, data.recipientValue)
      : [];

    if (data.channel === 'EMAIL') this.email.assertConfigured();

    const rows: QueueRow[] = await this.prisma.$queryRawUnsafe(
      `INSERT INTO "NotificationQueue"("companyId","createdByUserId","channel","priority","recipientType","recipientValue","title","message","status")
       VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,'PENDING') RETURNING *`,
      actor.companyId,
      actor.userId || null,
      data.channel,
      data.priority || 'NORMAL',
      recipientType,
      data.recipientValue?.trim() || null,
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
          recipientType,
          ...(recipients.length ? { recipientCount: recipients.length } : {}),
          status: 'PENDING',
        },
      },
    });

    if (data.channel !== 'EMAIL') return rows[0];
    return this.dispatchEmail(actor.companyId, rows[0].id, recipients);
  }

  async retry(actor: Actor, id: string) {
    await this.ensureStorage();
    await this.recoverStaleDeliveries(actor.companyId);
    const rows: QueueRow[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "NotificationQueue" WHERE "id"=$1::uuid AND "companyId"=$2::uuid LIMIT 1`,
      id,
      actor.companyId,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('التنبيه غير موجود.');
    if (row.channel !== 'EMAIL') throw new BadRequestException('إعادة المحاولة متاحة لتنبيهات البريد فقط.');
    if (!['PENDING', 'FAILED'].includes(row.status)) throw new BadRequestException('حالة التنبيه لا تسمح بإعادة الإرسال.');
    this.email.assertConfigured();
    const recipients = await this.resolveEmailRecipients(actor.companyId, row.recipientType, row.recipientValue || undefined);
    return this.dispatchEmail(actor.companyId, row.id, recipients);
  }

  private async dispatchEmail(companyId: string, id: string, recipients: string[]) {
    const claimed: QueueRow[] = await this.prisma.$queryRawUnsafe(
      `UPDATE "NotificationQueue" SET "status"='PROCESSING', "errorMessage"=NULL, "lastAttemptAt"=CURRENT_TIMESTAMP
       WHERE "id"=$1::uuid AND "companyId"=$2::uuid AND "status" IN ('PENDING','FAILED') RETURNING *`,
      id,
      companyId,
    );
    if (!claimed[0]) throw new BadRequestException('تم التقاط الرسالة للإرسال من عملية أخرى.');

    try {
      const result = await this.email.sendSystemNotification(recipients, claimed[0].title, claimed[0].message);
      const status = result.rejected > 0 ? 'PARTIAL' : 'SENT';
      const deliveryNote = result.rejected > 0
        ? `قبل مزود البريد ${result.accepted} من أصل ${recipients.length} مستلماً؛ راجع سجلات المزود للعناوين المرفوضة.`
        : null;
      await this.prisma.$executeRawUnsafe(
        `UPDATE "NotificationQueue" SET "status"=$1, "providerMessageId"=$2, "errorMessage"=$3, "sentAt"=CURRENT_TIMESTAMP WHERE "id"=$4::uuid`,
        status,
        result.messageId,
        deliveryNote,
        id,
      );
    } catch (error) {
      this.logger.error(`Email notification delivery failed for queue ${id}`, error instanceof Error ? error.stack : undefined);
      await this.prisma.$executeRawUnsafe(
        `UPDATE "NotificationQueue" SET "status"='FAILED', "errorMessage"=$1 WHERE "id"=$2::uuid`,
        'تعذر التسليم عبر مزود البريد. تحقق من إعدادات SMTP ثم أعد المحاولة.',
        id,
      );
    }

    const rows: QueueRow[] = await this.prisma.$queryRawUnsafe(`SELECT * FROM "NotificationQueue" WHERE "id"=$1::uuid LIMIT 1`, id);
    return rows[0];
  }

  private ensureStorage() {
    if (!this.storageReady) {
      this.storageReady = this.initializeStorage().catch((error) => {
        this.storageReady = undefined;
        throw error;
      });
    }
    return this.storageReady;
  }

  private async initializeStorage() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "NotificationQueue" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" UUID NOT NULL,
        "createdByUserId" UUID,
        "channel" TEXT NOT NULL,
        "priority" TEXT NOT NULL DEFAULT 'NORMAL',
        "recipientType" TEXT NOT NULL DEFAULT 'ROLE',
        "recipientValue" TEXT,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "providerMessageId" TEXT,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastAttemptAt" TIMESTAMPTZ,
        "sentAt" TIMESTAMPTZ
      )
    `);
    await this.prisma.$executeRawUnsafe(
      `ALTER TABLE "NotificationQueue" ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMPTZ`,
    );
    await this.prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "NotificationQueue_company_created_idx" ON "NotificationQueue" ("companyId", "createdAt" DESC)`,
    );
    await this.prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "NotificationQueue_status_idx" ON "NotificationQueue" ("status", "channel")`,
    );
  }

  private async recoverStaleDeliveries(companyId: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "NotificationQueue"
       SET "status"='FAILED', "errorMessage"='توقفت محاولة الإرسال قبل اكتمالها. يمكنك إعادة المحاولة.'
       WHERE "companyId"=$1::uuid
         AND "status"='PROCESSING'
         AND COALESCE("lastAttemptAt", "createdAt") < CURRENT_TIMESTAMP - INTERVAL '10 minutes'`,
      companyId,
    );
  }

  private async resolveEmailRecipients(companyId: string, recipientType: string, recipientValue?: string) {
    let recipients: string[] = [];
    const value = recipientValue?.trim();

    if (recipientType === 'DIRECT') {
      if (!value || !isEmail(value)) throw new BadRequestException('أدخل بريداً إلكترونياً صحيحاً للمستلم المباشر.');
      recipients = [value];
    } else if (recipientType === 'ALL') {
      const users = await this.prisma.user.findMany({ where: { companyId, isActive: true }, select: { email: true } });
      recipients = users.map((user) => user.email);
    } else if (recipientType === 'ROLE') {
      if (!value || !Object.values(Role).includes(value as Role)) throw new BadRequestException('أدخل اسم صلاحية صحيحاً للمستلمين.');
      const users = await this.prisma.user.findMany({ where: { companyId, isActive: true, role: value as Role }, select: { email: true } });
      recipients = users.map((user) => user.email);
    } else if (recipientType === 'EMPLOYEE') {
      if (!value) throw new BadRequestException('أدخل معرّف الموظف.');
      const employee = await this.prisma.employee.findFirst({
        where: { id: value, companyId, user: { isActive: true } },
        select: { user: { select: { email: true } } },
      });
      if (employee?.user?.email) recipients = [employee.user.email];
    } else if (recipientType === 'STATION') {
      if (!value) throw new BadRequestException('أدخل معرّف المنشأة.');
      const users = await this.prisma.user.findMany({
        where: { companyId, isActive: true, stationAccess: { some: { stationId: value } } },
        select: { email: true },
      });
      recipients = users.map((user) => user.email);
    } else {
      throw new BadRequestException('نوع المستلم غير مدعوم.');
    }

    const unique = [...new Set(recipients.map((email) => email.trim().toLowerCase()).filter((email) => isEmail(email)))];
    if (!unique.length) throw new BadRequestException('لم يتم العثور على مستلمين لديهم بريد صالح ونشط.');
    if (unique.length > 300) throw new BadRequestException('عدد مستلمي الرسالة يتجاوز الحد الأقصى 300.');
    return unique;
  }
}
