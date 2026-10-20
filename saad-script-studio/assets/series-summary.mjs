const AR_NUMS='٠١٢٣٤٥٦٧٨٩';
const ORD=['الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة'];
const BARCODE_EPISODES=[
  'تأخر المستحقات يعيد صديقًا قديمًا من عالم البرمجة إلى حياة سعود.',
  'تتسع تبعات قرار تقني ويتكشف الفرق بين المساعدة والتورط.',
  'تصل آثار القرارات إلى أسرة سعود وتبدأ المساءلة.',
  'تُفتح الحسابات والأسئلة المالية، ويواجه صاحب المقهى الوقائع.',
  'يفصل سعود بين حقه في الأجر ومسؤولية التصرف في أموال الآخرين.',
  'تمنح فرحة زواج عثمان الحكاية بُعدًا إنسانيًا قبل التحول الأشد إيلامًا.',
  'تأخذ القضية سعود إلى سيول، ويتلقى خبر فقد والده أثناء الرحلة.',
  'يحوّل سعود كلمات أبيه إلى مشروع توعوي لحماية الأسر والحسابات.'
];
const ORDER=[
  ['logline','التعريف بالمسلسل','جملة تعريفية واحدة دون كشف النهاية',450],
  ['vision','رؤية المؤلف','الزاوية الفنية والإنسانية التي يقترحها العمل',380],
  ['purpose','رسالة العمل','ما الذي نريد أن يبقى لدى المشاهد؟',380],
  ['points','القصة في نقاط','كل سطر نقطة واحدة؛ تجنّب التفاصيل والحوار والنهاية الدقيقة',1150],
  ['value','القيمة المجتمعية','فائدة المشاهد دون تحويل الدراما إلى محاضرة',450],
  ['audience','الجمهور المستهدف','وصف تحريري، وليس تصنيفًا رقابيًا معتمدًا',300],
  ['style','الهوية الدرامية','النبرة، المكان، والإيقاع بإيجاز',320],
  ['duration','المدة الزمنية','يحددها المؤلف بناءً على النسخة المعتمدة، لا تُستنتج من الصفحات',120]
];
const txt=v=>String(v??'').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=s=>Number(String(s).replace(/[٠-٩]/g,d=>String(AR_NUMS.indexOf(d))));
const ar=n=>String(n).replace(/[0-9]/g,d=>AR_NUMS[Number(d)]);
const isBarcode=p=>/^\s*(?:باركود|BARCODE)(?:\s|$)/iu.test(p.title||'');
const item=(n,title,note)=>({number:n,title:txt(title)||'الحلقة '+n,note:txt(note)});
export function episodesFromProject(project){
  const entries=[],seen=new Set();
  for(const b of project.blocks||[]){
    if(b.type!=='General')continue;
    const val=txt(b.text).replace(/\s+/gu,' ');
    const m=val.match(/^الحلقة\s+([0-9٠-٩]+|الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة)\s*(?:[|:—–-]\s*)?(.*)$/u);
    if(!m)continue;
    const n=/^[0-9٠-٩]+$/u.test(m[1])?number(m[1]):ORD.indexOf(m[1])+1;
    if(!n||seen.has(n))continue;
    seen.add(n);
    const name=txt(m[2]).replace(/^(?:[|:—–-]\s*)/u,'');
    entries.push(item(n,name&&!/^(?:باركود|BARCODE)$/iu.test(name)?name:'الحلقة '+ar(n), ''));
  }
  if(!entries.length&&Array.isArray(project.plan?.episodes)){
    for(const x of project.plan.episodes)if(Number.isInteger(x.number))entries.push(item(x.number,x.title,''));
  }
  return entries.sort((a,b)=>a.number-b.number);
}
export function proposedSummary(project,episodes=episodesFromProject(project)){
  const barcode=isBarcode(project)&&episodes.length===8&&episodes.every((e,i)=>e.number===i+1);
  const defined=project.presentation&&typeof project.presentation==='object'?project.presentation:{};
  const chars=Array.isArray(project.story?.characters)?project.story.characters:[];
  const first=chars.find(c=>txt(c.name));
  const hero=txt(project.pillars?.hero)||txt(first?.name);
  const defaults={
    logline:barcode?'مبرمج كويتي يسعى إلى استرداد مستحقاته ومساعدة أسرته، فينجرّ إلى تعاون رقمي خطِر مع صديق قديم، ثم يواجه تبعات خياراته بين القانون والضمير.':txt(project.story?.logline),
    vision:barcode?'حكاية إنسانية كويتية تحوّل تحديات العالم الرقمي إلى صراع أخلاقي وعائلي، وتجعل أثر القرارات على الناس أهم من استعراض التقنية.':'',
    purpose:barcode?'المعرفة التقنية أمانة، واسترداد الحق لا يبرر الاعتداء على حقوق الآخرين. الوقاية تبدأ بالوعي والحوار والمسؤولية.':'',
    points:barcode?[
      'تبدأ الأزمة من أجور متأخرة وحاجة عائلية تضغط على سعود.',
      'يعيد التواصل مع جون فتح باب مساعدة تبدو محدودة ثم تتسع مخاطرها.',
      'تؤثر النتائج في حسابات المقهى وحياة أشخاص لم يختاروا المشاركة.',
      'يتعلم سعود التمييز بين المطالبة بحقه وبين التصرف في حقوق الآخرين.',
      'يضع اختبار الفقد والعائلة المعرفة والضمير في مواجهة مباشرة.',
      'تتجه الرحلة نحو المسؤولية والتوعية الرقمية بدل تبرير الخطأ.'
    ].join('\n'):(hero?'البطل: '+hero:''),
    value:barcode?'طرح الاحتيال الإلكتروني وحماية الحسابات والتثبت من الرسائل، دون وصف إجراءات اختراق أو تحويل العمل إلى دليل تقني.':'',
    audience:barcode?'جمهور الدراما العائلية والتشويق الاجتماعي، والمهتمون بالوعي الرقمي.':'',
    style:barcode?'دراما اجتماعية وتشويق تقني بلهجة كويتية، تتحرك من الحياة اليومية في الكويت إلى تعاون دولي في سيول.':txt(project.genre),
    duration:'تُحدّد بعد اعتماد توقيت الأداء والإنتاج.'
  };
  const fields={};for(const [k] of ORDER)fields[k]=typeof defined[k]==='string'?defined[k]:defaults[k];
  const episodeNotes={};for(const e of episodes){
    const key=String(e.number);
    episodeNotes[key]=typeof defined.episodeNotes?.[key]==='string'?defined.episodeNotes[key]:(barcode?BARCODE_EPISODES[e.number-1]:'');
  }
  return {...fields,episodeNotes};
}
export function summaryMismatch(project,episodes=episodesFromProject(project)){
  return isBarcode(project)&&!(episodes.length===8&&episodes.every((e,i)=>e.number===i+1));
}
function formField(k,label,hint,limit,value){
  const long=k==='points'||k==='logline'||k==='vision'||k==='purpose'||k==='value'||k==='style';
  const control=long?'<textarea data-field="'+k+'" maxlength="'+limit+'" rows="'+(k==='points'?7:3)+'">'+esc(value)+'</textarea>':
    '<input data-field="'+k+'" maxlength="'+limit+'" value="'+esc(value)+'">';
  return '<label class="summary-field"><span>'+esc(label)+'</span><small>'+esc(hint)+'</small>'+control+'</label>';
}
function paragraph(text){return '<p>'+esc(txt(text)||'—')+'</p>';}
function bullets(text){
  const lines=String(text||'').split(/\r?\n/).map(txt).filter(Boolean).slice(0,9);
  return '<ul class="pitch-points">'+(lines.length?lines.map(t=>'<li>'+esc(t.replace(/^[•●\-\s]+/u,''))+'</li>').join(''):'<li>أضف نقاط القصة قبل التصدير.</li>')+'</ul>';
}
function episodeCards(episodes,data){
  if(!episodes.length)return '<p>لم تُحدّد عناوين الحلقات في السيناريو المفتوح.</p>';
  return '<div class="pitch-episodes">'+episodes.map(e=>'<div class="pitch-episode"><strong>'+ar(e.number)+' · '+esc(e.title)+'</strong><span>'+esc(txt(data.episodeNotes[String(e.number)])||'أضف وصفًا مختصرًا لهذه الحلقة.')+'</span></div>').join('')+'</div>';
}
function htmlReport(project,episodes,data){
  const titles=['الغلاف','فهرس الملخص وبطاقة العمل','الرؤية ورسالة المؤلف','القصة في نقاط','خريطة الحلقات','القيمة المجتمعية والحقوق'];
  const pclass='class="pitch-print-page"';
  const title=esc(project.title),author=esc(project.author||'سعد روضان');
  const page=(n,inner)=>'<section '+pclass+'><div class="pitch-page-top"><span>BARCODE · SERIES BRIEF</span><b>'+ar(n)+' / ٦</b></div>'+inner+'<div class="pitch-page-foot"><span>© 2026 '+author+' · جميع الحقوق محفوظة</span><span>'+ar(n)+'</span></div></section>';
  const toc='<ol class="pitch-toc">'+titles.map((t,i)=>'<li><span>'+esc(t)+'</span><b>'+ar(i+1)+'</b></li>').join('')+'</ol>';
  const cover=page(1,'<div class="pitch-cover"><span class="pitch-cover-small">ملف تعريف وملخص المسلسل</span><h1>'+title+'</h1><div class="pitch-cover-en">SERIES PRESENTATION</div><div class="pitch-rule"></div><p>تأليف وسيناريو وحوار</p><h2>'+author+'</h2><p>نسخة تقديم موجزة · أكتوبر ٢٠٢٦</p></div>');
  const info='<dl class="pitch-facts"><dt>العمل</dt><dd>'+title+'</dd><dt>المؤلف</dt><dd>'+author+'</dd><dt>الصيغة</dt><dd>مسلسل تلفزيوني · '+ar(episodes.length)+' حلقات</dd><dt>النوع</dt><dd>'+esc(project.genre||'دراما')+'</dd><dt>اللغة</dt><dd>'+esc(project.dialect||'العربية')+'</dd><dt>المدة</dt><dd>'+esc(data.duration)+'</dd></dl>';
  return '<div class="pitch-report">'+cover+
    page(2,'<h1>فهرس الملخص</h1>'+toc+'<h2>بطاقة العمل</h2>'+info)+
    page(3,'<h1>الرؤية الفنية والإنسانية</h1><h2>التعريف بالمسلسل</h2>'+paragraph(data.logline)+'<h2>رؤية المؤلف</h2>'+paragraph(data.vision)+'<h2>رسالة العمل</h2>'+paragraph(data.purpose))+
    page(4,'<h1>القصة في نقاط</h1><p class="pitch-kicker">عرض موجز للمسار الدرامي دون كشف تفاصيل المشاهد أو الحوارات.</p>'+bullets(data.points))+
    page(5,'<h1>خريطة الحلقات</h1><p class="pitch-kicker">تعريف مختصر بحركة الموسم من الحلقة الأولى إلى الأخيرة.</p>'+episodeCards(episodes,data))+
    page(6,'<h1>القيمة الإبداعية والمجتمعية</h1><h2>القيمة المجتمعية</h2>'+paragraph(data.value)+'<h2>الجمهور المستهدف</h2>'+paragraph(data.audience)+'<h2>الهوية الدرامية</h2>'+paragraph(data.style)+'<h2>حقوق المؤلف</h2>'+paragraph('تُقدّم هذه النسخة للقراءة والتقييم فقط. ولا تمنح أي حق بالإنتاج أو النشر أو الاقتباس أو التوزيع دون اتفاق كتابي مع صاحب الحق.'))+
    '</div>';
}
export function makeSummaryUI({current,save,toast}){
  const host=document.getElementById('summaryPanel');
  const printArea=document.getElementById('printArea');
  if(!host)throw Error('عنصر ملخص المسلسل غير موجود.');
  let active='';
  const collect=()=>{const p=current();return {p,episodes:episodesFromProject(p),data:proposedSummary(p)};};
  function preview(){
    const {p,episodes,data}=collect(),warn=summaryMismatch(p,episodes);
    const notice=host.querySelector('#summarySourceNotice');
    if(notice){notice.hidden=!warn;notice.textContent=warn?'تنبيه جودة: كتاب «باركود» المحدد في هذا المتصفح يحتوي '+ar(episodes.length)+' حلقات، بينما النسخة المكتملة المعتمدة ثماني حلقات. افتح أو استورد مشروع الحلقات الثماني قبل إصدار الملخص النهائي.':'';}
    const view=host.querySelector('#summaryPreview');
    if(view)view.innerHTML='<div class="summary-mini-heading"><span>معاينة ملف التقديم</span><b>'+esc(p.title)+'</b></div><h3>التعريف</h3>'+paragraph(data.logline)+'<h3>رؤية المؤلف</h3>'+paragraph(data.vision)+'<h3>القصة في نقاط</h3>'+bullets(data.points)+'<h3>فهرس الحلقات</h3>'+episodeCards(episodes,data)+'<h3>اسم المؤلف</h3>'+paragraph(p.author||'سعد روضان');
    const pbtn=host.querySelector('[data-summary-action="pdf"]');if(pbtn)pbtn.disabled=warn;
  }
  function render(){
    const {p,episodes,data}=collect();active=p.id;
    const fields=ORDER.map(([k,l,h,n])=>formField(k,l,h,n,data[k])).join('');
    const epForms=episodes.length?episodes.map(e=>'<label class="summary-field summary-episode-field"><span>الحلقة '+ar(e.number)+' · '+esc(e.title)+'</span><textarea data-episode="'+e.number+'" rows="2" maxlength="300">'+esc(data.episodeNotes[String(e.number)]||'')+'</textarea></label>').join(''):'<p>أضف عناوين الحلقات في نص السيناريو لتظهر هنا.</p>';
    host.innerHTML='<div id="summarySourceNotice" class="summary-warning" role="alert" hidden></div>'+
      '<div class="summary-layout"><div class="summary-editor"><div class="summary-panel-head"><h2>بيانات الملخص</h2><p>عدّل المحتوى المقترح؛ هذه البيانات لا تغيّر نص الحلقات ولا أي مشهد.</p></div>'+
      '<div class="summary-fields">'+fields+'</div><h3 class="summary-episode-heading">فهرس الحلقات ووصف كل حلقة</h3>'+epForms+'</div>'+
      '<aside class="summary-preview"><div id="summaryPreview"></div></aside></div>'+
      '<div class="summary-tools"><button class="button dark" type="button" data-summary-action="pdf">تصدير ملخص المسلسل · PDF</button><button class="button subtle" type="button" data-summary-action="copy">نسخ الملخص كنص</button><span>٦ صفحات مصممة بالعربية · فهرس مستقل · لا يُرفق السيناريو الكامل</span></div>';
    preview();
  }
  host.addEventListener('input',e=>{
    const p=current();if(!p||active!==p.id)return;
    const key=e.target.dataset.field,ep=e.target.dataset.episode;
    if(!key&&!ep)return;
    if(!p.presentation||typeof p.presentation!=='object')p.presentation={};
    if(key&&ORDER.some(x=>x[0]===key))p.presentation[key]=e.target.value;
    if(ep&&/^\d+$/u.test(ep)){if(!p.presentation.episodeNotes)p.presentation.episodeNotes={};p.presentation.episodeNotes[ep]=e.target.value;}
    save();preview();
  });
  host.addEventListener('click',async e=>{
    const action=e.target.closest('[data-summary-action]')?.dataset.summaryAction;if(!action)return;
    const {p,episodes,data}=collect();
    if(summaryMismatch(p,episodes)){toast('هذا ليس مشروع باركود المكتمل ذي الحلقات الثماني. افتح نسخته النهائية أولاً.',true);return;}
    if(action==='copy'){
      const lines=['ملخص المسلسل: '+p.title,'تأليف وسيناريو وحوار: '+(p.author||'سعد روضان'),'',
        ...ORDER.map(([k,label])=>label+'\n'+data[k]+'\n'),
        'فهرس الحلقات',...episodes.map(x=>x.number+' - '+x.title+'\n'+(data.episodeNotes[String(x.number)]||''))];
      try{await navigator.clipboard.writeText(lines.join('\n'));toast('تم نسخ الملخص.');}
      catch{toast('تعذر النسخ. استخدم تصدير PDF.',true);}
    }
    if(action==='pdf'){
      const previousTitle=document.title;
      const oldStyle=printArea.dataset.printStyle;
      printArea.dataset.printStyle='classic';
      printArea.dataset.summaryReport='true';
      printArea.innerHTML=htmlReport(p,episodes,data);
      printArea.setAttribute('aria-hidden','false');
      const finish=()=>{document.title=previousTitle;printArea.removeAttribute('data-summary-report');printArea.dataset.printStyle=oldStyle||'classic';printArea.setAttribute('aria-hidden','true');window.removeEventListener('afterprint',finish);};
      window.addEventListener('afterprint',finish,{once:true});
      try{await document.fonts?.ready;document.title=p.title+' - ملخص المسلسل - سعد روضان';window.print();}
      catch{finish();toast('تعذر تجهيز تصدير PDF. استخدم متصفحًا يدعم الطباعة إلى PDF.',true);}
    }
  });
  return {render,refresh:()=>{if(active!==current()?.id)render();else preview();}};
}
