const signals = [
  [/(?:سدد|السداد|تسديد|المدفوع|المبلغ المتبقي|الإيصال|إيصال|تحويل بنكي)|\b(?:paid|payment|receipt|outstanding|bank transfer)\b/iu,
    'قد يكون السداد أو الرصيد المتبقي محل بحث. طابق المطالبة مع الإيصالات أو التحويلات المذكورة.',
    'Payment or the outstanding balance may be in issue. Compare the claim with the receipts or transfers mentioned.'],
  [/(?:عقد|اتفاق|الإيجار|ايجار|المؤجر|المستأجر)|\b(?:contract|agreement|lease|landlord|tenant)\b/iu,
    'قد تتوقف المسألة على ما اتفق عليه الطرفان. راجع البند المتصل بالطلب والنسخة التي يستند إليها كل طرف.',
    'The issue may turn on the parties’ agreement. Check the relevant clause and the version each party relies on.'],
  [/(?:أنكر|ينكر|نازع|ينازع|متنازع|يدعي|زعم)|\b(?:denies|denied|disputes?|disputed|alleges?|contests?)\b/iu,
    'يتضمن النص رواية أو نقطة خلاف. انسب كل قول إلى صاحبه واربطه بالدليل الذي يسنده أو يناقضه.',
    'The text includes an allegation or a disputed point. Attribute each position to its source and link it to supporting or contrary evidence.'],
  [/(?:إعلان|اعلان|إخطار|اخطار|تبليغ|استلم|تسل[ّم]+|استلام)|\b(?:notice|served|service of|received|delivery|notification)\b/iu,
    'قد يكون الإخطار أو الاستلام مؤثرًا. راجع وسيلة الإرسال ودليل الاستلام وتاريخه.',
    'Notice or receipt may matter. Check the method of service or delivery, the evidence of receipt, and its date.'],
  [/(?:ميعاد|تقادم|المهلة|المهله|آخر موعد)|\b(?:deadline|limitation period|time limit)\b/iu,
    'أشار النص إلى مسألة توقيت. حدّد بداية المدة والحدث الذي ترتبط به وراجع مصدرها قبل التعويل عليها.',
    'The text raises a timing issue. Check the trigger date, relevant event, and source of any applicable period.'],
  [/(?:أصل المستند|اصل المستند|صورة المستند|صوره المستند|تزوير|توقيع)|\b(?:original document|copy of the document|signature|forgery)\b/iu,
    'تظهر مسألة تتعلق بالمستند أو التوقيع. حدّد النسخة التي يستند إليها الطلب وما يتوفر للتحقق منها.',
    'The document or signature may need review. Identify the version relied on and the evidence available to check it.'],
];

const checks = {
  facts: ['راجع تواريخ الوقائع وترتيبها ومن شهدها أو وثّقها.', 'Check the dates and sequence of events and who observed or documented them.'],
  evidence: ['حدّد مصدر كل مستند وتاريخه والواقعة التي يساندها.', 'Identify the source, date, and fact supported by each document.'],
  grounds: ['اربط كل دفع بواقعة محددة ومستند أو مرجع معتمد.', 'Link each argument to a specific fact and a document or reviewed authority.'],
  opponentGrounds: ['طابق قول الخصم مع الصحيفة أو المذكرة التي ورد فيها وحدّد ما تقرّ به أو تنازع فيه.',
    'Check the opposing submission against the document in which it appears and identify what is admitted or disputed.'],
  reply: ['طابق كل رد مع الدفع المقابل وأشر إلى ما يسنده.', 'Match each reply to the corresponding submission and identify its support.'],
  requests: ['حدّد الإجراء المطلوب من المحكمة والطرف المعني والمبلغ عند الاقتضاء.',
    'Specify the order sought, the party concerned, and any applicable amount.'],
  alternativeRequests: ['وضّح متى تطلب الحكم بالطلب الاحتياطي وعلاقته بالطلب الأصلي.',
    'Specify when the alternative relief is sought and how it relates to the primary relief.'],
  title: ['طابق العنوان مع نوع المذكرة وموضوع الطلب.', 'Check that the title reflects the document type and subject.'],
  number: ['طابق رقم القضية مع سجلها الرسمي، بما في ذلك السنة إن كانت جزءًا من الرقم.',
    'Check the case number against the official record, including the year if it forms part of the number.'],
  circuit: ['طابق اسم الدائرة مع سجل القضية.', 'Check the circuit against the case record.'],
  party: ['طابق الاسم والصفة في المذكرة مع أوراق القضية.', 'Check the party’s name and capacity against the case record.'],
  opponent: ['طابق اسم الخصم وصفته مع أوراق القضية.', 'Check the opposing party’s name and capacity against the case record.'],
  body: ['راجع الوقائع والطلبات مع الأوراق وطابق الإحالات مع المراجع المعتمدة.',
    'Check the facts and relief against the record and match citations to reviewed sources.'],
  summary: ['طابق الوصف مع النص الأصلي واذكر النسخة والصفحة أو الموضع.', 'Match the description to the original and identify its edition and location.'],
  question: ['حدّد القانون أو المستند أو الواقعة المقصودة لبحث المسألة بدقة.',
    'Identify the relevant law, document, or fact to narrow the research question.'],
};

