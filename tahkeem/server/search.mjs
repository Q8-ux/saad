export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640\u200B-\u200F\u202A-\u202E]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15))
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
