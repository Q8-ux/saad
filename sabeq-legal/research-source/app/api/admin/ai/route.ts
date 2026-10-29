import { adminJson, requireAdminService } from "@/lib/admin-service-auth";
import { formatEvidence, searchLegalDocuments, searchLegalEvidence } from "@/lib/legal-search";
import { generateText, openAIErrorResponse } from "@/lib/openai";
import { reviewLegalCitations, citationFailureMessage } from "@/lib/legal-citation-review";
import { cleanMultiline, cleanString, readJsonObject, RequestError } from "@/lib/request-security";

function sourceList(evidence: Awaited<ReturnType<typeof searchLegalEvidence>>) {
  return evidence.map((item, index) => ({
    reference: `م${index + 1}`,
    title: item.title,
    category: item.category,
    lawNumber: item.lawNumber,
    lawYear: item.lawYear,
    article: item.reference,
    sourceUrl: item.sourceUrl,
    officialSource: item.officialSource,
  }));
}

export async function POST(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  try {
    const data = await readJsonObject(request, 52_000);
    const tool = cleanString(data.tool, "الأداة", { min: 3, max: 20 });

    if (tool === "laws") {
      const query = cleanString(data.query, "عبارة البحث", { min: 2, max: 180 });
      const results = await searchLegalDocuments(query, 18);
      return adminJson({ tool, title: query, output: results.length ? `تم العثور على ${results.length} نتيجة قانونية موثقة.` : "لم تُعثر نتائج موثقة مطابقة.", results });
    }

    if (tool === "assistant") {
      const question = cleanMultiline(data.question, "السؤال", { min: 4, max: 4_000 });
      const evidence = await searchLegalEvidence(question, 10);
      if (!evidence.length) {
        return adminJson({
          tool,
          title: question.slice(0, 160),
          output: "لم أعثر على نص قانوني موثق يطابق السؤال في قاعدة البيانات الحالية. أعد صياغة السؤال أو راجع المصادر يدويًا.",
          sources: [],
        });
      }
      const answer = await generateText({
        instructions: `أنت مساعد قانوني داخلي لفريق مجموعة سابق القانونية في الكويت. أجب بالعربية فقط وبأسلوب مهني. استند حصراً إلى النصوص الموثقة المرفقة، ولا تخترع مادة أو حكماً أو تاريخاً أو نتيجة. ضع رمز المصدر 【م1】 بعد كل ادعاء قانوني، وصرّح بوضوح عند عدم كفاية المصادر. الناتج مادة عمل داخلية تتطلب مراجعة محامٍ قبل اعتمادها.`,
        input: `السؤال الداخلي:\n${question}\n\nالمصادر القانونية الموثقة:\n${formatEvidence(evidence)}`,
        maxOutputTokens: 14_000,
      });
      if (!reviewLegalCitations(answer,evidence).ok) throw new RequestError(citationFailureMessage,422);
      return adminJson({ tool, title: question.slice(0, 160), output: answer, sources: sourceList(evidence) });
    }

    if (tool === "memo") {
      const caseType = cleanString(data.caseType, "نوع القضية", { min: 2, max: 160 });
      const court = cleanString(data.court, "المحكمة", { min: 2, max: 200 });
      const caseNumber = cleanString(data.caseNumber, "رقم القضية", { max: 120, required: false });
      const clientName = cleanString(data.clientName, "اسم الموكل", { min: 2, max: 200 });
      const partyRole = cleanString(data.partyRole, "صفة الموكل", { min: 2, max: 120 });
      const otherParty = cleanString(data.otherParty, "الخصم", { min: 2, max: 400 });
      const allParties = cleanMultiline(data.allParties, "الأطراف والصفات", { max: 4_000, required: false });
      const facts = cleanMultiline(data.facts, "الوقائع", { min: 20, max: 18_000 });
      const requests = cleanMultiline(data.requests, "الطلبات", { min: 5, max: 7_000 });
      const legalIssues = cleanMultiline(data.legalIssues, "المسائل القانونية", { max: 5_000, required: false });
      const evidence = await searchLegalEvidence(`${caseType} ${legalIssues} ${facts.slice(0, 1200)} ${requests.slice(0, 500)}`, 12);
      const title = `${caseType} — ${clientName}`;
      if (!evidence.length) {
        const output = `مذكرة أولية بدفاع\n\nأمام ${court}${caseNumber ? `\nرقم القضية: ${caseNumber}` : ""}\n\nمقدمة من: ${clientName} — بصفته ${partyRole}\nضد: ${otherParty}${allParties ? `\n\nالأطراف والصفات:\n${allParties}` : ""}\n\nأولاً: الوقائع\n${facts}\n\nثانياً: الطلبات\n${requests}\n\nثالثاً: الأسانيد القانونية\nلم تتوفر نصوص موثقة مطابقة تكفي لإعداد الأسانيد القانونية، ولذلك لم تُضف مواد غير متحققة.\n\nتنبيه: هذه مسودة داخلية لا تصلح للإيداع قبل مراجعتها واعتمادها من محامٍ.`;
        return adminJson({ tool, title, output, sources: [] });
      }
      const output = await generateText({
        instructions: `أنت محرر مذكرات قانونية كويتية داخلي لمجموعة سابق القانونية. اكتب بالعربية فقط. استخدم حصراً البيانات والنصوص الموثقة المرفقة، ولا تخترع واقعة أو مادة أو حكماً أو تاريخاً. ضع رمز المصدر 【م1】 بعد كل سند. رتّب المذكرة: العنوان، المحكمة، الأطراف والصفات، الوقائع، المسائل القانونية، الدفاع والأسانيد، الطلبات الختامية، المصادر، ثم تنبيه بأنها مسودة داخلية للمراجعة المهنية قبل الإيداع.`,
        input: `المحكمة: ${court}\nرقم القضية: ${caseNumber || "غير محدد"}\nنوع القضية: ${caseType}\nالموكل: ${clientName}\nصفته: ${partyRole}\nالخصم: ${otherParty}\nالأطراف والصفات:\n${allParties || "غير محددة"}\n\nالوقائع:\n${facts}\n\nالطلبات:\n${requests}\n\nالمسائل القانونية:\n${legalIssues || "غير محددة"}\n\nالمصادر الموثقة:\n${formatEvidence(evidence)}`,
        maxOutputTokens: 26_000,
      });
      if (!reviewLegalCitations(output,evidence).ok) throw new RequestError(citationFailureMessage,422);
      return adminJson({ tool, title, output: `${output}\n\nتنبيه: مسودة داخلية لا تعتمد قبل مراجعة محامٍ.`, sources: sourceList(evidence) });
    }

    throw new RequestError("أداة الذكاء الاصطناعي غير صحيحة.");
  } catch (error) {
    const openAIError = openAIErrorResponse(error, "تعذر تنفيذ أداة الذكاء الاصطناعي حالياً.");
    if (openAIError) return adminJson({ error: openAIError.message }, openAIError.status);
    return adminJson({ error: error instanceof RequestError ? error.message : "تعذر تنفيذ أداة الذكاء الاصطناعي حالياً." }, error instanceof RequestError ? error.status : 503);
  }
}
