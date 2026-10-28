import { intakeMemoFieldNames } from "./memo-handoff";
import {assessMatterFacts} from "./matter-facts";
import { isLegalResearchRequirement } from "./legal-language";
// Bounded conversation memory. This is visitor-supplied context, never authority
// for access control or legal citations.
export type QuestionMemory = { asked: Array<{ key: string; text: string }>; resolved: string[]; unavailable: string[] };
const string = (value: unknown, max = 300) => typeof value === "string" ? value.replace(/\u0000/g, " ").trim().slice(0, max) : "";
const strings = (value: unknown, count = 16, max = 300) => Array.isArray(value) ? value.map(x => string(x, max)).filter(Boolean).slice(-count) : [];
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const questionKey = (value: unknown) => string(value, 80).toLowerCase().replace(/[^a-z0-9._-]/g, "");
export function normalizeQuestion(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[\u064b-\u065f\u0670]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function inferQuestionKey(value: string) {
  const text = normalizeQuestion(value);
  if (!text) return "";
  if (/عنوان.*(?:الموكل|الطرف الذي نمثله|الطرف الممثل)|address.*represented party/.test(text)) return "parties.client_address";
  if (/عنوان.*(?:الطرف الاخر|الخصم)|address.*other party/.test(text)) return "parties.other_address";
  if (/من.*(?:طلب تغيير الحكم|قدم.*(?:استيناف|طعن))|who.*(?:change the judgment|filed the appeal)/.test(text)) return "procedure.actor";
  if (/من.*(?:بدا المطالبه|رفع الدعوي اول)|who.*(?:first claimed|original claim)/.test(text)) return "client.role";
  if (/اخر ما حصل|official document|سرکاري کاغذ/.test(text)) return "procedure.stage";
  if (/رقم القضيه|case number/.test(text)) return "procedure.case_number";
  if (/اسم الدايره|what chamber/.test(text)) return "procedure.circuit";
  if (/اسم الشخص.*المذكره|name.*memorandum represents/.test(text)) return "parties.client_name";
  if (/اسم الشخص او الجهه|name.*making or facing/.test(text)) return "parties.other_name";

  if(/طبيعه.*(?:نشاط|جهه)|نشاط.*(?:شركه|جهه)|employer.*do|آجر.*کام/.test(text))return "employment.activity";
  if(/(?:ما العمل|المهام|طبيعه عملك|work or duties|ذمہ دارياں)/.test(text))return "employment.work";
  if(/من يدفع.*(?:راتب|اجر)|(?:جهه|صاحب (?:ال)?عمل|employer|آجر).*(?:عقد|contract|معاہد)|(?:عقد|contract).*(?:تدفع|pays|ادائيگي)/.test(text))return "employment.contract_party";
  if(/عقدك.*(?:النفطيه|الموقع)|contract.*oil employer/.test(text))return "employment.worksite_employer";
  if(/اجرك.*(?:بالشهر|باليوم|بالساعه)|wage.*(?:monthly|daily)|اجرت.*ماہانہ/.test(text))return "employment.pay_frequency";
  if(/اين.*العقار|where.*property|جائيداد.*کہاں/.test(text))return "property.location";
  if(/نوع العقار|type of property/.test(text))return "property.type";
  if(/حدث.*(?:العقار|العقد)|happened.*(?:property|contract)/.test(text))return "matter.transaction";
  if(/علاقتك.*(?:العقار|الطرف)|relationship.*(?:property|party)/.test(text))return "matter.relationship";
  if (/علاق(?:ه|ت)|صلتك|relationship/.test(text)) return "relationship";
  if (/محكمه.*اصدرت|اسم.*محكمه.*حكم|court.*issued/.test(text)) return "judgment.court";
  if (/توافق|consent|agree|منظور/.test(text)) return "consent.memo";
  if (/متي|تاريخ|when|date|کب/.test(text)) {
    if (/حكم|judgment/.test(text)) return "dates.judgment";
    if (/اعلان|اعلنت|اخطار|تبليغ|notice/.test(text)) return "dates.notice";
    if (/بدا|التحاق|start/.test(text)) return "dates.start";
    if (/انها|انته|فصل|terminat/.test(text)) return "dates.end";
    return "dates.event";
  }
  if (/اخطار|اشعار|رساله|وثيق|مستند|نسخه|ورق|document|notice|letter/.test(text) && /انها|نهايه|فصل|terminat/.test(text)) return "documents.termination_notice";
  if (/عقد|contract/.test(text)) {
    if (/نوع|محدد|مده|type|fixed/.test(text)) return "documents.contract.type";
    return "documents.contract";
  }
  if (/شكوي|شكوه|بلاغ|complaint/.test(text)) return "prior.complaint";
  if (/اخطار|مطالبه.*كتاب|طلب.*رسمي|طلب.*صاحب|demand|notice/.test(text)) return "prior.demand";
  if (/سبب|reason/.test(text) && /انها|فصل|termination|dismiss/.test(text)) return "employment.end.reason";
  if (/صفه|صفتك|role/.test(text)) return "client.role";
  if (/اسم|name/.test(text)) return /خصم|شركه|opponent|company/.test(text) ? "opponent.identity" : "client.identity";
  if (/قيمه|مبلغ|كم.*دينار|amount/.test(text)) return /مكافاه|نهايه الخدمه|benefit/.test(text) ? "amount.benefits" : "amount";
  if (/مقر|اقامه|اين|محافظه|where|location|address/.test(text)) return "location";
  if (/رفعت|مرفوعه|حكم سابق|قضيه سابقه|صدر.*حكم|حكم.*(?:من قبل|صادر)|لديك.*حكم|سبق.*(?:حكم|رفع)|existing case|filed|already.*judgment|پہلے.*فيصلہ/.test(text)) return "procedure.stage";
  if (/ماذا.*تطلب|ما.*طلبات|ما.*تطالب|relief/.test(text)) return "relief";
  // Stable fallback for a new detailed question. The normalized-text overlap
  // guard still handles punctuation and small paraphrases of this question.
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `question.${(hash >>> 0).toString(16)}`;
}

export function readQuestionMemory(value: unknown): QuestionMemory {
  const state = object(value), memory = object(state.questionMemory);
  const asked = (Array.isArray(memory.asked) ? memory.asked : []).slice(-64).map(item => {
    const row = object(item), text = string(row.text, 180), inferred = inferQuestionKey(text);
    return { key: inferred && !inferred.startsWith("question.") ? inferred : questionKey(row.key) || inferred, text };
  }).filter(x => x.key || x.text);
  for (const text of strings(state.nextQuestions, 3, 180)) {
    if (!asked.some(row => normalizeQuestion(row.text) === normalizeQuestion(text))) asked.push({ key: inferQuestionKey(text), text });
  }
  return { asked: asked.slice(-64), resolved: strings(memory.resolved, 64, 80).map(questionKey).filter(Boolean), unavailable: strings(memory.unavailable, 64, 80).map(questionKey).filter(Boolean) };
}

export function hasAsked(memory: QuestionMemory, key: string, text = "") {
  const normalizedKey = questionKey(key);
  if (normalizedKey && [...memory.resolved, ...memory.unavailable, ...memory.asked.map(row => row.key)].includes(normalizedKey)) return true;
  const normalized = normalizeQuestion(text);
  if (!normalized) return false;
  return memory.asked.some(row => {
    const old = normalizeQuestion(row.text);
    if (!old) return false;
    if (old === normalized) return true;
    const words = new Set(normalized.split(" ")), previous = new Set(old.split(" "));
    const overlap = [...words].filter(word => previous.has(word)).length;
    return Math.min(words.size, previous.size) >= 4 && overlap / Math.max(words.size, previous.size) >= .82;
  });
}

export function knownTopicsFromMessages(messages: Array<{ role: string; content: string }>) {
  const text = normalizeQuestion(messages.filter(item => item.role === "user").map(item => item.content).join(" "));
  const known: string[] = [];
  // A clear negative is an answer, not an unavailable fact. These guards only
  // prevent a repeat; they never determine jurisdiction or invent case facts.
  if (/لم اقدم (?:اي )?(?:شكوي|شكوى|شكوه|بلاغ)/.test(text)) known.push("prior.complaint");
  if (/لم ارفع (?:اي )?(?:قضيه|دعوي)|لا توجد (?:قضيه|دعوي)|لم يصدر (?:اي )?حكم|لا يوجد (?:اي )?حكم/.test(text)) known.push("procedure.stage");
  if (/صديقي|زوجي|زوجتي|والد(?:هما|هم|الطفل)|شركه.*اعمل|اعمل.*شركه/.test(text)) known.push("relationship");
  if (/لدي (?:نسخه من )?عقد|عندي (?:نسخه من )?عقد/.test(text)) known.push("documents.contract");
  if (/[0-9٠-٩]+(?:[.,][0-9٠-٩]+)?\s*(?:دينار|د ك|kd)(?:\s|$)/u.test(text)) known.push("amount");
  if (/انا (?:عامل|موظف|مدع|مستاجر|موجر)/.test(text)) known.push("client.role");
  return [...new Set([...known,...assessMatterFacts(text).known])];
}

export function validIntakeQuestion(value: string) {
  return value.length >= 8 && /[؟?]/.test(value) && !/^[a-z0-9._-]+$/i.test(value) && !isLegalChoiceQuestion(value) && !isLegalResearchRequirement(value);
}

export function isLegalChoiceQuestion(value: string) {
  const text = normalizeQuestion(value);
  // Names/dates printed on an existing judgment are facts, not legal choices.
  if (/المحكمه.*(?:اصدرت|مكتوب)|اسم.*محكمه.*(?:حكم|ورقه)|court.*(?:issued|written)|عدالت.*فيصلہ.*ديا/.test(text)) return false;
  if (/(?:مدع|مستانف|طاعن)[^؟?]{0,30}(?:ام|او)[^؟?]{0,30}(?:مدع|مستانف|طاعن)|(?:الكليه|كليه|الاستيناف|استيناف|الاستئناف|استئناف|الاداريه|اداريه)[^؟?]{0,20}(?:ام|او)[^؟?]{0,20}(?:الكليه|كليه|الاستيناف|استيناف|الاستئناف|استئناف|الاداريه|اداريه)/.test(text)) return true;
  if (/(?:هل انت|صفتك|حدد صفتك).*(?:مدع|مستانف|طاعن)|(?:are you|your role).*(?:plaintiff|defendant|appellant)|(?:مدعي|مدعي عليه).*(?:ام|او)/.test(text)) return true;
  return /نوع (?:القضيه|الدعوي|قضيتك|دعواك)|تصنيف.*(?:قضي|دعوي)|(?:هل|تعتبر|مدني).*(?:مدني|جزائي|تجاري).*(?:ام|او)|(?:اي|ما هي|ماهي|حدد|تختار|تريد|ترغب).*(?:محكمه|اختصاص)|(?:which|choose|select|what).*(?:court|legal category|type of case|type of lawsuit)|(?:civil|criminal).*(?:or|case type)|(?:کون سي عدالت|مقدمے کي قسم|ديواني يا فوجداري)/.test(text);
}

export type CaseOrientation = { categoryReason: string; track: "unknown" | "initial" | "pending" | "complaint" | "challenge" | "enforcement"; judgment: "unknown" | "none" | "first_instance" | "appeal" | "cassation"; judgmentQuote: string; nextAction: string };
export function cleanCaseOrientation(value: unknown): CaseOrientation {
  const raw = object(value);
  return { categoryReason: string(raw.categoryReason, 300), track: (["initial", "pending", "complaint", "challenge", "enforcement"].includes(String(raw.track)) ? raw.track : "unknown") as CaseOrientation["track"], judgment: (["none", "first_instance", "appeal", "cassation"].includes(String(raw.judgment)) ? raw.judgment : "unknown") as CaseOrientation["judgment"], judgmentQuote: string(raw.judgmentQuote, 300), nextAction: string(raw.nextAction, 350) };
}

// Extract explicit procedural facts, not a decision about jurisdiction.
export function proceduralFacts(message: string) {
  const normalized = normalizeQuestion(message);
  const negative = /(?:لم يصدر|لا يوجد|لا توجد) (?:اي )?حكم|no (?:court )?judgment/.test(normalized);
  const match = message.match(/(?:صدر\s+حكم|أصدرت\s+المحكمة\s+حكم|حكمت\s+المحكمة)[^\n.؟!]{0,240}/u);
  const quote = negative ? "" : match?.[0] || "";
  const q = normalizeQuestion(quote);
  const judgment = negative ? "none" : /استيناف|استئناف/.test(q) ? "appeal" : /تمييز/.test(q) ? "cassation" : /ابتداي|ابتدائي|اول درجه|اول درجة/.test(q) ? "first_instance" : "unknown";
  const challenge = !!quote && /(?:اريد|ابي|اطلب).{0,45}(?:طعن|اعتراض|تغيير|اعاده النظر)|اعترض/.test(normalized);
  const corrections = [...message.matchAll(/(?:^|[\n.؛])\s*(?:تصحيح|للتصحيح|الصحيح)\s*[:：]/g)];
  const current = corrections.length ? message.slice(corrections.at(-1)!.index! + corrections.at(-1)![0].length) : message;
  const clauses = current.split(/[\n،؛.!?]+/).map(normalizeQuestion);
  const filed = clauses.some(text => /(?:رفعت|اقمت|اقيمت|اقام|رفع)[^\n]{0,65}(?:دعوي|قضيه)|(?:الدعوي|القضيه)\s+(?:منظوره|مرفوعه)/.test(text) && !/(?:لم|لن|اذا|لو|اريد|انوي|سوف)\s+[^\n]{0,20}(?:رفع|رفعت|اقام|اقمت|تق[يم]|يق[يم])/.test(text));
  const noCase = /لم ارفع (?:اي )?(?:قضيه|دعوي)|لا توجد (?:اي )?(?:قضيه|دعوي)|لم نرفع (?:قضيه|دعوي)/.test(normalizeQuestion(current));
  return { judgment, judgmentQuote: quote, challenge, proceeding: filed ? "pending" : noCase ? "initial" : "unknown" };

}

export function updateQuestionMemory(memory: QuestionMemory, state: { questionKey: string; nextQuestions: string[]; resolvedTopics: string[]; unavailableTopics: string[] }): QuestionMemory {
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b.map(questionKey).filter(Boolean)])].slice(-64);
  return {
    asked: [...memory.asked, ...state.nextQuestions.slice(0, 1).map(text => ({ key: questionKey(state.questionKey), text: text.slice(0, 180) }))].slice(-64),
    resolved: union(memory.resolved, state.resolvedTopics || []), unavailable: union(memory.unavailable, state.unavailableTopics || []),
  };
}

