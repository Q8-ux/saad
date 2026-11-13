import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { format, memoBodyLimit, memoDocuments, memoLineRole } from '../public/memo-format.js';
import { hasUnverifiedCitation } from './legal-text.mjs';
import { draftBodies, missingEnglishFields } from './memo-draft.mjs';
import { one } from './store.mjs';
import { HttpError, isUuid, requireThat, textField } from './security.mjs';

export async function generateMemo(store, user, id, input, sources, method, model) {
  requireThat(isUuid(id), 400, 'معرّف المذكرة غير صالح.');
  const existing = await getMemo(store, user.id, id, false);
  if (existing) return existing;
  if (method === 'model') requireThat(model, 503, 'خدمة الصياغة الذكية غير متصلة. يمكنك استخدام القالب الآن.');
  else requireThat(!missingEnglishFields(input).length, 422,
    'أدخل النص الإنجليزي للحقول المعبأة أو اختر الصياغة الذكية لترجمتها.');
  let bodies;
  try { bodies = await draftBodies(input, sources, method === 'model' ? model : null); }
  catch (error) {
    if (error instanceof HttpError || method !== 'model') throw error;
    throw new HttpError(503, 'تعذرت الصياغة الذكية. أعد المحاولة أو اختر القالب.');
  }
  requireThat(bodies.every(body => body.length <= memoBodyLimit), 422, 'اختصر بعض المدخلات لحفظ المسودة.');

  return store.transaction(async db => {
    const account = await one(db, 'SELECT *, (access_until > now()) AS subscribed FROM accounts WHERE id=$1 FOR UPDATE', [user.id]);
    requireThat(account?.enabled && (account.role === 'owner' || account.subscribed), 403, 'الاشتراك غير نشط.');
    const current = await getMemo(db, user.id, id, false);
    if (current) return current;
    const snapshot = sources.map(item => ({ id: item.id, title: item.title, identity: item.identity,
      edition: item.edition, locator: item.locator, sourceUrl: item.sourceUrl, citable: item.citable, origin: item.origin, source: item.source }));
    const row = await one(db, `INSERT INTO memos (id,account_id,title,memo_type,case_number,input,sources,body,method,alternate_body)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING RETURNING *`,
    [id, user.id, input.title, input.type, input.number, JSON.stringify(input), JSON.stringify(snapshot), bodies[0], method, bodies[1] ?? null]);
    requireThat(row, 409, 'تعذر استخدام معرّف المذكرة. أنشئ طلبًا جديدًا.');
    return row;
  });
}

export function needsCitationReview(memo) {
  return memoDocuments(memo).some(({ body }) => hasUnverifiedCitation(body, memo.sources));
}

export async function getMemo(db, accountId, memoId, required = true) {
  requireThat(isUuid(memoId), 404, 'المذكرة غير موجودة.');
  const row = await one(db, 'SELECT * FROM memos WHERE id=$1 AND account_id=$2', [memoId, accountId]);
  if (required) requireThat(row, 404, 'المذكرة غير موجودة.');
  return row;
}

export async function changeMemo(db, accountId, id, body) {
  const current = await getMemo(db, accountId, id);
  requireThat(Number.isInteger(body.version) && body.version === current.version, 409,
    'تغيّرت المذكرة في نافذة أخرى. أعد فتحها للمراجعة.');
  const status = body.status || (current.status === 'approved' ? 'review' : current.status);
  requireThat(['review','approved','archived'].includes(status), 400, 'حالة المذكرة غير صالحة.');
  const content = body.body === undefined ? current.body : textField(body.body, 'نص المذكرة', memoBodyLimit, 20);
  requireThat(body.alternateBody === undefined || current.alternate_body !== null, 400, 'هذه المذكرة تتضمن نسخة واحدة.');
  const alternate = body.alternateBody === undefined ? current.alternate_body :
    textField(body.alternateBody, 'نص النسخة الإنجليزية', memoBodyLimit, 20);
  const title = body.title === undefined ? current.title : textField(body.title, 'العنوان', 140, 3);
  if (status === 'approved') {
    const bodies = [content, alternate].filter(Boolean);
    requireThat(body.reviewed === true && bodies.every(text => !/\[(?:يُستكمل|تُستكمل|Complete )/u.test(text)), 422,
      'أكمل الحقول المعلّقة وراجع الوقائع والمراجع قبل الاعتماد.');
    requireThat(bodies.every(text => !hasUnverifiedCitation(text, current.sources)), 422,
      'تتضمن المذكرة إحالة غير متحققة. راجع الأسانيد قبل الاعتماد.');
  }
  const edited = content !== current.body || alternate !== current.alternate_body;
  const row = await one(db, `UPDATE memos SET title=$3, body=$4, status=$5, method=$6, alternate_body=$7,
    version=version+1, updated_at=now() WHERE id=$1 AND account_id=$2 AND version=$8 RETURNING *`,
  [id, accountId, title, content, status, edited ? 'manual' : current.method, alternate, current.version]);
  requireThat(row, 409, 'تغيّرت المذكرة أثناء الحفظ. أعد فتحها للمراجعة.');
  return row;
}

export async function memoDocx(memo) {
  const sections = memoDocuments(memo).map(({ language, body, title }) => {
    const rtl = language === 'ar';
    const textRun = (text, bold = false) => new TextRun({ text, rightToLeft: rtl, bold, boldComplexScript: bold,
      font: 'Cairo', size: 26, sizeComplexScript: 26, language: { value: language, bidirectional: 'ar-KW' } });
    const children = body.split('\n').filter(line => line.trim()).map((line, index) => {
      const role = memoLineRole(line, index, title, memo.memo_type);
      return new Paragraph({
        ...(role === 'title' ? { heading: HeadingLevel.TITLE } : {}),
        bidirectional: rtl, alignment: role === 'title' ? AlignmentType.CENTER : rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        keepNext: Boolean(role), spacing: { before: role === 'heading' ? 210 : 0, after: 115, line: 345 },
        children: [textRun(line, Boolean(role))],
      });
    });
    if (memo.status !== 'approved') children.unshift(new Paragraph({
      bidirectional: rtl, alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [textRun(format[language].draft, true)],
    }));
    return { properties: { page: { size: { width: 11906, height: 16838 },
      margin: { top: 1050, bottom: 1050, left: 1200, right: 1200 } } }, children };
  });
  return Packer.toBuffer(new Document({ title: memo.title, sections }));
}
