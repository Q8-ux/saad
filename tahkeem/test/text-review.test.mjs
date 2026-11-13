import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reviewMemo, reviewText } from '../public/text-review.js';

test('review quotes the entered facts and treats a disputed payment as an issue to verify', () => {
  const input = 'ورد عقد إيجار. قال المستأجر إنه سدد ٥٠ د.ك. وأنكر الطرف الآخر السداد.';
  const result = reviewText(input, 'facts', 'ar');
  assert.ok(result.excerpts.some(excerpt => excerpt.includes('٥٠ د.ك.')));
  assert.ok(result.excerpts.every(excerpt => input.includes(excerpt)));
  assert.ok(result.inferences.some(text => text.includes('السداد')));
  assert.ok(result.verify.some(text => text.includes('تواريخ')));
  assert.doesNotMatch(JSON.stringify(result), /المادة\s*\d|ثبت السداد/u);
});

test('case review identifies unanswered submissions and differing amounts in the same currency', () => {
  const result = reviewMemo({
    facts: 'The claimant says KWD 150 was outstanding on 13 November 2026.',
    evidence: 'Copy of the bank receipt.',
    opponentGrounds: 'The opposing party disputes the outstanding balance.',
    requests: 'Order payment of KWD 100.',
  }, 'en');
  assert.ok(result.inferences.some(text => text.includes('different amounts')));
  assert.ok(result.verify.some(text => text.includes('reply')));
  assert.ok(result.excerpts.some(excerpt => excerpt.includes('13 November 2026')));
});

test('equivalent amounts are not flagged across Arabic and English notation', () => {
  const result = reviewMemo({
    facts: 'المبلغ المطلوب في المطالبة الأصلية ١٬٢٥٠٫٥٠ د.ك.',
    requests: 'طلب مبلغ 1,250.50 KWD.',
  }, 'ar');
  assert.ok(!result.inferences.some(text => text.includes('مبلغين مختلفين')));
  assert.deepEqual(reviewText(' ', 'facts', 'ar'), { excerpts: [], inferences: [], verify: [] });
});
