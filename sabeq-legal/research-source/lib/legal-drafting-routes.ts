// Server-owned drafting organisation, not a ruling on jurisdiction or admissibility.
// Reference documents contribute structure only; no case data or authorities live here.
export const legalDraftingRouteRevision = "legal-drafting-routes-2";
export type DraftingFamily = "misdemeanor" | "felony" | "administrative" | "civil" | "commercial" | "private_labor" | "family" | "tenancy" | "real_estate" | "enforcement";
export type DraftingKind = "claim" | "appeal" | "memorandum";
export type DraftingPurpose = "general" | "monetary_claim" | "expert_appointment" | "medical_expert" | "guardianship" | "care_assignment";
type DraftingInput = Partial<Record<"caseType" | "court" | "courtCircuit" | "partyRole" | "documentKind" | "caseStage" | "requests" | "facts" | "clientName" | "otherParty" | "originalRequests" | "judgmentOperative" | "judgmentNumber" | "notificationDate" | "caseNumber", string>>;
type Profile = { id: DraftingFamily; label: string; matches: RegExp; queries: string[]; instructions: string };
const norm = (v = "") => v.normalize("NFKC").replace(/[إأآٱ]/g,"ا").replace(/[ىی]/g,"ي").replace(/ک/g,"ك").replace(/ہ/g,"ه").replace(/ة/g,"ه").replace(/[\u064b-\u065f\u0670ـ]/g,"").toLowerCase();
export const legalDraftingProfiles: readonly Profile[] = [
 {id:"misdemeanor",label:"الجنح",matches:/جنح|جنحه|misdemeanou?r/,queries:["الجنح الاتهام المسند الأدلة وأركان الواقعة والدفوع المرتبطة بها"],instructions:"مسار الجنح: ثبّت وصف الجنحة المسندة فعلاً، وصفة كل طرف والفعل المنسوب إليه ودليل نسبته. عالج عناصر الاتهام والقصد والسببية والإجراء المطعون فيه عند قيامها في القضية ومصادرها فقط. لا تستعمل صيغة جناية أو صحيفة مطالبة مدنية لافتتاح الاتهام، ولا تفترض براءة أو اعترافاً أو بطلاناً أو تنازلاً أو أثراً للتصالح."},
 {id:"felony",label:"الجنايات",matches:/جناي|felon/,queries:["الجنايات وصف الاتهام إسناد الفعل القصد السببية الأدلة والضمانات الإجرائية"],instructions:"مسار الجنايات: افصل الاتهامات ودور كل متهم عن الآخرين؛ ناقش الدليل وظروفه وحدود نسبته وعناصر الوصف المسند بحسب المصادر. لا تختزل الجناية في نموذج جنحة، ولا تنقل عقوبة أو إجراء أو ميعاد أو طلب إخلاء سبيل من نموذج آخر. افصل مسألة المسؤولية الجزائية عن أي حق مدني تابع معروض فعلاً."},
 {id:"administrative",label:"الإداري",matches:/اداري|انتظامي|administrative/,queries:["النزاع الإداري طبيعة القرار أو التصرف المطعون فيه الصفة والمصلحة والطلب وحدود الرقابة"],instructions:"مسار الإداري: حدّد القرار أو التصرف أو المركز الإداري محل المنازعة، ومصدره وصفة الجهة ومن يمثّلها والضرر والطلب الفعلي. افصل الإلغاء والتعويض والاستحقاق بحسب المدخلات. لا تفترض قراراً سلبياً أو تظلماً أو تاريخ علم أو فوات ميعاد أو سلطة مقيدة. الإداري تخصص مستقل عن أول درجة والاستئناف؛ مجرد وجود جهة عامة لا يثبت الاختصاص الإداري."},
 {id:"civil",label:"المدني",matches:/مدني|ديواني|civil/,queries:["النزاع المدني مصدر الالتزام أو المسؤولية إثبات الحق والتخلص منه حدود الطلب"],instructions:"مسار المدني: افصل مصدر الالتزام أو المسؤولية عن دليل ثبوته وانقضائه، والمنازعة في المقدار عن المنازعة في الأصل. يظل التعويض المدني مدنياً عند الإشارة إلى واقعة أو حكم جزائي سابق؛ لا تنقل منطوقه أو أثره إلا من مستند القضية ومصدر موثق. وجود وزارة أو طبيب أو شركة في الأطراف لا يغير التخصص وحده."},
 {id:"commercial",label:"التجاري",matches:/تجار|commercial/,queries:["المنازعة التجارية طبيعة التعامل التزامات الأطراف وتنفيذ العقد والحسابات والمستندات"],instructions:"مسار التجاري: ثبّت طبيعة التعامل وصفة أطرافه والعقد والتزامات كل طرف والإخلال والمستندات المالية ذات الصلة. فرّق المطالبة بالأداء عن الفسخ والتعويض وندب الخبير؛ لا تضف تضامناً أو فوائد أو نفاذاً معجلاً أو فسخاً تلقائياً. اسم شركة وحده لا يجعل التعامل تجارياً."},
 {id:"private_labor",label:"العمل في القطاع الأهلي",matches:/عمالي|العمل(?: في)? (?:القطاع )?الاهلي|(?:ال)?قطاع (?:ال)?اهلي|private.?labor|labou?r|محنت/,queries:["العمل في القطاع الأهلي طبيعة علاقة العمل المطالبات والمدة والأجر والمستندات"],instructions:"مسار العمل الأهلي: تحقّق من القطاع وعلاقة العمل وطبيعة الأجر والمدة وسبب انتهائها ومن المطالبات المأذونة. لا تطبق قواعد القطاع الأهلي على موظف عام أو قطاع ذي نظام خاص بمجرد كلمة موظف؛ لا تحسب مستحقاً أو تقادماً أو تعويضاً دون بياناته ومصدره الموثق."},
 {id:"family",label:"الأسرة والأحوال الشخصية",matches:/اسره|احوال شخصي|عائلي|خانداني|وصاي|guardianship|family|personal status/,queries:["الأحوال الشخصية طبيعة الطلب والصفة والتمثيل وحدود الولاية أو الوصاية"],instructions:"مسار الأسرة والأحوال الشخصية: حدّد نوع الطلب والصفة والعلاقة الأسرية والتمثيل الفعلي من المدخلات. افصل الحضانة عن الولاية والوصاية والقوامة وإدارة أموال القاصر؛ لا تفترض أولوية شخص أو سريان نظام معين أو صفة ممثل عن غيره. اختصام هيئة عامة في مسألة وصاية لا يحولها تلقائياً إلى دعوى إدارية."},
 {id:"tenancy",label:"الإيجارات",matches:/ايجار|كرايه|tenancy|rent(?:al)?\b/,queries:["العلاقة الإيجارية طبيعة العين والعقد والأجرة والإخلال والطلب"],instructions:"مسار الإيجارات: ثبّت العلاقة الإيجارية والعين وصفة المؤجر والمستأجر والأجرة والفترة المتنازع عليها وسبب الطلب. افصل الإخلاء عن الأجرة والتعويض ورد التأمين، ولا تحول نزاع الملكية إلى إيجارات أو تفترض إنذاراً أو مدة أو سبب إخلاء."},
 {id:"real_estate",label:"العقار والملكية",matches:/عقار|جائيداد|ملكيه عقار|real estate|property ownership/,queries:["النزاع العقاري محل الحق والملكية أو الحيازة والتصرفات والطلبات"],instructions:"مسار العقار والملكية: حدّد العين والحق المتنازع عليه وسند الملكية أو الحيازة والقيود والتصرف المطلوب بحثه من المستندات المتاحة. افصل الملكية والحيازة والبيع والشيوع عن العلاقة الإيجارية. لا تفترض تسجيلاً أو وصفاً مساحياً أو صحة تصرف أو حصة أو وضع يد."},
 {id:"enforcement",label:"التنفيذ ومنازعاته",matches:/تنفيذ|نفاذ|enforcement/,queries:["التنفيذ السند التنفيذي أطرافه الإجراء محل المنازعة وحدود الطلب"],instructions:"مسار التنفيذ: ثبّت السند التنفيذي وأطرافه والإجراء محل الطلب وصفة المستشكل أو طالب التنفيذ من الملف. افصل منازعة التنفيذ عن الطعن في أصل الحكم أو دعوى جديدة؛ لا تفترض الصيغة التنفيذية أو الإعلان أو الوقف أو زوال المديونية. الطلبات الخاصة تظل بحاجة إلى قالبها المعتمد، ولا تستبدل بصحيفة دعوى مدنية عامة."},
];
// Questions to resolve from the current case and retrieved sources, never rules
// or presumed facts imported from reference pleadings.
const routeReviewChecklists: Record<DraftingFamily,readonly string[]> = {
 misdemeanor:["وصف الجنحة ونص التجريم المنطبق من المصدر","الفعل والدليل والقصد المنسوب لكل متهم على حدة","مشروعية الإجراء محل المنازعة عند ورود وقائعه","الدفع والرد والطلب المأذون دون افتراض بطلان أو براءة"],
 felony:["كل اتهام وعناصره بنصه المتحقق","تفريد الأفعال والأدلة والظروف لكل متهم","حدود الاستدلال والقصد والسببية بحسب وصف الاتهام","التمييز بين المسؤولية الجزائية وأي مطالبة مدنية تابعة"],
 administrative:["القرار أو المركز الإداري والجهة وصفة صاحب الطلب","القاعدة المنظمة وشروط انطباقها والدليل على تحققها","سبب الرفض وأسباب الحكم إن وجد والاعتراض المحدد عليها","تمييز الإلغاء والاستحقاق والتعويض والمرحلة دون افتراض قبول الطعن"],
 civil:["مصدر الالتزام وثبوته واستحقاقه","دليل الوفاء واتصال كل دفعة بالدين ونطاق المخالصة","الخسارة والسببية ومقدار التعويض المثبت","الطلبات الأصلية والمنازعة في الأصل أو المقدار دون إقرار ضمني"],
 commercial:["نطاق العقد والتزامات الطرفين ومراحل الاستحقاق","فصل المقابل الأصلي عن الإضافات والمدفوعات والملحقات","دليل التنفيذ والتسليم والاعتراضات الفنية","شروط الفسخ والرد والتعويض بحسب النصوص والمستندات"],
 private_labor:["نظام علاقة العمل والقطاع الفعلي","مدة العمل والأجر ومكوناته وسبب الانتهاء من مستنداتها","أساس كل استحقاق وحسابه وما ثبت دفعه","المطالبة والمرحلة والمواعيد من نصوص منطبقة فقط"],
 family:["نوع الطلب والعلاقة الأسرية والصفة والتمثيل","فصل الحضانة عن الولاية والوصاية والقوامة","المركز القائم والوقائع المنتجة ومصلحة المستفيد من أدلتها","نطاق الطلب والصلاحية دون افتراض أولوية أو نظام واجب التطبيق"],
 tenancy:["العين والعقد وصفة المؤجر والمستأجر","الفترة والأجرة والدفعات والإنذار إن ثبت","تمييز الإخلاء والأجرة والتأمين والتعويض","سبب الطلب ودليله والنص المنطبق دون افتراض سبب إخلاء"],
 real_estate:["العين والحق المتنازع عليه والصفة","سند الملكية أو الحيازة أو التصرف وقيوده","فصل البيع والشيوع والحيازة عن الإيجار","الطلبات وحدود الأثر دون اختراع حصة أو تسجيل أو وصف مساحي"],
 enforcement:["السند التنفيذي وأطرافه وحدود المبلغ والملحقات","صفة من يجري التنفيذ عليه وصفة مقدم المنازعة","إعلان السند والتكليف والإنذارات من أوراقها","فصل منازعة التنفيذ عن الطعن في الحكم وتحديد الإجراء الجاري"],
};
const approvedPaymentConsent=(text:string)=>{
 const value=norm(text.replace(/«[^»]*»|“[^”]*”|"[^"\n]*"/gu,""));
 const matches=value.matchAll(/(?:^|\s)(?:اقر|نقر)\s+(?:بالدين|بالمديونيه|باستحقاق|بالتزامي|بالتزامنا|بالمبلغ)(?=\s|$)|(?:اوافق|نوافق|اقبل|نقبل)\s+(?:علي\s+)?(?:الصلح|التسويه|السداد|سداد|الدفع|دفع|اداء|تحمل)(?=\s|$)|(?:اطلب|نطلب|التمس|نلتمس)\s+(?:اعتماد|اثبات|تنفيذ)\s+(?:اتفاق\s+)?(?:الصلح|التسويه)/gu);
 return [...matches].some(match=>!/(?:لا|لم|لن|عدم|ارفض)\s*$/u.test(value.slice(Math.max(0,(match.index||0)-24),match.index)));
};
const rejectsPayment=(prefix:string)=>/(?:رفض|الغاء|ابطال|بطلان|نقض|وقف|سقوط|استبعاد)(?:\s+(?:طلب|الحكم|القاضي|ب|ما|قضي|به|القضاء|قرار|القرار|الدعوي|المطالبه|القول|المتعلق|الطلبات|بشان|بطلب|المدعي|الخصم)){0,7}\s*$|عدم(?:\s+(?:جواز|احقيه|قبول|اجابه|الحكم|القضاء|ثبوت|طلب|الطلب|الخصم)){0,4}\s*$/u.test(prefix);
const requestsExpert=(text:string)=>{
 for(const part of text.split(/[\n؛،.!؟]+/u)) {
  const clause=norm(part);
  for(const match of clause.matchAll(/ندب\s+(?:خبير|هيئه خبراء)|اعاده\s+(?:ندب\s+)?(?:الخبير|الخبره)|اعاده\s+الماموريه(?=[^\n]{0,50}(?:خبير|الخبراء))/gu)) {
   const prefix=clause.slice(Math.max(0,(match.index||0)-120),match.index);
   if(!rejectsPayment(prefix)&&!/(?:لا\s+(?:اطلب|نطلب|اريد|نريد)|دون|بدون)\s*$/u.test(prefix))return true;
  }
 }
 return false;
};
export function reviewRequestedRelief(input:DraftingInput,requests=input.requests||"") {
 const issues:string[]=[];const role=roleOf(input.partyRole||"");
 const approvedConsent=approvedPaymentConsent(input.requests||"");
 if(requestsExpert(requests)&&!requestsExpert(input.requests||""))issues.push("unapproved_expert_relief");
 for(const part of requests.split(/[\n؛،.!؟]+/u)) {
  const clause=norm(part);
  const payments=clause.matchAll(/الزام\s+(.{2,180}?)\s+(?:ب(?:دفع|سداد|اداء|تسديد|تاديه)|بان\s+(?:يؤدي|تؤدي|يؤديا)|ان\s+(?:يؤدي|تؤدي|يؤديا))/gu);
  for(const match of payments) {
   const target=match[1];
   const prefix=clause.slice(Math.max(0,(match.index||0)-120),match.index);
   if(rejectsPayment(prefix)||approvedConsent)continue;
   const client=norm(input.clientName||"").replace(/[^\p{L}\p{N}\s]/gu,"").trim();
   const namesClient=client.length>=4&&(target.trim()===client||target.startsWith(client+" بصفته"));
   const defendant=role==="defendant"&&/المدعي\s+عليه(?:ا|ما|م|ن)?(?=\s|$)/u.test(target)&&!/(?:^|\s)الاخر(?:ي|ى)?(?=\s|$)/u.test(target);
   const accused=role==="accused"&&/(?:^|\s)المتهم(?=\s|$)/u.test(target);
   if(namesClient||defendant||accused)issues.push("self_adverse_relief");
  }
 }
 return {ok:issues.length===0,issues:[...new Set(issues)],question:issues.includes("self_adverse_relief")?"الطلب الحالي يتضمن إلزام صاحب المذكرة بالدفع. هل هذا طلب الخصم الذي نرد عليه، أم إقرار أو صلح يقصده صاحب المذكرة؟ حدّد الطلب المقصود دون تغيير الوقائع.":issues.length?"أضيف طلب ندب خبير أو إعادة الخبرة لم يرد ضمن طلبات صاحب المذكرة. يلزم إبقاء الطلب المأذون وعرض أي اقتراح جديد للمراجعة خارج النص.":""};
}
const purposeInstructions: Record<DraftingPurpose,string> = {
 general:"التزم بطبيعة الطلب الحالي ولا تضف طلباً شائعاً لمجرد وروده في نموذج مرجعي.",
 monetary_claim:"مسار المطالبة: بيّن منشأ الحق والمقدار المطالب به وأساس حسابه وما ثبت من سداد أو خصم دون إقرار ضمني ببقية الأرقام. ميّز أصل الدين عن التعويض والمصاريف والطلبات التابعة؛ لا تنشئ فوائد أو تضامناً أو مبلغاً احتياطياً غير مأذون.",
 expert_appointment:"مسار ندب الخبير: عيّن المسألة الفنية المنتجة ومهمة الخبير المطلوبة من الوقائع والمستندات الفعلية، وافصلها عن الفصل في المسألة القانونية. وضّح صلة المهمة بالطلب النهائي وحدوده؛ لا تجعل طلب الخبرة إقراراً بالدين أو حكماً بفسخ أو تعويض، ولا تضف خبرة جديدة إن كان المستخدم يرفضها أو يطلب مناقشة تقرير قائم فقط.",
 medical_expert:"مسار الخبرة في المسؤولية الطبية: فرّق الادعاء بالخطأ عن ثبوته، والبحث الفني والضرر والسببية عن التكييف القضائي. حدّد مهمة الفحص والسجلات المتاحة والأطراف وصفاتهم من القضية الجديدة دون تشخيص أو اختراع إعاقة أو نسبة عجز أو علاج. لا تفترض جهة فنية مختصة أو إجراءً إلزامياً أو مسؤولية جزائية من مجرد وجود مقدم خدمة صحي.",
 guardianship:"مسار الوصاية: افصل تعيين الوصي أو استبداله وحدود صلاحياته عن الحضانة والقوامة، وبيّن الصفة والمصلحة والمركز القائم والأموال أو الشؤون المطلوب إدارتها بحسب المدخلات فقط. لا تنقل أسماء قصر أو صلات قرابة أو وفاة أو أصول أو ترتيب أولوية من النماذج، ولا تفترض أحقية الطالب.",
 care_assignment:"مسار التكليف بالرعاية: عيّن صفة مقدم الطلب والمستفيد والمكلف الحالي والمطلوب تغيير تكليفه من البيانات الفعلية، والقرار أو الامتناع محل الطلب إذا ثبت. افصل هذا الإجراء عن الوصاية والحضانة والقوامة ولا تنقل وصفاً طبياً أو مصلحة أو ترتيباً عائلياً من المثال.",
};
export type LegalDraftingRoute = {
 revision: string; status:"ready"|"needs_clarification"|"template_review";
 id:string; family:DraftingFamily|null; label:string; purpose:DraftingPurpose;
 degree:"first_instance"|"appeal"|"cassation"|"unspecified";
 kind:DraftingKind; role:"claimant"|"defendant"|"accused"|"complainant"|"appellant"|"respondent"|"cassation_applicant"|"cassation_respondent"|"enforcement_applicant"|"execution_objector"|"unspecified";
 issueCodes:string[]; question:string;
};
function purposeOf(input:DraftingInput):DraftingPurpose {
 const request=norm(input.requests),category=norm(input.caseType);
 const expert=/(?:ندب|تعيين|احاله[^\n.]{0,35})(?:\s+(?:الي|اداره|الخبراء|جهه|لجنه|احد|من|المختصين|خبرائها|وزاره|العدل))*\s*(?:خبير|خبره|خبراء)|ندب\s+خبير|expert appointment|appoint[^.\n]{0,30}expert/.test(request)
  && !/(?:لا|لن|دون|عدم|رفض|ارفض|نرفض|لا اريد|لا نطلب)[^\n.]{0,25}(?:ندب|تعيين|احاله)[^\n.]{0,35}(?:خبير|خبراء|خبره)/.test(request);
 if(expert) {
  const medicalLiability=/(?:مسئولي|مسؤولي|خطا)[^\n.]{0,20}طبي|طبي[^\n.]{0,20}(?:مسئولي|مسؤولي|خطا)|medical liability|medical malpractice/.test(category+" "+request);
  const opposed=/(?:خبير|خبراء|خبره)[^\n.]{0,40}(?:ارفضه|نرفضه|رفض طلبه|رفضه)/.test(request);
  if(!opposed)return medicalLiability?"medical_expert":"expert_appointment";
 }
 if(/وصاي|تعيين[^\n.]{0,25}وصي|استبدال[^\n.]{0,25}وصي|guardianship/.test(request))return "guardianship";
 if(/(?:مكلف|تكليف)[^\n.]{0,30}(?:رعايه)|care assignment/.test(request))return "care_assignment";
 if(/(?:الزام|مطالب|سداد|اداء|تعويض)[^\n.]{0,45}(?:مبلغ|دين|رصيد|اجره|مستحق)|monetary claim|payment/.test(request))return "monetary_claim";
 return "general";
}
function roleOf(value:string):LegalDraftingRoute["role"] {
 const s=norm(value);
 if(/مستشكل|execution objector/.test(s))return "execution_objector";
 if(/طالب التنفيذ|enforcement applicant/.test(s))return "enforcement_applicant";
 if(/مطعون ضد/.test(s))return "cassation_respondent";
 if(/طاعن/.test(s))return "cassation_applicant";
 if(/مستانف ضد|respondent/.test(s))return "respondent";
 if(/مستانف|appellant/.test(s))return "appellant";
 if(/متهم|accused/.test(s))return "accused";
 if(/مدعي عليه|مدعا عليه|defendant/.test(s))return "defendant";
 if(/شاكي|شاك|مجني عليه|مدعي بالحق المدني|complainant/.test(s))return "complainant";
 if(/مدع|طالب|مقدم الطلب|plaintiff|claimant|applicant/.test(s))return "claimant";
 return "unspecified";
}
const caseReference=(value:string)=>{
 const normalized=norm(value).replace(/[٠-٩۰-۹]/gu,digit=>String("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹".indexOf(digit)%10));
 return normalized.match(/\d+/gu)?.join("/")||normalized.replace(/\s+/gu,"");
};
export function resolveLegalDraftingRoute(input:DraftingInput):LegalDraftingRoute {
 // Deliberately exclude party names, sample filenames, facts and quoted precedents
 // from subject classification. A historical criminal judgment is not the current forum.
 const explicit=norm(`${input.caseType||""}\n${input.courtCircuit||""}\n${input.court||""}`);
 let found=legalDraftingProfiles.filter(p=>p.matches.test(explicit));
 // A broad civil label may be refined by a specific civil subject/circuit.
 if(found.length>1&&found.some(p=>p.id==="civil")&&!found.some(p=>["misdemeanor","felony","administrative"].includes(p.id)))found=found.filter(p=>p.id!=="civil");
 const family=found.length===1?found[0].id:null,role=roleOf(input.partyRole||""),purpose=purposeOf(input);
 const position=norm(`${input.court||""} ${input.caseStage||""}`),request=norm(input.requests);
 const degree:LegalDraftingRoute["degree"]=/تمييز|cassation/.test(position)||role.startsWith("cassation_")?"cassation":/استئناف|استيناف|اپيل|appeal/.test(position)||["appellant","respondent"].includes(role)?"appeal":/كليه|جزئيه|اسره|اول درجه|جنح|جناي|ابتدائي|ابتدايي|first.instance/.test(position)?"first_instance":"unspecified";
 const explicitKind=["claim","appeal","memorandum"].includes(input.documentKind||"")?input.documentKind as DraftingKind:null;
 const answering=["defendant","accused","respondent","cassation_respondent"].includes(role);
 const wantsMemo=/مذكره|(?:^|[،؛\n])\s*دفاع|قضيه منظوره|جلسه|memorandum|defen[cs]e/.test(norm(`${input.caseStage||""} ${input.requests||""}`));
 const criminal=family==="misdemeanor"||family==="felony";
 const kind:DraftingKind=explicitKind||(answering||criminal||degree==="cassation"||wantsMemo||family==="enforcement"?"memorandum":degree==="appeal"&&role==="appellant"?"appeal":"claim");
 const result:LegalDraftingRoute={revision:legalDraftingRouteRevision,status:"ready",id:"",family,label:found.length===1?found[0].label:"مسار يحتاج تحديداً",purpose,degree,kind,role,issueCodes:[],question:""};
 const stop=(code:string,question:string,status:LegalDraftingRoute["status"]="needs_clarification")=>{result.status=status;result.issueCodes.push(code);if(!result.question)result.question=question;};
 const forum=norm(input.court),forumDegree=/تمييز|cassation/.test(forum)?"cassation":/استئناف|استيناف|اپيل|appeal/.test(forum)?"appeal":/كليه|جزئيه|اسره|جنح|جناي|ابتدائي|ابتدايي|first.instance/.test(forum)?"first_instance":null;
 const actorDegree=role.startsWith("cassation_")?"cassation":["appellant","respondent"].includes(role)?"appeal":explicitKind==="appeal"?"appeal":null;
 if(forumDegree&&actorDegree&&forumDegree!==actorDegree)stop("court_stage_conflict","هل المحكمة المذكورة هي التي أصدرت الحكم السابق أم الجهة التي تنظر الإجراء الحالي؟ حدّد المحكمة والصفة الحاليتين دون تغيير بيانات الحكم السابق.");
 if(family&&!["misdemeanor","felony"].includes(family)&&/جزائي|جنائي|فوجداري|criminal/.test(explicit))stop("conflicting_subjects","اختلف نوع القضية عن الدائرة الجزائية المذكورة؛ ما نوع الإجراء الحالي والدائرة المبينة في ورقته؟");
 if(found.length>1)stop("conflicting_subjects","اختلف نوع القضية عن الدائرة المذكورة؛ ما نوع الإجراء الحالي والدائرة المبينة في آخر ورقة تخصه؟");
 else if(!family)stop(/جزائي|جنايي|جنائي|فوجداري|criminal/.test(explicit)?"criminal_grade_missing":"unknown_subject",/جزائي|جنايي|جنائي|فوجداري|criminal/.test(explicit)?"هل الاتهام الحالي مقيد جنحة أم جناية بحسب ورقة القضية؟":"ما نوع النزاع الحالي والدائرة التي تنظر فيه بحسب بيانات القضية؟");
 if(family==="private_labor") {
  const employment=norm(`${input.caseType||""} ${input.facts||""}`);
  if(/قطاع حكومي|خدمه مدنيه|موظف عام|وظيفه عامه|سركاري|قطاع نفطي|عماله منزليه|public employment/.test(employment))stop("employment_regime_conflict","هل علاقة العمل في القطاع الأهلي أم وظيفة عامة أو جهة ذات نظام خاص؟");
  else if(!/قطاع خاص|شركه خاصه|(?:ال)?قطاع (?:ال)?اهلي|العمل الاهلي|نجي شعب|private/.test(employment))stop("employment_sector_missing","ما طبيعة جهة العمل ونظام علاقة العمل: قطاع أهلي أم وظيفة عامة أم نظام خاص؟");
 }
 if(/دستوري|constitutional|عسكري|military/.test(norm(`${input.court||""} ${input.courtCircuit||""}`)))stop("special_forum_template","هذا إجراء أمام جهة ذات نظام خاص؛ يلزم تحديد المستند وقالب معتمد لتلك الجهة، ولا يستخدم قالب دعوى مدنية تلقائياً.","template_review");
 const reliefReview=reviewRequestedRelief(input);
 if(!reliefReview.ok)stop("self_adverse_relief",reliefReview.question);
 const enforcementNotice=/(?:ورد|وصل|تسلم|تبلغ|استلم|تم)\s+(?:\S+\s+){0,4}(?:انذار|اخطار)\s+(?:ب)?تنفيذ|اعلان السند التنفيذي/u.test(norm(input.facts));
 const currentProcedure=/استئناف|طعن|تمييز|معارضه|تنفيذ|دعوي جديده|دعوي مستقله/u.test(norm(input.caseStage));
 if(enforcementNotice&&input.notificationDate&&input.judgmentNumber&&input.caseNumber&&caseReference(input.judgmentNumber)!==caseReference(input.caseNumber)&&family!=="enforcement"&&!currentProcedure&&explicitKind!=="appeal"&&explicitKind!=="claim")stop("current_procedure_unclear","ورد تنفيذ لحكم يختلف عن رقم الدعوى المذكور. هل المطلوب مذكرة في التنفيذ الحالي أم في خصومة أخرى؟ حدّد الإجراء والصفة الحاليين مع إبقاء بيانات الحكم والدعوى السابقة كما هي.");
 if(role==="unspecified")stop("party_role_missing","ما صفة الشخص الذي نعد المستند لمصلحته في الإجراء الحالي؟");
 if(explicitKind==="claim"&&answering)stop("adverse_party_form","هل المطلوب الرد على مطالبة الخصم أم رفع دعوى مستقلة للموكل بطلب مأذون؟");
 if(explicitKind==="appeal"&&["respondent","cassation_respondent"].includes(role))stop("respondent_cannot_file_opponent_appeal","هل نعد رداً على طعن الخصم أم طعناً مستقلاً يرفعه الموكل؟");
 if(kind==="appeal"&&!criminal&&degree!=="cassation"&&!["appellant","respondent"].includes(role))stop("appeal_actor_missing","هل الشخص الذي نعد الصحيفة لمصلحته هو من يرفع الاستئناف، أم نرد على استئناف الطرف الآخر؟ يلزم تثبيت الصفة الحالية.");
 if(degree==="appeal"&&kind==="claim")stop("appeal_not_original_claim","هل المطلوب صحيفة استئناف أم مذكرة في الاستئناف القائم، أم دعوى مستقلة جديدة؟");
 const unsupportedCriminalFiling=criminal&&(kind!=="memorandum"||(!explicitKind&&!wantsMemo&&/صحيفه|رفع[^\n.]{0,12}(?:دعوي|استئناف)|تقرير[^\n.]{0,12}استئناف/.test(request)));
 if(unsupportedCriminalFiling)stop("special_criminal_filing_template","هذا طلب افتتاح أو طعن جزائي يحتاج تحديد الإجراء وقالباً معتمداً خاصاً؛ لا يستبدل بصحيفة مدنية. ما الإجراء المطلوب بحسب ورقة القضية؟","template_review");
 if(degree==="cassation"&&(kind!=="memorandum"||(!explicitKind&&/صحيفه|تقرير طعن|رفع طعن/.test(request))))stop("cassation_filing_template","هل المطلوب مذكرة في طعن قائم أم صحيفة طعن بالتمييز؟ صحيفة الطعن تحتاج قالبها المعتمد الخاص.","template_review");
 if(family==="enforcement"&&(kind!=="memorandum"||(!explicitKind&&!wantsMemo&&/طلب تنفيذ|فتح ملف|بدء التنفيذ/.test(request))))stop("enforcement_filing_template","ما طلب التنفيذ المحدد؟ يحتاج الطلب الخاص قالباً معتمداً، ويمكن إعداد مذكرة في المنازعة القائمة دون تحويله إلى دعوى مدنية.","template_review");
 if(purpose==="guardianship"&&family&&family!=="family")stop("guardianship_subject_conflict","هل الطلب وصاية أم نزاع مدني أو إجراء آخر؟ بيّن نوع الطلب والدائرة حتى نستخدم مساره الصحيح.");
 if(purpose==="care_assignment"&&family==="family")stop("care_not_guardianship","هل المطلوب التكليف بالرعاية أم الوصاية أو الحضانة؟ هذه طلبات مختلفة ويجب تثبيت الإجراء الحالي.");
 if(result.status!=="ready")result.label=result.status==="template_review"?"مسار يحتاج قالباً معتمداً":"مسار يحتاج تحديداً";
 result.id=result.status==="ready"?`${family}.${purpose}.${degree}.${kind}.${role}`:"";
 return result;
}
export function legalRouteSummary(route:LegalDraftingRoute) {
 const {revision,status,id,family,label,purpose,degree,kind,role,issueCodes,question}=route;
 return {revision,status,id,family,label,purpose,degree,kind,role,issueCodes:[...issueCodes],question,reviewChecklist:family?[...routeReviewChecklists[family]]:[]};
}
export function legalRouteQuestion(route:LegalDraftingRoute,language="ar") {
 if(language!=="en"&&language!=="ur")return route.question;
 const code=route.issueCodes[0];
 if(code==="self_adverse_relief")return language==="en"?"The requested relief would require the represented person to pay. Is this the opponent's demand to contest, or an acknowledgment or settlement intended by the client?":"موجودہ درخواست موکل پر ادائیگی کی ذمہ داری ڈالتی ہے۔ کیا یہ مخالف کا مطالبہ ہے جس کا جواب دینا ہے، یا موکل کا اقرار یا منظور شدہ تصفیہ؟";
 if(code==="current_procedure_unclear")return language==="en"?"The execution notice concerns a different judgment. Is this memorandum for the current execution proceeding or another case? Confirm the current procedure and role.":"تنفیذ کا نوٹس ایک مختلف فیصلے سے متعلق ہے۔ کیا یہ یادداشت موجودہ تنفیذ کے لیے ہے یا کسی اور مقدمے کے لیے؟ موجودہ کارروائی اور حیثیت واضح کریں۔";

 if(code==="criminal_grade_missing")return language==="en"?"Is the current charge recorded as a misdemeanor or a felony in the case document?":"مقدمے کے کاغذ میں موجودہ الزام جنحہ ہے یا جنایت؟";
 if(code?.startsWith("employment_"))return language==="en"?"Is this private-sector employment, a public-service position, or employment under a special system?":"ملازمت نجی شعبے کی ہے، سرکاری ہے یا کسی خاص نظام کے تحت ہے؟";
 if(code==="party_role_missing")return language==="en"?"What is the represented person's role in the current proceeding?":"موجودہ کارروائی میں جس شخص کی نمائندگی ہے اس کی حیثیت کیا ہے؟";
 if(route.status==="template_review")return language==="en"?"What exact filing is requested? This special filing needs its own approved form.":"کون سی مخصوص عدالتی درخواست مطلوب ہے؟ اس کے لیے الگ منظور شدہ نمونہ ضروری ہے۔";
 return language==="en"?"Which current case type and chamber are shown in the case details?":"مقدمے کی تفصیلات میں موجودہ نوعیت اور متعلقہ عدالتی شعبہ کیا ہے؟";
}
export function legalRouteInstructions(route:LegalDraftingRoute) {
 const profile=legalDraftingProfiles.find(p=>p.id===route.family);
 if(route.status!=="ready"||!profile)return "لم يعتمد مسار الصياغة؛ لا تخمّن تخصصاً أو قالباً بديلاً.";
 const form=route.kind==="memorandum"?"المطلوب مذكرة في الإجراء القائم؛ لا تكتب صحيفة افتتاح دعوى أو طعناً باسم الخصم.":route.kind==="appeal"?"المطلوب صحيفة استئناف: افصل أسباب الاعتراض على الحكم وطلبات الطعن عن وقائع الدعوى الأصلية، ولا تجزم بقبول الطعن أو ميعاده.":"المطلوب صحيفة دعوى: ثبّت الصفة ومحل المطالبة وسببها والأسانيد والطلبات المأذونة، ولا تحولها إلى دفاع عن الطرف الآخر.";
 return `مسار الصياغة الخادمي: ${route.id}. لا تغير التخصص أو درجة التقاضي أو نوع المستند أو صفة الطرف أثناء التخطيط أو التصحيح. التصنيف تنظيم للصياغة لا إثبات للاختصاص أو قبول الإجراء.\n${profile.instructions}\nمحاور مراجعة هذا المسار (بحسب الوقائع والمصادر المتاحة، لا تفترض تحققها):\n${routeReviewChecklists[route.family!].map((point,index)=>`${index+1}- ${point}`).join("\n")}\nطلبات الخصم ومنطوق الحكم السابق بيانات للمناقشة وليست طلبات صاحب المذكرة. اربط كل طلب ختامي بطلب مأذون، ولا تضف إقراراً أو التزاماً بالدفع من صياغة النموذج.\n${purposeInstructions[route.purpose]}\n${form}\nصلة السند تتحدد بالمسألة والوقائع؛ يجوز بحث مسألة تبعية من تخصص آخر بمصدر موثق مع تفسير صلتها دون تغيير مسار الدعوى. كل وقائع وأرقام وأسماء القضية من مدخلاتها المعتمدة فقط، وكل سند من مصادرها الموثقة؛ النماذج الأسلوبية ليست مصدراً للوقائع أو القوانين أو الأحكام.`;
}
export function legalRouteResearchQueries(route:LegalDraftingRoute) {
 return route.status==="ready"?legalDraftingProfiles.find(p=>p.id===route.family)?.queries||[]:[];
}
export function reviewLegalRouteContent(route:LegalDraftingRoute,content:{facts:string;grounds:string;requests:string},input:DraftingInput={}) {
 const issues:string[]=[...reviewRequestedRelief({...input,partyRole:input.partyRole||({defendant:"مدعى عليه",accused:"متهم"} as Record<string,string>)[route.role]||route.role},content.requests).issues];
 // Inspect isolated document headings only, never a historical event or a
 // cross-domain authority legitimately discussed within a paragraph.
 for(const line of `${content.grounds}\n${content.requests}`.split("\n")) {
  const s=norm(line.trim());if(s.length>100||!/^(?:مذكره(?: بدفاع)?|صحيفه|دعوي)\s/.test(s))continue;
  const headings=legalDraftingProfiles.filter(p=>p.matches.test(s));
  if(headings.some(p=>p.id!==route.family&&!(p.id==="civil"&&["commercial","tenancy","real_estate"].includes(route.family||""))))issues.push("cross_route_heading");
  if(route.kind==="memorandum"&&/^صحيفه\s+(?:دعوي|استئناف)/.test(s))issues.push("wrong_document_heading");
 }
 return {ok:issues.length===0,issues:[...new Set(issues)]};
}
