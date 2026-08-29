const ARABIC_CHARACTER = /[\u0621-\u064a]/g;
const LATIN_CHARACTER = /[A-Za-z]/g;
const LATIN_TOKEN = /[A-Za-z]{2,}/g;
const REPEATED_ARABIC_RUN = /([\u0621-\u064a])\1{2,}/g;
const ARABIC_WORD = /[\u0621-\u064a]{2,}/g;
const ARABIC_TOKEN = /[\u0621-\u064a]+/g;

// These ranges are not meaningful legal text in this Arabic-first corpus.
// They are typical artifacts left by broken PDF character maps or OCR layers.
const OCR_UNSAFE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const OCR_FORMAT_MARK = /[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;
const OCR_EXTENDED_LATIN = /[\u00c0-\u024f]/g;
const OCR_PRIVATE_USE = /[\ue000-\uf8ff\ufff0-\uffff]/g;
const OCR_GARBAGE_SYMBOL = /[©®±µ¶·¸¹º¼½¾¿×÷∂∏∑−≠≤≥∞√∫≈]/g;
const OCR_COLUMN_SEPARATOR = /\|/g;
const OCR_BULLET = /\uf0b7/g;

export type LegalTextNoise = {
  arabicCharacters: number;
  latinCharacters: number;
  latinTokens: number;
  repeatedArabicRuns: number;
  replacementCharacters: number;
  controlCharacters: number;
  extendedLatinCharacters: number;
  privateUseCharacters: number;
  ocrSymbolCharacters: number;
  columnSeparators: number;
  fragmentedArabicTokens: number;
  arabicTokens: number;
};

function countMatches(value: string, expression: RegExp): number {
  return (value.match(expression) ?? []).length;
}

function hasExcessiveRepeatedArabicSequence(value: string): boolean {
  const words = value.match(ARABIC_WORD) ?? [];
  if (words.length < 20) return false;

  const pairCounts = new Map<string, number>();
  const pairTotal = words.length - 1;
  for (let index = 0; index < pairTotal; index += 1) {
    const pair = `${words[index]} ${words[index + 1]}`;
    const count = (pairCounts.get(pair) ?? 0) + 1;
    pairCounts.set(pair, count);

    // Repeated PDF headers and footers can dominate an OCR chunk. Legal text
    // may repeat individual words such as "المادة", but should not repeat the
    // same two-word phrase through a substantial portion of one passage.
    if (count >= 5 && count / pairTotal >= 0.12) return true;
  }

  return false;
}

function hasFragmentedArabicText(value: string): boolean {
  const tokens = value.match(ARABIC_TOKEN) ?? [];
  if (tokens.length < 60) return false;
  const singleCharacterTokens = tokens.filter((token) => token.length === 1).length;

  // Arabic prose naturally includes single-letter conjunctions, but a quarter
  // of the passage cannot be isolated letters without indicating a broken OCR
  // character map or incorrectly separated glyphs.
  return singleCharacterTokens >= 50 && singleCharacterTokens / tokens.length >= 0.25;
}

export function inspectLegalText(value: string): LegalTextNoise {
  const normalized = value.normalize("NFKC");
  const tokens = normalized.match(ARABIC_TOKEN) ?? [];
  const withoutBulletGlyph = normalized.replace(OCR_BULLET, "");
  return {
    arabicCharacters: countMatches(normalized, ARABIC_CHARACTER),
    latinCharacters: countMatches(normalized, LATIN_CHARACTER),
    latinTokens: countMatches(normalized, LATIN_TOKEN),
    repeatedArabicRuns: countMatches(normalized, REPEATED_ARABIC_RUN),
    replacementCharacters: countMatches(normalized, /�/g),
    controlCharacters: countMatches(normalized, OCR_UNSAFE_CONTROL),
    extendedLatinCharacters: countMatches(normalized, OCR_EXTENDED_LATIN),
    privateUseCharacters: countMatches(withoutBulletGlyph, OCR_PRIVATE_USE),
    ocrSymbolCharacters: countMatches(normalized, OCR_GARBAGE_SYMBOL),
    columnSeparators: countMatches(normalized, OCR_COLUMN_SEPARATOR),
    fragmentedArabicTokens: tokens.filter((token) => token.length === 1).length,
    arabicTokens: tokens.length,
  };
}

export function needsLegalTextFallback(value: string): boolean {
  const noise = inspectLegalText(value);
  return (
    noise.replacementCharacters > 0 ||
    noise.controlCharacters > 0 ||
    noise.extendedLatinCharacters > 0 ||
    noise.privateUseCharacters > 0 ||
    noise.ocrSymbolCharacters >= 4 ||
    noise.columnSeparators >= 4 ||
    hasFragmentedArabicText(value) ||
    noise.repeatedArabicRuns >= 2 ||
    hasExcessiveRepeatedArabicSequence(value) ||
    (noise.arabicCharacters >= 20 &&
      (noise.latinTokens >= 3 || noise.latinCharacters >= 12))
  );
}

export function cleanArabicLegalText(value: string): string {
  let text = value
    .normalize("NFKC")
    // The bullet from common Arabic office fonts is safe to preserve as a real
    // bullet; other private-use characters have no stable textual meaning.
    .replace(OCR_BULLET, " • ")
    .replace(/\u0000/g, " ")
    .replace(/�/g, " ")
    .replace(OCR_UNSAFE_CONTROL, " ")
    .replace(OCR_FORMAT_MARK, " ")
    .replace(OCR_PRIVATE_USE, " ")
    .replace(OCR_EXTENDED_LATIN, " ")
    .replace(OCR_GARBAGE_SYMBOL, " ")
    .replace(/[|#]/g, " ")
    // Normalize Persian glyph variants that are visually identical in Arabic
    // legal text and routinely arise from mixed OCR fonts.
    .replace(/\u06cc/g, "ي")
    .replace(/\u06a9/g, "ك")
    .replace(/[\u06c0\u06d5]/g, "ه");
  const noise = inspectLegalText(text);

  // Arabic legal PDFs often interleave short Latin OCR fragments between the
  // two page columns. They are not part of the Arabic source text.
  if (noise.arabicCharacters >= 20 && noise.latinTokens > 0) {
    text = text.replace(/[A-Za-z]+/g, " ");
  }

  return text
    .replace(/(رقم|سنة|لسنة|مادة|المادة)(?=[0-9٠-٩۰-۹])/g, "$1 ")
    .replace(/\s+([،؛:,.!؟)\]»])/g, "$1")
    .replace(/([(\[«])\s+/g, "$1")
    .replace(/\s*•\s*/g, " • ")
    .replace(/\s+/g, " ")
    .trim();
}

export function legalTextFingerprint(value: string): string {
  return cleanArabicLegalText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u0621-\u064a\u0660-\u0669\u06f0-\u06f9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isUsableIndexedLegalText(value: string): boolean {
  // Evaluate the original OCR before attempting any cosmetic cleanup. Removing
  // stray symbols can make a broken passage look superficially readable, but
  // it cannot make it legally reliable.
  const rawText = value.normalize("NFKC").replace(/\u0000/g, " ");
  if (rawText.trim().length < 40 || needsLegalTextFallback(rawText)) {
    return false;
  }

  const text = cleanArabicLegalText(value);
  const noise = inspectLegalText(text);

  if (text.length < 40) return false;
  if (hasExcessiveRepeatedArabicSequence(text)) return false;
  if (hasFragmentedArabicText(text)) return false;

  // Do not present fragments that contain neither a meaningful Arabic passage
  // nor a complete non-Arabic passage. This keeps OCR debris out of sources
  // without hiding a valid English-language legal document.
  return noise.arabicCharacters >= 12 || noise.latinCharacters >= 20;
}
