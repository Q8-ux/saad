import { interfaceLabel } from "@/lib/interface-language";
import { interfaceReviewInstructions, legalResearchInstructions, removeDelegatedResearch } from "@/lib/legal-language";
import { formatEvidence, searchLegalEvidence } from "@/lib/legal-search";
import { generateText, openAIErrorResponse } from "@/lib/openai";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { recordServiceActivity } from "@/lib/service-records";
import { requireServiceEnabled } from "@/lib/service-settings";
import { reviewLegalCitations, citationFailureMessage } from "@/lib/legal-citation-review";
import { assertSameOrigin, cleanLanguage, cleanMultiline, cleanString, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

type DraftAction = "improve_facts" | "extract_requests" | "improve_requests";

const actionInstructions: Record<DraftAction, string> = {
  improve_facts: `أعد صياغة الوقائع بلغة الواجهة القانونية الرسمية، بترتيب زمني واضح وفقرات قصيرة. حافظ حرفياً على جوهر كل واقعة واسم وتاريخ ومبلغ وصفة. لا تضف واقعة أو طلباً أو نتيجة قانونية أو مادة أو حكماً. استخدم المصادر فقط لضبط المصطلح القانوني عند الحاجة. أعد الوقائع المحسنة فقط من دون مقدمة أو خاتمة.`,
  extract_requests: `استخرج من الوقائع والسياق طلبات قضائية أولية بلغة الواجهة، مرقمة وواضحة، من دون تغيير غرض المستخدم. لا تضف طلباً لا تسنده الوقائع. لا تستشهد إلا بنص مرفق يدعم الطلب مباشرة، وضع رمزه بعد العبارة بالشكل 【م1】. إذا لم توجد مصادر مناسبة فاكتب الطلبات المستخلصة من الوقائع من دون أسانيد أو مواد. أعد قائمة الطلبات فقط.`,
  improve_requests: `أعد صياغة الطلبات بلغة الواجهة القانونية الرسمية مع الحفاظ الكامل على نوع الحماية والنتيجة التي قصدها المستخدم. نظّم الطلبات الأصلية والاحتياطية إن كانت موجودة في النص، ولا تنشئ طلباً جديداً. لا تستشهد إلا بنص مرفق يدعم الطلب مباشرة، وضع رمزه بعد العبارة بالشكل 【م1】. أعد الطلبات المحسنة فقط.`,
};

function isDraftAction(value: unknown): value is DraftAction {
  return value === "improve_facts" || value === "extract_requests" || value === "improve_requests";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireMemoUserOrGuest(request);
    await requireServiceEnabled("memo", request);
    const raw = await readJsonObject(request, 32_000);
    await enforceRateLimit(request, "legal-draft-tools", user ? 18 : 6, "hour");
    if (!isDraftAction(raw.action)) throw new RequestError("أداة الصياغة المطلوبة غير صحيحة.");

    const action = raw.action;
    const language = cleanLanguage(raw.language);
    const text = cleanMultiline(raw.text, "النص", { min: 10, max: 12_000 });
    const context = cleanMultiline(raw.context, "السياق", { max: 12_000, required: false });
    const caseType = cleanString(raw.caseType, "نوع القضية", { max: 120, required: false });
    const searchQuery = `${caseType} ${text.slice(0, 1_300)} ${context.slice(0, 650)}`;
    const evidence = await searchLegalEvidence(searchQuery, 8);
    const sources = evidence.map((item) => ({
      title: item.title,
      reference: item.reference || (item.lawNumber && item.lawYear ? `${item.lawNumber}/${item.lawYear}` : interfaceLabel("مرجع داخلي موثق", language)),
    }));
    const legalContext = evidence.length
      ? formatEvidence(evidence)
      : "لا توجد نصوص موثقة مطابقة. حسّن الصياغة أو استخرج الطلبات من كلام المستخدم فقط، ولا تضف أي سند قانوني.";

    const draft = await generateText({
      instructions: `${interfaceReviewInstructions(language)}\n${legalResearchInstructions}\nأنت محرر قانوني كويتي لمجموعة سابق القانونية. ${actionInstructions[action]} لغة الواجهة: ${language}. اكتب النتيجة والإرشادات بهذه اللغة فقط، واحتفظ بالأسماء والأرقام والاقتباسات الأصلية. محرك المذكرة النهائية منفصل ويكتب بالعربية دائماً.
التزم حصراً بنص المستخدم والمصادر الموثقة المرفقة. يُمنع اختلاق مادة أو حكم أو رقم قضية أو تاريخ أو مبلغ أو اسم. عند أي طلب لأحكام التمييز من دون مصدر مطابق وضّح بلغة الواجهة أنه لا توجد أحكام تمييز موثقة مطابقة في قاعدة البيانات حالياً. لا تذكر أنك نموذج ذكاء اصطناعي.`,
      input: `نوع القضية: ${caseType || "غير محدد"}

النص المطلوب معالجته:
${text}

السياق الإضافي:
${context || "غير متوفر"}

المصادر القانونية الموثقة:
${legalContext}`,
      maxOutputTokens: 10_000,
    });

    const output = removeDelegatedResearch(draft, language);
    if(!reviewLegalCitations(output,evidence).ok) throw new RequestError(citationFailureMessage,422);
    if (user) {
      await recordServiceActivity({ userId: user.id, serviceType: `draft_${action}`, title: caseType || action, inputText: text, outputText: output, metadata: { sourceCount: sources.length } });
    }
    return privateJson({ text: output, sourceCount: sources.length, sources });
  } catch (error) {
    const openAIError = openAIErrorResponse(error, "تعذر تنفيذ أداة الصياغة حالياً. يرجى المحاولة مجدداً.");
    if (openAIError) return privateJson({ error: openAIError.message }, openAIError.status);
    if (error instanceof RequestError) return errorResponse(error);
    return privateJson({ error: "تعذر تنفيذ أداة الصياغة حالياً. يرجى المحاولة مجدداً." }, 503);
  }
}
