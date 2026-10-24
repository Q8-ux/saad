// Pure document model shared by the preview and exports. Template definitions
// are loaded by the server from D1, not accepted from the visitor or the model.
export type PleadingKind = "claim" | "appeal" | "memorandum";
export type TemplateDefinition = {
  kind: "claim" | "appeal";
  title: string;
  paper: "A4" | "Letter";
  border: boolean;
  emblemData: string;
  labels: Record<string, string>;
  clauses: Record<string, string>;
};
export type TemplateInfo = { id: string; version: number; kind: string; title: string; sourceFilename: string; sourceSha256: string; approvedAt: string };
export type PleadingBlock = { text: string; style?: "title" | "heading" | "note" | "center" };
export type PleadingPage = { blocks: PleadingBlock[]; sidebar?: PleadingBlock[]; after?: PleadingBlock[]; emblem?: string; title?: string; court?: string; ministry?: string };
export type PleadingDocument = { title: string; kind: PleadingKind; template: TemplateInfo; paper: "A4" | "Letter"; border: boolean; pages: PleadingPage[]; reviewNotes: string[]; approval: string };
export type PleadingInput = Record<string, string>;
// Physical dimensions shared by preview, print and Word. The sidebar belongs
// to the first page only; case text continues in the plain full-width section.
export const pleadingLayout = {
  sidebarPercent: 17,
  firstMarginsTwips: { top: 567, right: 480, bottom: 567, left: 340 },
  firstMarginsCss: "10mm 8.5mm 10mm 6mm",
} as const;
const governmentCaptions = new Set(["دولة الكويت", "وزارة العدل", "إدارة كتاب محكمة الاستئناف", "قسم ضباط الدعاوى"]);
// Source markers stay in checked drafting content, never in the court copy.
export function stripPleadingResearchAnnotations(text:string):string {
  return text
    .replace(/[【\[]\s*م[\d٠-٩۰-۹]+\s*[】\]]/gu, "")
    .replace(/؛\s*صفح(?:ة|ات)\s+PDF\s+[\d٠-٩۰-۹]+(?:\s*[–-]\s*[\d٠-٩۰-۹]+)?(?=\))/giu, "")
    .split("\n")
    .filter(line=>!/^\s*(?:المرجع|المصدر|المراجع(?: القانونية)?)\s*[:：]\s*(?:منشورات\s+)?(?:وزارة\s+العدل|بوابة\s+وزارة|موقع\s+وزارة|https?:\/\/)/u.test(line))
    .join("\n");
}
export function presentationPleadingPages(pages: PleadingPage[]): PleadingPage[] {
  const clean=(blocks:PleadingBlock[])=>blocks.map(b=>({...b,text:stripPleadingResearchAnnotations(b.text)})).filter(b=>b.text.trim());
  return wideContinuationPages(pages.map(({emblem: _emblem, ministry: _ministry, court: _court, sidebar, ...page}, i) => {
    const cleanSidebar = i === 0 ? sidebar?.filter(b => !governmentCaptions.has(b.text.replace(/\s+/g, " ").trim())) : undefined;
    return {...page,blocks:clean(page.blocks),...(page.after?{after:clean(page.after)}:{}), ...(cleanSidebar?.length ? {sidebar: clean(cleanSidebar)} : {})};
  }));
}
// Word applies margins per section, not per physical first page. Bound the
// first section's text so a long claim continues in the full-width section.
// Preserve paragraph order and every character; never shorten case facts.
export function wideContinuationPages(pages: PleadingPage[]): PleadingPage[] {
  if (!pages.length) return pages;
  const first=pages[0], width=first.sidebar?44:62, budget=27;
  const cost=(b:PleadingBlock)=>Math.ceil(b.text.length/width)+1+(b.style === "heading"?1:0);
  const blocks=[...first.blocks,...(first.after||[])];
  if (blocks.reduce((n,b)=>n+cost(b),0)<=budget) return pages;
  const head:PleadingBlock[]=[],tail:PleadingBlock[]=[];let remaining=budget;
  for (const block of blocks) {
    if (tail.length) {tail.push(block);continue;}
    const lines=cost(block);
    if (lines<=remaining) {head.push(block);remaining-=lines;continue;}
    const target=Math.max(0,(remaining-2)*width);
    const at=target>0?block.text.lastIndexOf(" ",target):-1;
    if (at>0 && block.style!=="heading") {
      head.push({...block,text:block.text.slice(0,at)});
      tail.push({...block,text:block.text.slice(at)});
    } else tail.push(block);
    remaining=0;
  }
  return [{...first,blocks:head,after:[]},{blocks:tail},...pages.slice(1)];
}
export const pleadingFields = {
  civilId: "الرقم المدني", clientAddress: "موطن الطالب", otherAddress: "موطن الخصم",
  judgmentNumber: "رقم الحكم المستأنف", judgmentDate: "تاريخ الحكم", judgmentCircuit: "دائرة الحكم",
  judgmentCourt: "المحكمة التي أصدرت الحكم", judgmentOperative: "منطوق الحكم", originalRequests: "الطلبات أمام أول درجة",
  originalGrounds: "سند الدعوى أمام أول درجة", originalPlaintiff: "المدعي أمام أول درجة", originalDefendant: "المدعى عليه أمام أول درجة",
  notificationDate: "تاريخ الإعلان بالحكم", appealGrounds: "أسباب الاعتراض على الحكم",
  announcementDate: "تاريخ الإعلان بالصحيفة", hearingDate: "تاريخ الجلسة", hearingTime: "وقت الجلسة",
} as const;
export type PleadingContent = { facts: string; grounds: string; requests: string; legalResearchNotes: string; factualNotes: string[]; fields: Record<string, string> };
const normalize = (v: string) => v.normalize("NFKC").replace(/[إأآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[\u064b-\u065f\u0670]/g,"");
export function selectPleadingKind(input: PleadingInput): PleadingKind {
  const role = normalize(input.partyRole || "");
  const court = normalize(input.court || "");
  // A respondent needs a defence, never a new appeal on the appellant's behalf.
  if (/مستانف ضد|مدعي عليه|متهم|تمييز|نياب|جنح|جنايات/.test(`${role} ${court}`)) return "memorandum";
  if (["claim","appeal","memorandum"].includes(input.documentKind)) return input.documentKind as PleadingKind;
  if (/مستانف/.test(role) || (/استئناف|استيناف/.test(court) && /الغاء|تعديل الحكم|استئناف|استيناف/.test(normalize(input.requests || "")))) return "appeal";
  if (/مذكره|دفاع|جلسه/.test(normalize(`${input.caseStage || ""} ${input.requests || ""}`)) && !/صحيفه دعوي/.test(normalize(input.requests || ""))) return "memorandum";
  return "claim";
}
export const pleadingContentSchema = {
  type: "object", additionalProperties: false,
  required: ["facts","grounds","requests","legalResearchNotes","factualNotes","fields"],
  properties: {
    facts: { type: "string" }, grounds: { type: "string" }, requests: { type: "string" }, legalResearchNotes: { type: "string" },
    factualNotes: { type: "array", items: { type: "string" } },
    fields: { type: "object", additionalProperties: false, required: Object.keys(pleadingFields), properties: Object.fromEntries(Object.entries(pleadingFields).map(([key,label]) => [key,{ type: "string", description: `${label}: من نص الوقائع المعتمدة فقط؛ فارغ إن لم يذكر، لا تخمن.` }])) },
  },
};
export function parsePleadingContent(text: string): PleadingContent {
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || !["facts","grounds","requests","legalResearchNotes"].every(key => typeof value[key] === "string") || !Array.isArray(value.factualNotes) || !value.fields || typeof value.fields !== "object") throw new Error("Invalid pleading content");
  return { facts: value.facts, grounds: value.grounds, requests: value.requests, legalResearchNotes: value.legalResearchNotes,
    factualNotes: value.factualNotes.filter((v: unknown) => typeof v === "string"),
    fields: Object.fromEntries(Object.keys(pleadingFields).map(key => [key,typeof value.fields[key] === "string" ? value.fields[key].trim() : ""])) };
}
export function buildPleadingDocument(template: TemplateInfo, definition: TemplateDefinition, kind: PleadingKind, input: PleadingInput, content: PleadingContent): PleadingDocument {
  const d = definition, L = d.labels, C = d.clauses;
  const value = (key: string) => input[key]?.trim() || content.fields[key]?.trim() || "................";
  const fill = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_,key) => value(key));
  const p = (text: string, style?: PleadingBlock["style"]): PleadingBlock => ({text, ...(style ? {style} : {})});
  const h = (text: string) => p(text,"heading");
  const court = input.courtCircuit ? `${input.court} — ${input.courtCircuit}` : input.court;
  const role = `${input.clientName} — ${input.partyRole}`;
  const parties = [p(`${kind === "appeal" ? L.appellant : L.applicant} ${role}`), ...(kind === "appeal" ? [p(`${L.civilId} ${value("civilId")}`)] : []), p(`${L.address} ${value("clientAddress")}`)];
  const opponent = [p(`${kind === "appeal" ? L.respondent : L.opponent} ${input.otherParty}`), p(`${L.otherAddress} ${value("otherAddress")}`), p(C.addressedTo)];
  const facts = content.facts || input.facts;
  const requests = content.requests || input.requests;
  const grounds = content.grounds.trim();
  const pages: PleadingPage[] = [];
  const approval = "هذه المذكرة مسودة غير معتمدة، ولا تُعد معتمدة أو صالحة للتقديم إلى المحكمة إلا بعد مراجعتها ومصادقة مجموعة سابق القانونية عليها.";
  if (kind === "appeal") {
    pages.push({title:d.title,
      sidebar:[h(L.subject),p(L.appealSubject),p(`${L.number} ${value("judgmentNumber")}`),p(`${L.circuit} ${value("judgmentCircuit")}`),p(`${L.issuedOn} ${value("judgmentDate")}`),p(`${L.appellantSignature}\n................`),p(`${L.lawyerName}\n................`),p(`${L.lawyerRegistration}\n................`),p(`${L.lawyerSignature}\n................`)],
      blocks:[p(fill(C.date)),...parties,p(fill(C.processServer)),p(C.moved),...opponent,p(C.announced,"center")]});
    // Original litigant roles are separately filled; an appellant was not
    // necessarily the original claimant, despite the blank form's wording.
    pages.push({blocks:[p(fill(C.history)),h(C.originalRequests),p(value("originalRequests")),h(C.originalGrounds),p(value("originalGrounds")),p(facts),h(fill(C.judgmentIntro)),h(C.judgment),p(value("judgmentOperative"))]});
    pages.push({blocks:[p(C.appealIntro),h(L.grounds),p(grounds || input.appealGrounds || "تستكمل أسباب الاستئناف بعد مراجعة الحكم والوقائع والمصادر الموثقة."),p(C.reserveGrounds),h(L.relief),p(C.formalRelief),p(requests)]});
    pages.push({blocks:[h(L.therefore),p(fill(C.summons)),p(C.hearRelief),p(C.formalRelief),p(requests)]});
  } else if (kind === "claim") {
    pages.push({title:d.title,
      sidebar:[h(L.subject),p(input.caseType),...(input.caseNumber ? [p(`رقم الدعوى: ${input.caseNumber}`)] : []),p(C.responsibility,"note")],
      blocks:[p(fill(C.date)),...parties,p(fill(C.processServer)),p(C.moved),...opponent,h(L.subject),p(C.whereas),p(facts),...(grounds ? [h(L.grounds),p(grounds)] : []),h(L.therefore),p(C.relief),p(requests)],after:[h(L.basedOn),p(fill(C.summons)),p(C.reservation)]});
  } else {
    pages.push({title:"مذكرة بدفاع",
      blocks:[p(`مقدمة من: ${role}`),p(`ضد: ${input.otherParty}`),p(`في الدعوى المنظورة أمام ${court}`),...(input.caseNumber ? [p(`رقم القضية: ${input.caseNumber}`)] : []),...(input.allParties ? [p(input.allParties)] : []),h("الوقائع"),p(facts),h("الدفوع وأوجه الدفاع"),p(grounds || "يتمسك مقدم المذكرة بكافة أوجه الدفاع والدفوع المقررة قانوناً، وبما يقدم من مستندات ومذكرات شارحة."),h(L.therefore),p(C.relief),p(requests)]});
  }
  if (input.allParties && kind !== "memorandum") pages[0].blocks.push(h("بقية الأطراف والصفات"),p(input.allParties));
  const factual = [...content.factualNotes];
  if (kind === "appeal") for (const key of ["judgmentNumber","judgmentDate","judgmentOperative"] as const) if (value(key) === "................") factual.push(`لم تُذكر ${pleadingFields[key]}؛ تُراجع بيانات الحكم قبل إتمام الصحيفة.`);
  if (kind !== "memorandum" && (value("clientAddress") === "................" || value("otherAddress") === "................")) factual.push("تُستكمل عناوين الأطراف اللازمة للإعلان من بيانات القضية.");
  const notes = Array.from(new Set([...factual,...(content.legalResearchNotes ? [content.legalResearchNotes] : [])]));
  return {title:kind === "memorandum" ? "مذكرة بدفاع" : d.title,kind,template,paper:d.paper,border:d.border,pages:presentationPleadingPages(pages),reviewNotes:notes,approval};
}
export function pleadingText(doc: PleadingDocument) {
  return presentationPleadingPages(doc.pages).map(page => [page.title,...(page.sidebar || []).map(b=>b.text),...page.blocks.map(b=>b.text),...(page.after || []).map(b=>b.text)].filter(Boolean).join("\n\n")).join("\n\n");
}
export function escapeDocument(value: string) { return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,""); }
export function renderPleadingHtml(doc: PleadingDocument) {
  const e = escapeDocument;
  const blocks = (items: PleadingBlock[]) => items.map(b=>`<${b.style === "heading" ? "h2" : "p"} dir="rtl" lang="ar" class="${b.style || "body"}">${e(b.text).replace(/\n/g,"<br>")}</${b.style === "heading" ? "h2" : "p"}>`).join("");
  const pages = presentationPleadingPages(doc.pages).map((page,i)=>`<section dir="rtl" lang="ar" class="page ${i === 0 ? "first-page" : "continuation-page"}${i === 0 && doc.border ? " framed" : ""}">${page.title ? `<header><h1>${e(page.title)}</h1></header>` : ""}${page.sidebar ? `<table class="layout"><colgroup><col style="width:${100-pleadingLayout.sidebarPercent}%"><col style="width:${pleadingLayout.sidebarPercent}%"></colgroup><tbody><tr><td class="main">${blocks(page.blocks)}</td><td class="sidebar">${blocks(page.sidebar)}</td></tr></tbody></table>` : blocks(page.blocks)}${blocks(page.after || [])}<footer>${i+1}</footer></section>`).join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(doc.title)}</title><style>
