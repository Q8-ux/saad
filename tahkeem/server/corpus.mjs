import { one } from './store.mjs';
import { normalizeSearch } from './search.mjs';

const edition = 'مجموعة التشريعات الكويتية المستخرجة من ملف سابق';
const summaryColumns = 'c.id,c.document_id,c.component_id,c.article_number,c.document_title,c.heading,c.start_page,c.end_page,c.printed_page,c.boundary_review,c.text_verified,c.source_issue,c.source_sha256';

export function corpusItem(row) {
  return {
    id: row.id, kind: 'article', title: `المادة ${row.article_number} · ${row.document_title}`,
    identity: `المادة ${row.article_number} من قسم ${row.document_title}`,
    category: 'مجموعة التشريعات', authority: edition, edition,
    locator: `صفحة PDF ${row.start_page}${row.end_page !== row.start_page ? ' إلى '+row.end_page : ''}${row.printed_page ? ' · المطبوعة '+row.printed_page : ''}`,
    summary: row.heading === row.document_title ? '' : row.heading,
    sourceUrl: `/api/corpus/${row.id}`, citable: false, origin:'corpus',
    source: { document: row.document_id, component: row.component_id, sha256:row.source_sha256,
      pageStart:row.start_page,pageEnd:row.end_page,textVerified:row.text_verified,
      boundary:row.boundary_review,issue:row.source_issue,currentLawVerified:false },
    ...(row.text === undefined ? {} : { body:row.text, textSha256:row.text_sha256 }),
  };
}

function queryParts(query) {
  const q = normalizeSearch(query);
  const match = /(?:^| )الماده (\d+(?: مكرر(?: [ا-ي])?)?)(?= |$)/u.exec(q);
  if (match) return { exact:match[1], words:q.replace(match[0],' ').trim() };
  return /^\d+(?: مكرر(?: [ا-ي])?)?$/u.test(q) ? { exact:q, words:'' } : { exact:'', words:q };
}

export async function corpusSearch(db, { query, offset = 0, take = 18 }) {
  const { exact,words } = queryParts(query);
  const params = [exact,words];
  const where = `FROM corpus_articles c JOIN corpus_imports i USING(source_sha256)
    WHERE ($1='' OR c.number_key=$1) AND ($2='' OR c.search_vector @@ plainto_tsquery('simple',$2))`;
  const [count, result] = await Promise.all([
    one(db,`SELECT count(*)::int AS total ${where}`,params),
    take > 0 ? db.query(`SELECT ${summaryColumns} ${where}
      ORDER BY CASE WHEN $2='' THEN 0 ELSE ts_rank(c.search_vector,plainto_tsquery('simple',$2)) END DESC,
        c.start_page,c.id LIMIT $3 OFFSET $4`,[...params,take,offset]) : { rows:[] },
  ]);
  return { total:count.total, items:result.rows.map(corpusItem) };
}

export async function corpusByIds(db, ids, withText = false) {
  if (!ids.length) return [];
  const result = await db.query(`SELECT ${summaryColumns}${withText?',c.text,c.text_sha256':''}
    FROM corpus_articles c JOIN corpus_imports i USING(source_sha256) WHERE c.id=ANY($1::text[])`,[ids]);
  return result.rows.map(corpusItem);
}

export async function corpusStats(db) {
  return one(db,`SELECT coalesce(sum(article_count),0)::int AS articles,
    coalesce(sum(section_count),0)::int AS sections, coalesce(sum(page_count),0)::int AS pages
    FROM corpus_imports`);
}
