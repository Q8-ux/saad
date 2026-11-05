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
