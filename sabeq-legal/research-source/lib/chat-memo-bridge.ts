import { reviewMetaMemo, MetaMemoReviewError } from "./meta-memo-review";
import { resolveTextEnvironment } from "./text-runtime";
import type { TextProviderEnvironment } from "./text-providers";
import { memoEditState, saveMemoRevision } from "./management-memo-revisions";
import { memoDraftingStyleInstructions } from "./legal-language";
import { reviewMemoSubstance } from "./memo-substance-quality";
import { memoProjectFile } from "./memo-project";
import { emptyMemoRepairState, repairEmptyMemo, staleMemoRecoveryState, recoverStaleMemo, memoSnapshotHash } from "./memo-request-repair";
import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { validateMemoInput } from "./memo-input";
import { readHandoffEvidence, searchLegalEvidenceAcross, searchCassationEvidenceAcross, type LegalEvidence } from "./legal-search";
import { draftStatutoryText } from "./statutory-text";
import { scopeEvidenceToFacts, prepareBoundDraft } from "./bound-draft";
import { reviewLegalCitations } from "./legal-citation-review";
import { legalSourceCoverage } from "./legal-source-coverage";
import { loadApprovedTemplate } from "./approved-templates";
import { buildPleadingDocument, pleadingText, type PleadingContent } from "./pleading-document";
import { reviewLegalRouteContent } from "./legal-drafting-routes";
import { selectDraftingReference } from "./memorandum-reference-style";
import { cleanString, cleanMultiline, RequestError } from "./request-security";
import { splitMemoResearchInstruction } from "./memo-research-instructions";

