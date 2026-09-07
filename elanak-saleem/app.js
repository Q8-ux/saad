const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORAGE_KEY = 'elanak-saleem-records-v1';
let lang = localStorage.getItem('elanak-saleem-lang') || 'ar';
let lastResult = null;

const t = {
  ar: {
    brand:'إعلانك سليم',brandSub:'مراجعة أوضح قبل النشر',eyebrow:'مساعد امتثال إعلاني',headline:'افحص إعلانك قبل ما تنشره',lead:'نراجع البيانات الأساسية، العبارات الحساسة ومتطلبات كل قطاع، ثم نعطيك نسخة أوضح وجاهزة.',localRules:'قواعد مخصصة للسوق الكويتي',adDetails:'بيانات الإعلان',adDetailsHint:'المعلومات التي ستظهر للعميل',category:'نوع الإعلان',catGeneral:'منتج أو خدمة عامة',catDigital:'متجر إلكتروني',catDiscount:'عرض أو تخفيض',catInfluencer:'إعلان مؤثر',catHealth:'صحي أو تجميلي',catRealestate:'عقاري',catTelecom:'اتصالات أو اشتراك',providerName:'اسم المشروع أو المعلن',providerPlaceholder:'مثال: متجر السالم',price:'السعر النهائي',pricePlaceholder:'مثال: 12 د.ك',adCopy:'نص الإعلان',copyPlaceholder:'الصق النص كما سيظهر في الإعلان...',characters:'حرف',contact:'وسيلة التواصل',contactPlaceholder:'رابط الموقع أو رقم الشركة',permit:'رقم الترخيص أو الموافقة',optional:'اختياري',offerDuration:'مدة العرض',durationPlaceholder:'مثال: حتى 30 سبتمبر 2026',upload:'أضف صورة أو فيديو الإعلان',uploadHint:'اختياري — حتى 20 ميجابايت',analyze:'افحص الإعلان الآن',privacy:'الفحص يتم داخل جهازك في هذه النسخة التجريبية، ولا يتم رفع ملفاتك.',resultReady:'تقريرك يظهر هنا',resultReadyHint:'أدخل نص الإعلان وسنوضح لك ما هو مكتمل وما يحتاج تعديل.',checkDisclosure:'وضوح الإفصاح والسعر',checkClaims:'رصد العبارات الحساسة',checkSector:'متطلبات القطاع',findings:'نتائج الفحص',correctedCopy:'النص المقترح',copy:'نسخ',saveRecord:'حفظ في السجل',downloadReport:'تنزيل التقرير',legalNote:'هذا تقييم إرشادي وليس اعتماداً قانونياً أو ترخيصاً من جهة حكومية.',yourWorkspace:'مساحة عملك',archive:'سجل الإعلانات',archiveHint:'محفوظ على هذا الجهاز فقط.',clearAll:'مسح الكل',noRecords:'لا توجد إعلانات محفوظة',noRecordsHint:'افحص إعلاناً ثم احفظ تقريره ليظهر هنا.',startCheck:'ابدأ فحصاً جديداً',simplePlan:'اشتراك واضح',planTitle:'كل ما يحتاجه إعلانك قبل النشر',planLead:'خطة شهرية واحدة دون التزام سنوي. التفعيل التجريبي لا يخصم أي مبلغ.',operatorReady:'جاهز للربط مستقبلاً مع',proPlan:'الخطة الاحترافية',kwd:'د.ك',perMonth:'شهرياً',feature1:'30 فحصاً شهرياً',feature2:'نص معدل جاهز للنشر',feature3:'سجل الإعلانات والتقارير',feature4:'تنبيهات المتطلبات الحساسة',feature5:'إلغاء الاشتراك في أي وقت',activateDemo:'جرّب التفعيل',demoNoCharge:'عرض تجريبي — لا يتم الخصم من الرصيد',check:'الفحص',archiveNav:'السجل',subscription:'الاشتراك',demoActivation:'تجربة التفعيل',demoActivationHint:'أدخل رقمك لمشاهدة تجربة الاشتراك. لن تُرسل رسالة ولن يُخصم أي مبلغ.',mobileNumber:'رقم الهاتف',demoBanner:'نسخة عرض فقط — الربط الفعلي يتطلب موافقة شركة الاتصالات.',continue:'متابعة',fileTooLarge:'حجم الملف أكبر من 20 ميجابايت',saved:'تم حفظ التقرير في السجل',copied:'تم نسخ النص المقترح',copyFailed:'تعذر النسخ، حدّد النص وانسخه يدوياً',downloaded:'تم تنزيل التقرير',cleared:'تم مسح السجل',invalidPhone:'أدخل رقم هاتف كويتياً من 8 أرقام',demoDone:'تمت تجربة التفعيل بنجاح — دون أي خصم',alreadySaved:'هذا التقرير محفوظ مسبقاً',findingsCount:'ملاحظات',statusGood:'مطمئن',statusReview:'يحتاج مراجعة',statusRisk:'مخاطر مرتفعة',titleGood:'الإعلان واضح مبدئياً',titleReview:'عدّل هذه النقاط قبل النشر',titleRisk:'لا تنشر قبل معالجة الملاحظات',summaryGood:'لم نرصد نقصاً أساسياً في الفحص الآلي.',summaryReview:'هناك بيانات أو عبارات تحتاج توضيحاً.',summaryRisk:'رصدنا نقاطاً جوهرية قد ترفع مخاطر الإعلان.',pass:'مكتمل',warn:'تنبيه',fail:'مطلوب',delete:'حذف',savedOn:'حُفظ',reportTitle:'تقرير فحص إعلان'
  },
  en: {
    brand:'AdCheck Kuwait',brandSub:'A clearer review before publishing',eyebrow:'Advertising compliance assistant',headline:'Check your ad before you publish',lead:'We review key disclosures, sensitive claims and sector requirements, then prepare a clearer version.',localRules:'Rules tailored to Kuwait',adDetails:'Advertisement details',adDetailsHint:'Information your customer will see',category:'Advertisement type',catGeneral:'General product or service',catDigital:'Online store',catDiscount:'Offer or discount',catInfluencer:'Influencer promotion',catHealth:'Health or beauty',catRealestate:'Real estate',catTelecom:'Telecom or subscription',providerName:'Business or advertiser name',providerPlaceholder:'Example: Al Salem Store',price:'Final price',pricePlaceholder:'Example: KWD 12',adCopy:'Advertisement copy',copyPlaceholder:'Paste the copy exactly as it will appear...',characters:'characters',contact:'Contact method',contactPlaceholder:'Company website or number',permit:'Permit or approval number',optional:'Optional',offerDuration:'Offer duration',durationPlaceholder:'Example: Until 30 September 2026',upload:'Add the ad image or video',uploadHint:'Optional — up to 20 MB',analyze:'Check this advertisement',privacy:'This demo checks data on your device and does not upload your files.',resultReady:'Your report appears here',resultReadyHint:'Enter your copy to see what is complete and what needs attention.',checkDisclosure:'Disclosure and price clarity',checkClaims:'Sensitive claim detection',checkSector:'Sector requirements',findings:'Review findings',correctedCopy:'Suggested copy',copy:'Copy',saveRecord:'Save to archive',downloadReport:'Download report',legalNote:'This is guidance, not legal approval or a government permit.',yourWorkspace:'Your workspace',archive:'Advertisement archive',archiveHint:'Stored on this device only.',clearAll:'Clear all',noRecords:'No saved advertisements',noRecordsHint:'Check an advertisement and save its report to see it here.',startCheck:'Start a new check',simplePlan:'Simple subscription',planTitle:'Everything your ad needs before publishing',planLead:'One monthly plan with no annual commitment. Demo activation makes no charge.',operatorReady:'Ready for future integration with',proPlan:'Professional plan',kwd:'KWD',perMonth:'per month',feature1:'30 checks each month',feature2:'Revised copy ready to publish',feature3:'Advertisement and report archive',feature4:'Sensitive-requirement alerts',feature5:'Cancel at any time',activateDemo:'Try activation',demoNoCharge:'Demo only — no balance will be charged',check:'Check',archiveNav:'Archive',subscription:'Subscribe',demoActivation:'Activation demo',demoActivationHint:'Enter your number to preview the subscription flow. No message or charge will occur.',mobileNumber:'Mobile number',demoBanner:'Demonstration only — live billing requires operator approval.',continue:'Continue',fileTooLarge:'The file is larger than 20 MB',saved:'Report saved to your archive',copied:'Suggested copy copied',copyFailed:'Could not copy. Select the text and copy it manually.',downloaded:'Report downloaded',cleared:'Archive cleared',invalidPhone:'Enter a valid 8-digit Kuwait mobile number',demoDone:'Activation demo completed — no charge made',alreadySaved:'This report is already saved',findingsCount:'findings',statusGood:'Clear',statusReview:'Review needed',statusRisk:'High risk',titleGood:'The advertisement is initially clear',titleReview:'Make these changes before publishing',titleRisk:'Do not publish before resolving these issues',summaryGood:'No key omissions were found by the automated check.',summaryReview:'Some information or claims need clarification.',summaryRisk:'Key issues may materially increase advertising risk.',pass:'Complete',warn:'Caution',fail:'Required',delete:'Delete',savedOn:'Saved',reportTitle:'Advertisement Review Report'
  }
};

