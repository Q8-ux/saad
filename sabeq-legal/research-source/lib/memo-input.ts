import { inferProceduralPosition } from "@/lib/procedural-position";
import { cleanString, cleanMultiline, RequestError } from "@/lib/request-security";
import { correctLegalProse } from "@/lib/legal-language";
import { pleadingFields } from "@/lib/pleading-document";
import { assessMatterFacts } from "@/lib/matter-facts";

export function validateMemoInput(raw: Record<string, unknown>) {
    const caseType = cleanString(raw.caseType, "نوع القضية", { min: 2, max: 160 });
    const clientName = cleanString(raw.clientName, "اسم الموكل", { min: 2, max: 200 });
    const courtCircuit = cleanString(raw.courtCircuit, "الدائرة", { max: 200, required: false });
    const caseNumber = cleanString(raw.caseNumber, "رقم القضية", { max: 120, required: false });
    const otherParty = cleanString(raw.otherParty, "الخصم", { min: 2, max: 400 });
    const allParties = cleanMultiline(raw.allParties, "الأطراف والصفات", { max: 4_000, required: false });
    const facts = correctLegalProse(cleanMultiline(raw.facts, "الوقائع", { min: 20, max: 16_000 }), [clientName, otherParty, allParties]);
    const requests = correctLegalProse(cleanMultiline(raw.requests, "الطلبات", { min: 5, max: 7_000 }), [clientName, otherParty, allParties]);
    const procedure = inferProceduralPosition(facts + "\n" + requests, clientName, otherParty);
    if (procedure.conflict) throw new RequestError("تعارضت صفة الطرف أو صاحب الطعن في الوقائع. راجع من أقام الدعوى ومن تقدم بالطعن قبل إعداد الصحيفة.", 422);
    const court = cleanString(raw.court || procedure.court, "المحكمة", { min: 2, max: 200 });
    const partyRole = cleanString(raw.partyRole || procedure.partyRole, "الصفة", { min: 2, max: 120 });
    const legalIssues = cleanMultiline(raw.legalIssues, "المسائل القانونية", { max: 5_000, required: false });
    const conversationTranscript = cleanMultiline(raw.conversationTranscript, "تفريغ المحادثة", { max: 30_000, required: false });
    const conversationSummary = cleanMultiline(raw.conversationSummary, "ملخص المحادثة", { max: 6_000, required: false });
    const assistantResearch = cleanMultiline(raw.assistantResearch, "تحليل المساعد", { max: 12_000, required: false });
    const extraFields: Record<string,string> = {};
    for (const [key,label] of Object.entries(pleadingFields)) extraFields[key] = cleanMultiline(raw[key],label,{max:5000,required:false});
    const documentKind = cleanString(raw.documentKind,"صيغة المستند",{max:30,required:false});
    if (documentKind && !["auto","claim","appeal","memorandum"].includes(documentKind)) throw new RequestError("صيغة المستند غير صحيحة.");
    const caseStage = cleanString(raw.caseStage,"مرحلة القضية",{max:300,required:false});
    const matter = assessMatterFacts(facts + " " + requests + " " + allParties);
    if (!matter.ready) throw Object.assign(new RequestError("قبل إعداد المذكرة، يلزم توضيح الوقائع: " + matter.missing.map(g => g.ar).slice(0, 3).join(" "), 422), { stage: "fact_clarification", missingFacts: matter.missing.map(g => ({ key: g.key, question: g.ar })) });
    return { caseType, clientName, court, courtCircuit, caseNumber, otherParty, partyRole, allParties, facts, requests, legalIssues, conversationTranscript, conversationSummary, assistantResearch, extraFields, documentKind, caseStage };
}
