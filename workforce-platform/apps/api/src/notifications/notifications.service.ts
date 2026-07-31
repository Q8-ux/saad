import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private initialized=false;
  constructor(private readonly prisma:PrismaService){}
  private async ensure(){if(this.initialized)return;await this.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "NotificationQueue"(
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
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "sentAt" TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS "NotificationQueue_company_created_idx" ON "NotificationQueue"("companyId","createdAt" DESC);
    CREATE INDEX IF NOT EXISTS "NotificationQueue_status_idx" ON "NotificationQueue"("status","channel");
  `);this.initialized=true}
  async list(companyId:string,limit=100){await this.ensure();return this.prisma.$queryRawUnsafe(`SELECT * FROM "NotificationQueue" WHERE "companyId"=$1::uuid ORDER BY "createdAt" DESC LIMIT $2`,companyId,Math.min(Math.max(limit,1),300))}
  async queue(actor:any,data:{channel:string;priority?:string;recipientType?:string;recipientValue?:string;title:string;message:string}){await this.ensure();const rows:any[]=await this.prisma.$queryRawUnsafe(`INSERT INTO "NotificationQueue"("companyId","createdByUserId","channel","priority","recipientType","recipientValue","title","message","status") VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,'PENDING') RETURNING *`,actor.companyId,actor.userId||null,data.channel,data.priority||'NORMAL',data.recipientType||'ROLE',data.recipientValue||null,data.title,data.message);await this.prisma.auditLog.create({data:{companyId:actor.companyId,actorUserId:actor.userId,action:'CREATE',entityType:'NOTIFICATION_QUEUE',entityId:rows[0]?.id,metadata:{channel:data.channel,priority:data.priority||'NORMAL',status:'PENDING'}}});return rows[0]}
}
