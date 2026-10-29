import type {LegalEvidence} from './legal-search';
import type {LegalIntakeState} from './openai';
import type {QuestionMemory} from './intake-context';
const n=(s:string)=>s.normalize('NFKC').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064b-\u065fـ]/g,'').toLowerCase();
export type MatterGap={key:string;ar:string;en:string;ur:string};
const gap=(key:string,ar:string,en:string,ur:string):MatterGap=>({key,ar,en,ur});
export const matterFactInstructions=`قبل ترجيح التشريع، افهم محل المطالبة وعلاقة الأطراف من الوقائع، لا من اسم نشاط المنشأة وحده. موظف الشركة العقارية قد ينازع على راتبه لا العقار، ومورّد شركة نفطية قد ينازع على فاتورة لا حقوق عامل. اسأل بلغة بسيطة عن الفعل والصفة وطبيعة النشاط والعمل والجهة الحقيقية في العقد ومن يدفع الأجر وهل توجد شركة مقاول وسيطة. لا تعتبر العمل داخل منشأة نفطية عقداً مباشراً معها. لا تساوِ مجرد كلمة «حكومي» أو «خاص» بانطباق نظام قانوني. في العمل استوضح طبيعة المهام ودورية الأجر عند تأثيرهما في المطالبة. في العقار استوضح هل المستخدم مالك أو مستأجر أو مشترٍ أو وسيط، وما التصرف والعقار وموقعه. وفي الأعمال استوضح محل التعاقد وصفة الطرفين. اسأل عن المعلومة الجوهرية الناقصة فقط، سؤالاً واحداً، دون إعادة المعروف أو طلب اختيار نوع الدعوى أو القانون أو المحكمة. إذا تعددت العلاقات أو تعارضت الإجابات فلا تختر قطاعاً أو سنداً على التخمين. اجمع الوقائع ثم استخرج من الملف شروط انطباق النص واستثناءاته وفرعه الموافق للصفة ونوع الأجر وتاريخ الواقعة. لا تستكمل ما غاب عن الملف من الذاكرة. الملاءمة المبدئية ليست اعتماداً نهائياً.`;
export function assessMatterFacts(text:string){
 const s=n(text),known:string[]=[],missing:MatterGap[]=[];
 const employmentText=s.replace(/(?:ليس لي|ليس لدي|لا يوجد لدي|لا يوجد بيننا|ليس بيننا)\s+(?:اي\s+)?عقد\s+عمل/g,'');
 const employmentClaim=/راتبي|راتبه|راتب\s+شهري|اجور|رواتب|مكافاه\s+نهايه\s+الخدمه|عقد\s+عمل|فصل(?:ت|وني|ه|ني|ها)?\s+من\s+العمل|انه(?:ت|اء|ي).*عقد\s+العمل|employment|unpaid salary|end.of.service/.test(employmentText);
 const employmentRelation=/انا\s+(?:موظف|عامل)|اعمل\s+(?:ك|لدي|في)|اشتغل\s+(?:ك|عند|في)|عمل\s+[^.\n]{0,45}لدي\s+شركه|موظف\s+في\s+شركه|عقد\s+عمل|راتبي|راتب\s+شهري/.test(employmentText);
 const propertyClaim=/استاجرت|اجرت\s+(?:شقه|محل|بيت|عقار)|اشتريت\s+(?:شقه|بيت|عقار|ارض)|مستاجر|موجر|اخلاء|عقد\s+ايجار|بيع\s+(?:عقار|شقه|بيت|ارض)|تسجيل\s+عقار|سند\s+ملكيه|tenant|landlord|property sale/.test(s);
 const commercialClaim=/وردت|وردنا|تورد|فاتوره|توريد|شراكه|عقد\s+مقاوله|بعت\s+بضاعه|ثمن\s+بضاعه|supplier|invoice|supply contract/.test(s);
 const propertyMention=/عقار|شقه|ارض|ايجار|بيت|property|real estate/.test(s);
 const mixed=employmentClaim&&(propertyClaim||commercialClaim);
 const domain=mixed?'mixed':propertyClaim?'property':commercialClaim?'commercial':employmentClaim||employmentRelation?'employment':propertyMention&&!/شركه\s+عقاريه/.test(s)?'property':'other';
 const oil=!/(?:ليست|ليس|لا اعمل|لست|غير)[^.\n]{0,20}(?:نفط|بترول)/.test(s)&&/شركه\s+(?:نفطيه|بتروليه)|منشاه\s+نفطيه|استخراج\s+النفط|انتاج\s+النفط|oil company|petroleum/.test(s);
 const propertyIndustry=/شركه\s+عقاريه|تطوير\s+عقاري/.test(s);
 const privateStated=/القطاع\s+الاهلي|القطاع\s+الخاص|قطاع\s+اهلي|شركه\s+خاصه|private sector/.test(s);
 const publicStated=/جهه\s+حكوميه|وزاره|موظف\s+حكومي|government ministry/.test(s);
 const domestic=/عامل[ه]?\s+منزلي[ه]?|عماله\s+منزليه|خادمه|سائق\s+(?:المنزل|منزلي)|domestic worker/.test(s);
 const agency=/عقدي\s+مع\s+شركه\s+(?:مقاول|وسيط)|تابع\s+لشركه\s+مقاول|شركه\s+مقاول.*(?:عقد|راتب)|لست\s+موظفا\s+(?:مباشرا|لدي)|subcontractor|staffing agency/.test(s);
 const activityKnown=oil||propertyIndustry||publicStated||domestic||/نشاط\s+(?:الشركه|الجهه)|تعمل\s+(?:في\s+)?(?:التجاره|التعليم|الصناعه|الصحه|بيع|توزيع|المقاولات)|شركه\s+(?:تجاريه|صناعيه|تعليميه|مقاولات|تبيع)|electrical trading|manufactur|employer activity/.test(s);
 const workKnown=domestic||/محاسب|مهندس|مدرس|معلم|طبيب|صيدلي|ممرض|موظف\s+اداري|سائق|عامل\s+(?:حفر|تشغيل|نظافه)|فني\s+صيانه|امين\s+مخزن|وظيفتي\s+\S+|عملي\s+هو\s+\S+|مسماي\s+الوظيفي\s+\S+|accountant|engineer|teacher|nurse|job duties/.test(s);
 const contractKnown=domestic||agency||/(?:صاحب العمل|جهه العمل|الجهه التي تدفع راتبي|الشركه التي تدفع راتبي)(?:\s+الفعلي)?\s+(?:هو|هي|اسمها)\s+\S+|راتبي\s+من\s+شركه\s+\S+/.test(s)||/قرار\s+تعيين(?:ي|ه)?\s+(?:من|ب|في)\s*وزاره/.test(s)||/عقد(?:ي|ه|ها|\s+العمل)?[^.\n]{0,35}(?:باسم|مع|لدي)\s+\S+|عمل\s+[^.\n]{0,45}لدي\s+شركه[^.\n]{0,65}بعقد|تعاقدت\s+مباشره|عقد\s+مباشر\s+مع|contract (?:is )?with|direct employment contract/.test(employmentText);
 const directOil=/عقد(?:ي|ه|\s+العمل)?[^.\n]{0,65}(?:مع|باسم)[^.\n]{0,35}(?:الشركه\s+النفطيه|شركه\s+نفطيه|مؤسسه\s+البترول|شركه\s+نفط\s+الكويت)/.test(s);
 const frequencyKnown=/شهري|بالشهر|يومي|باليوم|اسبوعي|بالاسبوع|بالساعه|monthly|daily|hourly|weekly/.test(s);
 if(employmentRelation||employmentClaim)known.push('matter.relationship');
 if(activityKnown)known.push('employment.activity');if(workKnown)known.push('employment.work');if(contractKnown)known.push('employment.contract_party');if(frequencyKnown)known.push('employment.pay_frequency');
 if(domain==='mixed')missing.push(gap('matter.claim_focus','ما الواقعة الأساسية التي تريد معالجتها الآن: مستحقات عملك أم التصرف أو العقد الآخر؟','Which event should we address first: your employment dues or the other transaction?','پہلے کس واقعے کو دیکھیں: ملازمت کے واجبات یا دوسرا معاملہ؟'));
 if(domain==='employment'){
  if(!activityKnown)missing.push(gap('employment.activity','ما طبيعة نشاط جهة العمل؟','What does the employer actually do?','آپ کا آجر کیا کام کرتا ہے؟'));
  if(!workKnown)missing.push(gap('employment.work','ما العمل أو المهام التي كنت تؤديها؟','What work or duties did you perform?','آپ کیا کام یا ذمہ داریاں انجام دیتے تھے؟'));
  if(!contractKnown)missing.push(gap('employment.contract_party','من صاحب العمل الفعلي ومن يدفع راتبك؟ وإذا كان لديك عقد، فباسم أي جهة؟','Who is your actual employer and who pays you? If you have a contract, which employer is named?','معاہدے میں آجر کون ہے اور تنخواہ کون دیتا ہے؟'));
  if(oil&&contractKnown&&!agency&&!directOil)missing.push(gap('employment.worksite_employer','هل عقدك مع الجهة النفطية نفسها أم مع شركة أخرى تشغّلك في الموقع؟','Is your contract directly with the oil employer or another company placing you at its site?','کیا معاہدہ براہ راست تیل کی کمپنی سے ہے یا وہاں کام دلانے والی دوسری کمپنی سے؟'));
  if(/مكافاه|راتب|اجور|رواتب|نهايه\s+الخدمه/.test(s)&&!frequencyKnown)missing.push(gap('employment.pay_frequency','هل يُحسب أجرك بالشهر أم باليوم أو بالساعة؟','Is your wage calculated monthly, daily or hourly?','آپ کی اجرت ماہانہ، روزانہ یا فی گھنٹہ ہے؟'));
 }
 const relationKnown=/انا\s+(?:المالك|مالك|المستاجر|مستاجر|الموجر|موجر|المشتري|مشتري|وسيط)|استاجرت|اجرت\s|اشتريت|بعت|وردت|وردنا|supplier|tenant|landlord/.test(s);
 const transactionKnown=propertyClaim||commercialClaim;
 const propertyTypeKnown=/شقه|منزل|بيت|محل|مكتب|ارض|سكني|تجاري|apartment|house|shop|land/.test(s);
 const propertyLocationKnown=/الكويت|كويتي|حولي|الفروانيه|الاحمدي|الجهراء|العاصمه|مبارك\s+الكبير|kuwait/.test(s);
 if(relationKnown)known.push('matter.relationship');if(transactionKnown)known.push('matter.transaction');if(propertyTypeKnown)known.push('property.type');if(propertyLocationKnown)known.push('property.location');
 if(domain==='commercial'&&!relationKnown)missing.push(gap('matter.relationship','هل أنت المورّد أو المشتري أو المقاول أو الشريك، وما التزام الطرف الآخر الذي لم ينفذه؟','Are you the supplier, buyer, contractor or partner, and which obligation was not performed?','کیا آپ سپلائر، خریدار، ٹھیکیدار یا شریک ہیں، اور کون سی ذمہ داری پوری نہیں ہوئی؟'));
 if(domain==='property'){
  if(!relationKnown)missing.push(gap('matter.relationship','ما علاقتك بالعقار وبالشخص الذي تختلف معه؟','What is your relationship to the property and the other party?','جائیداد اور دوسرے فریق سے آپ کا کیا تعلق ہے؟'));
  if(!transactionKnown)missing.push(gap('matter.transaction','ما الذي حدث تحديدًا بشأن العقار أو العقد؟','What exactly happened with the property or contract?','جائیداد یا معاہدے کے متعلق کیا ہوا؟'));
  if(!propertyTypeKnown)missing.push(gap('property.type','ما نوع العقار وكيف يُستخدم؟','What type of property is it and how is it used?','جائیداد کس نوعیت کی ہے اور کیسے استعمال ہوتی ہے؟'));
  if(!propertyLocationKnown)missing.push(gap('property.location','أين يقع العقار؟','Where is the property located?','جائیداد کہاں واقع ہے؟'));
 }
 if(domain==='other'&&s.trim().length<55&&!relationKnown)missing.push(gap('matter.relationship','ما الذي حدث بينك وبين الطرف الآخر، وما علاقتك به؟','What happened with the other party, and what is your relationship?','دوسرے فریق سے آپ کا کیا تعلق ہے اور کیا ہوا؟'));
 const employmentReady=domain==='employment'&&!missing.length;
 return {domain,activity:oil?'oil':propertyIndustry?'real_estate':publicStated?'public':domestic?'domestic':activityKnown?'other':'unknown',agency,known:[...new Set(known)],missing,ready:!missing.length,eligibility:{oil:employmentReady&&oil&&!agency&&directOil,domestic:employmentReady&&domestic,public:employmentReady&&publicStated&&!agency,private:employmentReady&&!domestic&&(!publicStated||agency)&&(privateStated||agency||activityKnown)}};
}
export function selectMatterSources<T extends Pick<LegalEvidence,'title'>>(evidence:T[],text:string):T[]{
 const profile=assessMatterFacts(text),s=n(text);
 return evidence.filter(source=>{
  const title=n(source.title),labor=/العمل\s+في\s+القطاع|العماله\s+المنزليه|الخدمه\s+المدنيه|التامين\s+التكميلي/.test(title);
  if(profile.domain==='property'||profile.domain==='commercial')return !labor;
  if(profile.domain==='employment'){
   if(/القطاع\s+النفطي/.test(title))return profile.eligibility.oil;
   if(/العماله\s+المنزليه/.test(title))return profile.eligibility.domestic;
   if(/العمل\s+في\s+القطاع\s+(?:الاهلي|االهلي)/.test(title))return profile.eligibility.private||profile.eligibility.oil;
   if(/الخدمه\s+المدنيه/.test(title))return profile.eligibility.public;
   if(/ايجار\s+العقارات|التسجيل\s+العقاري|السجل\s+العيني/.test(title)&&!/ايجار|ملكيه|تسجيل\s+عقار/.test(s))return false;
  }
  if((profile.domain==='mixed'||!profile.ready)&&labor)return false;
  return true;
 });
}
export function guardMatterIntake(state:LegalIntakeState,text:string,previous:QuestionMemory,language:string){
 const p=assessMatterFacts(text),lang=language==='en'?'en':language==='ur'?'ur':'ar';
 const memory={asked:[...previous.asked],resolved:[...new Set([...previous.resolved,...(state.questionMemory?.resolved||[]),...p.known])],unavailable:[...new Set([...previous.unavailable,...(state.questionMemory?.unavailable||[])])]};
 const current=state as LegalIntakeState & {matterFacts?:unknown};
 current.matterFacts={...p,missing:p.missing.map(g=>({key:g.key,question:g[lang]})),legalApplicability:'requires_source_and_human_review'};
 if(!p.missing.length)return current;
 const question=p.missing.find(g=>!memory.asked.some(q=>q.key===g.key)&&!memory.unavailable.includes(g.key));
 current.readyForMemo=false;current.phase='gathering';current.court='';current.courtCircuit='';current.jurisdictionConfidence='low';current.legalBasis=[];
 const notice=lang==='en'?'The relevant statute and court remain provisional until these facts are clear.':lang==='ur'?'متعلقہ قانون اور عدالت کا تعین حقائق واضح ہونے تک مؤخر ہے۔':'تحديد التشريع المتخصص والمحكمة يبقى مؤجلًا حتى تتضح هذه الوقائع.';
 current.jurisdictionReason=notice;current.analysisWarnings=[...new Set([...(current.analysisWarnings||[]),notice])];
 current.missingInformation=[...new Set([...(current.missingInformation||[]),...p.missing.map(g=>g[lang])])];
 current.memoPrefill={...current.memoPrefill,court:''};current.nextQuestions=question?[question[lang]]:[];current.questionKey=question?.key||'';
 if(question)memory.asked.push({key:question.key,text:question[lang]});
 current.questionMemory=memory;current.resolvedTopics=memory.resolved;current.unavailableTopics=memory.unavailable;
 current.assistantMessage=(lang==='en'?'I need to clarify the relevant facts.':lang==='ur'?'متعلقہ حقائق واضح کرنا ضروری ہے۔':'أحتاج توضيح الوقائع المرتبطة بالمشكلة.')+(question?'\n'+question[lang]:' '+notice);
 return current;
}
