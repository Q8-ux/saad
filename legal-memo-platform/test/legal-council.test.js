'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { articleNumbers, isOfficialSource, auditArticleReferences, runLegalCouncil } = require('../legal-council');

const sources = [{
  title: 'قانون اختباري', reference: 'المادة (١٢)', excerpt: 'المادة ١٢\nهذا نص مقتطف اختباري.',
  sourceUrl: 'https://www.moj.gov.kw/ar/documents/mock.pdf', lawNumber: 1, lawYear: 2026,
}];

test('extracts Arabic and Western digits; deduplicates', () => {
  assert.deepEqual(articleNumbers('المادة (١٢) والمادة رقم 12 والمادة ٣'), [12, 3]);
});
test('rejects misleading domains and insecure sources', () => {
  assert.equal(isOfficialSource(sources[0].sourceUrl), true);
  assert.equal(isOfficialSource('https://moj.gov.kw.evil.example/law'), false);
  assert.equal(isOfficialSource('http://moj.gov.kw/law'), false);
});
test('matches heading citations, not passing references in an excerpt body', () => {
  const result = auditArticleReferences('المادة ١٢، والمادة ٥', [{ ...sources[0], excerpt: 'هذا شرح للمادة ٥.\nالمادة ١٢\nالنص' }]);
  assert.deepEqual(result.matchedToOfficialExcerpt, [12]);
  assert.deepEqual(result.unsupported, [5]);
});
test('does not pretend verification when official sources are absent', async () => {
  let calls = 0;
  const client = { responses: { create: async () => { calls++; return { output_text: '' }; } } };
  const result = await runLegalCouncil({ client, model: 'test', memo: 'المادة ١١', caseData: {}, sources: [] });
  assert.equal(result.reviewStatus, 'needs_review');
  assert.deepEqual(result.articleAudit.unsupported, [11]);
  assert.equal(calls, 0);
});
test('runs adversarial review and revision, always requires human approval', async () => {
  const calls = [];
  const client = { responses: { create: async request => {
    calls.push(request);
    return { output_text: calls.length === 1 ? 'ينقص الإثبات' : 'الوقائع\nالدفوع\nالمادة ١٢' };
  } } };
  const result = await runLegalCouncil({ client, model: 'test', memo: 'مذكرة أولية', caseData: { facts: 'واقعة' }, sources });
  assert.equal(calls.length, 2);
  assert.equal(result.reviewStatus, 'needs_review');
  assert.deepEqual(result.articleAudit.unsupported, []);
  assert.equal(result.memo.includes('المادة ١٢'), true);
});
test('flags unverified quotations presented as full law text', () => {
  const m = 'المادة ١٢: «نص غير موجود بالمصدر الرسمي المعروض»';
  const result = auditArticleReferences(m, sources);
  assert.equal(result.unverifiedLawQuotes.length, 1);
});

test('does not confuse the same article number in two different statutes', () => {
  const another = {...sources[0], title:'قانون آخر', lawNumber: 5, lawYear: 2015, excerpt:'المادة ١٢\nنص مادة من قانون مختلف'};
  const result = auditArticleReferences('وفق المادة ١٢ من القانون رقم 99 لسنة 2026.', [sources[0], another]);
  assert.deepEqual(result.matchedToOfficialExcerpt, []);
  assert.deepEqual(result.wrongLaw, ['12 / 99/2026']);
  assert.equal(result.publicationBlocked, true);
});

test('same numbered article without a law identity requires disambiguation', () => {
  const another = {...sources[0], title:'قانون آخر', lawNumber: 5, lawYear: 2015};
  const result = auditArticleReferences('المادة ١٢', [sources[0], another]);
  assert.deepEqual(result.ambiguous, [12]);
  assert.equal(result.publicationBlocked, true);
});

test('explicit statute identity resolves collision only for the cited law', () => {
  const another = {...sources[0], title:'قانون آخر', lawNumber: 5, lawYear: 2015};
  const result = auditArticleReferences('المادة ١٢ من القانون رقم 1 لسنة 2026', [sources[0], another]);
  assert.deepEqual(result.wrongLaw, []);
  assert.deepEqual(result.matchedToOfficialExcerpt, [12]);
  assert.equal(result.publicationBlocked, false);
});

test('missing law metadata does not give false certification', () => {
  const result = auditArticleReferences('المادة ١٢', [{...sources[0], lawNumber: null}]);
  assert.deepEqual(result.unverifiableLaw, [12]);
  assert.equal(result.publicationBlocked, true);
});

test('quotes must belong to the very statute cited, not another same-numbered statute', () => {
  const another = {...sources[0], title:'قانون مختلف', lawNumber: 7, lawYear: 2020,
    excerpt:'المادة ١٢\nالنص المختلف الذي لا ينطبق على المادة المعنية'};
  const result = auditArticleReferences(
    'المادة ١٢ من القانون رقم 1 لسنة 2026: «النص المختلف الذي لا ينطبق على المادة المعنية»',
    [sources[0], another],
  );
  assert.equal(result.unverifiedLawQuotes.length, 1);
  assert.equal(result.publicationBlocked, true);
});

test('council withholds unsafe revised memo and preserves case identity', async () => {
  let n = 0;
  const client = { responses: { create: async () => {
    n++;
    return {output_text: n === 1 ? 'تأكد من الطلب' : 'عميل آخر\nالمادة ١٢ من القانون رقم 99 لسنة 2026'};
  } } };
  const result = await runLegalCouncil({
    client, model: 'test', memo: 'اسم الموكل: عميل حقيقي\nالطلبات: رفض الدعوى',
    caseData: {clientName:'عميل حقيقي', requests:'رفض الدعوى'}, sources,
  });
  assert.equal(result.memo, '');
  assert.equal(result.publicationBlocked, true);
  assert.equal(result.reviewStatus, 'needs_review');
  assert.equal(n, 2);
});
