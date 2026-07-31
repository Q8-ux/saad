import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AiSection =
  | 'ATTENDANCE'
  | 'TRANSFERS'
  | 'EMERGENCY'
  | 'SAFETY'
  | 'ASSETS'
  | 'REPORTS'
  | 'NOTIFICATIONS'
  | 'EXECUTIVE';

export interface AiAnalysisRequest {
  section: AiSection;
  task: string;
  data?: unknown;
  language?: 'ar' | 'en';
  entityType?: string;
  entityId?: string;
}

export interface AiActorContext {
  companyId: string;
  userId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}

const SECTION_INSTRUCTIONS: Record<AiSection, string> = {
  ATTENDANCE:
    'حلل بيانات الحضور والانصراف والنطاق الجغرافي. اكتشف الأنماط غير الطبيعية، التأخير، تكرار الأجهزة، ضعف دقة GPS، والقفزات الجغرافية. لا تتهم الموظف؛ قدم مؤشرات مخاطر وأسبابًا قابلة للمراجعة.',
  TRANSFERS:
    'حلل تصاريح الانتقال بين المنشآت والمسافات والمدد وحالات الوصول. اكتشف التأخير والانحرافات والحركات غير المنطقية، واقترح الإجراء التشغيلي المناسب دون إصدار عقوبات تلقائية.',
  EMERGENCY:
    'حلل الحوادث والطوارئ والإخلاء ونقاط التجمع والملاجئ. رتب الأولويات، حدد الأشخاص غير المؤكدين، واقترح إجراءات آمنة. لا تستبدل قائد الحادث أو خطة الطوارئ المعتمدة.',
  SAFETY:
    'حلل مخاطر السلامة وتصاريح العمل والملاحظات الميدانية. اقترح ضوابط وقائية وقائمة فحص، وميز بوضوح بين المتطلبات المؤكدة والاقتراحات التي تحتاج اعتماد مختص.',
  ASSETS:
    'حلل الأصول الحرجة وحالتها ومستوى المخاطر وسجل الأعطال. اقترح أولويات التفتيش والصيانة، مع توضيح أن القرار النهائي يعتمد على المهندسين والبيانات الفنية المعتمدة.',
  REPORTS:
    'حوّل البيانات التشغيلية إلى تقرير عربي تنفيذي واضح: ملخص، مؤشرات، استثناءات، مخاطر، إجراءات مقترحة، ونقاط تحتاج قرارًا. لا تختلق أرقامًا غير موجودة في المدخلات.',
  NOTIFICATIONS:
    'صغ تنبيهًا مختصرًا وواضحًا مناسبًا للتطبيق أو واتساب أو البريد، مع مستوى الأولوية والإجراء المطلوب. تجنب كشف بيانات شخصية أكثر من اللازم.',
  EXECUTIVE:
    'قدّم ملخصًا تنفيذيًا للإدارة العليا يركز على الاتجاهات والمخاطر والقرارات المطلوبة والأثر التشغيلي، مع فصل الحقائق عن الاستنتاجات.',
};

@Injectable()
export class AiService {
  private initialized = false;

  constructor(private readonly prisma: PrismaService) {}

  capabilities() {
    return Object.entries(SECTION_INSTRUCTIONS).map(([section, description]) => ({ section, description }));
  }

  private async ensureStorage() {
    if (this.initialized) return;
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AiAnalysis" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" UUID NOT NULL,
        "actorUserId" UUID,
        "section" TEXT NOT NULL,
        "task" TEXT NOT NULL,
        "entityType" TEXT,
        "entityId" TEXT,
        "model" TEXT NOT NULL,
        "inputSummary" JSONB,
        "result" JSONB NOT NULL,
        "requiresHumanReview" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "AiAnalysis_company_created_idx" ON "AiAnalysis" ("companyId", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "AiAnalysis_entity_idx" ON "AiAnalysis" ("entityType", "entityId");
    `);
    this.initialized = true;
  }

  async history(companyId: string, limit = 50) {
    await this.ensureStorage();
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    return this.prisma.$queryRawUnsafe(
      `SELECT * FROM "AiAnalysis" WHERE "companyId" = $1::uuid ORDER BY "createdAt" DESC LIMIT $2`,
      companyId,
      safeLimit,
    );
  }

  async analyze(request: AiAnalysisRequest, actor?: AiActorContext) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new BadRequestException('OPENAI_API_KEY غير مضبوط على الخادم');
    if (!SECTION_INSTRUCTIONS[request.section]) throw new BadRequestException('قسم الذكاء الاصطناعي غير مدعوم');

    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    const language = request.language === 'en' ? 'English' : 'Arabic';
    const input = [
      `القسم: ${request.section}`,
      `المهمة: ${request.task}`,
      `لغة الإجابة: ${language}`,
      `البيانات:\n${JSON.stringify(request.data ?? {}, null, 2)}`,
    ].join('\n\n');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: [
          'أنت مساعد تشغيلي مؤسسي لمنصة نطاق العمل.',
          SECTION_INSTRUCTIONS[request.section],
          'التزم بالخصوصية، ولا تعرض الاسم الكامل عند عدم الحاجة.',
          'افصل دائمًا بين الحقائق، الاستنتاجات، والمقترحات.',
          'لا تنفذ قرارًا عقابيًا أو إجراءً خطرًا تلقائيًا.',
          'أعد النتيجة بصيغة JSON فقط وفق الحقول المطلوبة.',
        ].join('\n'),
        input,
        text: {
          format: {
            type: 'json_schema',
            name: 'workforce_ai_result',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                summary: { type: 'string' },
                riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                findings: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
                requiresHumanReview: { type: 'boolean' },
                confidenceNote: { type: 'string' },
              },
              required: ['summary', 'riskLevel', 'findings', 'recommendations', 'requiresHumanReview', 'confidenceNote'],
            },
          },
        },
      }),
    });

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new BadGatewayException(payload?.error?.message || 'تعذر الاتصال بخدمة الذكاء الاصطناعي');
    const outputText = payload?.output_text;
    if (!outputText) throw new BadGatewayException('لم تُرجع خدمة الذكاء الاصطناعي نتيجة قابلة للقراءة');

    let result: any;
    try { result = JSON.parse(outputText); }
    catch { throw new BadGatewayException('تعذر تحليل نتيجة الذكاء الاصطناعي'); }

    const generatedAt = new Date().toISOString();
    if (actor?.companyId) {
      await this.ensureStorage();
      const inputSummary = this.redactAndLimit(request.data);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "AiAnalysis" ("companyId","actorUserId","section","task","entityType","entityId","model","inputSummary","result","requiresHumanReview")
         VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)`,
        actor.companyId,
        actor.userId || null,
        request.section,
        request.task,
        request.entityType || null,
        request.entityId || null,
        model,
        JSON.stringify(inputSummary),
        JSON.stringify(result),
        Boolean(result.requiresHumanReview),
      );
      await this.prisma.auditLog.create({
        data: {
          companyId: actor.companyId,
          actorUserId: actor.userId,
          action: 'CREATE',
          entityType: 'AI_ANALYSIS',
          entityId: request.entityId,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          metadata: { section: request.section, model, riskLevel: result.riskLevel, requiresHumanReview: result.requiresHumanReview },
        },
      });
    }

    return { section: request.section, model, generatedAt, result };
  }

  private redactAndLimit(data: unknown) {
    const text = JSON.stringify(data ?? {});
    if (text.length <= 12000) return data ?? {};
    return { truncated: true, preview: text.slice(0, 12000), originalLength: text.length };
  }
}
