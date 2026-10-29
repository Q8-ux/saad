import { env } from 'cloudflare:workers';
import { getD1 } from '@/db';
import { RequestError } from './request-security';
import { boundNormalize } from './bound-legislation-core';

export const AUDIT_ID = 'audit-20261024-a0fc35daf938';
const SOURCE_ID = 'kw-tashree3at-20260401-a0fc35daf938';
type Row = Record<string, string | number | null>;
export type AuditAsset = { id: string; objectKey: string; sha256: string; bytes: number; mimeType: string; filename: string };
export type AuditData = { id: string; sourceId: string; sourceSha256: string; reviewedAt: string; summary: Record<string, unknown>; details: unknown; sections: Row[]; pagePatches: Row[]; articlePatches: Row[]; images: Row[]; currency: Row[]; report: Row; assets: AuditAsset[]; pageHashes: Array<[number, string]>; articleHashes: Array<[string, string]> };
type StoredObject = { body: ReadableStream<Uint8Array>; size: number; customMetadata?: Record<string, string> };
type Bucket = { get(key: string): Promise<StoredObject | null>; head(key: string): Promise<{ customMetadata?: Record<string, string> } | null>; put(key: string, body: ArrayBuffer, options: unknown): Promise<unknown> };
const bucket = () => { const value = (env as unknown as { DOCUMENTS?: Bucket }).DOCUMENTS; if (!value) throw new RequestError('مساحة حفظ الأدلة غير متاحة.', 503); return value; };
export async function readStoredArchiveObject(key:string){
  if(!/^legislation\/[a-f0-9]{64}\/(?:source\.pdf|images\/\d+\.(?:png|jpeg))$/.test(key))throw new RequestError('مسار المصدر المحفوظ غير صحيح.',503);
  return bucket().get(key);
}
export async function auditDigest(value: string | ArrayBuffer) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : value)), b => b.toString(16).padStart(2, '0')).join(''); }
let ready: Promise<{ data: AuditData; sha256: string }> | undefined;
async function pinnedAudit() {
  return ready ??= (async () => {
    const { default: payload } = await import('../server-data/legislation-audit.json');
    const bytes = Uint8Array.from(atob(payload.gzip), c => c.charCodeAt(0));
    const raw = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    if (await auditDigest(raw) !== payload.sha256) throw new Error('audit_integrity_failed');
    const data = JSON.parse(new TextDecoder().decode(raw)) as AuditData;
    if (data.id !== AUDIT_ID || data.sourceId !== SOURCE_ID) throw new Error('audit_identity_mismatch');
    return { data, sha256: payload.sha256 };
  })().catch(error => { ready = undefined; throw error; });
}
export async function assertAuditAccess(request: Request, expectedHash = 'e660441c29d74a7ac4d0a51722a53e87fb22b039421e14147a4ad758d80b00d3', expiresAt = Date.UTC(2026, 9, 25, 3, 0)) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token || Date.now() >= expiresAt || await auditDigest(token) !== expectedHash) throw new RequestError('طلب المراجعة غير مصرح به أو انتهت صلاحيته.', 403);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new RequestError('مصدر الطلب غير مسموح.', 403);
}
export async function auditStatus(reviewId = AUDIT_ID) {
  const db = getD1();
  const review = await db.prepare('SELECT * FROM legislation_reviews WHERE id = ?').bind(reviewId).first<Record<string, unknown>>();
  if (!review) return { review: null, counts: null };
  const counts = await db.prepare('SELECT (SELECT COUNT(*) FROM legislation_sections WHERE source_id = ?) sections,(SELECT COUNT(*) FROM legislation_pages WHERE source_id = ?) pages,(SELECT COUNT(*) FROM legislation_articles WHERE source_id = ?) articles,(SELECT COUNT(*) FROM legislation_image_reviews WHERE review_id = ?) images,(SELECT COUNT(*) FROM legislation_currency_checks WHERE review_id = ?) currency,(SELECT COUNT(*) FROM legislation_audit_reports WHERE review_id = ?) reports').bind(review.source_id, review.source_id, review.source_id, reviewId, reviewId, reviewId).first<Record<string, number>>();
  return { review, counts };
}
async function ensureReview(data: AuditData, sha256: string) {
  const db = getD1(), source = await db.prepare('SELECT source_sha256 FROM legislation_imports WHERE id = ?').bind(data.sourceId).first<{ source_sha256: string }>();
  if (source?.source_sha256 !== data.sourceSha256) throw new RequestError('بصمة المصدر في سابق لا تطابق المراجعة.', 409);
  await db.prepare('INSERT INTO legislation_reviews(id,source_id,source_sha256,payload_sha256,summary_json,details_json,reviewed_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(data.id, data.sourceId, data.sourceSha256, sha256, JSON.stringify(data.summary), JSON.stringify(data.details), data.reviewedAt).run();
  const row = await db.prepare('SELECT payload_sha256,status,asset_receipts_json FROM legislation_reviews WHERE id = ?').bind(data.id).first<{ payload_sha256: string; status: string; asset_receipts_json: string }>();
  if (row?.payload_sha256 !== sha256) throw new RequestError('إصدار المراجعة الموجود مختلف؛ لا تجوز الكتابة فوقه.', 409);
  return row;
}
const descriptors = {
  sections: { table: 'legislation_sections', fields: ['id','source_id','title','start_page','end_page','kind','boundary_method'], conflict: '(id)' },
  images: { table: 'legislation_image_reviews', fields: ['source_id','pdf_page','review_id','xref','source_image_sha256','verified_text','text_sha256','rows_json','unresolved_json','full_transcription_verified','review_method','object_key','reviewed_at'], conflict: '(source_id,pdf_page)' },
  currency: { table: 'legislation_currency_checks', fields: ['source_id','section_id','review_id','identity_json','status','official_sources_json','findings_json','current_law_verified','checked_at'], conflict: '(source_id,section_id)' },
  report: { table: 'legislation_audit_reports', fields: ['id','source_id','review_id','title','filename','object_key','mime_type','bytes','sha256','created_at'], conflict: '(id)' },
};
export async function applyAuditBatch(data: AuditData, sha256: string, input: Record<string, unknown>) {
  const phase = String(input.phase || ''), offset = input.offset ?? 0;
  if (!['sections','pages','articles','images','currency','report','complete'].includes(phase) || !Number.isInteger(offset) || Number(offset) < 0) throw new RequestError('مرحلة المراجعة أو الإزاحة غير صحيحة.');
  const lists: Record<string, Row[]> = { sections: data.sections, pages: data.pagePatches, articles: data.articlePatches, images: data.images, currency: data.currency, report: [data.report] };
  if (phase !== 'complete' && Number(offset) >= lists[phase].length && !(Number(offset) === 0 && !lists[phase].length)) throw new RequestError('إزاحة المراجعة خارج الحزمة.');
  const db = getD1(), current = await ensureReview(data, sha256);
  if (current.status === 'complete') return { ...(await auditStatus(data.id)), complete: true, unchanged: true };
  if (phase === 'complete') {
    const status = await auditStatus(data.id), counts = status.counts!;
    if (counts.sections !== data.sections.length || counts.pages !== data.pageHashes.length || counts.articles !== data.articleHashes.length || counts.images !== data.images.length || counts.currency !== data.currency.length || counts.reports !== 1) throw new RequestError('دفعات المراجعة غير مكتملة.', 409);
    for (const [table, key, expectedRows] of [['legislation_pages','pdf_page',data.pageHashes],['legislation_articles','id',data.articleHashes]] as const) {
      const rows = (await db.prepare(`SELECT ${key},text_sha256 FROM ${table} WHERE source_id = ?`).bind(data.sourceId).all<Record<string, string | number>>()).results;
      const expected = new Map<string | number, string>(expectedRows);
      if (rows.length !== expected.size || rows.some((row: Record<string, string | number>) => expected.get(row[key]) !== row.text_sha256)) throw new RequestError('لم تطابق بصمات السجلات إصدار المراجعة.', 409);
    }
    const receipts = JSON.parse(current.asset_receipts_json) as Record<string, string>;
    if (data.assets.some(asset => receipts[asset.id] !== asset.sha256)) throw new RequestError('رفع التقرير أو ملفات الأصل والأدلة غير مكتمل.', 409);
    const original = await db.prepare('SELECT metadata_json FROM legislation_imports WHERE id = ?').bind(data.sourceId).first<{ metadata_json: string }>();
    const metadata = { ...JSON.parse(original!.metadata_json), audit: data.summary, review_id: data.id, cross_page_articles: data.summary.cross_page_article_units, segments: data.summary.segment_count, scope: 'bound_source_with_separate_official_audit', unreviewed_image_pages: [], partially_transcribed_image_pages: data.images.filter(row => !row.full_transcription_verified).map(row => row.pdf_page), searchable_layers: ['digital_text','visually_verified_image_fields'] };
    await db.batch([
      db.prepare('UPDATE legislation_imports SET section_count=?,article_count=?,metadata_json=? WHERE id=? AND source_sha256=?').bind(data.sections.length,data.articleHashes.length,JSON.stringify(metadata),data.sourceId,data.sourceSha256),
      db.prepare("UPDATE legislation_reviews SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE id=? AND status='processing'").bind(data.id),
    ]);
    return { ...(await auditStatus(data.id)), complete: true };
  }
  const selected = lists[phase].slice(Number(offset), Number(offset) + 300);
  const statements = selected.map(row => {
    if (phase === 'pages') return db.prepare('UPDATE legislation_pages SET document_id=?,role=?,quality_flags_json=?,search_text=? WHERE source_id=? AND pdf_page=? AND text_sha256=?').bind(row.document_id,row.role,row.quality_flags_json,boundNormalize(String(row.digital_text)+'\n'+String(row.verified_image_text || '')),data.sourceId,row.pdf_page,row.text_sha256);
    if (phase === 'articles') return db.prepare('UPDATE legislation_articles SET document_id=?,component_id=?,start_page=?,end_page=?,text=?,text_sha256=?,segments_json=?,boundary_review=? WHERE source_id=? AND id=? AND text_sha256 IN (?,?)').bind(row.document_id,row.component_id,row.start_page,row.end_page,row.text,row.text_sha256,row.segments_json,row.boundary_review,data.sourceId,row.id,row.before_text_sha256,row.text_sha256);
    const descriptor = descriptors[phase as keyof typeof descriptors], fields = descriptor.fields;
    const values: Row = { ...row, source_id: data.sourceId, review_id: data.id, current_law_verified: 0 };
    const updates = fields.filter(field => !['id','source_id','pdf_page','section_id'].includes(field));
    return db.prepare(`INSERT INTO ${descriptor.table}(${fields.join(',')}) VALUES(${fields.map(() => '?').join(',')}) ON CONFLICT${descriptor.conflict} DO UPDATE SET ${updates.map(field => field+'=excluded.'+field).join(',')} WHERE ${descriptor.table}.source_id=excluded.source_id`).bind(...fields.map(field => values[field]));
  });
  const results = statements.length ? await db.batch(statements) : [];
  if (results.some((result: { meta: { changes?: number } }) => Number(result.meta.changes) !== 1)) throw new RequestError('بعض سجلات المصدر لم تطابق شروط التصحيح.', 409);
  const next = Number(offset) + selected.length;
  return { phase, processed: next, total: lists[phase].length, nextOffset: next < lists[phase].length ? next : null, complete: false };
}
export async function applyPinnedAudit(input: Record<string, unknown>) { const { data, sha256 } = await pinnedAudit(); return applyAuditBatch(data, sha256, input); }
export async function uploadAuditAsset(request: Request, assetId: string, manifest?: { data: AuditData; sha256: string }) {
  const { data, sha256 } = manifest || await pinnedAudit();
  const asset = data.assets.find(item => item.id === assetId);
  if (!asset) throw new RequestError('ملف الدليل غير موجود في المراجعة.', 404);
  const current = await ensureReview(data, sha256);
  if (current.status === 'complete') return { ok: true, unchanged: true };
  const length = request.headers.get('content-length');
  if (length && Number(length) !== asset.bytes) throw new RequestError('حجم ملف الدليل غير مطابق.');
  const body = await request.arrayBuffer();
  if (body.byteLength !== asset.bytes || await auditDigest(body) !== asset.sha256) throw new RequestError('بصمة ملف الدليل غير مطابقة.');
  const store = bucket(), previous = await store.head(asset.objectKey);
  if (previous && previous.customMetadata?.sha256 !== asset.sha256) throw new RequestError('يوجد ملف مختلف بالمفتاح نفسه.', 409);
  if (!previous) await store.put(asset.objectKey, body, { httpMetadata: { contentType: asset.mimeType }, customMetadata: { sha256: asset.sha256, source_sha256: data.sourceSha256 } });
  if ((await store.head(asset.objectKey))?.customMetadata?.sha256 !== asset.sha256) throw new RequestError('تعذر تأكيد حفظ ملف الدليل.', 503);
  await getD1().prepare('UPDATE legislation_reviews SET asset_receipts_json=json_set(asset_receipts_json,?,?) WHERE id=? AND status=\'processing\'').bind('$."'+asset.id+'"',asset.sha256,data.id).run();
  return { ok: true, asset: asset.id, bytes: asset.bytes, sha256: asset.sha256 };
}
export async function getAuditSummary(sourceId: string) {
  const db = getD1(), audit = await db.prepare('SELECT id,status,summary_json,completed_at FROM legislation_reviews WHERE source_id=? ORDER BY reviewed_at DESC LIMIT 1').bind(sourceId).first<{ id: string; status: string; summary_json: string; completed_at: string | null }>();
  const reports = (await db.prepare("SELECT p.id,p.title,p.filename,p.sha256,p.bytes,p.created_at FROM legislation_audit_reports p JOIN legislation_reviews r ON p.review_id=r.id WHERE p.source_id=? AND r.status='complete' ORDER BY p.created_at DESC").bind(sourceId).all()).results;
  return { review: audit ? { id: audit.id, status: audit.status, summary: JSON.parse(audit.summary_json), completedAt: audit.completed_at } : null, reports };
}
export async function getAuditFile(id: string, origin: string) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new RequestError('معرف التقرير غير صحيح.');
  const row = await getD1().prepare("SELECT p.filename,p.object_key,p.mime_type,p.sha256 FROM legislation_audit_reports p JOIN legislation_reviews r ON p.review_id=r.id WHERE p.id=? AND r.status='complete'").bind(id).first<{ filename: string; object_key: string; mime_type: string; sha256: string }>();
  if (!row) throw new RequestError('التقرير غير متاح.', 404);
  const object = await bucket().get(row.object_key);
  if (!object || object.customMetadata?.sha256 !== row.sha256) throw new RequestError('ملف التقرير المحفوظ غير مطابق.', 503);
  return new Response(object.body, { headers: { 'Content-Type': row.mime_type, 'Content-Disposition': 'inline; filename="'+row.filename+'"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } });
}
