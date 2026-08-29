import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanArabicLegalText,
  inspectLegalText,
  isUsableIndexedLegalText,
  legalTextFingerprint,
  needsLegalTextFallback,
} from "../lib/legal-text.ts";

const noisyLawText =
  "قانون الأحوال الشخصية الجعفرية الصادر بالقانون رقم 124 لسنة 2019 ined وعلى المرسوم obs ثم أصدرنا Bay مشروع ORY المرسوم Anat ونصه GY";

test("detects interleaved OCR fragments in Arabic legal text", () => {
  const noise = inspectLegalText(noisyLawText);
  assert.ok(noise.arabicCharacters >= 20);
  assert.ok(noise.latinTokens >= 3);
  assert.equal(needsLegalTextFallback(noisyLawText), true);
  assert.equal(isUsableIndexedLegalText(noisyLawText), false);
});

test("removes unrelated Latin OCR fragments from Arabic results", () => {
  const cleaned = cleanArabicLegalText(noisyLawText);
  assert.doesNotMatch(cleaned, /ined|obs|Bay|ORY|Anat|GY/);
  assert.match(cleaned, /القانون رقم 124 لسنة 2019/);
});

test("does not alter a genuinely English-dominant legal passage", () => {
  const english = "Article 12. The parties shall comply with the agreement.";
  assert.equal(cleanArabicLegalText(english), english);
  assert.equal(needsLegalTextFallback(english), false);
});

test("rejects an OCR passage dominated by a repeated PDF header", () => {
  const repeatedHeader =
    "التشريعات الكويتية ".repeat(24) +
    "شكر وتقدير للنص القانوني المفهرس داخل المكتبة.";

  assert.equal(needsLegalTextFallback(repeatedHeader), true);
  assert.equal(isUsableIndexedLegalText(repeatedHeader), false);
});

test("keeps a readable indexed Arabic passage", () => {
  const passage =
    "المادة الأولى: تسري أحكام هذا القانون على العقود التي تنشأ صحيحة وفقاً للقواعد القانونية، ويلتزم كل طرف بتنفيذ ما تعهد به بحسن نية.";

  assert.equal(isUsableIndexedLegalText(passage), true);
});

test("removes safe bullet glyphs but rejects broken PDF character maps", () => {
  const bulletPassage =
    "المادة الأولى: يلتزم الطرفان بتنفيذ العقد بحسن نية. \uf0b7 ولا يخل ذلك بالضمانات المقررة قانوناً.";
  const brokenCharacterMap =
    "المادة الأولى: يلتزم الطرفان بالتنفيذ \u0003ŔƅŕƂšŊ على الوجه الذي يقرره القانون.";

  assert.match(cleanArabicLegalText(bulletPassage), /•/);
  assert.equal(needsLegalTextFallback(bulletPassage), false);
  assert.equal(needsLegalTextFallback(brokenCharacterMap), true);
  assert.equal(isUsableIndexedLegalText(brokenCharacterMap), false);
});

test("rejects interleaved columns and fragmented Arabic OCR", () => {
  const interleavedColumns =
    "المادة الأولى | يلتزم الطرف الأول | بتنفيذ التزامه | خلال المدة | المقررة قانوناً | دون إخلال.";
  const fragmented = Array.from({ length: 72 }, (_, index) =>
    index % 2 ? "و" : "ا",
  ).join(" ");

  assert.equal(needsLegalTextFallback(interleavedColumns), true);
  assert.equal(needsLegalTextFallback(fragmented), true);
});

test("builds the same fingerprint for harmless OCR formatting differences", () => {
  const first = "المادة الأولى: يلتزم المدين بالتنفيذ. \uf0b7 ويجوز الاتفاق كتابةً.";
  const second = "المادة الأولى: يلتزم المدين بالتنفيذ. • ويجوز الاتفاق كتابةً.";

  assert.equal(legalTextFingerprint(first), legalTextFingerprint(second));
});