export function cleanIntakeContext(value: unknown) {
  const raw = object(value);
  if (!Object.keys(raw).length) return null;
  return {
    phase: string(raw.phase, 20), caseType: string(raw.caseType), caseStage: string(raw.caseStage), court: string(raw.court), courtCircuit: string(raw.courtCircuit),
    jurisdictionReason: string(raw.jurisdictionReason, 600), jurisdictionMissing: strings(raw.jurisdictionMissing, 8),
    orientation: cleanCaseOrientation(raw.orientation),
    memoFields: Object.fromEntries(Object.entries(object(raw.memoFields)).slice(0, 20).filter(([key,value]) => intakeMemoFieldNames.includes(key as typeof intakeMemoFieldNames[number]) && typeof value === "string").map(([key,value]) => [key, string(value, 3000)])),
    parties: (Array.isArray(raw.parties) ? raw.parties : []).slice(0, 12).map(item => { const row = object(item); return { name: string(row.name, 140), role: string(row.role, 140) }; }),
    facts: strings(raw.facts, 30), requests: strings(raw.requests, 12), legalIssues: strings(raw.legalIssues, 12),
    importantDates: (Array.isArray(raw.importantDates) ? raw.importantDates : []).slice(0, 12).map(item => { const row = object(item); return { label: string(row.label, 140), date: string(row.date, 100) }; }),
    documentsNeeded: strings(raw.documentsNeeded, 12), missingInformation: strings(raw.missingInformation, 12), contradictions: strings(raw.contradictions, 12),
    nextQuestions: strings(raw.nextQuestions, 1), questionKey: questionKey(raw.questionKey), questionMemory: readQuestionMemory(raw),
  };
}

