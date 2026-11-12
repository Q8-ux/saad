import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { RequestError } from "./request-security";
import claimSource from "@/data/drafting-templates/claim-source.json";
import appealSource from "@/data/drafting-templates/appeal-source.json";
import type { TemplateDefinition, TemplateInfo } from "./pleading-document";
import { appealReferenceStyle, approvedAppealReference } from "./appeal-reference-style";
import { memorandumReferenceStyle, approvedMemorandumReference, type DraftingReferenceStyle } from "./memorandum-reference-style";

type ObjectBucket = { head(key: string): Promise<unknown>; put(key: string, bytes: Uint8Array, options: { httpMetadata: { contentType: string }; customMetadata: Record<string,string> }): Promise<unknown>; get(key: string): Promise<{ body: ReadableStream; customMetadata?: Record<string,string> } | null> };
function bucket() {
  const binding = (env as unknown as { DOCUMENTS?: ObjectBucket }).DOCUMENTS;
  if (!binding) throw new RequestError("مخزن القوالب المعتمدة غير متاح. احتفظ ببياناتك وحاول لاحقاً.",503);
  return binding;
}
const commonLabels = { ministry:"وزارة العدل", subject:"الموضوع والطلبات", applicant:"بناءً على طلب/", address:"وموطنه/", opponent:"المعلن إليه/", otherAddress:"موطنه/", grounds:"الأسانيد وأوجه الدفاع", therefore:"لذا", basedOn:"بناءً عليه" };
const commonClauses = {
  date:"إنه في يوم {{announcementDate}}، الساعة: ................",
  processServer:"أنا ................ مندوب الإعلان ب{{court}}",
  moved:"قد انتقلت وأعلنت صورة من هذه الصحيفة إلى:",
  addressedTo:"مخاطباً مع/ ................",
  whereas:"وحيث",
  relief:"يلتمس الطالب الحكم له:",
  summons:"أنا مندوب الإعلان سالف الذكر قد انتقلت وسلمت صورة من هذا الإعلان إلى المعلن إليه وكلفته بالحضور يوم {{hearingDate}} أمام {{court}}، الدائرة {{courtCircuit}}، الساعة {{hearingTime}}؛ ليسمع الحكم بالطلبات السابق بيانها.",
  reservation:"مع حفظ كافة حقوق الطالب الأخرى.",
  responsibility:"جميع البيانات المذكورة بصحيفة الدعوى وصحة عنوان المدعى عليه رُفعت بناءً على مسؤولية الطالب.\nب. م: ................",
};
const definitions: Record<"claim" | "appeal",TemplateDefinition> = {
  claim:{kind:"claim",title:"صحيفة الدعوى",paper:"Letter",border:false,emblemData:claimSource.emblemData,labels:commonLabels,clauses:commonClauses},
  appeal:{kind:"appeal",title:"صحيفة استئناف",paper:"A4",border:true,emblemData:appealSource.emblemData,
    labels:{...commonLabels,subject:"الموضوع",administration:"إدارة كتاب محكمة الاستئناف",processSection:"قسم ضباط الدعاوى",appealSubject:"استئناف الحكم الابتدائي",number:"رقم:",circuit:"الدائرة:",issuedOn:"الصادر بتاريخ:",appellantSignature:"توقيع المستأنف:",lawyerName:"اسم المحامي:",lawyerRegistration:"رقم الهوية ودرجة القيد:",lawyerSignature:"توقيع المحامي:",appellant:"بناءً على طلب المستأنف:",civilId:"بطاقة مدنية رقم:",address:"والمقيم في:",respondent:"المستأنف ضده:",otherAddress:"ويعلن في:",grounds:"أسباب الاستئناف",relief:"بطلب:",therefore:"لذلك"},
    clauses:{...commonClauses, moved:"قد انتقلت في تاريخه:",announced:"وأعلنته بالآتي",
      history:"تخلص وقائع الاستئناف الماثل في الدعوى الابتدائية رقم {{judgmentNumber}}، أمام الدائرة {{judgmentCircuit}} بـ{{judgmentCourt}}، المقامة من {{originalPlaintiff}} ضد {{originalDefendant}}، والصادر فيها الحكم بتاريخ {{judgmentDate}}.",
      originalRequests:"وطُلب الحكم فيها:",originalGrounds:"وذلك على سند القول:",judgmentIntro:"وبجلسة {{judgmentDate}} أصدرت محكمة أول درجة حكمها القاضي منطوقه:",judgment:"حكمت المحكمة:",
      appealIntro:"ولما كان المستأنف ينعى على هذا الحكم مخالفته لأحكام القانون وإجحافه بحقوقه، فإنه يطعن عليه بالاستئناف الماثل للأسباب الآتية:",
      reserveGrounds:"لهذه الأسباب والأسباب الأخرى التي سيبديها المستأنف في جلسات المرافعة بالمذكرات والمرافعة الشفوية والمستندات، فإنه يطعن على الحكم المستأنف بالاستئناف الماثل، ويلتمس من هيئة المحكمة الموقرة:",
      formalRelief:"أولاً: قبول الاستئناف شكلاً متى ثبت استيفاؤه شروطه ورفعه في الميعاد القانوني.\nثانياً: وفي الموضوع:",
      summons:"أكلف المستأنف ضده بالحضور أمام {{court}} في يوم {{hearingDate}}، الساعة {{hearingTime}}، الدائرة رقم {{courtCircuit}}.",hearRelief:"لسماع الحكم بقبول الاستئناف شكلاً، وفي الموضوع نلتمس من هيئة المحكمة الموقرة:"}},
};

