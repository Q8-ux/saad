// Public, fictional fixtures only. This module never imports auth, storage or a database.
// The owner role below previews the complete UI; it is never a server-side identity.
export const GUEST_READ_ONLY = "هذه نسخة استعراض ببيانات تجريبية. التغييرات لا تُحفظ.";
const createdAt = "2026-09-15T09:00:00.000Z";
export const GUEST_SESSION = {
  user: { id: "guest-preview", email: "guest@example.invalid", displayName: "ضيف", isPlatformAdmin: true },
  memberships: [],
  activeOffice: { officeId: "guest-office", officeName: "مكتب تجريبي", role: "owner" as const,
    plan: "professional", subscriptionStatus: "trial", billingMode: "manual", seatLimit: 5, endsAt: "", graceUntil: "" },
};
export const GUEST_OFFICE = {
  clients: [
    { id: 1, name: "عميل تجريبي ١", phone: "", email: "client-one@example.invalid", notes: "بيانات وهمية لاستعراض ملف العميل.", createdAt },
    { id: 2, name: "شركة تجريبية", phone: "", email: "company@example.invalid", notes: "نموذج لعميل من الشركات.", createdAt },
  ],
  cases: [
    { id: 1, caseNumber: "DEMO-2026-001", clientId: 1, clientName: "عميل تجريبي ١", court: "محكمة تجريبية", type: "مدني", status: "active", opposingParty: "طرف تجريبي", notes: "ملف عرض فقط، لا يمثل قضية حقيقية.", createdAt },
    { id: 2, caseNumber: "DEMO-2026-002", clientId: 2, clientName: "شركة تجريبية", court: "محكمة تجريبية", type: "تجاري", status: "pending", opposingParty: "شركة افتراضية", notes: "ملف تجريبي لمراجعة عقد خدمات.", createdAt },
  ],
  hearings: [
    { id: 1, caseId: 1, caseNumber: "DEMO-2026-001", title: "جلسة تجريبية", date: "2026-09-23", time: "09:00", location: "قاعة تجريبية", kind: "hearing", status: "pending", notes: "موعد وهمي لعرض جدول الجلسات." },
    { id: 2, caseId: 2, caseNumber: "DEMO-2026-002", title: "مراجعة عقد تجريبي", date: "2026-09-24", time: "11:30", location: "المكتب التجريبي", kind: "task", status: "pending", notes: "مهمة تجريبية." },
  ],
  invoices: [
    { id: 1, clientId: 1, clientName: "عميل تجريبي ١", caseId: 1, caseNumber: "DEMO-2026-001", amountFils: 250000, paidFils: 100000, status: "partially_paid", issueDate: "2026-09-15", dueDate: "2026-10-01", description: "أتعاب تجريبية" },
    { id: 2, clientId: 2, clientName: "شركة تجريبية", caseId: 2, caseNumber: "DEMO-2026-002", amountFils: 150000, paidFils: 150000, status: "paid", issueDate: "2026-09-15", dueDate: "2026-09-20", description: "مراجعة عقد تجريبي" },
  ],
  memos: [{ id: 1, caseId: 1, title: "مذكرة عرض تجريبية", memoType: "مذكرة دفاع", court: "محكمة تجريبية", facts: "وقائع وهمية لعرض تنظيم المذكرة.", legalCharacterization: "مثال للعرض فقط", legalBasis: "لا يتضمن هذا المثال مراجع قانونية أو مواد تشريعية.", requests: "طلب تجريبي.", content: "مذكرة عرض تجريبية\n\nأولاً: الوقائع\nوقائع وهمية توضّح طريقة عرض المذكرة وربطها بالقضية.\n\nثانياً: الطلبات\nطلب تجريبي لشرح تنظيم المحتوى.\n\nهذه عينة للواجهة، وليست مذكرة معدّة للاستخدام القانوني.", citationsJson: "[]", createdAt }],
  settings: { id: 1, officeName: "مكتب تجريبي", currency: "KWD", updatedAt: createdAt },
  reminders: [{ id: 1, title: "جلسة تجريبية", date: "2026-09-23", kind: "hearing", status: "pending" }],
  meta: { page: 1, pageSize: 20, counts: { clients: 2, cases: 2, hearings: 2, invoices: 2, memos: 1 }, hasMore: { clients: false, cases: false, hearings: false, invoices: false, memos: false }, finances: { total: 400000, paid: 250000, outstanding: 150000, overdue: 0 } },
};
const review = { state: "not_citable", label: "عينة تجريبية غير صالحة للاقتباس", version: "guest-v1", versionNumber: 1, fileType: "txt", hasOcr: false, ocrQuality: null, issueDate: "2026-09-15", checkedAt: null, reviewer: null, canCite: false, canExport: false };
const documents = [
  { id: 1, title: "نموذج عقد خدمات — عينة تجريبية", category: "نماذج العقود", document_type: "نموذج", law_number: null, law_year: null, summary: "عينة توضح ترتيب أطراف العقد ونطاق الخدمات والمدة والأتعاب.", official_source: "عينة تجريبية", source_url: "", source_page: "", page_count: 1, article_count: 1, source_type: "demo", review },
  { id: 2, title: "اتفاقية سرية — عينة تجريبية", category: "نماذج الاتفاقيات", document_type: "نموذج", law_number: null, law_year: null, summary: "مثال على تنظيم التزامات السرية بين أطراف افتراضية.", official_source: "عينة تجريبية", source_url: "", source_page: "", page_count: 1, article_count: 1, source_type: "demo", review },
];
export const GUEST_STATS = { documents: 2, chunks: 2, officialDocuments: 0, libraryDocuments: 0, officialOnly: 0, officeOnly: 0, mixedSources: 0, otherSources: 2, categories: documents.map(d => ({ category: d.category, count: 1 })), types: [{ document_type: "نموذج", count: 2 }], recent: documents, indexedAt: createdAt };
const members = [
  { id: "demo-member-1", userId: "demo-user-1", email: "owner@example.invalid", displayName: "مدير تجريبي", role: "owner", status: "active", createdAt },
  { id: "demo-member-2", userId: "demo-user-2", email: "lawyer@example.invalid", displayName: "محامٍ تجريبي", role: "lawyer", status: "active", createdAt },
];
const sampleText = (id: number) => `${documents.find(d => d.id === id)?.title || "عينة تجريبية"}\n\nهذا نص وهمي لاستعراض قراءة الوثيقة داخل المنصة. لا يمثل تشريعاً أو عقداً معتمداً، ولا يصلح للاقتباس القانوني.\n\nالأطراف: طرف أول تجريبي وطرف ثانٍ تجريبي.\nالموضوع: تنظيم نطاق الخدمة والمدة والمقابل في نموذج توضيحي.`;
const normalize = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/[\u064b-\u065f]/g, "");
function matchingDocuments(params: URLSearchParams) {
  const query = normalize(params.get("q") || "");
  return documents.filter(d => (!query || normalize(`${d.title} ${d.summary} ${sampleText(d.id)}`).includes(query)) && (!params.get("category") || d.category === params.get("category")) && (!params.get("type") || d.document_type === params.get("type")) && !params.get("year"));
}
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