function tr(key){return t[lang][key] || key}

function applyLanguage(){
  document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  $('#langButton').textContent=lang==='ar'?'EN':'ع';
  $$('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(t[lang][k])el.textContent=t[lang][k]});
  $$('[data-i18n-placeholder]').forEach(el=>{const k=el.dataset.i18nPlaceholder;if(t[lang][k])el.placeholder=t[lang][k]});
  renderArchive();
  if(lastResult) renderResult(lastResult);
}

$('#langButton').addEventListener('click',()=>{lang=lang==='ar'?'en':'ar';localStorage.setItem('elanak-saleem-lang',lang);applyLanguage()});

function route(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.route===name));
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='archive')renderArchive();
}
$$('[data-route]').forEach(el=>el.addEventListener('click',(e)=>{e.preventDefault();route(el.dataset.route)}));

$('#adCopy').addEventListener('input',()=>$('#charCount').textContent=$('#adCopy').value.length);
$('#adFile').addEventListener('change',(e)=>{const f=e.target.files[0];if(!f)return;if(f.size>20*1024*1024){showToast(tr('fileTooLarge'));e.target.value='';return}$('#fileName').textContent=f.name});

const categoryNames={ar:{general:'عام',digital:'متجر إلكتروني',discount:'عرض أو تخفيض',influencer:'إعلان مؤثر',health:'صحي أو تجميلي',realestate:'عقاري',telecom:'اتصالات أو اشتراك'},en:{general:'General',digital:'Online store',discount:'Offer or discount',influencer:'Influencer',health:'Health or beauty',realestate:'Real estate',telecom:'Telecom or subscription'}};

