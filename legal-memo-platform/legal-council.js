'use strict';

// SABEQ legal council: server-side multi-role review, not browser automation.
const ARTICLE_RE = /(?:المادة|المادتان|المادتين)\s*(?:رقم\s*)?[\[(（]?\s*([0-9٠-٩۰-۹]{1,4})/g;
const HEADER_RE = /(?:^|\n)\s*المادة\s*(?:رقم\s*)?[\[(（]?\s*([0-9٠-٩۰-۹]{1,4})/gm;
const MAX_MEMO = 50000;

function digitNormalize(value) {
  return String(value || '').replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
}

function articleNumbers(value, pattern = ARTICLE_RE) {
  const found = new Set();
  const text = digitNormalize(value);
  for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
    const n = Number(m[1]);
    if (Number.isInteger(n) && n > 0) found.add(n);
  }
  return [...found];
}

function isOfficialSource(url) {
  try {
    const parsed = new URL(String(url || ''));
    return parsed.protocol === 'https:' &&
      (parsed.hostname.toLowerCase() === 'moj.gov.kw' || parsed.hostname.toLowerCase().endsWith('.moj.gov.kw'));
  } catch { return false; }
}

function verifiedSourceIndex(sources = []) {
  if (!Array.isArray(sources)) return [];
  return sources.filter(source => isOfficialSource(source?.sourceUrl))
    .map(source => ({
      title: String(source.title || '').slice(0, 240),
      sourceUrl: String(source.sourceUrl || ''),
      reference: String(source.reference || '').slice(0, 200),
      excerpt: String(source.excerpt || '').slice(0, 4500),
      lawNumber: source.lawNumber ?? null,
      lawYear: source.lawYear ?? null,
    })).filter(source => source.excerpt.trim())
    .map(source => ({
      ...source,
      // A passing mention of an article in the body is NOT an article source.
      articleNumbers: [...new Set([
        ...articleNumbers(source.reference),
        ...articleNumbers(source.excerpt, HEADER_RE),
      ])],
    }));
}

// A bare article number is not an identity: article 12 can exist in many laws.
// Tie the number to the same named law/year and the same returned official excerpt.
const LAW_ID_RE = /(?:المرسوم\s+بقانون|القانون|قانون)\s*(?:رقم\s*)?([0-9٠-٩۰-۹]{1,5})\s*(?:لسنة|لسنه|لعام|\/)\s*([0-9٠-٩۰-۹]{4})/g;
const ARTICLE_MATCH_RE = /(?:المادة|المادتان|المادتين)\s*(?:رقم\s*)?[\[(（]?\s*([0-9٠-٩۰-۹]{1,4})/g;
function lawIdentity(source) {
  const number = Number(digitNormalize(source.lawNumber));
  const year = Number(digitNormalize(source.lawYear));
  return Number.isInteger(number) && number > 0 && Number.isInteger(year) && year >= 1900
    ? number + '/' + year : null;
}
function normalizeQuote(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}
function citationContexts(memo) {
  const paragraphs = String(memo || '').split(/[\n]+/);
  const results = [];
  for (const paragraph of paragraphs) {
    const normalized = digitNormalize(paragraph);
    const laws = [...normalized.matchAll(new RegExp(LAW_ID_RE.source, LAW_ID_RE.flags))].map(m => ({
      index: m.index, end: m.index + m[0].length, identity: Number(m[1]) + '/' + Number(m[2]),
    }));
    const articles = [...normalized.matchAll(new RegExp(ARTICLE_MATCH_RE.source, ARTICLE_MATCH_RE.flags))];
    for (let i = 0; i < articles.length; i++) {
      const match = articles[i];
      const number = Number(match[1]);
      const next = articles[i + 1]?.index ?? paragraph.length;
      const after = laws.find(l => l.index >= match.index + match[0].length && l.index < Math.min(next, match.index + 170));
      const before = [...laws].reverse().find(l => l.end <= match.index && match.index - l.end < 100);
      const linked = after || before || null;
      results.push({ number, lawIdentity: linked?.identity || null, fragment: paragraph.slice(match.index, next).slice(0, 1000) });
    }
  }
  return results.filter(item => Number.isInteger(item.number) && item.number > 0);
}
function unverifiedLawQuotes(contexts, indexed) {
  const invalid = [];
  const rx = /[«“"]([^»”"]{12,2500})[»”"]/g;
  for (const context of contexts) {
    const candidates = indexed.filter(source =>
      source.articleNumbers.includes(context.number) &&
      (!context.lawIdentity || lawIdentity(source) === context.lawIdentity));
    for (const match of context.fragment.matchAll(new RegExp(rx.source, rx.flags))) {
      const quote = normalizeQuote(match[1]);
      if (!candidates.some(source => normalizeQuote(source.excerpt).includes(quote))) {
        invalid.push(quote.slice(0, 140));
      }
    }
  }
  return [...new Set(invalid)];
}

function auditArticleReferences(memo, sources) {
  const indexed = verifiedSourceIndex(sources);
  const contexts = citationContexts(memo);
  const mentioned = [...new Set(contexts.map(item => item.number))];
  const unsupported = [], ambiguous = [], wrongLaw = [], unverifiableLaw = [];
  const matchedToOfficialExcerpt = new Set();
  for (const claim of contexts) {
    const candidates = indexed.filter(item => item.articleNumbers.includes(claim.number));
    if (!candidates.length) { unsupported.push(claim.number); continue; }
    if (claim.lawIdentity) {
      const correct = candidates.filter(item => lawIdentity(item) === claim.lawIdentity);
      if (!correct.length) { wrongLaw.push(claim.number + ' / ' + claim.lawIdentity); continue; }
      matchedToOfficialExcerpt.add(claim.number);
    } else {
      const identities = [...new Set(candidates.map(lawIdentity))];
      if (identities.includes(null)) unverifiableLaw.push(claim.number);
      else if (identities.length > 1) ambiguous.push(claim.number);
      else matchedToOfficialExcerpt.add(claim.number);
    }
  }
  const unverifiedLawQuotes = unverifiedLawQuotesForAudit(contexts, indexed);
  const unique = values => [...new Set(values)];
  const audit = {
    mentioned,
    matchedToOfficialExcerpt: [...matchedToOfficialExcerpt],
    unsupported: unique(unsupported),
    ambiguous: unique(ambiguous),
    wrongLaw: unique(wrongLaw),
    unverifiableLaw: unique(unverifiableLaw),
    sourceCount: indexed.length,
    unverifiedLawQuotes,
    requiresEffectiveDateCheck: true,
  };
  audit.publicationBlocked = Boolean(audit.unsupported.length || audit.ambiguous.length ||
    audit.wrongLaw.length || audit.unverifiableLaw.length || audit.unverifiedLawQuotes.length);
  return audit;
}
const unverifiedLawQuotesForAudit = unverifiedLawQuotes;

function importantFieldsChanged(original, revised, caseData = {}) {
  const fields = ['clientName', 'otherParty', 'caseNumber', 'requests'];
  return fields.filter(field => {
    const value = String(caseData[field] || '').trim();
    return value.length >= 3 && original.includes(value) && !revised.includes(value);
  });
}

async function runLegalCouncil({ client, model, memo, caseData, sources = [] }) {
  if (!client?.responses?.create) throw new TypeError('Server-side AI client is required');
  const original = String(memo || '').trim().slice(0, MAX_MEMO);
  if (!original) throw new Error('Memo is empty');
  const indexed = verifiedSourceIndex(sources);
  const sourceList = indexed.map(({ title, sourceUrl, reference, excerpt, lawNumber, lawYear }) =>
    ({ title, sourceUrl, reference, excerpt, lawNumber, lawYear }));
  if (!indexed.length) {
    return {
      memo: '',
      reviewStatus: 'needs_review',
      publicationBlocked: true,
      review: 'تعذر التحقق من أرقام المواد ونصوصها لغياب مقتطفات رسمية قابلة للاستشهاد.',
      articleAudit: auditArticleReferences(original, []),
      warnings: ['لا مصادر تشريعية رسمية متاحة؛ لا يجوز اعتماد أي إحالة إلى مادة بوصفها موثقة.'],
    };
  }

  // Critic: opposing-counsel perspective. Uses the already configured AI provider.
  const critique = await client.responses.create({
    model,
    instructions: [
      'أنت مراجع خصم متخصص في القانون الكويتي. راجع مسودة المذكرة لمصلحة الجودة لا لمصلحة طرف الخصومة.',
      'اكتشف الدفوع التي لا تتصل بالوقائع، والتناقضات والأرقام غير المسندة، والفجوات في الإثبات.',
      'راجع كل إحالة إلى مادة قانونية على ضوء مقتطفات المصادر الرسمية المعطاة فقط.',
      'تمييز مهم: وجود مقتطف لا يثبت أن المادة كاملة أو أن صياغتها نافذة اليوم.',
      'لا تخترع رقم مادة أو نصاً حرفياً أو حكماً أو مستنداً أو واقعة. اكتب ملاحظات عملية موجزة بالعربية.',
    ].join(' '),
    input: JSON.stringify({ memo: original, caseData, officialExcerpts: sourceList }),
    temperature: 0.1,
  });
  const review = String(critique?.output_text || '').trim().slice(0, 12000);
  if (!review) throw new Error('Reviewer returned no text');

  // Synthesizer: revises the draft while preserving the original facts and requests.
  const revision = await client.responses.create({
    model,
    instructions: [
      'أنت محرر المذكرات لمجموعة سابق القانونية. حسّن المسودة حسب تدقيق المراجع، دون اختلاق.',
      'الترتيب: الديباجة وبيانات المحكمة والأطراف، الوقائع المرقمة زمنياً، الدفوع القانونية المرقمة مع التطبيق،',
      'الرد على حجج الخصم إن وجدت، الطلبات الأصلية والاحتياطية عند وجود سند، ثم حافظة المستندات إن وجدت.',
      'لا تنسب نصاً كاملاً لمادة إذا كان المتاح مقتطفاً فقط. لا تضع رقم مادة غير مذكور صراحة في مصدر رسمي.',
      'النقل الحرفي للنص التشريعي لا يكون إلا من المصدر المعطى وبحدوده، وإلا اشرح المبدأ دون ادعاء النقل.',
      'لا تضف طلبات أو مستندات أو وقائع أو أحكام تمييز من عندك.',
      'أخرج نص المذكرة فقط بالعربية، بلا تعليقات داخلها ولا عبارة أن المسودة ولّدتها أداة.',
    ].join(' '),
    input: JSON.stringify({ originalMemo: original, critique: review, caseData, officialExcerpts: sourceList }),
    temperature: 0.1,
  });
  const revisedMemo = String(revision?.output_text || '').trim();
  if (!revisedMemo) throw new Error('Reviser returned no text');
  const articleAudit = auditArticleReferences(revisedMemo, indexed);
  const changedFields = importantFieldsChanged(original, revisedMemo, caseData);
  const warnings = [
    'المراجعة الآلية لا تثبت صحة النص الكامل للمادة أو آخر تعديل؛ يتطلب الاعتماد مراجعة قانونية بشرية.',
  ];
  if (articleAudit.unverifiedLawQuotes.length) {
    warnings.push('ورد نقل حرفي غير مطابق للمقتطفات الرسمية المتاحة (' + articleAudit.unverifiedLawQuotes.length + ').');
  }
  if (articleAudit.unsupported.length) {
    warnings.push('إحالات غير متحققة إلى المواد: ' + articleAudit.unsupported.join('، ') + '. لا تعتمد النص قبل تصحيحها.');
  }
  if (articleAudit.wrongLaw.length) warnings.push('هوية القانون لا تطابق المصدر: ' + articleAudit.wrongLaw.join('، '));
  if (articleAudit.ambiguous.length) warnings.push('أرقام مواد مشتركة بين قوانين متعددة: ' + articleAudit.ambiguous.join('، '));
  if (articleAudit.unverifiableLaw.length) warnings.push('تعذر تحديد القانون المالك للمادة: ' + articleAudit.unverifiableLaw.join('، '));
  if (changedFields.length) warnings.push('تم تغيير بيانات جوهرية في الصياغة: ' + changedFields.join('، '));
  const publicationBlocked = articleAudit.publicationBlocked || changedFields.length > 0;
  return {
    memo: publicationBlocked ? '' : revisedMemo,
    reviewStatus: 'needs_review',
    publicationBlocked,
    review,
    articleAudit,
    warnings,
  };
}

module.exports = { articleNumbers, isOfficialSource, verifiedSourceIndex, auditArticleReferences, runLegalCouncil, citationContexts, importantFieldsChanged };