type Row = {id:string; kind:"claim"|"appeal"; version:number; title:string; source_filename:string; source_sha256:string; source_object_key:string; page_count:number; definition_json:string; approved_at:string; status:string};
type StoredDefinition = TemplateDefinition & { referenceStyle?: DraftingReferenceStyle };
const referenceStyles = {
  appeal: { catalog: appealReferenceStyle, verify: approvedAppealReference, appliesTo: "appeal" },
  claim: { catalog: memorandumReferenceStyle, verify: approvedMemorandumReference, appliesTo: "memorandum" },
} as const;
const selectedColumns = "id,kind,version,title,source_filename,source_sha256,source_object_key,page_count,definition_json,approved_at,status";
function info(row:Row): TemplateInfo { return {id:row.id,kind:row.kind,version:row.version,title:row.title,sourceFilename:row.source_filename,sourceSha256:row.source_sha256,approvedAt:row.approved_at}; }
async function sha256(bytes:Uint8Array) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new Uint8Array(bytes).buffer))).map(b=>b.toString(16).padStart(2,"0")).join(""); }

function parseDefinition(kind: Row["kind"], json: string): StoredDefinition {
  const definition = JSON.parse(json) as StoredDefinition;
  if (definition?.kind !== kind || !definition.labels || !definition.clauses) {
    throw new Error("Invalid stored drafting template");
  }
  return definition;
}

async function readDefinition(row: Row): Promise<StoredDefinition> {
  const definition = parseDefinition(row.kind, row.definition_json);
  const reference = referenceStyles[row.kind];
  if (reference.verify(definition.referenceStyle)) return definition;

  // Merge only the server-owned style field, including on older template rows.
  const updated = await getD1().prepare(`
    UPDATE legal_drafting_templates
    SET definition_json = json_set(definition_json, '$.referenceStyle', json(?))
    WHERE id = ? AND kind = ? AND status = 'approved'
    RETURNING definition_json
  `).bind(JSON.stringify(reference.catalog), row.id, row.kind).first<Pick<Row, "definition_json">>();
  if (!updated) throw new RequestError("تعذّر تحديث مرجع الصياغة المعتمد. أعد المحاولة.", 503);
  return parseDefinition(row.kind, updated.definition_json);
}

