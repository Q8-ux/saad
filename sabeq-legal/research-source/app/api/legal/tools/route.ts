import {boundLegislation} from "@/lib/bound-legislation";
import { searchLegalEvidence } from "@/lib/legal-search";
import { formatIntakeEvidence, intakePassages } from "@/lib/intake-analysis";
import { isLegalToolAction, reviewToolOutput, type LegalToolResult } from "@/lib/legal-tools";
import { runLegalTool, openAIErrorResponse } from "@/lib/openai";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { requireServiceEnabled } from "@/lib/service-settings";
import { enforceUserServiceLimit, recordServiceActivity } from "@/lib/service-records";
import { assertSameOrigin, cleanLanguage, cleanMultiline, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";
export const OPTIONS = corsPreflight;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const started = performance.now();
    const [user, data] = await Promise.all([requireMemoUserOrGuest(request), readJsonObject(request, 90_000), requireServiceEnabled("assistant", request)]);
    if (!isLegalToolAction(data.action)) throw new RequestError("الأداة المطلوبة غير متاحة.");
    const action = data.action, language = cleanLanguage(data.language);
    await Promise.all([requireServiceEnabled(["research", "precedents", "updates"].includes(action) ? "library" : "memo", request), enforceRateLimit(request, "legal-tools", user ? 50 : 24, "hour"), user ? enforceUserServiceLimit(user, "assistant") : Promise.resolve()]);
    const result: LegalToolResult = { action, text: "", findings: [], missing: [], sources: [], warnings: [], retrievedAt: new Date().toISOString(), timing: { totalMs: 0 }, requiresReview: true };
    if (action === "updates") {
      const index=await boundLegislation();
      result.sources=index.documents.slice(0,12).map((d,i)=>({id:String(i+1),title:d.title,quote:"",url:`https://q8-ux.github.io/saad/sabeq-legal/source.html?page=${d.start}`,indexedAt:index.metadata.importedAt,kind:d.kind}));
      result.text=language==="ar"?"هذه أقسام من الملف المرفوع فقط؛ تاريخ فهرستها ليس تاريخ نفاذ ولا تغذية لتعديلات حديثة. لا يوجد بحث خارجي.":language==="en"?"Sections from your bound file only. The indexing date does not establish current law; no external updates are fetched.":"یہ صرف منسلک فائل کے حصے ہیں؛ اشاریہ بندی کی تاریخ نفاذ کی تصدیق نہیں۔";

    } else {
      const text = cleanMultiline(data.text, "النص", { min: ["research", "precedents"].includes(action) ? 2 : 10, max: 16_000 });
      const search = action === "research" || action === "precedents";
      const evidence = await searchLegalEvidence(text.slice(0, search ? 500 : 1300), 6, action === "precedents" ? "judgment" : action === "research" ? "legislation" : undefined);
      if (search) {
        result.sources = evidence.map((item, i) => ({ id: `م${i + 1}`, title: item.title, quote: item.text, url: item.sourceUrl, kind: item.documentType, indexedAt: item.libraryUpdatedAt || null }));
        result.text = language === "ar" ? (evidence.length ? "نتائج من النصوص المفهرسة. راجع النص الأصلي ومدى انطباقه على قضيتك." : (action==="precedents"?"لا توجد سجلات أحكام تمييز مستقلة مفهرسة في الملف المتاح؛ لا يمكن إنشاء حكم من ذكر المحكمة داخل قانون.":"غير موجود في الملف المتاح.")) : language === "en" ? (evidence.length ? "Results from indexed source texts. Check originals and applicability." : "No matching verified text was found.") : (evidence.length ? "اشاریہ شدہ ماخذ کے نتائج۔ اصل متن اور اطلاق کی جانچ کریں۔" : "متعلقہ مصدقہ متن نہیں ملا۔");
      } else {
        const raw = await runLegalTool({ action, text, language, evidence: formatIntakeEvidence(evidence), passageIds: intakePassages(evidence).map(p => p.id), signal: request.signal });
        Object.assign(result, reviewToolOutput(raw, text, evidence, language));
      }
      if (user) await recordServiceActivity({ userId: user.id, serviceType: "assistant", title: `أداة: ${action}`, inputText: text, outputText: JSON.stringify(result), metadata: { action, sourceCount: result.sources.length } });
    }
    result.timing.totalMs = Math.round(performance.now() - started);
    const response = privateJson(result); response.headers.set("X-Tools-Revision", "legal-tools-1"); return response;
  } catch (error) {
    const mapped = openAIErrorResponse(error, "تعذر إكمال الأداة. احتُفظ بالنص لتتمكن من إعادة المحاولة.");
    if (mapped) return privateJson({ error: mapped.message }, mapped.status);
    if (error instanceof RequestError) return errorResponse(error);
    return privateJson({ error: "تعذر الوصول للخدمة أو المكتبة. لم تُنشأ نتيجة، ويمكنك إعادة المحاولة." }, 503);
  }
}
