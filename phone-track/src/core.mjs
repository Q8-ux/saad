import { parsePhoneNumberWithError, validatePhoneNumberLength, getCountries, getCountryCallingCode } from 'libphonenumber-js/max';

const names = new Intl.DisplayNames(['ar'], { type: 'region' });
export const countryName = code => code === '001' ? 'خدمة دولية غير مرتبطة بدولة' : code ? names.of(code) || code : 'غير محددة';
export const countries = getCountries().map(code => ({ code, name: countryName(code), callingCode: getCountryCallingCode(code) }));
export const typeLabels = {
  MOBILE: 'هاتف محمول', FIXED_LINE: 'هاتف ثابت', FIXED_LINE_OR_MOBILE: 'ثابت أو محمول',
  TOLL_FREE: 'رقم مجاني', PREMIUM_RATE: 'رقم بتعرفة خاصة', SHARED_COST: 'تكلفة مشتركة',
  VOIP: 'هاتف عبر الإنترنت', PERSONAL_NUMBER: 'رقم شخصي', PAGER: 'نداء آلي', UAN: 'رقم وصول موحد', VOICEMAIL: 'بريد صوتي',
};
const lengthLabels = {
  TOO_SHORT: 'عدد الأرقام أقل من المطلوب.', TOO_LONG: 'عدد الأرقام أكبر من المطلوب.',
  INVALID_LENGTH: 'طول الرقم لا يطابق الأطوال المعتمدة.', INVALID_COUNTRY: 'مفتاح الدولة غير معروف.',
  NOT_A_NUMBER: 'أدخل رقم هاتف واحداً باستخدام الأرقام ومفتاح الدولة.',
};

export function normalizeInput(value) {
  if (typeof value !== 'string' || value.length > 64) throw new Error('أدخل رقماً واحداً لا يتجاوز 64 حرفاً.');
  let text = value.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim()
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0));
  if (!text) throw new Error('أدخل رقم الهاتف أولاً.');
  if (!/^\+?[\d ().\-\t\u00a0]+$/.test(text)) throw new Error('أدخل رقم هاتف واحداً. لا تُدخل أسماء أو روابط أو حروفاً.');
  text = text.replace(/[ ().\-\t\u00a0]/g, '');
  if (text.startsWith('00')) text = '+' + text.slice(2);
  if (!/^\+?\d+$/.test(text)) throw new Error('مفتاح الدولة يجب أن يكون في بداية الرقم.');
  return text;
}

export function analyzeNumber(value, region = 'KW') {
  const normalizedInput = normalizeInput(value);
  if (!getCountries().includes(region)) throw new Error('اختر دولة صحيحة للرقم المحلي.');
  let phone;
  try { phone = parsePhoneNumberWithError(normalizedInput, { defaultCountry: region, extract: false }); }
  catch (error) { throw new Error(lengthLabels[error.message] || 'تعذر قراءة الرقم. تحقق من مفتاح الدولة وعدد الأرقام.'); }
  const valid = phone.isValid();
  const possible = phone.isPossible();
  const type = valid ? phone.getType() : undefined;
  const lengthReason = validatePhoneNumberLength(normalizedInput, region);
  const possibleCountries = phone.country ? [phone.country] : phone.getPossibleCountries();
  const country = phone.country || (phone.isNonGeographic() ? '001' : undefined);
  const countryLabel = country ? countryName(country) : possibleCountries.length ? possibleCountries.map(countryName).join('، ') : 'غير محددة — مفتاح دولي مشترك';
  return {
    normalizedInput, country, countryName: countryLabel, possibleCountries,
    callingCode: phone.countryCallingCode, nationalNumber: phone.nationalNumber,
    international: phone.formatInternational(), national: phone.formatNational(),
    e164: phone.number, uri: phone.getURI(), valid, possible,
    type, typeLabel: typeLabels[type] || 'غير محدد',
    lengthReason, lengthMessage: lengthLabels[lengthReason] || (valid ? 'الطول والنمط مطابقان لخطة الترقيم.' : 'الطول ممكن، لكن النمط لا يطابق خطة الترقيم.'),
    digitCount: phone.nationalNumber.length,
    internationalDigits: phone.number.slice(1).length,
    carrier: null, area: null, timezones: [], metadataAvailable: false,
    ownership: 'غير متحقق', reachability: 'غير متحققة', currentLocation: 'غير متاح من رقم الهاتف',
  };
}

export function prefixValue(packed, number) {
  if (!packed) return undefined;
  for (let i = number.length; i > 0; i--) {
    const prefix = number.slice(0, i);
    if (Object.hasOwn(packed.prefixes, prefix)) return packed.labels[packed.prefixes[prefix]];
  }
  return undefined;
}

export function enrichNumber(result, chunk, manifest) {
  if (!result.valid) return result;
  const digits = result.e164.slice(1);
  const geographic = ['FIXED_LINE', 'FIXED_LINE_OR_MOBILE'].includes(result.type) ||
    (result.type === 'MOBILE' && manifest.geoMobileCallingCodes.includes(Number(result.callingCode)));
  let geoDigits = digits;
  const token = manifest.mobileTokens[result.callingCode];
  if (token && result.nationalNumber.startsWith(token)) geoDigits = result.callingCode + result.nationalNumber.slice(token.length);
  const carrier = ['MOBILE', 'FIXED_LINE_OR_MOBILE', 'PAGER'].includes(result.type) ? prefixValue(chunk.carrier, digits) : undefined;
  const area = geographic ? prefixValue(chunk.geo, geoDigits) : undefined;
  let timezones = prefixValue(chunk.timezone, geographic ? digits : result.callingCode) || [];
  timezones = timezones.filter(zone => zone !== 'Etc/Unknown');
  return { ...result, carrier: carrier || null, area: area || null, timezones, metadataAvailable: true, metadataVersion: manifest.version, metadataDate: manifest.generatedAt };
}

export function reportText(r) {
  const rows = [
    ['مسار الهاتف', r.international], ['الدولة المرتبطة بالرقم', r.countryName], ['مفتاح الدولة', '+' + r.callingCode],
    ['نوع الرقم', r.typeLabel], ['الصحة حسب خطة الترقيم', r.valid ? 'مطابق' : 'غير مطابق'],
    ['الطول ممكن', r.possible ? 'نعم' : 'لا'], ['المشغل الأصلي حسب البيانات', r.carrier || 'غير متوفر'],
    ['منطقة تخصيص الرقم', r.area || 'لا تتوفر منطقة تفصيلية'],
    ['المناطق الزمنية المحتملة', r.timezones.join('، ') || 'غير متوفرة'],
    ['التنسيق الدولي', r.international], ['التنسيق المحلي', r.national], ['E.164', r.e164],
    ['الرقم المحلي دون المفتاح', r.nationalNumber], ['عدد الأرقام المحلية', r.digitCount],
    ['إجمالي الأرقام الدولية', r.internationalDigits], ['صيغة رابط الاتصال', r.uri],
    ['ملكية الرقم', 'لم يتم التحقق'], ['حالة تشغيل الخط', 'لم يتم التحقق'],
    ['الموقع الحالي واسم المالك', 'لا يمكن استخراجهما بهذه الأداة'],
    ['مصدر الترقيم', 'libphonenumber-js 1.13.15'], ['مصدر البيانات الإضافية', 'phonenumbers ' + (r.metadataVersion || '9.0.41')],
  ];
  return rows.map(([name, value]) => `${name}: ${value}`).join('\n') + '\n\nبيانات المشغل قد تشير إلى المشغل الأصلي قبل نقل الرقم. منطقة الترقيم ليست موقع الجهاز الحالي.';
}