// Fail closed: every request is fulfilled locally or rejected. Never delegate to fetch.
export async function guestRequest(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : null;
  const url = new URL(request?.url ?? String(input), "https://guest.invalid");
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  if (method !== "GET") return json({ error: GUEST_READ_ONLY, code: "guest_read_only" }, 403);
  const params = url.searchParams;
  switch (url.pathname) {
    case "/api/auth/me": return json(GUEST_SESSION);
    case "/api/office": return json(GUEST_OFFICE);
    case "/api/legal/stats": return json(GUEST_STATS);
    case "/api/office/contact": return json({ type: "none", masked: "", configured: false, canManage: true });
    case "/api/office/members": return json({ members, canManage: true, seatLimit: 5, activeMemberCount: members.length });
    case "/api/office/audit": return json({ rows: [{ id: "demo-audit", action: "create_memo", date: createdAt, actor: "مستخدم تجريبي" }], hasMore: false });
    case "/api/office/lookup": {
      const choices = params.get("resource") === "cases" ? GUEST_OFFICE.cases.map(c => ({ id: c.id, label: c.caseNumber })) : GUEST_OFFICE.clients.map(c => ({ id: c.id, label: c.name }));
      return json({ rows: choices.filter(c => normalize(c.label).includes(normalize(params.get("q") || ""))) });
    }
    case "/api/office/case-links": {
      const id = Number(params.get("id"));
      return json({ groups: {
        hearings: GUEST_OFFICE.hearings.filter(r => r.caseId === id).map(r => ({ id: r.id, title: r.title, date: r.date })),
        invoices: GUEST_OFFICE.invoices.filter(r => r.caseId === id).map(r => ({ id: r.id, title: r.description, date: r.issueDate })),
        memos: GUEST_OFFICE.memos.filter(r => r.caseId === id).map(r => ({ id: r.id, title: r.title, date: r.createdAt })), documents: [],
      }, hasMore: false });
    }
    case "/api/legal/documents": {
      const matches = matchingDocuments(params);
      return json({ documents: matches, total: matches.length, page: 1, pageSize: 24 });
    }
    case "/api/legal/search": {
      const results = matchingDocuments(params).map(d => ({ id: d.id, documentId: d.id, chunkIndex: 0, reference: null, excerpt: sampleText(d.id), title: d.title, category: d.category, documentType: d.document_type, lawNumber: null, lawYear: null, sourceUrl: "", sourcePage: "", officialSource: d.official_source, summary: d.summary, pageCount: 1, articleCount: 1, sourceType: "demo", score: 0, qualityScore: 0, qualityLabel: "عينة تجريبية", amendmentAlert: false, review }));
      return json({ results, nextOffset: null, analysis: { query: params.get("q") || "", resultCount: results.length, documentCount: results.length, officialResultCount: 0, categories: [...new Set(results.map(r => r.category))], averageQuality: 0, confidence: "عينة تجريبية", amendmentWarning: null, evidenceNote: "نتائج وهمية لاستعراض البحث، وليست مصادر قانونية.", strongestDocuments: [], nextChecks: [] } });
    }
    case "/api/legal/document": {
      const document = documents.find(d => d.id === Number(params.get("id")));
      return document ? json({ document, chunks: [{ id: document.id, chunk_index: 0, reference: null, text: sampleText(document.id) }], page: 1, pageSize: 20, totalChunks: 1, rejectedChunks: 0, needsReindex: false, hasMore: false }) : json({ error: "الوثيقة غير موجودة." }, 404);
    }
    case "/api/legal/review": return json({ review, canApprove: false, document: { officeId: "guest-office", fileScanStatus: "demo" }, history: [] });
    case "/api/admin/offices": return json({ offices: [{ id: "guest-office", name: "مكتب تجريبي", status: "active", plan: "professional", subscriptionStatus: "trial", billingMode: "manual", seatLimit: 5, endsAt: "", graceUntil: "", ownerLogin: "demo-owner", memberCount: members.length, createdAt }] });
    case "/api/admin/legal-sync": return json({ officialDocuments: 0, indexedDocuments: 2, lastRun: null });
    default: return json({ error: GUEST_READ_ONLY, code: "guest_unavailable" }, 403);
  }
}
