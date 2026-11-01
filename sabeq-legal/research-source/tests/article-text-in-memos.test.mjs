import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';

// Fictional law, article and wording: software fixtures, never legal authorities.
const text = 'نص اصطناعي يلزم طرف الاختبار بتقديم المستند ولا يمثل قاعدة قانونية حقيقية.';
const source = { documentId: 1, title: 'قانون اختباري غير حقيقي', lawNumber: 98765, lawYear: 2000, text,
  corpus: { scope: 'bound_file_only', sourceId: 'user-legislation-source', sourceSha256: '8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd', articleIdentityUnique: true, articleNumber: '12 مكرر أ', completeArticleVerified: false, lawIdentity: { number: 98765, year: 2000 } } };
const input = { facts: 'واقعة افتراضية فقط.', requests: 'تقديم المستند فقط دون إضافة طلبات أخرى.' };
const content = { ...input, grounds: 'تطبيق القاعدة على واقعة الاختبار 【م1】', factualNotes: [], legalResearchNotes: '', fields: {} };
const bound = load('../lib/bound-draft.ts');
const { reviewLegalCitations: review } = load('../lib/legal-citation-review.ts');
const options = { courtDocument: true, requireArticleText: true };

test('memo gate rejects an article number alone and accepts the source text added by the server', () => {
  const missing = review('المادة 12 مكرر أ من القانون رقم 98765 لسنة 2000 【م1】', [source], options);
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some(i => i.code === 'missing_article_text'));
  const result = bound.prepareBoundDraft(content, input, [source]);
  assert.ok(result.grounds.includes(`«${text}»`));
  assert.match(result.grounds, /مقتطف/);
  assert.equal(review(result.grounds, [source], options).ok, true);
  assert.equal(bound.prepareBoundDraft(result, input, [source]).grounds, result.grounds);
  assert.equal(result.facts, input.facts);
  assert.equal(result.requests, input.requests);
});

test('missing or excluded source text never becomes an apparently complete article', () => {
  for (const item of [{ ...source, text: '' }, { ...source, corpus: { ...source.corpus, draftingEligible: false } }, { ...source, corpus: { ...source.corpus, sourceSha256: '0'.repeat(64) } }]) {
    const result = bound.prepareBoundDraft(content, input, [item]);
    assert.ok(!result.grounds.includes(`«${text}»`));
    assert.equal(review(result.grounds, [item], options).ok, false);
  }
});

test('a correct inserted text cannot hide an incorrect article, law or fabricated model quote', () => {
  for (const grounds of ['المادة 99 من القانون رقم 98765 لسنة 2000 【م1】', 'المادة 12 مكرر أ من القانون رقم 98766 لسنة 2000 【م1】', 'تنص المادة 12 مكرر أ على «نص مختلق لا أصل له» 【م1】']) {
    const result = bound.prepareBoundDraft({ ...content, grounds }, input, [source]);
    assert.equal(review(result.grounds, [source], options).ok, false, grounds);
  }
});

test('verbatim statutory cross references and multiple lines are quoted without inventing separate authorities', () => {
  const item = { ...source, text: 'مادة 12 مكرر أ\nنص اصطناعي يحيل إلى المادة 9876 من القانون رقم 98766 لسنة 2001.\nيحفظ المستند في اختبار البرمجيات.' };
  const result = bound.prepareBoundDraft(content, input, [item]);
  assert.ok(result.grounds.includes(item.text.replace(/\s+/g, ' ')));
  assert.equal(review(result.grounds, [item], options).ok, true);
});

test('an unreviewed candidate continuation and PDF bookkeeping are not published as article wording', () => {
  const item = { ...source, text: `${text}\n[استمرار موضع المادة؛ صفحة PDF 13؛ الحدود تحتاج مراجعة]\nاستمرار اصطناعي غير مراجع.`, corpus: { ...source.corpus, continuationPage: 13 } };
  const result = bound.prepareBoundDraft(content, input, [item]);
  assert.ok(result.grounds.includes(`«${text}»`));
  assert.doesNotMatch(result.grounds, /صفحة PDF|استمرار اصطناعي|نصها الكامل/);
  assert.equal(review(result.grounds, [item], options).ok, true);
});

test('only explicit completeness review changes the excerpt label; nested quotation marks stay verbatim', () => {
  const item = { ...source, text: 'نص اختبار يتضمن «اقتباساً اصطناعياً» دون تغيير حروفه.', corpus: { ...source.corpus, completeArticleVerified: true } };
  const result = bound.prepareBoundDraft(content, input, [item]);
  assert.ok(result.grounds.includes(`“${item.text}”`));
  assert.doesNotMatch(result.grounds, /مقتطف/);
  assert.equal(review(result.grounds, [item], options).ok, true);
  assert.equal(bound.prepareBoundDraft(result, input, [item]).grounds, result.grounds);
});