function makeFinding(level,titleAr,titleEn,detailAr,detailEn){return{level,title:{ar:titleAr,en:titleEn},detail:{ar:detailAr,en:detailEn}}}
function includesAny(text,patterns){return patterns.some(p=>text.toLowerCase().includes(p.toLowerCase()))}

function analyze(data){
  const f=[];let score=100;const all=`${data.copy} ${data.price} ${data.contact} ${data.duration} ${data.permit}`;
  const add=(finding,penalty=0)=>{f.push(finding);score-=penalty};
  if(data.provider.length>=2)add(makeFinding('pass','هوية المعلن واضحة','Advertiser identity is clear','تم ذكر اسم المشروع أو المعلن.','The business or advertiser is identified.'));
  else add(makeFinding('fail','اسم المعلن غير موجود','Advertiser name is missing','أضف الاسم التجاري أو اسم مقدم الخدمة بوضوح.','Add the business or service provider name clearly.'),18);
  if(data.price.trim())add(makeFinding('pass','السعر مذكور','Price is stated','تم إدخال السعر النهائي للخدمة أو المنتج.','A final price has been provided.'));
  else add(makeFinding('fail','السعر النهائي غير واضح','Final price is unclear','اذكر السعر النهائي وأي رسوم إضافية بصورة مباشرة.','State the final price and any additional fees.'),18);
  if(data.copy.trim().length>=28)add(makeFinding('pass','الوصف قابل للفهم','Description is understandable','النص يحتوي وصفاً كافياً لإجراء الفحص الأولي.','The copy contains enough detail for an initial review.'));
  else add(makeFinding('warn','وصف الإعلان قصير','Advertisement description is brief','أضف وصفاً دقيقاً للمنتج أو الخدمة وما يحصل عليه العميل.','Add a precise description of the product or service.'),10);
  if(data.contact.trim())add(makeFinding('pass','وسيلة التواصل موجودة','Contact method is present','تم توفير قناة يستطيع العميل الرجوع إليها.','A customer contact channel is provided.'));
  else add(makeFinding('fail','بيانات التواصل ناقصة','Contact information is missing','أضف رابط المتجر أو رقم الشركة أو الحساب الرسمي.','Add the store link, business number or official account.'),12);

  const riskyAr=['مضمون 100%','الأفضل في الكويت','رقم واحد','نتائج مضمونة','يعالج نهائياً','بدون أي مخاطر','مجاني للأبد'];
  const riskyEn=['guaranteed 100%','best in kuwait','#1','guaranteed results','cures','risk free','free forever'];
  const foundRisk=[...riskyAr,...riskyEn].filter(x=>data.copy.toLowerCase().includes(x.toLowerCase()));
  if(foundRisk.length)add(makeFinding('warn','ادعاءات تحتاج دليلاً','Claims need evidence',`راجع أو أثبت العبارات التالية: ${foundRisk.join('، ')}.`,`Review or substantiate: ${foundRisk.join(', ')}.`),15);
  else add(makeFinding('pass','لا توجد مبالغات واضحة','No obvious exaggerated claims','لم نرصد في القائمة الآلية ادعاءات مطلقة شائعة.','No common absolute claims were detected.'));

  const isOffer=data.category==='discount'||includesAny(all,['خصم','عرض','%','٪','discount','offer','مجانا','مجاني','free']);
  if(isOffer){
    if(data.duration.trim())add(makeFinding('pass','مدة العرض محددة','Offer duration is stated','تم توضيح نهاية أو مدة العرض.','The offer end date or duration is stated.'));
    else add(makeFinding('fail','مدة العرض غير محددة','Offer duration is missing','أضف تاريخ بداية ونهاية العرض أو مدة سريانه.','Add the offer start and end date or validity period.'),15);
    if(includesAny(all,['الشروط','تطبق','terms','conditions']))add(makeFinding('pass','هناك إشارة إلى الشروط','Terms are referenced','تأكد أن الشروط ظاهرة وقابلة للقراءة.','Ensure the terms are visible and readable.'));
    else add(makeFinding('warn','شروط العرض غير ظاهرة','Offer terms are not visible','أضف الشروط والاستثناءات الأساسية بوضوح.','Add the main terms and exclusions clearly.'),8);
  }

  if(['health','realestate'].includes(data.category)){
    if(data.permit.trim())add(makeFinding('pass','رقم الموافقة مدخل','Approval number provided','تحقق من سريان الرقم ومن مطابقته للإعلان النهائي.','Verify the number is valid and matches the final advertisement.'));
    else add(makeFinding('fail','الموافقة القطاعية غير مدخلة','Sector approval is missing',data.category==='health'?'الإعلانات الصحية والتجميلية قد تتطلب موافقة مختصة قبل النشر.':'أدخل رقم ترخيص الإعلان العقاري وتحقق من صلاحيته.',data.category==='health'?'Health and beauty advertising may require approval before publication.':'Enter and validate the real-estate advertising permit.'),22);
  }
  if(data.category==='influencer'){
    if(includesAny(data.copy,['إعلان','تعاون مدفوع','برعاية','ad','paid partnership','sponsored']))add(makeFinding('pass','الإفصاح الإعلاني موجود','Advertising disclosure is present','تم رصد إفصاح يوضح الطبيعة الإعلانية للمحتوى.','A disclosure identifying the content as advertising was detected.'));
    else add(makeFinding('fail','الإفصاح الإعلاني غير موجود','Advertising disclosure is missing','أضف كلمة «إعلان» أو «تعاون مدفوع» بصورة واضحة.','Add “Ad”, “Sponsored” or “Paid partnership” clearly.'),20);
    add(makeFinding('warn','احتفظ بمستندات التعاون','Keep collaboration records','احتفظ بالعقد، الدفع، نسخة الإعلان والموافقات في ملف واحد.','Keep the contract, payment, ad version and approvals together.'),4);
  }
  if(data.category==='telecom'){
    if(includesAny(all,['شهري','أسبوعي','يومي','monthly','weekly','daily']))add(makeFinding('pass','دورية الاشتراك مذكورة','Billing frequency is stated','تم رصد مدة واضحة للاشتراك.','A subscription billing period was detected.'));
    else add(makeFinding('fail','دورية الاشتراك غير واضحة','Billing frequency is unclear','اذكر قيمة الاشتراك ودوريته الشهرية أو الأسبوعية بوضوح.','State the subscription price and monthly or weekly frequency.'),18);
    add(makeFinding('warn','التفعيل والإلغاء','Activation and cancellation','يلزم مسار موافقة واضح قبل التفعيل وإلغاء متاح في أي وقت.','Use explicit consent before activation and allow cancellation at any time.'),5);
  }
  if(data.category==='digital')add(makeFinding('warn','شروط الشراء الإلكتروني','Online purchase terms','أظهر السعر النهائي، التسليم، الدفع، وسياسة الإرجاع والاستبدال في صفحة مرتبطة.','Show final price, delivery, payment and return terms on a linked page.'),5);
  score=Math.max(0,Math.min(100,score));
  const status=score>=82?'good':score>=55?'review':'risk';
  return{...data,score,status,findings:f,corrected:buildCorrected(data,isOffer),createdAt:new Date().toISOString(),id:crypto.randomUUID?crypto.randomUUID():String(Date.now())};
}

