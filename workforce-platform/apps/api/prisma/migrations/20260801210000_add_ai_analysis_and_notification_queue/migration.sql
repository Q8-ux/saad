-- CreateTable
CREATE TABLE "AiAnalysis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "actorUserId" UUID,
  "section" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "model" TEXT NOT NULL,
  "inputSummary" JSONB,
  "result" JSONB NOT NULL,
  "requiresHumanReview" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationQueue" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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
  "sentAt" TIMESTAMPTZ,
  CONSTRAINT "NotificationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAnalysis_company_created_idx" ON "AiAnalysis"("companyId", "createdAt" DESC);
CREATE INDEX "AiAnalysis_entity_idx" ON "AiAnalysis"("entityType", "entityId");
CREATE INDEX "NotificationQueue_company_created_idx" ON "NotificationQueue"("companyId", "createdAt" DESC);
CREATE INDEX "NotificationQueue_status_idx" ON "NotificationQueue"("status", "channel");

-- AddForeignKey
ALTER TABLE "AiAnalysis" ADD CONSTRAINT "AiAnalysis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAnalysis" ADD CONSTRAINT "AiAnalysis_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationQueue" ADD CONSTRAINT "NotificationQueue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationQueue" ADD CONSTRAINT "NotificationQueue_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
