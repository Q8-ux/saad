import {selectMatterSources} from "./matter-facts";
import type {PleadingContent,PleadingInput} from './pleading-document';
import type {LegalEvidence} from './legal-search';
import {hasReviewedJudgment} from './judgment-evidence';
import {draftStatutoryText} from './statutory-text';
const normal=(s:string)=>s.normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064b-\u065f]/g,'');
export const pleadingAuthorityInstructions = `ست قواعد لتحرير صحيفة أو استئناف أو مذكرة دفاع:
1. اعتمد الوقائع والطلبات المصححة والمرفقات المقروءة المعتمدة؛ لا تعاود طلب معلومة متاحة، ولا تعامل كلام المساعد أو وصف مستند غير مقروء كدليل. لا تغير اسماً أو صفة أو مبلغاً أو تاريخاً أو واقعة، ولا تضف طلباً أو إقراراً غير مأذون.
2. حافظ على أسلوب المذكرة القضائية المكتوبة بسرد متصل وحجج مرتبة، لا بأسلوب تقرير تقني أو إجابات مختصرة. أبقِ هيكل القالب المعتمد واضحاً: المحكمة والدائرة ورقم الدعوى إن عُرفت، ثم صاحب المذكرة وصفته والطرف الآخر وصفته، ثم الوقائع زمنياً، ثم الدفوع والأسانيد مع التطبيق على الوقائع، وأخيراً الطلبات الأصلية والاحتياطية المأذون بها فقط. اكتب بلغة قانونية مباشرة، ولكل فقرة فكرة محددة، دون تغيير أسماء الأطراف وصفاتهم أو ترتيب الوقائع أو معنى الطلبات. لا تختصر بإسقاط واقعة أو دفع مؤثر، ولا تكرر العبارات الإنشائية، ولا تفرض طولاً ثابتاً.
3. رتّب الوقائع زمنياً والدفوع موضوعياً والطلبات بوضوح وفق القالب المعتمد. لكل دفع: الواقعة، ثم القاعدة القانونية الموثقة، ثم مضمون المبدأ القضائي المناسب إن توفر، ثم التطبيق والرد على الاعتراض المؤثر والطلب المأذون. في المنازعات المدنية والتجارية ابحث عند اللزوم دفوع المرافعات (الاختصاص، الصفة، المصلحة، صحة الإعلان، البطلان، المواعيد) من نص قانون المرافعات رقم 38 لسنة 1980 والتعديلات المنطبقة، دون افتراض انطباقها على الجزائي أو إضافة دفع بلا وقائع وسند.
4. لكل دفع يستند إلى مادة متاحة موثقة ومختارة في خطة القضية: اشرح وجه الاستدلال أولاً، وضع علامة المصدر الداخلية ملاصقة لذلك الدفع؛ يُدرج الخادم بعدها في نفس موضع الدفع رقم المادة واسم القانون ورقمه وسنته عند ثبوتها، ثم النص القانوني الحرفي من سجل المصدر. لا تنقل نص المادة من ذاكرة النموذج ولا تعِد صياغته أو تصحيح اقتباس مشوه بالتخمين. لا تكتف برقم مادة بلا نص متاح أو علامة مصدر، ولا تضع النصوص في قائمة منفصلة بآخر المذكرة. عند كون المصدر مقتطفاً راجع حدوده وسمّه مقتطفاً، ولا تعرضه بصفته النص الكامل. لا تخترع حكماً أو رقم طعن أو تاريخاً أو نتيجة، ولا تخلط مبدأ التجميع القضائي بالحكم الكامل. بيانات المحكمة والدائرة والطعن وسنته والجلسة من السجل المتحقق فقط.
5. عند نقص السند أو هويته لا تنشئ إحالة إليه. سجّل النواقص والتعارضات للمراجعة خارج الورقة في factualNotes أو legalResearchNotes. ممنوع إدراج هوامش أو حواش أو قائمة مصادر أو روابط بوابات أو أسماء ملفات بحث أو صفحات PDF أو ملاحظات تقنية داخل المذكرة؛ تحفظ في سجل المراجعة الداخلي. ذكر جهة أو رابط كواقعة يبقى كما ورد ولا يعامل كمرجع بحث.
6. قبل التسليم راجع الأسماء والصفات والمبالغ والتواريخ وتغطية الدفوع والطلبات ومطابقة الاستشهادات واتساقها مع الواقعة. الناتج مسودة تحتاج اعتماد المختص؛ لا تدّع اكتمالاً أو تحققاً لم يحصل، ويبقى بيان حالة المراجعة خارج متن المذكرة.`;
/** Only an explicit factual sector excludes a distinct sector's enactment. */
export function scopeEvidenceToFacts(evidence:LegalEvidence[],caseText:string){
 return selectMatterSources(evidence,caseText);
}
export function prepareBoundDraft(content:PleadingContent,input:PleadingInput,evidence:LegalEvidence[]):PleadingContent{
 const boundary=normal(input.requests+' '+input.facts);
 // Preserve an explicit closed relief boundary. Optional new claims need a
 // separate user approval, even when a model/auditor suggests them.
 const locked=/دون\s+(?:اي\s+)?(?:اضافه\s+)?طلبات\s+اخر[ىي]|دون\s+اضافه\s+(?:اي\s+)?طلبات|لا\s+(?:تضف|اريد)\s+طلبات\s+(?:اضافيه|اخر[ىي])/.test(boundary);
 const decorate=(text:string)=>text.replace(/[【\[]\s*م(\d+)\s*[】\]]/g,(marker,n,offset)=>{
  const s=evidence[Number(n)-1],c=s?.corpus;
  if(s&&hasReviewedJudgment(s)&&s.judgment?.analogy){
   const j=s.judgment,date=j.decisionDate.split('-').reverse().join('/');
   const citation=` (محكمة التمييز، الدائرة ${j.chamber}؛ الطعن رقم ${j.appealNumber} لسنة ${j.appealYear}؛ جلسة ${date})`;
   return text.slice(Math.max(0,offset-citation.length),offset)===citation?marker:citation+marker;
  }
  const article=c?.articleIdentityUnique?c.articleNumber:s?.verification?.status==='source_verified'?s.verification.articleNumber:null;
  if(!article)return marker;
  const law=c?.lawIdentity||(s?.verification?.status==='source_verified'&&s.lawNumber&&s.lawYear?{number:s.lawNumber,year:s.lawYear}:null);
  const identity=law?`، القانون رقم ${law.number} لسنة ${law.year}`:'';
  const statutory=draftStatutoryText(s);
  const wording=statutory?`؛ ${statutory.complete?'نص المادة':'مقتطف من نص المادة'}: ${statutory.quote}`:'';
  const citation=` (المادة ${article} من ${s.title}${identity})${wording}`;
  return text.slice(Math.max(0,offset-citation.length),offset)===citation?marker:citation+marker;
 });
 return {...content,grounds:decorate(content.grounds),requests:locked?input.requests:decorate(content.requests)};
}
