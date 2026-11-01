import type { LegalEvidence } from './legal-search';

const boundSha = '8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd';

/** Only the retrieved article's own wording, never neighbouring pages or OCR.
 * A source match does not establish completeness, amendments or currency. */
export function draftStatutoryText(source: LegalEvidence) {
  const c = source.corpus;
  if (source.judgment || c?.draftingEligible === false) return null;
  const bound = c?.scope === 'bound_file_only' && c.sourceId === 'user-legislation-source' && c.sourceSha256 === boundSha && c.articleIdentityUnique;
  const number = bound ? c.articleNumber : source.verification?.status === 'source_verified' ? source.verification.articleNumber : null;
  if (!number) return null;
  // The resolver labels candidate continuations explicitly: their boundaries
  // have not been reviewed. Do not promote that context to statutory wording.
  const text = source.text.split(/\n\[استمرار موضع المادة؛ صفحة PDF [^\n]*\]\s*\n/u)[0].replace(/\s+/gu, ' ').trim();
  if (!text || !/\p{L}/u.test(text) || /【\s*م\d+\s*】|صفحة PDF/u.test(text)) return null;
  const delimiters = [['«', '»'], ['“', '”'], ['"', '"']].find(pair => pair.every(char => !text.includes(char)));
  if (!delimiters) return null;
  return { number, text, quote: delimiters[0] + text + delimiters[1], complete: bound && c.completeArticleVerified === true && !c.continuationPage };
}

/** Language cleanup may edit the surrounding prose, never a literal quote. */
export function preserveLegalQuotes(text: string, transform: (prose: string) => string) {
  return text.split(/(«[^»]*»|“[^”]*”|"[^"\n]*")/gu).map((part, index) => index % 2 ? part : transform(part)).join('');
}