// Search vocabulary only. These are not rules assigning a court or legal outcome.
const topics: Array<[RegExp, string]> = [
  [/عمل|عامل|عمال|راتب|اجور|اجر|موظف|خدمه|فصل|salary|employ|worker|labou?r|ملازمت|مزدور/, "العمل العامل أجور إنهاء الخدمة"],
  [/ايجار|مستاجر|موجر|اخلاء|rent|lease|landlord|tenant|evict|کرایہ/, "إيجار مستأجر مؤجر إخلاء"],
  [/طلاق|نفقه|حضانه|زواج|اسره|ميراث|احوال|divorce|custody|marriage|family|خاندان/, "الأحوال الشخصية محكمة الأسرة نفقة حضانة"],
  [/جريم|جزاء|نصب|احتيال|سرقه|اعتداء|بلاغ|criminal|fraud|assault|فوجداری/, "الجزاء إجراءات جزائية جريمة"],
  [/وزاره|اداري|جهة حكوم|قرار اداري|government|administrative/, "إداري إلغاء قرار جهة إدارية اختصاص"],
  [/شرك|تجار|توريد|افلاس|company|commerc|contract|تجارتی/, "تجاري شركات عقد التزام"],
  [/دين|مدني|تعويض|قرض|مبلغ|debt|civil|compensation|دیوانی/, "مدني التزام تعويض مديونية"],
  [/استيناف|تمييز|حكم|طعن|appeal|cassation|اپیل/, "مرافعات اختصاص استئناف طعن حكم"],
];
export function intakeSearchQueries(message: string, currentState: unknown, userMessages: string[] = []) {
  const state = cleanIntakeContext(currentState);
  const context = [message, state?.caseType, ...(state?.legalIssues || []), ...(state?.requests || []), ...(state?.facts || []).slice(-8), ...userMessages.slice(-3)].filter(Boolean).join(" ");
  const normalized = normalizeQuestion(context);
  const isLabor = topics[0][0].test(normalized);
  const matched = topics.filter(([pattern], i) => pattern.test(normalized) && !(i === 5 && isLabor && !/شراك|توريد|افلاس|اسهم|تجاري/.test(normalized))).map(([, terms]) => terms).slice(0, 3);
  if (isLabor && /قطاع اهلي|قطاع خاص|شركه خاصه/.test(normalized)) matched.unshift("العمل القطاع الأهلي");
  const focused = matched.join(" ") || [state?.caseType, ...(state?.legalIssues || []), message].filter(Boolean).join(" ");
  const issueTerms: Array<[RegExp, string]> = [[/اقرض|قرض|سلفت|سلفني/, "قرض مديونية وفاء إثبات"], [/مكافاه|نهايه الخدمه/, "مكافأة نهاية الخدمة أجور"], [/راتب|رواتب|اجور/, "أجور راتب تأخير العمل"], [/ضرب|اعتدا|اصابه/, "ضرب جرح إيذاء اعتداء"], [/نفقه|مصاريف.*طفل|طفل.*مصاريف/, "نفقة أولاد صغار"], [/اخلاء|ايجار/, "إيجار إخلاء أجرة"], [/تعويض|اتلاف/, "تعويض ضرر مسؤولية"], [/فصل.*عمل|انها.*خدمه/, "فصل تعسفي إنهاء الخدمة"]];
  const specific = issueTerms.filter(([pattern]) => pattern.test(normalized)).map(([, terms]) => terms).slice(0, 2).join(" ");
  return [...new Set([[specific, state?.caseType, ...(state?.legalIssues || []).slice(0, 2)].filter(Boolean).join(" ") || focused, [specific, ...(state?.requests || []).slice(0, 2), message].filter(Boolean).join(" ").slice(0, 500), `اختصاص ${focused.slice(0, 350)}`])].filter(Boolean);
}
