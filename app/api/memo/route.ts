import { getD1 } from "../../../db";
import { nullableId, textValue } from "../../../lib/office-validation";
import { searchLegalCorpus } from "../../../lib/legal-search";
import {
  assertTrustedMutation,
  privateJson,
  readJsonObject,
  RequestValidationError,
} from "../../../lib/request-security";
import {
  requireCapability,
  requireTenantContext,
  TenantAccessError,
  writeAuditLog,
} from "../../../lib/tenant-access";

export const dynamic = "force-dynamic";

const MEMO_TYPES = new Set(["دفاع", "رد", "استئناف", "تمييز", "طلب"]);

async function assertLinkedCase(caseId: number | null, officeId: string) {
  if (!caseId) return;
  const row = await getD1()
    .prepare("SELECT id FROM tenant_cases WHERE id=? AND office_id=?")
    .bind(caseId, officeId)
    .first<{ id: number }>();
  if (!row) throw new RequestValidationError("القضية المرتبطة غير موجودة ضمن هذا المكتب.");
}

function failure(error: unknown) {
  if (error instanceof TenantAccessError) {
    return privateJson({ error: error.message }, { status: error.status });
  }
  if (error instanceof RequestValidationError) {
    return privateJson({ error: error.message }, { status: 400 });
  }
  console.error("Memo generation failed", error instanceof Error ? error.message : error);
  return privateJson(
    { error: "تعذّر إنشاء المذكرة حالياً. حاول مرة أخرى بعد قليل." },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const context = await requireTenantContext(request);
    requireCapability(context, "manageMemos");
    const body = await readJsonObject(request);
    const title = textValue(body.title, 300) || "مذكرة قانونية";
    const memoType = textValue(body.memoType, 80) || "دفاع";
    if (!MEMO_TYPES.has(memoType)) {
      throw new RequestValidationError("نوع المذكرة غير صحيح.");
    }
    const court = textValue(body.court, 240);
    const facts = textValue(body.facts, 15000);
    const legalBasis = textValue(body.legalBasis, 8000);
    const requests = textValue(body.requests, 5000);
    const rawCaseId = textValue(body.caseId, 30);
    const caseId = nullableId(body.caseId);
    if (rawCaseId && !caseId) {
      throw new RequestValidationError("القضية المرتبطة غير صحيحة.");
    }
    if (!facts && !legalBasis) {
      throw new RequestValidationError(
        "أدخل الوقائع أو السند القانوني حتى يمكن بناء مذكرة مسندة.",
      );
    }
    await assertLinkedCase(caseId, context.officeId);

    // The corpus receives only a bounded research query. Tenant case data is
    // never sent to an external model from this route.
    const searchQuery = `${legalBasis} ${facts}`.trim().slice(0, 650);
    const results = await searchLegalCorpus({ query: searchQuery, limit: 12 });
    const citations = [
      ...new Map(results.map((result) => [result.documentId, result])).values(),
    ].slice(0, 6);

    const lines: string[] = [
      title,
      "",
      court ? `مقدمة إلى: ${court}` : "مقدمة إلى المحكمة المختصة",
      `نوع المذكرة: ${memoType}`,
      "",
      "أولاً: الوقائع",
      facts || "[تستكمل الوقائع من ملف القضية]",
      "",
      "ثانياً: الإطار القانوني والدفوع المحتملة",
    ];
    if (legalBasis) lines.push(legalBasis, "");
    if (citations.length) {
      citations.forEach((citation, index) => {
        lines.push(
          `${index + 1}. ${citation.title}`,
          citation.excerpt,
          `[المصدر: ${citation.officialSource} | درجة فحص النص: ${citation.qualityScore}%]`,
          "",
        );
      });
    } else {
      lines.push(
        "لم يعثر المحرك على سند مطابق بدرجة كافية. لا تُودع هذه المسودة قبل إضافة النصوص القانونية ومراجعتها.",
        "",
      );
    }
    lines.push(
      "ثالثاً: الطلبات",
      requests || "[تستكمل الطلبات الختامية بدقة]",
      "",
      "ختاماً",
      "يلتمس مقدم المذكرة الحكم بالطلبات المتقدمة، مع حفظ سائر الحقوق والدفوع.",
      "",
      "ملاحظة مراجعة داخلية: هذه مسودة بحثية أولية. يجب التحقق من سريان كل نص ومطابقة الاقتباسات مع النسخة الرسمية قبل التوقيع أو الإيداع.",
    );

    const content = lines.join("\n");
    const citationPayload = citations.map((citation, index) => ({
      number: index + 1,
      documentId: citation.documentId,
      title: citation.title,
      sourceUrl: citation.sourceUrl,
      sourcePage: citation.sourcePage,
      officialSource: citation.officialSource,
      sourceType: citation.sourceType,
      qualityScore: citation.qualityScore,
      amendmentAlert: citation.amendmentAlert,
    }));

    await getD1()
      .prepare(
        "INSERT INTO tenant_memos (office_id,case_id,title,memo_type,court,facts,legal_basis,requests,content,citations_json) VALUES (?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        context.officeId,
        caseId,
        title,
        memoType,
        court,
        facts,
        legalBasis,
        requests,
        content,
        JSON.stringify(citationPayload),
      )
      .run();
    await writeAuditLog({
      officeId: context.officeId,
      actorUserId: context.id,
      action: "create_memo",
      entityType: "memo",
      metadata: { citationCount: citationPayload.length },
    });

    return privateJson({
      memo: { title, content, citations: citationPayload },
      warning:
        citations.length > 0
          ? "تم بناء المسودة من نتائج قاعدة القوانين، وتبقى المراجعة البشرية واجبة."
          : "المسودة بلا سند مطابق؛ أضف كلمات قانونية أدق وأعد التوليد.",
    });
  } catch (error) {
    return failure(error);
  }
}
