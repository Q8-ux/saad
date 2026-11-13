import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { one } from './store.mjs';
import { requireThat, textField } from './security.mjs';
import { corpusByIds, corpusSearch } from './corpus.mjs';
import { normalizeSearch } from './search.mjs';

export { normalizeSearch } from './search.mjs';

const manifest = JSON.parse(readFileSync(new URL('../data/moj-laws-manifest.json', import.meta.url)));
const references = JSON.parse(readFileSync(new URL('../data/references.json', import.meta.url)));
const officialHosts = new Set(['moj.gov.kw','www.moj.gov.kw','kijls.moj.gov.kw','www.kijls.moj.gov.kw',
  'kuwaitalyawm.media.gov.kw','eservices.moj.gov.kw','e.gov.kw','www.e.gov.kw','www.cck.moj.gov.kw']);

const categoryRules = [
  ['مرافعات وتنفيذ', /مرافعات|تنفيذ|الدعاو[ىي]|الإعلان الإلكتروني|الخبرة|الرسوم القضائية/],
  ['أسرة وأحوال شخصية', /أحوال الشخصية|محكمة الأسرة|المرأة|الطفل|حضانة/],
  ['جزائي', /الجزاء|الجنائية|الجزائية|الجرائم|الأحداث|المخدرات|الاتجار بالأشخاص/],
  ['دستوري وقضائي', /الدستور|المحكمة الدستورية|تنظيم القضاء|الفتوى والتشريع/],
  ['عمالي', /قانون العمل|العمالة|الخدمة المدنية|التأمينات الاجتماعية/],
  ['عقاري وتوثيق', /العقارية|التسجيل العقاري|التوثيق/],
  ['مالي ومصرفي', /الإفلاس|الائتمانية|المصرفية|الأوراق المالية|أسواق المال|التأمين|غسل الأموال/],
  ['مدني وتجاري', /القانون المدني|التجارة|الشركات|التحكيم/],
  ['دولي واتفاقيات', /اتفاقية|بروتوكول|العهد الدولي/],
];

export function sourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && officialHosts.has(url.hostname) && !url.username && !url.password && !url.port) {
      return url.href;
    }
  } catch {}
  return '';
}

function titleText(value) {
  return value.replace(/[\u200B-\u200F\u202A-\u202E]/g, '').replace(/\s+/g, ' ').trim();
}

const officialLaws = manifest.documents.flatMap(entry => {
  const url = sourceUrl(entry.source_url);
  if (!url) return [];
  const title = titleText(entry.title);
  return [{
    id: `law-${createHash('sha256').update(url).digest('hex').slice(0, 18)}`,
    kind: 'law', title,
    category: categoryRules.find(([, rule]) => rule.test(title))?.[0] || 'تشريعات عامة',
    authority: manifest.official_source, identity: title,
    edition: '', locator: '', summary: '', sourceUrl: url, citable: false, origin: 'catalog',
  }];
});
const seeds = references.map(ref => ({ ...ref, sourceUrl: sourceUrl(ref.sourceUrl), citable: false, origin: 'starter' }));
const fixedItems = [...officialLaws, ...seeds];

function itemFromRow(row) {
  return {
    id: row.id, kind: row.kind, title: row.title, category: row.category, authority: row.authority,
    identity: row.identity, edition: row.edition, locator: row.locator, summary: row.summary,
    sourceUrl: row.source_url, citable: Boolean(row.approved_at) && row.kind !== 'law',
    approvedAt: row.approved_at, origin: 'owner',
  };
}

export async function catalog(db, { kind = '', query = '', category = '' } = {}) {
  const result = await db.query(`SELECT * FROM references_catalog
    WHERE ($1 = '' OR kind = $1) ORDER BY created_at DESC LIMIT 1000`, [kind]);
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  return [...result.rows.map(itemFromRow), ...fixedItems].filter(item => {
    if (kind && item.kind !== kind) return false;
    if (category && item.category !== category) return false;
    const content = normalizeSearch([item.title, item.identity, item.category, item.summary].join(' '));
    return terms.every(term => content.includes(term));
  });
}

export async function libraryPage(db, { kind, query, category, page, pageSize }) {
  const all = await catalog(db, { kind, query });
  const corpusCategory = 'مجموعة التشريعات';
  const includeCorpus = (!kind || kind === 'article') && (!category || category === corpusCategory);
  const local = category ? all.filter(item => item.category === category) : all;
  const offset = (page-1)*pageSize;
  const items = local.slice(offset, offset+pageSize);
  const extra = includeCorpus
    ? await corpusSearch(db, { query, offset:Math.max(0,offset-local.length), take:pageSize-items.length })
    : { total:0, items:[] };
  const categories = [...new Set([...all.map(item => item.category),...(extra.total ? [corpusCategory] : [])])]
    .sort((a,b) => a.localeCompare(b,'ar'));
  return { items:[...items,...extra.items], total:local.length+extra.total, page, pageSize, categories };
}

export async function selectedSources(db, ids) {
  if (!ids.length) return [];
  const [items, imported] = await Promise.all([catalog(db),corpusByIds(db,ids)]);
  const map = new Map([...items,...imported].map(item => [item.id, item]));
  return ids.map(id => {
    const item = map.get(id);
    requireThat(item && ['article', 'judgment'].includes(item.kind), 400, 'أحد المراجع المختارة غير متاح.');
    return item;
  });
}

export async function saveReference(db, body) {
  const kind = body.kind;
  requireThat(['law','article','judgment'].includes(kind), 400, 'اختر نوع المرجع.');
  const values = [randomUUID(), kind, textField(body.title, 'عنوان المرجع', 220, 3),
    textField(body.category, 'التصنيف', 80, 2), textField(body.authority, 'الجهة', 150, 2),
    textField(body.identity, 'رقم المرجع وهويته', 260, 3), textField(body.edition, 'الإصدار', 150, 2),
    textField(body.locator, 'موضع النص في المصدر', 120, 2), textField(body.summary, 'مضمون المرجع', 1600, 8),
    sourceUrl(textField(body.sourceUrl, 'الرابط الرسمي', 2000, 12))];
  requireThat(values.at(-1), 400, 'أدخل رابط HTTPS من مصدر حكومي مدعوم.');
  requireThat(body.citable !== true || body.checked === true, 400, 'أكد مطابقة هوية المرجع ومضمونه للنسخة الرسمية.');
  const row = await one(db, `INSERT INTO references_catalog
    (id,kind,title,category,authority,identity,edition,locator,summary,source_url,approved_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $11::boolean THEN now() ELSE NULL END) RETURNING *`,
    [...values, body.citable === true]);
  return itemFromRow(row);
}

export async function setReferenceApproval(db, id, approved) {
  const row = await one(db, `UPDATE references_catalog SET approved_at=CASE WHEN $2::boolean THEN now() ELSE NULL END
    WHERE id=$1 RETURNING *`, [id, approved]);
  requireThat(row, 404, 'المرجع غير موجود.');
  return itemFromRow(row);
}
