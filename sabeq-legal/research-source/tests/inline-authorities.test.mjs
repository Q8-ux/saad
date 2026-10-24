import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { load, templateHarness } from './template-harness.mjs';

// Invented identities and prose for behaviour tests, never real authorities.
const base = { documentId: 1, title: 'قانون اختباري غير حقيقي', text: 'نص اصطناعي طويل لاختبار الاستناد ولا يمثل أي قاعدة قانونية حقيقية.', lawNumber: 98765, lawYear: 2000, category: '', reference: 'صفحة PDF 12', sourceUrl: '', officialSource: 'مصدر اختبار', sourceType: 'user_document', documentType: 'تشريع', qualityScore: 0 };
const article = { ...base, corpus: { scope: 'bound_file_only', sourceId: 'user-legislation-source', sourceSha256: '8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd', articleIdentityUnique: true, articleNumber: '9', page: 12, lawIdentity: { number: 98765, year: 2000 } } };
const quote = 'مبدأ اصطناعي لاختبار موضع بيانات الاستناد فقط، ولا ينسب إلى أي حكم قضائي حقيقي.';
const judgment = { ...base, documentId: 2, text: quote, corpus: undefined, judgment: { scope: 'uploaded_judgments_only', recordId: 'synthetic-record', sourceKind: 'judicial_digest', sourceBook: 'synthetic-book', sourceSha256: 'a'.repeat(64), pdfPage: 34, printedPage: 30, appealNumber: 987654, appealYear: 1999, decisionDate: '2001-02-03', chamber: 'تجاري', court: 'محكمة التمييز', quote, quoteSha256: createHash('sha256').update(quote).digest('hex'), reviewStatus: 'source_page_matched', reviewedAt: '2026-10-01', currentAuthorityVerified: false, analogy: { issue: 'مسألة اصطناعية', factQuote: 'واقعة اصطناعية', reason: 'مطابقة اصطناعية لاختبار البرمجيات', differences: 'لا يمثل هذا الاختبار تطابق قضية حقيقية' } } };
const evidence = [article, judgment];
const facts = 'يدور نزاع افتراضي مع وزارة العدل بشأن رابط https://example.org/contract. طلب مستند أصلي دون إضافة طلبات أخرى.';
const input = { clientName: 'شخص الاختبار', partyRole: 'مدعى عليه', otherParty: 'خصم افتراضي', court: 'المحكمة الكلية', caseType: 'مدني', caseNumber: '0000/2026', facts, requests: 'تقديم الأصول فقط دون إضافة طلبات أخرى.', clientAddress: 'عنوان اختبار', otherAddress: 'عنوان افتراضي' };
const content = { facts, grounds: 'تطبيق النص على الواقعة الاصطناعية 【م1】\nتطبيق المبدأ على المسألة الاصطناعية 【م2】', requests: input.requests, fields: {}, factualNotes: [], legalResearchNotes: '' };
const bound = load('../lib/bound-draft.ts');
const citation = load('../lib/legal-citation-review.ts');
const doc = load('../lib/pleading-document.ts');
const word = load('../lib/pleading-docx.ts');

test('available legal identities are in the body without PDF provenance; preparation is idempotent', () => {
  const result = bound.prepareBoundDraft(content, input, evidence);
  assert.match(result.grounds, /المادة 9 من قانون اختباري غير حقيقي، القانون رقم 98765 لسنة 2000/);
  assert.match(result.grounds, /محكمة التمييز.*الطعن رقم 987654 لسنة 1999.*جلسة 03\/02\/2001/);
  assert.doesNotMatch(result.grounds, /صفحة PDF/);
  assert.equal(result.facts, facts);
  assert.equal(result.requests, input.requests);
  assert.equal(bound.prepareBoundDraft(result, input, evidence).grounds, result.grounds);
  assert.equal(citation.reviewLegalCitations(result.grounds, evidence, { requireJudgmentAnalogy: true, courtDocument: true }).ok, true);
});

