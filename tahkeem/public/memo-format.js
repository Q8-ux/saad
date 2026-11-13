export const types = {
  'مذكرة دفاع': { en: 'Memorandum of Defence', arGrounds: 'الدفوع وأوجه الدفاع', enGrounds: 'Defences and submissions' },
  'صحيفة دعوى': { en: 'Statement of Claim', arGrounds: 'أسباب الدعوى وأسانيدها', enGrounds: 'Grounds of the claim' },
  'صحيفة استئناف': { en: 'Notice and Grounds of Appeal', arGrounds: 'أسباب الاستئناف وأثرها في الحكم المطعون فيه', enGrounds: 'Grounds of appeal and effect on the challenged judgment' },
  'مذكرة رد': { en: 'Reply Memorandum', arGrounds: 'أوجه الرد والأسانيد', enGrounds: 'Reply submissions' },
  'مذكرة تمييز': { en: 'Cassation Memorandum', arGrounds: 'أسباب الطعن بالتمييز', enGrounds: 'Grounds for cassation' },
  'مذكرة تنفيذ': { en: 'Enforcement Memorandum', arGrounds: 'أسانيد الطلب في التنفيذ', enGrounds: 'Grounds of the enforcement application' },
};

export const courts = {
  'المحكمة الكلية': 'Court of First Instance',
  'المحكمة الجزئية': 'Summary Court',
  'محكمة الاستئناف': 'Court of Appeal',
  'محكمة التمييز': 'Court of Cassation',
  'محكمة الأسرة': 'Family Court',
  'المحكمة الدستورية': 'Constitutional Court',
  'إدارة التنفيذ': 'Enforcement Department',
};

export const languages = { ar: 'العربية', en: 'English', both: 'العربية والإنجليزية' };
export const memoBodyLimit = 54_000;

export const format = {
  ar: {
    dir: 'rtl', draft: 'مسودة للمراجعة', circuit: 'الدائرة', case: 'القضية رقم', from: 'مقدمة من', against: 'ضد',
    missingParty: '[يُستكمل اسم مقدم المذكرة وصفته]', missingOpponent: '[يُستكمل اسم الخصم وصفته]',
    facts: 'الوقائع', evidence: 'المستندات والأدلة', objections: 'دفوع الخصم والرد عليها',
    position: 'دفوع الخصم', reply: 'الرد', requests: 'الطلبات',
    primary: 'الطلبات الأصلية', alternative: 'الطلبات الاحتياطية',
    missingGrounds: '[تُستكمل الدفوع والأسانيد]', missingRequests: '[تُستكمل الطلبات الأصلية]',
    authorities: 'الأسانيد القانونية', closing: 'وتفضلوا بقبول فائق الاحترام.',
    order: ['أولاً', 'ثانياً', 'ثالثاً', 'رابعاً', 'خامساً', 'سادساً'],
  },
  en: {
    dir: 'ltr', draft: 'Draft for review', circuit: 'Circuit', case: 'Case No.', from: 'Submitted by', against: 'Against',
    missingParty: '[Complete the filing party and capacity]', missingOpponent: '[Complete the opposing party and capacity]',
    facts: 'Facts', evidence: 'Documents and evidence', objections: 'Opposing submissions and reply',
    position: 'Opposing submissions', reply: 'Reply', requests: 'Relief sought',
    primary: 'Primary relief', alternative: 'Alternative relief',
    missingGrounds: '[Complete the grounds and supporting analysis]', missingRequests: '[Complete the primary relief sought]',
    authorities: 'Legal authorities', closing: 'Respectfully submitted.',
    order: ['I.', 'II.', 'III.', 'IV.', 'V.', 'VI.'],
  },
};

export function memoDocuments(memo) {
  const language = memo.input?.language;
  if (language === 'both' && memo.alternate_body) {
    return [
      { language: 'ar', body: memo.body, title: memo.title },
      { language: 'en', body: memo.alternate_body, title: memo.input.english?.title },
    ];
  }
  return [{ language: language === 'en' ? 'en' : 'ar', body: memo.body, title: memo.title }];
}

export function memoLineRole(line, index, title, type) {
  if (index === 0 || line === title || line === type || line === types[type]?.en) return 'title';
  if (/^(?:أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً) —|^(?:I|II|III|IV|V|VI)\. |^المراجع المحددة للمراجعة$/u.test(line)) return 'heading';
  if (Object.values(format).some(copy => [copy.position, copy.reply, copy.primary, copy.alternative].includes(line))) {
    return 'subheading';
  }
  return '';
}
