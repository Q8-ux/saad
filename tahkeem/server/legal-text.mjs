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

export function hasUnverifiedCitation(body, sources) {
  const approved = sources.filter(source => source.citable);
  const labels = approved.map(source => legalNormalization(citationLabel(source)));
  return legalNormalization(body).split(/\r?\n/u).some(line => {
    const text = line.trim().replace(/^•\s*/u, '');
    const entry = /^〔(\d+)〕\s+(.+)$/u.exec(text);
    if (entry) return labels[Number(entry[1]) - 1] !== entry[2];
    if (labels.includes(text)) return false;
    const markers = [...text.matchAll(/〔(\d+)〕/gu)];
    return markers.some(([, id]) => !approved[Number(id) - 1]) || citation.test(text.replace(/〔\d+〕/gu, ''));
  });
}
