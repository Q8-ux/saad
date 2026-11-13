const citation = /(?:الماد(?:ة|ه|تين|تان)|ماد(?:ة|ه|تين|تان)|المواد|القانون|المرسوم|الطعن|الحكم|جلس(?:ة|ه)|القضاء|أرقام الطعون)\s*(?:الاصطناعية\s+|رقم\s+|أرقام\s+|ارقام\s+|برقم\s+|الصادر(?:ة)?\s*(?:في|برقم)?\s*|الموافق(?:ة)?\s*)*[([«]?\s*\p{N}|(?:لسن(?:ة|ه)|لسنوات)\s*\p{N}|\b(?:articles?|arts?\.?|sections?|statute|law|decree|appeal|judg(?:e)?ment|ruling|case\s+no\.?)\s*(?:nos?\.?\s*|numbers?\s*|#\s*)*[([]?\s*\p{N}|\b(?:act|regulation)\s+(?:no\.?\s*|#\s*)\p{N}|§+\s*\p{N}|\b(?:https?:\/\/|www\.)|\[[^\]\n]*\p{N}+[^\]\n]*\]/iu;

export function legalNormalization(value) {
  return value.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640\p{Cf}]/gu, '')
    .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15));
}

export function cleanModelText(value, max, numericEvidence = '') {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length < 4 || text.length > max || /[\n\r\[\]〔〕]/u.test(text)) return null;
  const normalized = legalNormalization(text);
  if (citation.test(normalized)) return null;
  const allowed = new Set(legalNormalization(numericEvidence).match(/\p{N}+/gu) || []);
  return (normalized.match(/\p{N}+/gu) || []).every(number => allowed.has(number)) ? text : null;
}

export function citationLabel(source) {
  return [source.identity, source.edition, source.locator].join(' — ');
}

export function citationEntry(source, index) {
  const text = (source.verbatimText || '').split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  return [`〔${index + 1}〕 ${citationLabel(source)}`, ...text.map(line => `«${line}»`)].join('\n');
}

export function hasUnverifiedCitation(body, sources) {
  const approved = sources.filter(source => source.citable);
  const labels = approved.map(source => legalNormalization(citationLabel(source)));
  const sourceTexts = approved.map((source, index) => citationEntry(source, index).split('\n').slice(1));
  const requiredEntries = new Set();
  const foundEntries = new Set();
  const lines = body.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim().replace(/^•\s*/u, '');
    const text = legalNormalization(line);
    const entry = /^〔(\d+)〕\s+(.+)$/u.exec(text);
    if (entry) {
      const sourceIndex = Number(entry[1]) - 1;
      if (labels[sourceIndex] !== entry[2]) return true;
      const quotes = sourceTexts[sourceIndex];
      if (quotes.some((quote, offset) => lines[index + offset + 1]?.trim().normalize('NFC') !== quote.normalize('NFC'))) return true;
      if (quotes.length && /^«.*»$/u.test(lines[index + quotes.length + 1]?.trim() || '')) return true;
      foundEntries.add(sourceIndex);
      index += quotes.length;
      continue;
    }
    if (labels.includes(text)) continue;
    for (const [, number] of text.matchAll(/〔(\d+)〕/gu)) {
      const sourceIndex = Number(number) - 1;
      if (!approved[sourceIndex]) return true;
      if (sourceTexts[sourceIndex].length) requiredEntries.add(sourceIndex);
    }
    if (citation.test(text.replace(/〔\d+〕/gu, ''))) return true;
  }
  return [...requiredEntries].some(index => !foundEntries.has(index));
}