export const chatMemoBridgeRevision = "owner-chat-memo-3";
export function requireChatOwner(request: Request, runtime = env as unknown as { SABEQ_CHAT_OWNER_EMAIL?: string }) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const userId = request.headers.get("oai-authenticated-user-id")?.trim();
  const owner = runtime.SABEQ_CHAT_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || !email || email !== owner || !userId) throw new RequestError("هذا الربط خاص بمالك سابق المسجل في ChatGPT.", 403);
  return { userId, email };
}
const textSchema = { type: "string" };
export const chatMemoTools = [
  { name: "sabeq_recover_stale_memo", description: "Owner-authorized recovery of an empty running memo abandoned for at least 24 hours. Read recovery.expectedHash first. Does not generate, overwrite saved text, charge payment or send mail; preserves the original in history.", inputSchema: { type: "object", additionalProperties: false, required: ["requestId", "expectedHash", "reason"], properties: { requestId: textSchema, expectedHash: textSchema, reason: textSchema } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  { name: "sabeq_review_meta_draft", description: "Send an exact existing memo plus its original case inputs and rechecked bound sources to the configured Meta reviewer with the owner's existing model-cost approval, at the owner's request. Read snapshotHash first. Stores a private review candidate with provenance; never replaces the court text or approves filing. No unapproved paid model, model fallback or settings changes. Reports provider/source/concurrency failure without claiming review success.", inputSchema: { type: "object", additionalProperties: false, required: ["requestId", "expectedHash"], properties: { requestId: textSchema, expectedHash: textSchema } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
  { name: "sabeq_search_legal_sources", description: "Search Sabeq's bound uploaded Kuwaiti legal library and reviewed judgments. Returns exact passages and verification limits, not legal conclusions. Use these sources when drafting in the conversation; do not invent authorities.", inputSchema: { type: "object", additionalProperties: false, required: ["query"], properties: { query: textSchema, caseFacts: textSchema } }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "sabeq_read_memo_request", description: "Read one existing Sabeq memo request by its exact ID, including its original case inputs, saved draft and review status. Owner only.", inputSchema: { type: "object", additionalProperties: false, required: ["requestId"], properties: { requestId: textSchema, historyOffset: { type: "integer", minimum: 0 } } }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "sabeq_remove_memo_email", description: "Remove only the contact email from one exact chat-assisted Sabeq draft at the owner's explicit request. Preserves the memorandum, case inputs, journal, accounts and recovery settings. Owner only; cannot modify website client requests.", inputSchema: { type: "object", additionalProperties: false, required: ["requestId"], properties: { requestId: textSchema } }, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false } },
  { name: "sabeq_save_chat_draft", description: "Save a private Sabeq conversation draft for office review. Omit requestId for a NEW draft; supply an exact existing chat requestId to preserve its facts and save a guarded revision with full history. Original facts and requested relief are preserved by the server. Source IDs must come from Sabeq search and markers م1, م2 follow that array order. The server re-reads sources and blocks unverified citations. Does not approve a filing, destroy saved history, charge payment or send email. Requires the user's instruction to save. To repair an existing empty failed website request in place, provide caseData.repairExistingRequestId, repairExpectedHash from the read tool and repairReason. Identity and requested relief stay fixed; original inputs are retained privately.", inputSchema: { type: "object", additionalProperties: false, required: ["caseData", "grounds", "sourceIds"], properties: { requestId: { ...textSchema, description: "Optional exact existing chat-assisted request ID. The server rejects changed case inputs or source order and preserves the previous text." }, caseData: { type: "object", additionalProperties: { type: "string" }, description: "Approved case fields: caseType, clientName, otherParty, court, partyRole, facts, requests, documentKind and optional case details. Never infer missing identities. existingRequestId may carry the exact saved chat request ID for clients using this case-field map; it cannot change case facts. For explicitly authorized empty-request repair only, repairExistingRequestId selects the existing request, repairExpectedHash must come from its latest read, and repairReason records the reviewed correction. Never guess ambiguous facts." }, grounds: { ...textSchema, description: memoDraftingStyleInstructions }, sourceIds: { type: "array", maxItems: 12, items: { type: "integer", minimum: 1 } } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
] as const;

async function selectedEvidence(value: unknown) {
  if (!Array.isArray(value) || value.length > 12 || value.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(value).size !== value.length) throw new RequestError("معرفات المصادر غير صحيحة.");
  const found = await Promise.all(value.map(async id => {
    const candidates = await readHandoffEvidence([id]);
    const source = candidates.find(s => s.chunkId === id);
    if (!source || source.corpus?.draftingEligible === false || !source.judgment && !draftStatutoryText(source)) throw new RequestError("أحد المصادر غير متاح للاستناد؛ أعد البحث من مكتبة سابق.", 422);
    return source;
  }));
  return found;
}
function sourceCard(source: LegalEvidence, index: number) {
  return { marker: `م${index + 1}`, sourceId: source.chunkId, title: source.title, reference: source.reference || "", text: source.text, sourceUrl: source.sourceUrl || null, verification: source.verification || null, corpus: source.corpus || null, judgment: source.judgment || null, statutory: draftStatutoryText(source) };
}
export async function chatMemoTool(name: string, args: Record<string, unknown>, actor: { userId: string; email: string }) {
  if (name === "sabeq_recover_stale_memo") return recoverStaleMemo({ id: args.requestId, expectedHash: args.expectedHash, reason: args.reason }, actor.userId);
  if (name === "sabeq_review_meta_draft") {
    const id = cleanString(args.requestId, "رقم الطلب", { min: 8, max: 100 });
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new RequestError("رقم الطلب غير صحيح.");
    const db = getD1(), row = await db.prepare("SELECT id,input_json,output_text,status,error_code,updated_at FROM management_memo_requests WHERE id=?").bind(id).first<{id:string;input_json:string;output_text:string;status:string;error_code:string;updated_at:string}>();
    if (!row || !row.output_text.trim() || row.status === "running" || args.expectedHash !== await memoSnapshotHash(row)) throw new RequestError("اقرأ أحدث مسودة محفوظة قبل مراجعتها.",409);
    const original = JSON.parse(row.input_json), checked = validateMemoInput(original);
    const sourceIds = original.ownerRepair?.sourceIds || original.chatSourceIds;
    if (!Array.isArray(sourceIds) || !sourceIds.length) throw new RequestError("لا توجد مصادر مرتبطة قابلة لإعادة التحقق لهذه المسودة.",422);
    const evidence = await selectedEvidence(sourceIds);
    const runtime = await resolveTextEnvironment(env as unknown as TextProviderEnvironment);
    const model = runtime.META_MODEL || runtime.OPENROUTER_MODEL || runtime.OPENROUTER_FREE_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
    if (!model.endsWith(":free") && runtime.OPENROUTER_ALLOW_PAID_META !== "approved") throw new RequestError("المراجع المضبوط نموذج مدفوع بلا موافقة محفوظة على تكلفته؛ لم يستدع ولم تتغير الإعدادات.",409);
    let result;
    try { result = await reviewMetaMemo({ primaryProvider:"openai", primaryInput:JSON.stringify({mode:"saved_chat_draft_review",caseInput:original,savedMemo:row.output_text}), originalInput:original, openaiDraft:{facts:checked.facts,grounds:row.output_text,requests:checked.requests,fields:checked.extraFields,factualNotes:[],legalResearchNotes:""},casePlan:{mode:"owner_review_candidate"},sources:JSON.stringify(evidence.map(sourceCard)) }, undefined, {runtime:{...runtime,META_MODEL:model},resolve:async value=>value}); }
    catch(error) { throw new RequestError(error instanceof MetaMemoReviewError ? "لم تكتمل مراجعة ميتا: " + error.code : "لم تكتمل مراجعة ميتا؛ لم يسجل نجاح.",502); }
    if (result.content.facts !== checked.facts || result.content.requests !== checked.requests) throw new RequestError("أعاد ميتا تغييراً في الوقائع أو الطلبات؛ لم يعتمد مرشح المراجعة.",422);
    const candidate = prepareBoundDraft(result.content, original, evidence);
    if (!reviewLegalCitations(candidate.grounds, evidence,{courtDocument:true,requireArticleText:true,requireJudgmentAnalogy:true}).ok) throw new RequestError("لم تجتز أسانيد مرشح ميتا التحقق؛ لم يحفظ كناتج مراجع.",422);
    const review = { model:result.model, reviewedAt:new Date().toISOString(), sourceIds, draftHash:await memoSnapshotHash(row), content:candidate, status:"candidate_requires_human_review", actorId:actor.userId };
    const input = JSON.stringify({...original,ownerMetaReview:review});
    const writes = await db.batch([
      db.prepare("UPDATE management_memo_requests SET input_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND input_json=? AND output_text=? AND status=? AND error_code=? AND updated_at=?").bind(input,id,row.input_json,row.output_text,row.status,row.error_code,row.updated_at),
      db.prepare("SELECT id FROM management_memo_requests WHERE id=? AND input_json=? AND output_text=?").bind(id,input,row.output_text),
    ]);
    if(writes[1].results?.length!==1)throw new RequestError("تغيرت المسودة أثناء مراجعة ميتا؛ لم تلحق المراجعة بنسخة مختلفة.",409);
    return {requestId:id,metaReview:review,canonicalMemoUnchanged:true,humanReviewRequired:true};
  }
  if (name === "sabeq_search_legal_sources") {
    const query = cleanString(args.query, "موضوع البحث", { min: 2, max: 800 });
    const facts = cleanMultiline(args.caseFacts, "وقائع البحث", { max: 16000, required: false });
    const [laws, judgments] = await Promise.all([searchLegalEvidenceAcross([query], 6), searchCassationEvidenceAcross([query], 3)]);
    const unique = [...new Map([...laws, ...judgments].filter(s => Number.isSafeInteger(s.chunkId)).map(s => [s.chunkId, s])).values()];
    const sources = facts ? scopeEvidenceToFacts(unique, facts) : unique;
    return { revision: chatMemoBridgeRevision, sources: sources.map(sourceCard), coverage: legalSourceCoverage(sources), notice: "المصادر من المكتبة المرفوعة فقط. صلة النص بالقضية تحتاج مراجعة، ولا تثبت مطابقة المصدر سريانه أو اكتمال كل تعديلاته. لا تنسب حكماً إلى التمييز دون بياناته الموثقة وفحص انطباقه." };
  }
  if (name === "sabeq_read_memo_request") {
    const id = cleanString(args.requestId, "رقم الطلب", { min: 8, max: 100 });
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new RequestError("رقم الطلب غير صحيح.");
    const row = await getD1().prepare("SELECT id, input_json, output_text, status, error_code, updated_at, email FROM management_memo_requests WHERE id = ?").bind(id).first<{ id: string; input_json: string; output_text: string; status: string; error_code: string; updated_at: string; email: string }>();
    if (!row) throw new RequestError("طلب المذكرة غير موجود.", 404);
    return { bridgeRevision: chatMemoBridgeRevision, requestId: row.id, contactEmailPresent: Boolean(row.email?.trim()), caseData: JSON.parse(row.input_json), draft: row.output_text, status: row.status, reviewCode: row.error_code, updatedAt: row.updated_at, snapshotHash: await memoSnapshotHash(row), recovery: await staleMemoRecoveryState(row), repair: await emptyMemoRepairState(row), projectFile: await memoProjectFile(id, args.historyOffset === undefined ? 0 : args.historyOffset as number), notice: "لا تدمج هذه القضية بوقائع طلب آخر. أي نص محفوظ مسودة تحتاج مراجعة المختص." };
  }
  if (name === "sabeq_remove_memo_email") {
    const id = cleanString(args.requestId, "رقم الطلب", { min: 8, max: 100 });
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new RequestError("رقم الطلب غير صحيح.");
    const db = getD1();
    const row = await db.prepare("SELECT id, origin FROM management_memo_requests WHERE id = ?").bind(id).first<{ id: string; origin: string }>();
    if (!row) throw new RequestError("طلب المذكرة غير موجود.", 404);
    if (row.origin !== "chatgpt-mcp") throw new RequestError("هذه العملية خاصة بمسودات المحادثة؛ لا تغير بريد عميل الموقع.", 409);
    await db.prepare("UPDATE management_memo_requests SET email = '' WHERE id = ? AND origin = 'chatgpt-mcp'").bind(id).run();
    const saved = await db.prepare("SELECT email FROM management_memo_requests WHERE id = ?").bind(id).first<{ email: string }>();
    if (!saved || saved.email) throw new RequestError("تعذر تأكيد إزالة البريد.", 503);
    return { requestId: id, contactEmailPresent: false, emailRemoved: true, memoPreserved: true };
  }
  if (name === "sabeq_save_chat_draft") {
    if (!args.caseData || typeof args.caseData !== "object" || Array.isArray(args.caseData) || Object.values(args.caseData).some(v => typeof v !== "string")) throw new RequestError("بيانات القضية غير صحيحة.");
    const raw = args.caseData as Record<string, string>;
    const repairId = raw.repairExistingRequestId;
    if (repairId !== undefined && (args.requestId !== undefined || raw.existingRequestId !== undefined)) throw new RequestError("اختر إصلاح طلب فارغ أو تعديل مسودة محفوظة، دون جمع المسارين.");
    const checked = validateMemoInput(raw);
    const { legalRoute, extraFields, preparationNotes: _notes, ...caseData } = checked;
    const evidence = await selectedEvidence(args.sourceIds);
    const scoped = scopeEvidenceToFacts(evidence, checked.facts + " " + checked.requests + " " + checked.caseType);
    if (scoped.length !== evidence.length) throw new RequestError("أحد المصادر خارج موضوع القضية. أعد اختيار الأسانيد المناسبة.", 422);
    const grounds = cleanMultiline(args.grounds, "دفوع المسودة", { min: 80, max: 50000 });
    const input = { ...extraFields, ...caseData };
    let selectedRevision: { id: string; hash: string; revision: number } | undefined;
    const requestedId = args.requestId ?? raw.existingRequestId;
    if (args.requestId && raw.existingRequestId && args.requestId !== raw.existingRequestId) throw new RequestError("معرفا المذكرة لا يتطابقان.");
    if (requestedId !== undefined) {
      const id = cleanString(requestedId, "رقم الطلب", { min: 8, max: 100 });
      if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new RequestError("رقم الطلب غير صحيح.");
      const previous = await getD1().prepare("SELECT id,input_json,output_text,status,origin FROM management_memo_requests WHERE id=?").bind(id).first<{ id: string; input_json: string; output_text: string; status: string; origin: string }>();
      if (!previous) throw new RequestError("طلب المذكرة غير موجود.", 404);
      const savedInput = JSON.parse(previous.input_json) as Record<string, unknown>;
      if (previous.origin !== "chatgpt-mcp" || Object.entries(input).some(([key,value]) => savedInput[key] !== value) || JSON.stringify(savedInput.chatSourceIds) !== JSON.stringify(args.sourceIds)) throw new RequestError("التعديل يحفظ وقائع وطلبات ومصادر هذه المذكرة فقط. أنشئ طلباً مستقلاً للبيانات المختلفة.", 409);
      const state = await memoEditState(id, previous.output_text, previous.status);
      if (!state.editable) throw new RequestError("المذكرة ليست جاهزة لتعديل محفوظ.", 409);
      selectedRevision = { id, hash: state.hash, revision: state.revision };
    }
    const requestParts = repairId === undefined ? { courtRequests: checked.requests, researchInstructions: "" } : splitMemoResearchInstruction(checked.requests);
    const content: PleadingContent = prepareBoundDraft({ facts: checked.facts, requests: requestParts.courtRequests, grounds, fields: extraFields, factualNotes: [], legalResearchNotes: "مسودة من المحادثة؛ لم تنفذ مراجعة OpenAI/Meta الآلية، وتحتاج مراجعة موضوعية من المختص." }, { ...input, requests: requestParts.courtRequests }, evidence);
    const citations = reviewLegalCitations(content.grounds + "\n" + content.requests, evidence, { courtDocument: true, requireArticleText: true, requireJudgmentAnalogy: true });
    if (!citations.ok) throw new RequestError("لم تجتز أسانيد المسودة الفحص: " + [...new Set(citations.issues.map(i => i.code))].join(", "), 422);
    const substance = reviewMemoSubstance(input, content, { requireStatutoryText: evidence.some(source => Boolean(source.corpus && !source.judgment)) });
    if (!substance.ok) throw new RequestError("المسودة أقصر أو أضعف من معيار المذكرة الرسمية، ولم تُحفظ: " + substance.issues.map(issue => issue.code).join(", "), 422);
    if (!reviewLegalRouteContent(legalRoute, content, input).ok) throw new RequestError("تحتاج صيغة المستند أو الطلبات إلى تصحيح قبل الحفظ.", 422);
    const template = await loadApprovedTemplate(legalRoute.kind === "appeal" ? "appeal" : "claim");
    const reference = selectDraftingReference(legalRoute, template.referenceStyle, input);
    const document = buildPleadingDocument(template.info, template.definition, legalRoute.kind, input, content, reference.memorandumTitle);
    const memo = pleadingText(document);
    if (memo.length > 140000) throw new RequestError("المسودة أكبر من الحد المتاح للحفظ.", 413);
    if (repairId !== undefined) {
      const receipt = await repairEmptyMemo({ id: repairId, expectedHash: raw.repairExpectedHash, reason: raw.repairReason, input: { ...input, legalRoute, ...(requestParts.researchInstructions ? { ownerDraftingInstructions: requestParts.researchInstructions } : {}) }, memo, sourceIds: args.sourceIds as number[] }, actor.userId);
      return { ...receipt, memo, sourceCount: evidence.length, draftingInstructionsSeparated: Boolean(requestParts.researchInstructions), humanReviewRequired: true, automaticModelReview: false, notice: "حُفظت المذكرة المصححة في الطلب نفسه مع المدخلات الأصلية في سجل الطلب، وتبقى بانتظار مراجعة المختص." };
    }
    if (selectedRevision) {
      const revision = await saveMemoRevision({ id: selectedRevision.id, text: memo, expectedHash: selectedRevision.hash, expectedRevision: selectedRevision.revision }, actor.userId);
      await getD1().prepare("UPDATE management_memo_requests SET email = '' WHERE id = ? AND origin = 'chatgpt-mcp'").bind(selectedRevision.id).run();
      return { requestId: selectedRevision.id, contactEmailPresent: false, status: "needs_review", reviewMode: "chat_assisted_revision", revision: revision.revision, memo, sourceCount: evidence.length, humanReviewRequired: true, automaticModelReview: false, notice: "حُفظت الصياغة المصححة في سجل المذكرة نفسه، وبقي الأصل محفوظاً للمراجعة." };
    }
    const id = crypto.randomUUID();
    // The journal triggers preserve this new request and add a private dashboard
    // notification atomically. No existing case, entitlement or mail is changed. The content has no model/substantive approval.
    await getD1().prepare("INSERT INTO management_memo_requests (id, user_id, client_name, email, case_type, case_number, input_json, output_text, status, error_code, origin) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'needs_review', 'chat_assisted_draft', 'chatgpt-mcp')")
      .bind(id, checked.clientName, "", checked.caseType, checked.caseNumber, JSON.stringify({ ...input, chatSourceIds: args.sourceIds, chatBridgeRevision: chatMemoBridgeRevision, chatActor: actor.userId }), memo).run();
    return { requestId: id, status: "needs_review", reviewMode: "chat_assisted_draft", memo, sourceCount: evidence.length, humanReviewRequired: true, automaticModelReview: false, notice: "حُفظت مسودة المحادثة في لوحة سابق للمراجعة. لم تُعتمد للتقديم، ولم تُرسل بالبريد، ولم تُستهلك دفعة مالية." };
  }
  throw new RequestError("أداة الربط غير معروفة.", 404);
}
