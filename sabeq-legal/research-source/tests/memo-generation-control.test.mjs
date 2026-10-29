import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';
const { reviewLegalCitations: review } = load('../lib/legal-citation-review.ts');
// Entirely invented article identities and prose; these are not legal authorities.
const textA = 'يسترد طرف الاختبار بدل الخدمة إذا لم تقدم الخدمة المتفق عليها.';
const textB = 'يقدم طرف الاختبار المستند المطلوب خلال مدة الاختبار.';
function source(article, number = 98765, year = 2000, text = textA) {
  return { documentId: number, title: 'قانون الاختبار ألف', text, lawNumber: number, lawYear: year,
    corpus: { scope: 'bound_file_only', sourceId: 'user-legislation-source', sourceSha256: '8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd', articleIdentityUnique: true, articleNumber: article, lawIdentity: { number, year } } };
}
const base = source('12');
const repeated = source('12 مكرر');
const lettered = source('12 مكرر أ');
const second = { ...source('13', 98766, 2001, textB), title: 'قانون الاختبار باء' };
const options = { courtDocument: true, requireJudgmentAnalogy: true };

test('base article accepts Arabic, Persian and Latin digit formatting', () => {
  for (const number of ['12', '(١٢)', '（۱۲）']) {
    assert.equal(review(`المادة ${number} من القانون رقم 98765 لسنة 2000 【م1】`, [base], options).ok, true);
  }
});
test('parentheses cannot turn an unverified repeated article into a verified base article', () => {
  for (const number of ['(12) مكرر', '(١٢) مكررا', '（۱۲） مكررة']) {
    assert.equal(review(`المادة ${number} من القانون رقم 98765 لسنة 2000 【م1】`, [base], options).ok, false, number);
  }
});
test('lettered repeated articles do not borrow the unlettered or another letter identity', () => {
  for (const number of ['12 مكرر أ', '12 مكرر (أ)', '(12) مكررا (ب)']) {
    assert.equal(review(`المادة ${number} 【م1】`, [repeated], options).ok, false, number);
  }
  assert.equal(review('المادة 12 مكرر (ب) 【م1】', [lettered], options).ok, false);
});
test('matching lettered repeated articles tolerate formatting without losing the letter', () => {
  for (const number of ['12 مكرر أ', '12 مكرر (أ)', '(١٢) مكررا (أ)', '(12 مكررة أ)']) {
    assert.equal(review(`المادة ${number} من القانون رقم 98765 لسنة 2000 【م1】`, [lettered], options).ok, true, number);
  }
});
test('each member of an article list retains its own repeated suffix', () => {
  const evidence = [base, source('13 مكرر')];
  assert.equal(review('المواد 12 و13 مكرر من القانون رقم 98765 لسنة 2000 【م1】【م2】', evidence, options).ok, true);
});
test('two trailing source markers cannot hide articles swapped between their laws', () => {
  const swapped = 'المادة 13 من القانون رقم 98765 لسنة 2000 والمادة 12 من القانون رقم 98766 لسنة 2001 【م1】【م2】';
  assert.equal(review(swapped, [base, second], options).ok, false);
  const correct = 'المادة 12 من القانون رقم 98765 لسنة 2000 والمادة 13 من القانون رقم 98766 لسنة 2001 【م1】【م2】';
  assert.equal(review(correct, [base, second], options).ok, true);
});
test('law-before-article clauses retain their own law identity', () => {
  const correct = 'القانون رقم 98765 لسنة 2000، المادة 12؛ والقانون رقم 98766 لسنة 2001، المادة 13 【م1】【م2】';
  const swapped = 'القانون رقم 98765 لسنة 2000، المادة 13؛ والقانون رقم 98766 لسنة 2001، المادة 12 【م1】【م2】';
  assert.equal(review(correct, [base, second], options).ok, true);
  assert.equal(review(swapped, [base, second], options).ok, false);
});
test('an article list can share an explicit following law', () => {
  assert.equal(review('المواد 12 و13 من القانون رقم 98765 لسنة 2000 【م1】【م2】', [base, source('13')], options).ok, true);
});
test('a correct article number cannot authenticate a fabricated statutory quotation', () => {
  const result = review('تنص المادة 12 من القانون رقم 98765 لسنة 2000 على «يسقط حق طرف الاختبار في جميع الأحوال» 【م1】', [base], options);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(i => i.code === 'unverified_quote'));
});
test('a quote cannot borrow text from another selected article', () => {
  assert.equal(review(`تنص المادة 12 من القانون رقم 98765 لسنة 2000 على «${textB}» 【م1】【م2】`, [base, second], options).ok, false);
});
test('literal statutory quotes tolerate Arabic formatting and remain tied to the owning article', () => {
  assert.equal(review(`تنص المادة (١٢) من القانون رقم 98765 لسنة 2000 على «${textA}» 【م1】`, [base], options).ok, true);
  assert.equal(review(`نصت المادة ١٢ على: "${textA}" 【م1】`, [base], options).ok, true);
});
test('missing sources, unknown markers and drafting-ineligible records remain rejected', () => {
  assert.equal(review('المادة 12', [], options).ok, false);
  assert.equal(review('المادة 12 【م99】', [base], options).ok, false);
  assert.equal(review('المادة 12 【م1】', [{ ...base, corpus: { ...base.corpus, draftingEligible: false } }], options).ok, false);
});