const date = /(?:[\p{N}]{1,4}[-/.][\p{N}]{1,2}[-/.][\p{N}]{1,4}|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/iu;
const amountPattern = /\bKWD\s*([0-9٠-٩۰-۹]+(?:[.,٬٫][0-9٠-٩۰-۹]+)*)|([0-9٠-٩۰-۹]+(?:[.,٬٫][0-9٠-٩۰-۹]+)*)\s*(?:KWD\b|د\s*\.\s*ك\.?|دينار(?:اً|ا)?\s+كويتي(?:اً|ا)?)/giu;

function excerpts(text, limit = 4) {
  return text.trim().split(/(?:\n+|(?<=[.!?؟؛])\s+)/u).map(line => line.trim()).filter(Boolean)
    .slice(0, limit).map(line => Array.from(line).slice(0, 260).join('').trimEnd());
}

function amounts(text) {
  return new Set(Array.from(text.matchAll(amountPattern), ([, before, after]) => {
    const digits = (before || after).replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15))
      .replace(/٬|,(?=\d{3}(?:\D|$))/g, '').replace(/[٫,]/g, '.');
    const [whole, fraction = ''] = digits.split('.');
    return [whole.replace(/^0+(?=\d)/u, ''), fraction.replace(/0+$/u, '')].join('.');
  }));
}

function possibleIssues(text, index) {
  return signals.filter(([pattern]) => pattern.test(text)).slice(0, 4).map(entry => entry[index + 1]);
}

export function reviewText(text, field, language) {
  const index = language === 'en' ? 1 : 0;
  const entered = excerpts(text);
  const result = { excerpts: entered, inferences: [], verify: [] };
  if (!entered.length) return result;
  result.inferences = possibleIssues(text, index);
  const check = checks[field];
  if (check) result.verify.push(check[index]);
  if (date.test(text) && field !== 'facts') {
    result.verify.push(index ? 'A date is mentioned. Confirm which event it refers to.' : 'ورد تاريخ في النص. حدّد الواقعة التي يعود إليها وراجعه في المستند.');
  }
  return result;
}

export function reviewMemo(fields, language) {
  const en = language === 'en';
  const { facts = '', evidence = '', grounds = '', opponentGrounds = '', reply = '', requests = '', alternativeRequests = '' } = fields;
  const entries = [facts, evidence, grounds, opponentGrounds, reply, requests, alternativeRequests].map(text => text.trim());
  const combined = entries.filter(Boolean).join('\n');
  const result = { excerpts: [], inferences: [], verify: [] };
  if (!combined) return result;
  const priority = [facts, evidence, opponentGrounds, requests, grounds, reply, alternativeRequests].filter(text => text.trim());
  result.excerpts = priority.length === 1 ? excerpts(priority[0]) : priority.slice(0, 4).flatMap(text => excerpts(text, 1));
  result.inferences = possibleIssues(combined, en ? 1 : 0);
  const factAmounts = amounts(facts);
  const requestAmounts = amounts(requests);
  if (factAmounts.size === 1 && requestAmounts.size === 1 && !requestAmounts.has([...factAmounts][0])) {
    result.inferences.unshift(en
      ? 'The facts and primary relief mention different amounts in Kuwaiti dinars. Check whether the difference is intentional.'
      : 'تذكر الوقائع والطلبات الأصلية مبلغين مختلفين بالدينار الكويتي. بيّن سبب الفرق وطابق المبلغ المطلوب مع المستند.');
  }
  if (!facts.trim()) result.verify.push(en ? 'Add the sequence of events and who says what occurred.' : 'أضف تسلسل الوقائع وانسب كل رواية إلى صاحبها.');
  else if (!date.test(facts)) result.verify.push(en ? 'Add dates for the key events where available.' : 'اذكر تواريخ الوقائع الرئيسية حيث تتوفر.');
  if (!evidence.trim()) result.verify.push(en ? 'Identify the evidence that supports the material facts.' : 'حدّد المستندات المؤيدة للوقائع المؤثرة.');
  if (opponentGrounds.trim() && !reply.trim()) result.verify.push(en ? 'Add a reply to the opposing submissions.' : 'أضف الرد على دفوع الخصم.');
  if (!requests.trim()) result.verify.push(en ? 'Specify the primary relief sought.' : 'حدّد الطلبات الأصلية.');
  return result;
}
