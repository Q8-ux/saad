// Plain-text only. Raw exports, hidden link targets and advertiser contacts never enter the catalogue.
export function redactContacts(value='') {
  return String(value).normalize('NFKC')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,'')
    .replace(/(?:https?:\/\/|www\.)\S+/gi,'')
    .replace(/(?:wa\.me|t\.me|telegram\.me|api\.whatsapp\.com)\/\S+/gi,'')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'')
    .replace(/@[\p{L}\p{N}_]{3,}/gu,'')
    .replace(/[+＋]?(?:[0-9٠-٩۰-۹][\s().\-–—/]*?){8,}(?![0-9٠-٩۰-۹])/g,'')
    .trim();
}
