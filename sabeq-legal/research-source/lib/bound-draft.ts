import {selectMatterSources} from "./matter-facts";
import type {PleadingContent,PleadingInput} from './pleading-document';
import type {LegalEvidence} from './legal-search';
import {hasReviewedJudgment} from './judgment-evidence';
const normal=(s:string)=>s.normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064b-\u065f]/g,'');
export const pleadingAuthorityInstructions = `عند صياغة صحيفة أو استئناف أو مذكرة دفاع: ابدأ بوقائع محددة من المدخلات، ثم القاعدة القانونية الموثقة، ثم مضمون المبدأ القضائي المناسب إن توفر، ثم تطبيقهما على الواقعة والرد على الاعتراض والطلب الذي أجازه المستخدم.
لا تخترع نص مادة أو حكماً أو رقم طعن أو تاريخاً أو نتيجة. لا تجعل مقتطفاً نصاً كاملاً ولا مبدأ من تجميع قضائي حكماً كاملاً. إذا لم يتوفر نص السند أو هويته المطلوبة فلا تنشئ إحالة إليه؛ تسجل الفجوة للمراجعة خارج الورقة.
اكتب مضمون السند ووجه الاستدلال داخل الدفع نفسه. ضع علامة المصدر الداخلية مباشرة بعده للتحقق فقط؛ يضيف الخادم هوية المادة وقانونها وبيانات المحكمة والدائرة ورقم الطعن وسنته والجلسة من السجل المتحقق، فلا تكررها كقائمة مراجع.
ممنوع إدراج هوامش أو حواش أو قائمة مصادر أو عبارات من نوع «المرجع: منشورات وزارة العدل» أو روابط البوابات أو أسماء ملفات البحث أو صفحات PDF داخل الورقة القضائية. تبقى هذه البيانات في سجل المراجعة الداخلي فقط، ولا تحل محل مضمون السند ووجه تطبيقه.
لا تغير اسماً أو صفة أو مبلغاً أو واقعة، ولا تضف طلباً أو إقراراً غير مأذون. ذكر جهة أو رابط بوصفه واقعة في القضية يبقى كما ورد ولا يعامل كمرجع بحث.`;
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
  const citation=` (المادة ${article} من ${s.title}${identity})`;
  return text.slice(Math.max(0,offset-citation.length),offset)===citation?marker:citation+marker;
 });
 return {...content,grounds:decorate(content.grounds),requests:locked?input.requests:decorate(content.requests)};
}