function buildCorrected(d,isOffer){
  const lines=[];
  if(d.category==='influencer')lines.push(lang==='ar'?'إعلان | تعاون مدفوع':'ADVERTISEMENT | Paid partnership');
  if(d.provider)lines.push(d.provider);
  lines.push(d.copy.trim());
  if(d.price)lines.push(lang==='ar'?`السعر النهائي: ${d.price}`:`Final price: ${d.price}`);
  if(isOffer&&d.duration)lines.push(lang==='ar'?`مدة العرض: ${d.duration}`:`Offer duration: ${d.duration}`);
  if(d.permit)lines.push(lang==='ar'?`رقم الترخيص/الموافقة: ${d.permit}`:`Permit/approval: ${d.permit}`);
  if(d.contact)lines.push(lang==='ar'?`للتفاصيل والتواصل: ${d.contact}`:`Details and contact: ${d.contact}`);
  if(isOffer)lines.push(lang==='ar'?'تطبق الشروط والأحكام المعلنة.':'Published terms and conditions apply.');
  return lines.filter(Boolean).join('\n\n');
}

$('#checkerForm').addEventListener('submit',(e)=>{
  e.preventDefault();const copy=$('#adCopy').value.trim();
  if(!copy){$('#adCopy').focus();return}
  const data={category:$('#category').value,provider:$('#providerName').value.trim(),price:$('#price').value.trim(),copy,contact:$('#contact').value.trim(),permit:$('#permit').value.trim(),duration:$('#duration').value.trim(),file:$('#adFile').files[0]?.name||''};
  lastResult=analyze(data);renderResult(lastResult);$('#resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
});

function renderResult(r){
  $('#emptyState').hidden=true;$('#resultContent').hidden=false;$('#resultPanel').classList.remove('empty');
  $('#scoreValue').textContent=r.score;$('#scoreRing').style.setProperty('--score',`${r.score*3.6}deg`);
  $('#statusPill').textContent=tr(r.status==='good'?'statusGood':r.status==='review'?'statusReview':'statusRisk');
  $('#resultTitle').textContent=tr(r.status==='good'?'titleGood':r.status==='review'?'titleReview':'titleRisk');
  $('#resultSummary').textContent=tr(r.status==='good'?'summaryGood':r.status==='review'?'summaryReview':'summaryRisk');
  $('#findingCount').textContent=`${r.findings.length} ${tr('findingsCount')}`;
  $('#findingsList').innerHTML=r.findings.map(x=>`<article class="finding ${x.level}"><span class="finding-icon">${x.level==='pass'?'✓':x.level==='warn'?'!':'×'}</span><div><h4>${escapeHTML(x.title[lang])}</h4><p>${escapeHTML(x.detail[lang])}</p></div></article>`).join('');
  $('#correctedCopy').value=r.corrected=buildCorrected(r,r.category==='discount'||includesAny(`${r.copy} ${r.duration}`,['خصم','عرض','%','٪','discount','offer','free','مجاني']));
}

$('#copyButton').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#correctedCopy').value);showToast(tr('copied'))}catch{$('#correctedCopy').select();showToast(tr('copyFailed'))}});
$('#saveButton').addEventListener('click',()=>{if(!lastResult)return;const records=getRecords();if(records.some(r=>r.id===lastResult.id)){showToast(tr('alreadySaved'));return}records.unshift(lastResult);localStorage.setItem(STORAGE_KEY,JSON.stringify(records.slice(0,50)));showToast(tr('saved'))});
$('#downloadButton').addEventListener('click',()=>{if(!lastResult)return;const report=`${tr('reportTitle')}\n${'='.repeat(32)}\n${categoryNames[lang][lastResult.category]} | ${lastResult.score}/100\n\n${lastResult.findings.map(x=>`[${tr(x.level)}] ${x.title[lang]}\n${x.detail[lang]}`).join('\n\n')}\n\n${tr('correctedCopy')}\n${'-'.repeat(24)}\n${lastResult.corrected}\n\n${tr('legalNote')}`;downloadText(`ad-report-${Date.now()}.txt`,report);showToast(tr('downloaded'))});

function getRecords(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]}}
function renderArchive(){const records=getRecords();$('#archiveEmpty').classList.toggle('hidden',records.length>0);$('#clearArchive').classList.toggle('hidden',records.length===0);$('#archiveGrid').innerHTML=records.map(r=>`<article class="record-card"><div class="record-top"><span class="status-pill">${escapeHTML(categoryNames[lang][r.category]||r.category)}</span><b class="record-score">${r.score}/100</b></div><h3>${escapeHTML(r.provider||tr('brand'))}</h3><p>${escapeHTML(r.copy)}</p><div class="record-meta"><span>${tr('savedOn')} ${new Intl.DateTimeFormat(lang==='ar'?'ar-KW':'en-GB',{dateStyle:'medium'}).format(new Date(r.createdAt))}</span><button class="record-delete" data-delete-id="${r.id}">${tr('delete')}</button></div></article>`).join('');$$('[data-delete-id]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(records.filter(r=>r.id!==b.dataset.deleteId)));renderArchive()}))}
$('#clearArchive').addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY);renderArchive();showToast(tr('cleared'))});

$('#activateButton').addEventListener('click',()=>$('#activationDialog').showModal());
$('#activationForm').addEventListener('submit',(e)=>{e.preventDefault();const p=$('#mobileNumber').value.replace(/\D/g,'');if(p.length!==8){showToast(tr('invalidPhone'));return}$('#activationDialog').close();showToast(tr('demoDone'));$('#mobileNumber').value=''});

function showToast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),2600)}
function escapeHTML(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function downloadText(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

applyLanguage();renderArchive();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
