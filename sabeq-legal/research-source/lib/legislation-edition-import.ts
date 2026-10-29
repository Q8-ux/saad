import { getD1 } from '@/db';
import { boundNormalize } from './bound-legislation-core';
import { RequestError } from './request-security';
import { getAuditSummary } from './legislation-audit';

export const EDITION_ID = 'kw-tashree3at-20260401-a0fc35daf938';
const IMPORT_KEY_SHA256 = '3cf92d1b9f12c1e39ec750b7fda0b2e19ceb117b6bde3f31f783268c2d2f385e';
const IMPORT_EXPIRES_AT = Date.UTC(2026, 9, 24, 19, 0);
type Row = Record<string, string | number | boolean | null>;
export type EditionData = { source: Row; sections: Row[]; pages: Row[]; articles: Row[] };
let payloadReady: Promise<EditionData> | undefined;
async function digest(value: string | ArrayBuffer) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
export async function assertEditionImportAccess(request: Request, expectedHash = IMPORT_KEY_SHA256, expiresAt = IMPORT_EXPIRES_AT) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token || Date.now() >= expiresAt || await digest(token) !== expectedHash) throw new RequestError('طلب الاستيراد غير مصرح به أو انتهت صلاحيته.', 403);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new RequestError('مصدر الطلب غير مسموح.', 403);
}
async function pinnedData() {
  return payloadReady ??= (async () => {
    const { default: payload } = await import('../server-data/tashree3at-20260401.json');
    const bytes = Uint8Array.from(atob(payload.gzip), c => c.charCodeAt(0));
    const raw = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    if (await digest(raw) !== payload.sha256) throw new Error('edition_payload_integrity_failed');
    const data = JSON.parse(new TextDecoder().decode(raw)) as EditionData;
    if (data.source.id !== EDITION_ID || data.source.page_count !== data.pages.length || data.source.article_count !== data.articles.length || data.source.section_count !== data.sections.length) throw new Error('edition_manifest_mismatch');
    return data;
  })().catch(error => { payloadReady = undefined; throw error; });
}
export async function editionImportStatus(sourceId = EDITION_ID) {
  const db = getD1();
  const source = await db.prepare('SELECT * FROM legislation_imports WHERE id = ?').bind(sourceId).first();
  if (!source) return { source: null, counts: null };
  const counts = await db.prepare('SELECT (SELECT COUNT(*) FROM legislation_sections WHERE source_id = ?) AS sections, (SELECT COUNT(*) FROM legislation_pages WHERE source_id = ?) AS pages, (SELECT COUNT(*) FROM legislation_articles WHERE source_id = ?) AS articles').bind(sourceId, sourceId, sourceId).first();
  return { source, counts };
}
const columns = {
  sections: ['id', 'source_id', 'title', 'start_page', 'end_page', 'kind', 'boundary_method'],
  pages: ['source_id', 'pdf_page', 'document_id', 'printed_page', 'role', 'text', 'text_sha256', 'search_text', 'quality_flags_json'],
  articles: ['id', 'source_id', 'document_id', 'component_id', 'number', 'heading', 'start_page', 'end_page', 'text', 'text_sha256', 'segments_json', 'boundary_review', 'transcription_verified', 'complete_article_verified'],
};
const tables = { sections: 'legislation_sections', pages: 'legislation_pages', articles: 'legislation_articles' };
export async function importEditionBatch(data: EditionData, input: Record<string, unknown>) {
  const phase = input.phase, offset = input.offset ?? 0;
  if (!['sections', 'pages', 'articles', 'complete'].includes(String(phase)) || !Number.isInteger(offset) || Number(offset) < 0) throw new RequestError('مرحلة الاستيراد أو الإزاحة غير صحيحة.');
  if (phase !== 'complete') {
    const records = data[phase as keyof typeof tables];
    if (Number(offset) >= records.length && !(offset === 0 && records.length === 0)) throw new RequestError('إزاحة الاستيراد خارج الحزمة.');
  }
  const db = getD1(), source = data.source;
  const fields = ['id', 'title', 'source_sha256', 'source_bytes', 'edition_claim', 'page_count', 'section_count', 'article_count', 'provenance', 'current_law_verified', 'active_for_generation', 'metadata_json'];
  await db.prepare(`INSERT INTO legislation_imports (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')}) ON CONFLICT(id) DO NOTHING`).bind(...fields.map(field => field === 'current_law_verified' || field === 'active_for_generation' ? 0 : source[field])).run();
  const current = await db.prepare('SELECT source_sha256,status FROM legislation_imports WHERE id = ?').bind(source.id).first<{ source_sha256: string; status: string }>();
  if (current?.source_sha256 !== source.source_sha256) throw new RequestError('هوية المصدر الموجودة لا تطابق الحزمة.', 409);
  if (current.status === 'complete') return { ...(await editionImportStatus(String(source.id))), complete: true, unchanged: true };
  if (phase === 'complete') {
    const status = await editionImportStatus(String(source.id));
    const counts = status.counts as { sections: number; pages: number; articles: number };
    if (counts.sections !== data.sections.length || counts.pages !== data.pages.length || counts.articles !== data.articles.length) throw new RequestError('الاستيراد غير مكتمل؛ استكمل الدفعات أولاً.', 409);
    for (const part of ['pages', 'articles'] as const) {
      const key = part === 'pages' ? 'pdf_page' : 'id';
      const rows = (await db.prepare(`SELECT ${key},text_sha256 FROM ${tables[part]} WHERE source_id = ?`).bind(source.id).all<Record<string, string | number>>()).results;
      const expected = new Map(data[part].map(row => [row[key], row.text_sha256]));
      if (rows.length !== expected.size || rows.some((row: Record<string, string | number>) => expected.get(row[key]) !== row.text_sha256)) throw new RequestError('فشلت مطابقة بصمات السجلات المحفوظة.', 409);
    }
    await db.prepare("UPDATE legislation_imports SET status = 'complete', imported_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'importing'").bind(source.id).run();
    return { ...(await editionImportStatus(String(source.id))), complete: true };
  }
  const part = phase as keyof typeof tables;
  if (part !== 'sections') {
    const previous = part === 'pages' ? 'sections' : 'pages';
    const count = await db.prepare(`SELECT COUNT(*) AS n FROM ${tables[previous]} WHERE source_id = ?`).bind(source.id).first<{ n: number }>();
    if (count?.n !== data[previous].length) throw new RequestError('استكمل المرحلة السابقة قبل هذه الدفعة.', 409);
  }
  // One batch is one D1 subrequest; bound rows to keep its duration below 30s.
  const records = data[part].slice(Number(offset), Number(offset) + 400);
  const fieldsForPart = columns[part];
  const statements = records.map(row => {
    const values: Row = { ...row, source_id: source.id, search_text: part === 'pages' ? boundNormalize(String(row.text)) : '', transcription_verified: 0, complete_article_verified: 0 };
    const conflict = part === 'pages' ? '(source_id,pdf_page)' : '(id)';
    return db.prepare(`INSERT INTO ${tables[part]} (${fieldsForPart.join(',')}) VALUES (${fieldsForPart.map(() => '?').join(',')}) ON CONFLICT${conflict} DO NOTHING`).bind(...fieldsForPart.map(field => values[field]));
  });
  const result = statements.length ? await db.batch(statements) : [];
  const next = Number(offset) + records.length;
  return { sourceId: source.id, phase, offset, nextOffset: next < data[part].length ? next : null, total: data[part].length, inserted: result.reduce((sum: number, row: { meta: { changes?: number } }) => sum + Number(row.meta.changes || 0), 0), complete: false };
}
export async function importPinnedEdition(input: Record<string, unknown>) {
  // A completed import can never be rewritten, even with the capability.
  const status = await editionImportStatus();
  if ((status.source as { status?: string } | null)?.status === 'complete') return { ...status, complete: true, unchanged: true };
  return importEditionBatch(await pinnedData(), input);
}
export async function searchImportedEdition(url: URL) {
  const sourceId = url.searchParams.get('source') || EDITION_ID;
  const status = { ...(await editionImportStatus(sourceId)), audit: await getAuditSummary(sourceId) };
  if (!status.source) return { ...status, results: [] };
  const query = boundNormalize(url.searchParams.get('q') || '').slice(0, 200);
  const page = url.searchParams.get('page');
  const section = url.searchParams.get('section');
  const rawOffset = url.searchParams.get('offset') || '0';
  if(!/^\d+$/.test(rawOffset)||Number(rawOffset)>1549)throw new RequestError('إزاحة البحث غير صحيحة.');
  if(section&&!/^[a-zA-Z0-9-]{1,100}$/.test(section))throw new RequestError('معرف القسم غير صحيح.');
  if (page && (!/^\d+$/.test(page) || Number(page) < 1)) throw new RequestError('رقم الصفحة غير صحيح.');
  if (!query && !page && !section) return { ...status, results: [], hasMore:false };
  const clauses = ['p.source_id = ?'], values: (string | number)[] = [sourceId];
  if (page) { clauses.push('p.pdf_page = ?'); values.push(Number(page)); }
  if (section) { clauses.push('p.document_id = ?'); values.push(section); }
  for (const term of query.split(' ').filter(Boolean).slice(0, 6)) {
    if (new TextEncoder().encode('%' + term + '%').byteLength > 50) throw new RequestError('استخدم كلمات بحث أقصر أو افصلها بمسافات.');
    clauses.push('p.search_text LIKE ?'); values.push('%' + term + '%');
  }
  const matches = (await getD1().prepare(`SELECT p.pdf_page,p.printed_page,p.document_id,p.role,p.text,p.text_sha256,p.quality_flags_json,s.title AS section_title,i.verified_text AS reviewed_image_text,i.text_sha256 AS image_text_sha256,i.source_image_sha256,i.full_transcription_verified,i.unresolved_json AS unresolved_image_fields,c.status AS legal_currency_status,c.official_sources_json FROM legislation_pages p LEFT JOIN legislation_sections s ON p.document_id=s.id LEFT JOIN legislation_image_reviews i ON i.source_id=p.source_id AND i.pdf_page=p.pdf_page LEFT JOIN legislation_currency_checks c ON c.source_id=p.source_id AND c.section_id=p.document_id WHERE ${clauses.join(' AND ')} ORDER BY p.pdf_page LIMIT 21 OFFSET ?`).bind(...values,Number(rawOffset)).all()).results;
  const results=matches.slice(0,20);
  const metadata = JSON.parse(String((status.source as { metadata_json: string }).metadata_json));
  return { ...status, results, hasMore:matches.length>20, offset:Number(rawOffset), currentLawVerified: false, activeForGeneration: false, reviewStatus: 'needs_review', searchableLayers: metadata.searchable_layers || ['digital_text'], unreviewedImagePages: metadata.unreviewed_image_pages || [], partiallyTranscribedImagePages: metadata.partially_transcribed_image_pages || [], unresolvedImageFieldCount: metadata.audit?.unresolved_image_fields ?? null };
}
