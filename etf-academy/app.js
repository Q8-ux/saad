(function(){
 'use strict';
 const D=window.ETF_CONTENT,M=window.ETFMath,$=s=>document.querySelector(s),main=$('#main');
 const key='etf-learning-v1';let storageOK=true,saved={};
 try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{storageOK=false;}
 const ids=D.lessons.map(l=>l.id),state={done:Array.isArray(saved.done)?saved.done.filter(x=>ids.includes(x)):[],large:saved.large===true,answers:{}};
 if(saved.answers&&typeof saved.answers==='object')D.lessons.forEach(l=>{const v=saved.answers[l.id];if(Number.isInteger(v)&&v>=0&&v<l.question.options.length)state.answers[l.id]=v;});
 const fmt=(x,d=0)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}).format(x);
 const number=(x,d=0)=>`<bdi class="num">${fmt(x,d)}</bdi>`;
 const icons={book:'<path d="M3 5h7c1.2 0 2 .8 2 2v14c0-1.2-.8-2-2-2H3zM21 5h-7c-1.2 0-2 .8-2 2v14c0-1.2.8-2 2-2h7z"/>',tools:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2"/>',terms:'<path d="M5 4h14v17H5zM8 8h8m-8 4h8m-8 4h5"/>',home:'<path d="m3 10 9-7 9 7v11H3zM9 21v-8h6v8"/>'};
 const icon=name=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.book}</svg>`;
 const ext=(url,label)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (يفتح في نافذة جديدة)</span></a>`;
 function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{storageOK=false;}}
 function announce(t){$('#announcer').textContent=t;}
 function storageNote(){return storageOK?'التقدّم محفوظ على هذا المتصفح فقط. لا تتم مزامنته بين الأجهزة.':'تعذّر الحفظ في المتصفح؛ يبقى تقدّمك لهذه الجلسة فقط.';}
 function footer(){return `<footer class="footer"><p>مادة تعليمية عامة. الأمثلة والمحاكاة افتراضية، ولا تمثل توصية مالية أو ضمانًا للعائد.</p><a href="#sources">المصادر وحدود المحتوى</a></footer>`;}
 function breadcrumb(text){return `<div class="breadcrumb"><a href="#home">خريطة التعلّم</a><span aria-hidden="true"> / </span><b>${text}</b></div>`;}
 function nav(route){
  const item=(href,label,i)=>`<a class="nav-main ${route===href?'active':''}" href="#${href}" ${route===href?'aria-current="page"':''}>${icon(i)}${label}</a>`;
  $('#main-nav').innerHTML=item('home','خريطة التعلّم','home')+D.stages.map((s,i)=>`<div class="nav-group"><span class="nav-group-label">${number(i+1)} · ${s.name}</span>${D.lessons.filter(l=>l.stage===i).map(l=>{const n=ids.indexOf(l.id)+1,active=route==='lesson/'+l.id,done=state.done.includes(l.id);return `<a href="#lesson/${l.id}" class="nav-lesson ${active?'active':''} ${done?'done':''}" ${active?'aria-current="page"':''}><span class="lesson-digit" aria-hidden="true">${done?'✓':String(n).padStart(2,'0')}</span>${l.short}${done?'<span class="sr-only">، مكتمل</span>':''}</a>`;}).join('')}</div>`).join('')+`<div class="nav-extra">${item('tools','المعامل التفاعلية','tools')}${item('glossary','قاموس المصطلحات','terms')}${item('sources','الدليل والمراجع','book')}</div>`;
 }
 function home(){
  const next=D.lessons.find(l=>!state.done.includes(l.id))||D.lessons[0],pct=Math.round(state.done.length/ids.length*100);
  return `<div class="welcome"><div><h1>مسارك في صناديق ETF</h1><p>خطوة واضحة، ثم معرفة أعمق.</p></div><div class="progress-pill"><span class="mini-ring" style="--progress:${pct}%" aria-hidden="true"><span>${pct}%</span></span><span>${number(state.done.length)} من ${number(ids.length)} درسًا</span></div></div>
  ${state.done.length===ids.length?'<div class="completion-box"><h2>أكملت قراءة المسار</h2><p>ارجع إلى التمارين والمصادر لتثبيت فهمك. إكمال الدروس لا يمثل تأهيلًا مهنيًا أو تقييمًا لملاءمة استثمار.</p></div>':''}
  <section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><span class="eyebrow">من الأساسيات إلى بناء المحفظة</span><h2 id="hero-title">افهم الصندوق.<br><em>ثم اتّخذ قرارك بوعي.</em></h2><p>دروس مبسّطة تشرح ما تملكه، وما تدفعه، وما قد تخسره. جرّب الأمثلة لتتحول الأرقام إلى فهم.</p><div class="hero-actions"><a class="btn light" href="#lesson/${next.id}">${state.done.length?'تابع التعلّم':'ابدأ بالدرس الأول'}</a><a class="btn ghost" href="#tools/fees">جرّب أثر الرسوم</a></div></div><div class="hero-figure"><span class="small">توزيع أصول افتراضي للتعلّم</span><div class="donut" role="img" aria-label="مثال تعليمي: 60% أسهم و35% سندات و5% نقد"><div class="donut-center"><b>ETF</b><span>افهم ما تملك</span></div></div><div class="legend"><span class="legend-item"><i class="swatch" style="background:#82e4d3"></i>أسهم 60%</span><span class="legend-item"><i class="swatch" style="background:#72a9f5"></i>سندات 35%</span><span class="legend-item"><i class="swatch" style="background:#e6edf3"></i>نقد 5%</span></div></div></section>
  <div class="stats-strip"><div><b>12</b><span>درسًا متدرّجًا</span></div><div><b>4</b><span>معامل تفاعلية</span></div><div><b>24</b><span>مصطلحًا مشروحًا</span></div></div>
  <section class="home-definition"><h2>ما هو ETF باختصار؟</h2><p>صندوق استثماري تُتداول وحداته في البورصة. قد يضم أسهمًا أو سندات أو أصولًا أخرى، ويتبع مؤشرًا أو يُدار بنشاط. المخاطرة تعتمد على ما بداخله.</p></section>
  <section aria-labelledby="path-title"><div class="section-head"><div><h2 id="path-title">خريطة التعلّم</h2><p>خمس مراحل تغطي موضوعات الدليل الأصلي، مع شرح وتطبيق.</p></div><span class="badge">ابدأ دون معرفة سابقة</span></div>
  ${D.stages.map((s,i)=>`<section class="stage-section"><div class="stage-heading"><span class="stage-number">0${i+1}</span><div><h3>${s.name}</h3><p>${s.description}</p></div></div><div class="lesson-grid">${D.lessons.filter(l=>l.stage===i).map(l=>`<a class="lesson-card" href="#lesson/${l.id}"><div class="card-top"><span class="label">${l.tag}</span><span>${number(l.minutes)} دقائق تقريبًا</span></div><h4>${l.short}</h4><p>${l.objectives[0]}</p><div class="card-bottom"><span>الدرس ${number(ids.indexOf(l.id)+1)}</span><span class="${state.done.includes(l.id)?'complete-mark':''}">${state.done.includes(l.id)?'✓ تمت قراءته':'افتح الدرس'}</span></div></a>`).join('')}</div></section>`).join('')}</section>
  <div class="bottom-links"><a href="#glossary">${icon('terms')}<span>مصطلح غير واضح؟<small>قاموس عربي مع المقابل الإنجليزي</small></span></a><a href="#sources">${icon('book')}<span>ارجع إلى المصدر<small>ربط الدروس بالدليل والمراجع الرسمية</small></span></a></div><p class="progress-note">${storageNote()}</p>`;
 }
 function table(t){return `<div class="table-wrap" tabindex="0" role="region" aria-label="جدول قابل للتمرير أفقيًا"><table><thead><tr>${t.head.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map((c,i)=>i===0?`<th scope="row">${c}</th>`:`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
 function lesson(l){
  const index=ids.indexOf(l.id),selected=state.answers[l.id],done=state.done.includes(l.id);
  return `${breadcrumb(D.stages[l.stage].name)}<header class="lesson-header"><div class="eyebrow">الدرس ${number(index+1)} من ${number(ids.length)} <span class="badge">${l.tag}</span></div><h1>${l.title}</h1><p class="lesson-intro">${l.intro}</p><div class="lesson-meta"><span>${number(l.minutes)} دقائق قراءة تقريبًا</span><span>·</span><span>الدليل الأصلي: ص ${l.pages}</span>${l.lab?'<span>· يتضمن تجربة تفاعلية</span>':''}</div></header>
  <article class="lesson-body"><section class="objectives"><h2>بعد هذا الدرس ستستطيع</h2><ul>${l.objectives.map(x=>`<li>${x}</li>`).join('')}</ul></section>
  ${l.sections.map(s=>`<section class="lesson-section"><h2>${s.title}</h2>${s.body?`<p>${s.body}</p>`:''}${s.list?`<ul>${s.list.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}${s.table?table(s.table):''}</section>`).join('')}
  <section class="example"><span class="eyebrow">مثال محلول</span><h3>${l.example.title}</h3><p>${l.example.body}</p></section>
  ${l.lab?lab(l.lab):''}
  <aside class="callout"><h3>انتبه لهذا الالتباس</h3><p>${l.mistake}</p></aside><div class="takeaway"><span>الفكرة التي تستحق التذكّر</span><p>${l.takeaway}</p></div>
  <form class="quiz-card" id="lesson-quiz"><span class="quiz-label">تحقّق من فهمك · سؤال قصير</span><fieldset><legend>${l.question.text}</legend>${l.question.options.map((o,i)=>`<label class="option"><input type="radio" name="answer" value="${i}" required ${selected===i?'checked':''}><span>${o}</span></label>`).join('')}</fieldset><button class="btn small secondary" type="submit">تحقّق من الإجابة</button><div id="quiz-feedback" class="quiz-feedback" aria-live="polite"></div></form>
  <div class="lesson-actions"><button id="complete-lesson" class="btn secondary" aria-pressed="${done}">${done?'✓ تمت قراءة الدرس':'أكملت قراءة الدرس'}</button><div class="next-links">${index>0?`<a class="btn secondary" href="#lesson/${ids[index-1]}">الدرس السابق</a>`:''}<a class="btn" href="${index<ids.length-1?'#lesson/'+ids[index+1]:'#home'}">${index<ids.length-1?'الدرس التالي':'العودة إلى المسار'}</a></div></div><p class="progress-note">${storageNote()}</p>
  <section class="refs-box"><h3>للتوسّع والتحقّق</h3>${ext(D.source+'#page='+l.pages.split('،')[0],'الدليل الأصلي · ص '+l.pages)}${l.refs.map(r=>ext(D.refs[r].url,D.refs[r].title)).join('')}<p class="muted">الشرح والأمثلة الموسّعة هنا إعداد تعليمي مستقل. راجع حدود المراجع في صفحة المصادر.</p></section></article>`;
 }
 const toolNames={fees:'أثر الرسوم',allocation:'توزيع الأصول',orders:'فارق السعر',rebalance:'إعادة التوازن'};
 function field(name,label,val,min,max,step='any',hint=''){return `<label class="field" for="calc-${name}">${label}<input id="calc-${name}" name="${name}" type="number" value="${val}" min="${min}" max="${max}" step="${step}" required inputmode="decimal">${hint?`<small>${hint}</small>`:''}</label>`;}
 function lab(type){
  let inputs='',text='',note='',preset='';
  if(type==='fees'){
   text='غيّر الافتراضات ثم قارن السيناريوهين بالعائد الإجمالي نفسه.';
   inputs=field('principal','المبلغ الأولي',10000,0,1e8,'any','وحدة نقدية افتراضية')+field('monthly','إيداع شهري',0,0,1e6,'any','في نهاية كل شهر')+field('years','المدة بالسنوات',20,1,50,1,'من 1 إلى 50 سنة')+field('rate','العائد الإجمالي السنوي %',7,-50,50,'any','افتراضي، يقبل القيم السالبة')+field('feeA','رسوم الخيار أ %',.2,0,10,'any','نسبة سنوية')+field('feeB','رسوم الخيار ب %',1.5,0,10,'any','مساوية لأ أو أعلى');
   note='تقريب رياضي: النمو السنوي = 1 + (العائد − الرسوم) ÷ 100. للمساهمات الشهرية نستخدم الجذر الثاني عشر للنمو السنوي. لا ضرائب أو تضخم أو تكاليف تداول؛ لا بيانات سوق ولا توقع للعائد. «الفارق» اختلاف في القيمة النهائية وليس مجموع فواتير الرسوم.';
  }else if(type==='allocation'){
   text='غيّر الأوزان لترى أثر صدمة واحدة افتراضية على المحفظة.';
   inputs=field('stocks','وزن الأسهم %',60,0,100)+field('bonds','وزن السندات %',35,0,100);
   preset='<div class="preset-buttons" aria-label="أمثلة تعليمية للتوزيع"><button type="button" data-preset="30,60">30 / 60 / 10</button><button type="button" data-preset="60,35">60 / 35 / 5</button><button type="button" data-preset="85,10">85 / 10 / 5</button></div><p class="small muted">بالترتيب: أسهم / سندات / نقد. أمثلة من الدليل؛ لا توصيات.</p>';
   note='النقد هو المتبقي حتى 100%. نفترض هبوط الأسهم 30% والسندات 5% وثبات النقد. العائد المركّب للمحفظة = مجموع (الوزن × تغير الفئة). الصدمة ليست توقعًا ولا الحد الأقصى للخسارة، ولا تشمل الرسوم والعملات والتضخم.';
  }else if(type==='orders'){
   text='احسب تكلفة شراء ثم بيع فوري عند أسعار ثابتة، قبل أي حركة في السوق.';
   inputs=field('bid','سعر المشتري (Bid)',99.9,.001,1e6)+field('ask','سعر البائع (Ask)',100.1,.001,1e6)+field('qty','عدد الوحدات',20,1,1e6,1)+field('commission','عمولة لكل عملية',2,0,1e5);
   note='جميع المبالغ بوحدة نقدية واحدة افتراضية. الشراء = Ask × الكمية + العمولة؛ البيع = Bid × الكمية − العمولة. نفترض توافر الكمية كلها بالسعر نفسه، مع إهمال الضرائب والتحويل والانزلاق السعري. لا ينفذ المعمل أي صفقة.';
  }else{
   text='أدخل القيم الحالية والأوزان المستهدفة لحساب التعديلات قبل التكاليف.';
   inputs=field('stockValue','قيمة الأسهم الحالية',7200,0,1e8)+field('stockWeight','وزن الأسهم المستهدف %',60,0,100)+field('bondValue','قيمة السندات الحالية',2400,0,1e8)+field('bondWeight','وزن السندات المستهدف %',35,0,100)+field('cashValue','قيمة النقد الحالية',400,0,1e8)+field('cashWeight','وزن النقد المستهدف %',5,0,100);
   note='استخدم العملة نفسها لكل القيم. الوزن المستهدف يجب أن يجمع إلى 100%. التعديل = القيمة المستهدفة − القيمة الحالية، دون إيداعات جديدة أو ضرائب أو عمولات. النتائج ليست أوامر بيع وشراء؛ قد تُستخدم المساهمات الجديدة لتقليل الحاجة إلى البيع.';
  }
  return `<section class="lab" data-lab="${type}" aria-label="معمل ${toolNames[type]}"><header class="lab-header"><span class="eyebrow">تعلّم بالتجربة</span><h2>معمل ${toolNames[type]}</h2><p>${text}</p></header><div class="lab-body"><div class="lab-grid"><form id="calc-form"><div class="inputs-grid">${inputs}</div>${preset}<button type="submit" class="btn calc-submit">احسب النتيجة</button></form><div id="calc-result" class="result-panel" aria-live="polite"></div></div><div id="calc-error" class="calc-error" role="alert"></div><div id="calc-detail"></div><p class="lab-note">${note}</p></div></section>`;
 }
 function tools(type){return `${breadcrumb('المعامل التفاعلية')}<header class="page-title"><span class="eyebrow">الأرقام تصبح أوضح عندما تجرّبها</span><h1>معامل الفهم المالي</h1><p>أربع تجارب تعليمية. غيّر المدخلات، واقرأ الافتراضات، ثم فسّر النتيجة.</p></header><nav class="tool-tabs" aria-label="اختيار المعمل">${Object.entries(toolNames).map(([id,name])=>`<a href="#tools/${id}" class="tool-tab ${id===type?'active':''}" ${id===type?'aria-current="page"':''}>${name}</a>`).join('')}</nav>${lab(type)}`;}
 function glossary(){return `${breadcrumb('قاموس المصطلحات')}<header class="page-title"><span class="eyebrow">مرجعك أثناء التعلّم</span><h1>المصطلح، بلغة واضحة</h1><p>24 مصطلحًا ستقابلها في الدروس ووثائق الصناديق.</p></header><dl class="glossary-grid">${D.glossary.map(([en,ar,desc])=>`<div class="term-card"><dt><span class="english" lang="en">${en}</span>${ar}</dt><dd>${desc}</dd></div>`).join('')}</dl>`;}
 function sources(){return `${breadcrumb('الدليل والمراجع')}<header class="page-title"><span class="eyebrow">افهم المعلومة ومصدرها</span><h1>الدليل والمراجع</h1><p>آخر مراجعة للمحتوى: 28 سبتمبر 2026.</p></header>
  <section class="source-card"><h2>الدليل الذي انطلق منه المسار</h2><p>«كيف تستثمر في صناديق المؤشرات المتداولة؟» — إعداد <span lang="en">Trade Academy Global</span>، 20 صفحة. نظّمنا موضوعاته في دروس عربية بشرح مستقل وأمثلة وتمارين إضافية.</p><p>${ext(D.source,'افتح ملف PDF الأصلي')}</p><p class="source-meta">الرابط إلى نسخة الناشر؛ لم تُعد استضافة الملف أو صوره. هذا الموقع ليس إصدارًا رسميًا أو اعتمادًا من الجهة الناشرة.</p></section>
  <section class="source-card"><h2>كيف تقرأ هذا المحتوى؟</h2><p>موضوعات الدروس مرتبطة بصفحات الدليل أدناه. الأمثلة المحلولة والأسئلة والمعامل والقاموس إضافات تعليمية لهذا الموقع. عند تبسيط فكرة مالية، ذكرنا حدود التبسيط، مثل تقريب الرسوم والتمييز بين سعر السوق وNAV.</p><p>المراجع التنظيمية التالية تخص السوق الأمريكية أساسًا، ونستخدمها لشرح المفاهيم. لا تعني أن قواعدها الضريبية أو التنظيمية تنطبق على المستثمر في الكويت أو أي دولة أخرى. التوافر والترخيص والضرائب والتوافق الشرعي تحتاج تحققًا منفصلًا من المنتج والجهات المختصة.</p></section>
  <section class="source-map"><h2>أين تجد كل موضوع في الدليل؟</h2>${table({head:['الدرس في الموقع','صفحات PDF'],rows:D.lessons.map(l=>[`<a href="#lesson/${l.id}">${l.short}</a>`,l.pages])})}<p class="small muted">الغلاف وخريطة المسار في الصفحتين 1 و2. الخلاصة في الصفحة 20 ضمن درس المراجعة.</p></section>
  <section class="lesson-section"><h2>مراجع مالية رسمية للتوسّع</h2>${Object.values(D.refs).map(r=>`<div class="source-card"><h3>${ext(r.url,r.title)}</h3><p class="source-meta"><span lang="en">${r.org}</span>${r.date?' · تاريخ المصدر: '+r.date:''}</p></div>`).join('')}</section>
  <section class="source-card"><h2>المحاكاة والتقدّم</h2><p>الحاسبات لا تتصل بالسوق، وكل الأرقام قابلة للتعديل للتعلّم. لا توجد حسابات تداول أو توصيات منتجات أو عوائد مضمونة. ${storageNote()} القيم التي تدخلها في الحاسبات تبقى في الصفحة ولا تُرسل إلى خادم.</p></section>`;}
 function feeChart(a,b){
  const all=[...a,...b],max=Math.max(...all,1)*1.08,years=a.length-1,W=660,H=220,L=60,R=15,T=15,B=35;
  const x=i=>L+i/years*(W-L-R),y=v=>H-B-v/max*(H-B-T),path=arr=>arr.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
  return `<div class="chart-area"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="مقارنة النمو الافتراضي: الخيار أ ينتهي عند ${fmt(a.at(-1))} والخيار ب عند ${fmt(b.at(-1))} بعد ${years} سنة">${[0,.5,1].map(f=>`<line x1="${L}" x2="${W-R}" y1="${y(max*f)}" y2="${y(max*f)}" stroke="#dce5ed"/><text x="${L-8}" y="${y(max*f)+4}" text-anchor="end">${fmt(max*f)}</text>`).join('')}<path d="${path(a)}" fill="none" stroke="#087f78" stroke-width="3"/><path d="${path(b)}" fill="none" stroke="#145cc5" stroke-width="3" stroke-dasharray="7 4"/><text x="${L}" y="${H-8}" text-anchor="middle">0</text><text x="${x(years/2)}" y="${H-8}" text-anchor="middle">${years/2}</text><text x="${W-R}" y="${H-8}" text-anchor="end">${years}</text></svg><div class="chart-caption">السنوات من اليسار إلى اليمين · القيم بوحدة نقدية افتراضية</div><div class="legend chart-legend"><span class="legend-item"><i class="swatch" style="background:#087f78"></i>أ: خط متصل</span><span class="legend-item"><i class="swatch" style="background:#145cc5"></i>ب: خط متقطع</span></div></div>`;
 }
 function wireLab(){
  const container=$('[data-lab]');if(!container)return;const type=container.dataset.lab,form=$('#calc-form'),out=$('#calc-result'),detail=$('#calc-detail'),error=$('#calc-error');
  const val=n=>{const i=form.elements.namedItem(n);if(i.value.trim()==='')throw Error('أكمل جميع الحقول؛ يمكن إدخال صفر عندما يسمح الحقل بذلك.');const nval=Number(i.value);if(!Number.isFinite(nval))throw Error('أدخل أرقامًا صالحة.');return nval;};
  const row=(label,value)=>`<div class="result-row"><span>${label}</span><b>${value}</b></div>`;
  function calculate(){
   error.textContent='';detail.innerHTML='';
   try{
    if(type==='fees'){
     const r=M.fees(val('principal'),val('monthly'),val('years'),val('rate'),val('feeA'),val('feeB'));
     out.innerHTML=`<span class="eyebrow">الفارق بين القيمتين النهائيتين</span><div class="result-value">${fmt(r.difference,2)}</div><p>وحدة نقدية لصالح الخيار أ في هذا النموذج</p><div class="result-rows">${row('القيمة النهائية · أ',fmt(r.a.value,2))}${row('القيمة النهائية · ب',fmt(r.b.value,2))}${row('إجمالي ما أودعته',fmt(r.a.paid,2))}${row('الربح أو الخسارة · أ',fmt(r.a.value-r.a.paid,2))}</div>`;detail.innerHTML=feeChart(r.a.points,r.b.points);
    }else if(type==='allocation'){
     const r=M.allocation(val('stocks'),val('bonds'));
     out.innerHTML=`<div class="allocation-result"><span class="eyebrow">توزيعك الافتراضي</span><div class="allocation-bar" role="img" aria-label="أسهم ${r.stocks}% وسندات ${r.bonds}% ونقد ${r.cash}%"><span style="width:${r.stocks}%;background:#82e4d3"></span><span style="width:${r.bonds}%;background:#72a9f5"></span><span style="width:${r.cash}%;background:#e6edf3"></span></div><div class="result-rows">${row('أسهم',fmt(r.stocks,1)+'%')}${row('سندات',fmt(r.bonds,1)+'%')}${row('نقد متبقٍ',fmt(r.cash,1)+'%')}</div><div class="stress"><span>أثر الصدمة الافتراضية</span><div class="result-value">${fmt(r.shock,2)}%</div><p>كل 1,000 تصبح ${number(1000*(1+r.shock/100),2)} وحدة نقدية، في هذا المثال فقط.</p></div></div>`;
    }else if(type==='orders'){
     const r=M.order(val('bid'),val('ask'),val('qty'),val('commission'));
     out.innerHTML=`<span class="eyebrow">تكلفة الشراء والبيع الفوري</span><div class="result-value">${fmt(r.roundTrip,2)}</div><p>وحدة نقدية مفقودة بسبب الفارق والعمولتين، مع ثبات الأسعار.</p><div class="result-rows">${row('فارق سعر الوحدة',fmt(r.spread,3))}${row('الفارق ÷ منتصف السعر',fmt(r.spreadPct,3)+'%')}${row('إجمالي الشراء',fmt(r.buy,2))}${row('صافي البيع الفوري',fmt(r.sell,2))}</div>`;
    }else{
     const values=[val('stockValue'),val('bondValue'),val('cashValue')],weights=[val('stockWeight'),val('bondWeight'),val('cashWeight')],r=M.rebalance(values,weights),names=['أسهم','سندات','نقد'];
     out.innerHTML=`<span class="eyebrow">إجمالي قيمة المحفظة</span><div class="result-value">${fmt(r.total,2)}</div><p>قيمة ثابتة في الحساب قبل العمولات والضرائب. الفروق أدناه توضح مقدار زيادة كل فئة أو خفضها.</p><div class="result-rows">${r.rows.map((v,i)=>row(names[i]+' حاليًا',fmt(v.currentPct,1)+'%')).join('')}</div>`;
     detail.innerHTML=`<div style="margin-top:22px">${table({head:['الفئة','القيمة الحالية','القيمة المستهدفة','التعديل الحسابي'],rows:r.rows.map((v,i)=>[names[i],number(v.current,2),number(v.target,2),Math.abs(v.change)<.005?'دون تعديل':(v.change>0?'زيادة ':'خفض ')+number(Math.abs(v.change),2)])})}</div>`;
    }
   }catch(e){out.innerHTML='<p>النتيجة غير متاحة حتى تصحيح المدخلات.</p>';error.textContent=e.message;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();calculate();});
  form.addEventListener('input',()=>{out.innerHTML='<p>تغيّرت المدخلات. اضغط «احسب النتيجة» لتحديث الحساب.</p>';detail.innerHTML='';error.textContent='';});
  form.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const [s,t]=b.dataset.preset.split(',').map(Number);form.elements.stocks.value=s;form.elements.bonds.value=t;calculate();}));
  calculate();
 }
 function wireLesson(l){
  $('#lesson-quiz').addEventListener('submit',e=>{e.preventDefault();const checked=$('#lesson-quiz input:checked');if(!checked)return;const v=Number(checked.value),correct=v===l.question.answer;state.answers[l.id]=v;save();const feedback=$('#quiz-feedback');feedback.className='quiz-feedback '+(correct?'good':'review');feedback.textContent=(correct?'إجابة صحيحة. ':'راجع الفكرة: الإجابة الصحيحة هي «'+l.question.options[l.question.answer]+'». ')+l.question.explain;});
  $('#lesson-quiz').addEventListener('change',()=>{$('#quiz-feedback').textContent='';});
  $('#complete-lesson').addEventListener('click',()=>{const was=state.done.includes(l.id);state.done=was?state.done.filter(x=>x!==l.id):[...state.done,l.id];save();nav('lesson/'+l.id);const btn=$('#complete-lesson');btn.setAttribute('aria-pressed',String(!was));btn.textContent=was?'أكملت قراءة الدرس':'✓ تمت قراءة الدرس';$('.progress-note').textContent=storageNote();announce(was?'أُلغي إكمال الدرس':'تم حفظ إكمال الدرس');});
 }
 const sidebar=$('#sidebar'),toggle=$('#menu-toggle'),scrim=$('#nav-scrim');
 function closeMenu(focus=false){sidebar.classList.remove('open');document.body.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','فتح قائمة التعلّم');scrim.hidden=true;if(focus)toggle.focus();}
 toggle.addEventListener('click',()=>{if(sidebar.classList.contains('open')){closeMenu(true);return;}sidebar.classList.add('open');document.body.classList.add('nav-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','إغلاق قائمة التعلّم');scrim.hidden=false;sidebar.querySelector('a').focus();});
 scrim.addEventListener('click',()=>closeMenu(true));
 document.addEventListener('keydown',e=>{if(!sidebar.classList.contains('open'))return;if(e.key==='Escape'){closeMenu(true);return;}if(e.key==='Tab'){const links=[toggle,...sidebar.querySelectorAll('a,button')],index=links.indexOf(document.activeElement);e.preventDefault();links[(index+(e.shiftKey?-1:1)+links.length)%links.length].focus();}});
 window.matchMedia('(min-width:961px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
 function font(){document.body.classList.toggle('large-text',state.large);$('#font-toggle').setAttribute('aria-pressed',String(state.large));$('#font-toggle').setAttribute('aria-label',state.large?'استعادة حجم النص':'تكبير حجم النص');}
 font();$('#font-toggle').addEventListener('click',()=>{state.large=!state.large;save();font();});
 function render(initial=false){
  const raw=location.hash.replace(/^#/,'')||'home',route=raw.split('?')[0],parts=route.split('/');let html='',l=null,title='دليل ETF';
  if(route==='home'){html=home();title='خريطة التعلّم';}
  else if(parts[0]==='lesson'&&(l=D.lessons.find(x=>x.id===parts[1]))){html=lesson(l);title=l.short;}
  else if(parts[0]==='tools'&&(!parts[1]||Object.hasOwn(toolNames,parts[1]))){html=tools(parts[1]||'fees');title='المعامل التفاعلية';}
  else if(route==='glossary'){html=glossary();title='قاموس المصطلحات';}
  else if(route==='sources'){html=sources();title='الدليل والمراجع';}
  else html='<section class="not-found"><h1>لم نعثر على هذا الدرس</h1><p>اختر درسًا من خريطة التعلّم.</p><a class="btn" href="#home">العودة إلى المسار</a></section>';
  closeMenu();main.innerHTML=html+footer();nav(parts[0]==='tools'?'tools':route);document.title=title+' | دليل ETF';if(l)wireLesson(l);wireLab();
  if(!initial){window.scrollTo({top:0,behavior:'instant'});main.focus({preventScroll:true});announce(title);}
 }
 $('.skip').addEventListener('click',e=>{e.preventDefault();main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});
 window.addEventListener('hashchange',()=>render());render(true);
})();