// Only these visually reviewed, owner-authorized blank forms are seeded. No
// request-provided template bytes or schema changes are used during seeding.
export async function ensureApprovedTemplates() {
  const db=getD1();
  for (const source of [claimSource,appealSource]) {
    const existing=await db.prepare(`SELECT ${selectedColumns} FROM legal_drafting_templates WHERE id = ?`).bind(source.id).first<Row>();
    if (existing) continue;
    const bytes=Uint8Array.from(atob(source.pdfBase64),c=>c.charCodeAt(0));
    if (await sha256(bytes) !== source.sourceSha256) throw new Error("Template source checksum mismatch");
    const key=`approved-drafting-templates/${source.id}/${source.sourceSha256}.pdf`;
    await bucket().put(key,bytes,{httpMetadata:{contentType:"application/pdf"},customMetadata:{sha256:source.sourceSha256,templateId:source.id}});
    if (!await bucket().head(key)) throw new Error("Template original was not persisted");
    const kind = source.kind as Row["kind"];
    const stored = { ...definitions[kind], referenceStyle: referenceStyles[kind].catalog };
    await db.prepare(`INSERT INTO legal_drafting_templates (id,kind,version,title,source_filename,source_sha256,source_object_key,page_count,definition_json,status,approved_by,approved_at) VALUES (?,?,?,?,?,?,?,?,?,'approved','project_owner',?) ON CONFLICT(id) DO NOTHING`).bind(source.id,source.kind,source.version,source.title,source.sourceFilename,source.sourceSha256,key,source.pageCount,JSON.stringify(stored),source.approvedAt).run();
  }
}
export async function loadApprovedTemplate(kind:"claim"|"appeal") {
  await ensureApprovedTemplates();
  const row=await getD1().prepare(`SELECT ${selectedColumns} FROM legal_drafting_templates WHERE kind = ? AND status = 'approved' ORDER BY version DESC LIMIT 1`).bind(kind).first<Row>();
  if (!row) throw new RequestError("القالب المعتمد غير متاح حالياً؛ لم تُنشأ صحيفة بصيغة بديلة.",503);
  const { referenceStyle, ...definition } = await readDefinition(row);
  return { info: info(row), definition, referenceStyle: referenceStyles[kind].verify(referenceStyle) };
}
export async function listApprovedTemplates() {
  await ensureApprovedTemplates();
  const rows=await getD1().prepare(`SELECT ${selectedColumns} FROM legal_drafting_templates WHERE status = 'approved' ORDER BY kind,version DESC`).all<Row>();
  const active = new Map<Row["kind"], string>();
  for (const row of rows.results) {
    if (!active.has(row.kind)) active.set(row.kind, row.id);
  }
  return Promise.all(rows.results.map(async (row: Row) => {
    const result = { ...info(row), pageCount: row.page_count, originalStored: !!await bucket().head(row.source_object_key) };
    const reference = referenceStyles[row.kind];
    if (!reference || row.id !== active.get(row.kind)) return result;
    const style = reference.verify((await readDefinition(row)).referenceStyle);
    if (!style) return result;
    return {
      ...result,
      referenceStyle: {
        revision: style.revision,
        appliesTo: reference.appliesTo,
        reviewedFiles: style.reviewedFiles,
        reviewedPages: style.reviewedPages,
        families: Object.keys(style.families),
        ...("procedures" in style ? { procedures: Object.keys(style.procedures) } : {}),
      },
    };
  }));
}
export async function readApprovedTemplateOriginal(id:string) {
  const row=await getD1().prepare(`SELECT ${selectedColumns} FROM legal_drafting_templates WHERE id = ?`).bind(id).first<Row>();
  if (!row) throw new RequestError("القالب غير موجود.",404);
  const original=await bucket().get(row.source_object_key);
  if (!original) throw new RequestError("أصل القالب غير متاح.",503);
  return {body:original.body,filename:row.source_filename,sha256:row.source_sha256};
}
