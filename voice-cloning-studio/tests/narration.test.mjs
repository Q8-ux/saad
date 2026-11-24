import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNarration, narrationBrief} from '../narration.mjs';

const letters = text => text.replace(/[\u064B-\u065F\u0670]/gu, '');

test('speech copy preserves approved words, negation, numbers and event order', () => {
  const original = 'لم يدفع شمشون 2.500 دينار. ثم سأل دليلة.\nلم يرسل رقم 17 إلى أحد.';
  const plan = prepareNarration(original);
  assert.equal(plan.originalText, original);
  assert.equal(letters(plan.speechText), original);
  assert.deepEqual(plan.pronunciationEdits.map(x => x.word), ['شمشون', 'دليلة']);
  assert.equal(plan.voice.newSpeakerSelected, false);
  assert.equal(plan.preparation.weightsModified, false);
  assert.equal(plan.review.clone, 'not_started');
});

test('limited name pronunciation is idempotent and does not touch other words', () => {
  const original = 'شمشوني وشمشون شَمْشُون دَلِيلَة دليل دليلة';
  const first = prepareNarration(original);
  assert.equal(first.speechText, 'شمشوني وشمشون شَمْشُون دَلِيلَة دليل دَلِيلَة');
  assert.equal(prepareNarration(first.speechText).speechText, first.speechText);
});

test('Kuwaiti narration retains dialect and confines any rewrite to a separate brief', () => {
  const original = 'هلا والله شلونكم؟ ما يصير ندخل حساب العميل لأن معلوماته خاصة.';
  const plan = prepareNarration(original, 'qisas-kuwaiti');
  assert.equal(plan.speechText, original);
  assert.equal(plan.language, 'ar');
  assert.match(narrationBrief(plan), /اللهجة الكويتية/);
  assert.match(narrationBrief(plan), /لا تستبدل النص المعتمد تلقائيًا/);
  assert.ok(narrationBrief(plan).includes(JSON.stringify(original)));
});

test('reject invalid input before model load', () => {
  for (const value of ['', '  ', null, 15, 'ن'.repeat(2001)]) assert.throws(() => prepareNarration(value));
  assert.throws(() => prepareNarration('نص', '__proto__'));
});
