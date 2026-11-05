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

function unverifiedLawQuotes(memo, indexed) {
  // Only quoted passages explicitly introduced as statutory article text.
  const rx = /(?:المادة\s*(?:رقم\s*)?[0-9٠-٩۰-۹]{1,4})[^\n«”]{0,100}[«“"]([^»”"]{15,2500})[»”"]/g;
  const compact = text => String(text || '').replace(/\s+/g, ' ').trim();
  const invalid = [];
  for (const match of String(memo || '').matchAll(rx)) {
    if (!indexed.some(source => compact(source.excerpt).includes(compact(match[1])))) {
      invalid.push(compact(match[1]).slice(0, 140));
    }
  }
  return invalid;
}

function auditArticleReferences(memo, sources) {
  const indexed = verifiedSourceIndex(sources);
  const mentioned = articleNumbers(memo);
  const grounded = [...new Set(indexed.flatMap(source => source.articleNumbers))];
  return {
    mentioned,
    matchedToOfficialExcerpt: mentioned.filter(n => grounded.includes(n)),
    unsupported: mentioned.filter(n => !grounded.includes(n)),
    sourceCount: indexed.length,
    unverifiedLawQuotes: unverifiedLawQuotes(memo, indexed),
    // Match is NOT proof of the full law's text, attribution or current applicability.
    requiresEffectiveDateCheck: true,
  };
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
      memo: original,
      reviewStatus: 'needs_review',
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
  const warnings = [
    'المراجعة الآلية لا تثبت صحة النص الكامل للمادة أو آخر تعديل؛ يتطلب الاعتماد مراجعة قانونية بشرية.',
  ];
  if (articleAudit.unverifiedLawQuotes.length) {
    warnings.push('ورد نقل حرفي غير مطابق للمقتطفات الرسمية المتاحة (' + articleAudit.unverifiedLawQuotes.length + ').');
  }
  if (articleAudit.unsupported.length) {
    warnings.push('إحالات غير متحققة إلى المواد: ' + articleAudit.unsupported.join('، ') + '. لا تعتمد النص قبل تصحيحها.');
  }
  return { memo: revisedMemo, reviewStatus: 'needs_review', review, articleAudit, warnings };
}

module.exports = { articleNumbers, isOfficialSource, verifiedSourceIndex, auditArticleReferences, runLegalCouncil };
