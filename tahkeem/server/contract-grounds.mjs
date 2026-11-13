import { normalizeSearch } from './search.mjs';

const rescission = /\b(?:rescission|rescind)\b|(?:^| )(?:ب)?فسخ(?: |$)/u;
const supplyWork = /\b(?:supply|install\w*|contractor|contracted works)\b|توريد|تركيب|مقاول/u;
const otherContracts = /فسخ(?: عقد)? (?:الايجار|ايجار|العمل|عمل|البيع|بيع)(?: |$)|rescin(?:d|d\w*|ssion) (?:of )?(?:the |a )?(?:lease|employment|sale)\b/u;
const linkedPayment = /(?:باقي|الباقي|المتبقي|الرصيد|\d+ (?:دينار|د ك)).{0,60}(?:اكتمال|التركيب|التسليم)|(?:اكتمال|التركيب|التسليم).{0,60}(?:باقي|الباقي|المتبقي|الرصيد)|(?:balance|remaining).{0,70}(?:complet|install|delivery)/u;

const ground = (ids, ar, en) => ({ ids, ar, en });

export function groundSourceIds(grounds) {
  return [...new Set([...grounds.arguments, ...grounds.replies].flatMap(item => item.ids))];
}

export function contractGrounds(input) {
  const requests = normalizeSearch([input.requests, input.english?.requests].join(' '));
  const facts = normalizeSearch([input.title, input.facts, input.evidence, input.english?.facts].join(' '));
  if (input.type !== 'صحيفة دعوى' || !rescission.test(requests) || otherContracts.test(requests) || !supplyWork.test(facts)) {
    return { arguments: [], replies: [] };
  }

  const argumentsList = [];
  if (/الكلية|الكليه|الجزئية|الجزئيه/u.test(input.court) && /\d.*(?:دينار|د ك|kwd)|(?:دينار|د ك|kwd).*\d/u.test(facts)) {
    argumentsList.push(ground(['kw-procedure-40','kw-procedure-29','kw-procedure-34'],
      'الاختصاص القيمي — إذا كان التوريد والتنفيذ لعمل واحد، تُقدّر قيمة طلب فسخ العقد بقيمة المتعاقد عليه. يُقارن الثمن الثابت في العقد بنصاب المحكمة الجزئية لتحديد المحكمة المختصة.',
      'Jurisdiction by value — For a single contracted job, compare the value of the contract with the Summary Court’s monetary jurisdiction to determine the proper court for the rescission claim.'));
  }
  argumentsList.push(ground(['kw-civil-196','kw-civil-197'],
    'لزوم العقد وحسن تنفيذه — يُستدل بالعقد على نطاق العمل والأجل المتفق عليه وترتيب الدفعات، ويُقاس التنفيذ على هذه الالتزامات.',
    'Binding terms and performance in good faith — Use the contract to establish the agreed work, deadline and payment schedule, and compare performance with those terms.'));
  if (/تركيب|مقاول|\b(?:install\w*|contractor|contracted works)\b/u.test(facts)) {
    argumentsList.push(ground(['kw-civil-666','kw-civil-676'],
      'أجل الإنجاز واستحقاق المقابل — بقدر انطباق وصف المقاولة، يُرجع إلى شروط إنجاز العمل والمدة المتفق عليها، وإلى الاتفاق في تحديد أجل استحقاق المقابل.',
      'Completion and payment — To the extent the works rules apply, assess performance by the agreed scope and deadline, and apply the agreed payment terms.'));
  }
  const notice = /انذار|اعذار|\b(?:formal notice|notice to perform|notice of default)\b/u.test(facts);
  argumentsList.push(ground(['kw-civil-209', ...(notice ? ['kw-civil-298'] : [])],
    'الإخلال الموجب للفسخ — يقوم الطلب على ثبوت عدم التنفيذ بعد حلول الأجل والإعذار، وعلى وفاء المدعي بما حلّ من التزاماته. وتقدّر المحكمة جسامة الإخلال وما إذا كانت الظروف تقتضي إمهال المدين.',
    'Breach supporting rescission — Establish non-performance after the deadline and notice, and show that the claimant met obligations already due. The court assesses the seriousness of the breach and whether to allow further time.'));
  if (/رد.{0,55}(?:دفعه|مقدم|ثمن|مبلغ)|\b(?:refund|return of the deposit|repayment|restitution)\b/u.test(requests)) {
    argumentsList.push(ground(['kw-civil-211'],
      'رد الدفعة المقدّمة — إذا قُضي بالفسخ، يُطلب رد ما ثبت سداده أثرًا لإعادة المتعاقدين إلى حالة ما قبل العقد، مع مراعاة ما تسلمه كل طرف.',
      'Return of the advance — If rescission is granted, seek repayment of the advance proved to have been paid, accounting for what each party received.'));
  }
  argumentsList.push(ground(['kw-evidence-1'],
    'عبء الإثبات — يثبت المدعي العقد والالتزام الذي يستند إليه وأي مبلغ يطلب ردّه. وعلى الخصم إثبات ما يدّعيه من وفاء أو سبب لانقضاء الالتزام.',
    'Burden of proof — The claimant proves the contract and the obligation relied on, including any payment it seeks to recover. The opposing party proves any performance or other discharge it asserts.'));
  if (/مصروفات|اتعاب|\b(?:costs|legal fees|lawyers fees)\b/u.test(requests)) {
    argumentsList.push(ground(['kw-procedure-119','kw-procedure-119bis'],
      'المصروفات وأتعاب المحاماة — للمحكمة الحكم في المصروفات وتقدير الأتعاب في حدود الطلب وما يثبت تحمّله منها.',
      'Costs and lawyers’ fees — The court awards costs and assesses lawyers’ fees within the relief sought and in light of the fees shown to have been incurred.'));
  }
  const alternative = normalizeSearch([input.alternativeRequests, input.english?.alternativeRequests].join(' '));
  if (/ندب.{0,20}خبير|\bappoint.{0,26}expert\b/u.test(alternative)) {
    argumentsList.push(ground(['kw-experts-2'],
      'الخبرة — عند قيام نزاع فني في التسليم أو التنفيذ، يُطلب تحديد مأمورية الخبير في بيان ما نُفّذ وقيمته وفق العقد.',
      'Expert evidence — If delivery or performance raises a technical dispute, define the expert’s remit around the work performed and its value under the contract.'));
  }

  const replies = [ground(['kw-civil-209','kw-evidence-1'],
    'التنفيذ الجزئي أو طلب مهلة — إذا أُثير ذلك، يُطلب دليل التسليم وتحديد ما تمّ وما بقي، ثم تقدّر المحكمة أثره في الفسخ وحاجة المدين إلى أجل إضافي.',
    'Partial performance or additional time — If raised, seek proof of delivery and identify completed and remaining work so the court can assess its effect on rescission and any extension.')];
  if (notice) replies.unshift(ground(['kw-civil-298'],
    'المنازعة في الإعذار — إذا نوزع فيه، يُرجع إلى أصل الإنذار وما يثبت طريقة إعلانه وتاريخه.',
    'Challenge to notice — If notice is disputed, refer to its original and the evidence of how and when it was served.'));
  if (linkedPayment.test(facts)) replies.unshift(ground(['kw-civil-196','kw-civil-676'],
    'باقي المقابل — إذا تمسّك الخصم بعدم سداده، يُرجع إلى شرط استحقاقه في العقد وإلى ما يثبت اكتمال العمل أو تسلّمه بحسب الاتفاق.',
    'Outstanding balance — If non-payment is alleged, apply the contractual payment trigger and assess the evidence of completion or acceptance.'));
  return { arguments: argumentsList, replies };
}