test('hidden markers are still checked before presentation and cannot manufacture authority', () => {
  const options = { requireJudgmentAnalogy: true, courtDocument: true };
  for (const text of ['المادة 9999 من قانون مزعوم 【م1】', 'استقر قضاء محكمة التمييز على قاعدة مزعومة 【م99】']) {
    assert.equal(citation.reviewLegalCitations(text, evidence, options).ok, false);
  }
  const unreviewed = { ...judgment, judgment: undefined };
  const result = bound.prepareBoundDraft({ ...content, grounds: 'استقر قضاء محكمة التمييز على ذلك 【م1】' }, input, [unreviewed]);
  assert.doesNotMatch(result.grounds, /987654/);
  assert.equal(citation.reviewLegalCitations(result.grounds, [unreviewed], options).ok, false);
});

test('court drafting rejects a portal bibliography without confusing a substantive party name', () => {
  const options = { courtDocument: true };
  for (const text of ['المرجع: منشورات وزارة العدل الكويتية، القاعدة 123.', 'المصدر: https://example.org/law.pdf', 'راجع موقع وزارة العدل لإثبات هذا الدفع.', '- المصدر: بوابة البحث.', 'استناد في صفحة PDF 12', 'استناد في صفحات PDF 12–13', 'مبدأ اصطناعي (المصدر: منشورات وزارة العدل)']) {
    assert.equal(citation.reviewLegalCitations(text, evidence, options).ok, false, text);
  }
  assert.equal(citation.reviewLegalCitations('تتمسك وزارة العدل، بصفتها خصماً في النزاع الافتراضي، بطلب الأصول.', evidence, options).ok, true);
});

test('claim, appeal and defence retain substantive facts and legal identities across text, HTML and Word', async t => {
  const h = templateHarness();
  t.after(h.cleanup);
  const prepared = bound.prepareBoundDraft(content, input, evidence);
  const folder = new URL('../tmp/inline-authorities-qa/', import.meta.url);
  mkdirSync(folder, { recursive: true });
  for (const kind of ['claim', 'appeal', 'memorandum']) {
    const template = await h.templates.loadApprovedTemplate(kind === 'appeal' ? 'appeal' : 'claim');
    const result = doc.buildPleadingDocument(template.info, template.definition, kind, input, prepared);
    const text = doc.pleadingText(result);
    const html = doc.renderPleadingHtml(result);
    const bytes = word.exportPleadingDocx(result);
    const xml = new TextDecoder().decode(bytes);
    for (const rendered of [JSON.stringify(result.pages), text, html, xml]) {
      assert.doesNotMatch(rendered, /【م\d+】|\[م\d+\]|صفحة PDF|المصدر:|المرجع:/);
      assert.match(rendered, /987654/);
      assert.match(rendered, /98765/);
      assert.match(rendered, /وزارة العدل/);
      assert.match(rendered, /https:\/\/example.org\/contract/);
    }
    assert.ok(text.includes(facts));
    assert.ok(text.includes(input.requests));
    writeFileSync(new URL(`${kind}.docx`, folder), bytes);
    writeFileSync(new URL(`${kind}.html`, folder), html);
  }
});

test('historical research annotations are removed without dropping the adjacent court citation', () => {
  const pages = [{ blocks: [{ text: 'مبدأ اصطناعي (تمييز تجاري؛ الطعن رقم 987654 لسنة 1999؛ جلسة 03/02/2001؛ صفحة PDF 34)【م1】\nالمرجع: منشورات وزارة العدل الكويتية، القاعدة 123.' }] }];
  const cleaned = JSON.stringify(doc.presentationPleadingPages(pages));
  assert.match(cleaned, /الطعن رقم 987654 لسنة 1999/);
  assert.doesNotMatch(cleaned, /【م1】|صفحة PDF|المرجع:|القاعدة 123/);
  assert.equal(JSON.stringify(doc.presentationPleadingPages(doc.presentationPleadingPages(pages))), cleaned);
});

test('the shared court drafting instructions bind evidence to facts and keep research bookkeeping out', () => {
  assert.equal(typeof bound.pleadingAuthorityInstructions, 'string');
  assert.match(bound.pleadingAuthorityInstructions, /الواقعة/);
  assert.match(bound.pleadingAuthorityInstructions, /لا.*(?:تخترع|تنشئ)/);
  assert.match(bound.pleadingAuthorityInstructions, /هوامش/);
});