@font-face{font-family:Mohanad;src:url('https://q8-ux.github.io/saad/sabeq-legal/assets/al-mohanad.ttf')}@font-face{font-family:Mohanad;src:url('https://q8-ux.github.io/saad/sabeq-legal/assets/al-mohanad-bold.ttf');font-weight:700}
*{box-sizing:border-box}html{background:#e9edef;color:#111;direction:rtl;text-align:right}body{direction:rtl;text-align:right;margin:0;font-family:Mohanad,Arial,sans-serif;font-size:18px;line-height:1.8}.page{background:white;width:min(100%,${doc.paper === "Letter" ? "216mm" : "210mm"});min-height:${doc.paper === "Letter" ? "279mm" : "297mm"};padding:${pleadingLayout.firstMarginsCss};margin:12px auto;overflow-wrap:anywhere}.continuation-page{padding:0}.framed{border:4px double #111}header{margin-bottom:12px;font-weight:bold}header>div:last-child{text-align:right}.framed h1{background:#e5e5e5;border:1px solid #111;border-radius:12px;padding:12px}.framed .sidebar p{margin-bottom:12px}h1{font-size:30px;text-decoration:underline;margin:8px 0 20px}h2{font-size:23px;text-align:right;text-decoration:underline;margin:22px 0 12px;break-after:avoid}p{margin:0 0 15px;white-space:normal;orphans:3;widows:3}.center{text-align:right}.note{font-size:15px}.layout{width:100%;border-collapse:collapse;table-layout:fixed;direction:rtl}.layout td{vertical-align:top}.main{padding-left:18px}.sidebar{border-right:1px solid #111;padding-right:12px;font-size:16px}.sidebar h2{font-size:19px}.sidebar p{margin-bottom:24px}.framed .sidebar{border:1px solid #222;border-radius:18px;padding:12px}footer{text-align:center;font-size:13px;margin-top:22px}
@media(max-width:600px){body{font-size:17px}.page{padding:20px 12px;min-height:0}.main{padding-left:10px}.sidebar{font-size:14px;padding-right:8px}.sidebar h2{font-size:17px}header{gap:8px}h1{font-size:26px}h2{font-size:21px}}
@page{size:${doc.paper};margin:0}@page:first{margin:${pleadingLayout.firstMarginsCss}}.continuation-page{padding:0}@media print{html,body{background:white;font-size:14pt}.page{width:auto;min-height:0;margin:0;padding:0;break-after:page}.page:last-of-type{break-after:auto}.continuation-page{padding:0}.layout{display:block}.layout tbody,.layout tr{display:block}.layout tr{display:flex;flex-direction:row;align-items:flex-start}.layout .main{width:${100-pleadingLayout.sidebarPercent}%}.layout .sidebar{width:${pleadingLayout.sidebarPercent}%}h1{font-size:24pt}h2{font-size:18pt}p{break-inside:auto}footer{display:none}}</style></head><body dir="rtl" lang="ar">${pages}</body></html>`;
}

// Legacy text results still need a format that can retain Arabic direction.
export function renderArabicMemoHtml(text: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مذكرة قانونية</title><style>@font-face{font-family:Mohanad;src:url('https://q8-ux.github.io/saad/sabeq-legal/assets/al-mohanad.ttf')}html,body{direction:rtl;text-align:right}body{font-family:Mohanad,Arial,sans-serif;font-size:18px;line-height:1.9;padding:24px;white-space:pre-wrap;overflow-wrap:anywhere}@page{size:A4;margin:18mm}.continuation-page{padding:0}@media print{body{padding:0;font-size:14pt}}</style></head><body lang="ar" dir="rtl">${escapeDocument(stripPleadingResearchAnnotations(text))}</body></html>`;
}
