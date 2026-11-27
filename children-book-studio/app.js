(() => {
  const KEY = 'hikayaStudio.v1';
  const emptyBook = () => ({
    id: crypto.randomUUID?.() || String(Date.now()), title: '', age: '3–6 سنوات', format: 'كتاب تعليمي تفاعلي',
    goal: '', premise: '', language: 'العربية', trendNote: '', pages: [], characters: [], activities: [],
    checks: {}, print: {trimSize:'8.5x8.5',printColor:'ملون',printDirection:'من اليمين إلى اليسار',printPlatform:'Amazon KDP'},
    updatedAt: new Date().toISOString()
  });
  let state = load();
  let book = state.books.find(x => x.id === state.activeId) || state.books[0] || emptyBook();
  const $ = (q, root=document) => root.querySelector(q);
  const $$ = (q, root=document) => [...root.querySelectorAll(q)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function load(){ try { const x=JSON.parse(localStorage.getItem(KEY)||'{}'); return {books:Array.isArray(x.books)?x.books:[], notes:Array.isArray(x.notes)?x.notes:[], activeId:x.activeId||null}; } catch { return {books:[],notes:[],activeId:null}; } }
  function persist(message='تم الحفظ على هذا الجهاز') {
    book.updatedAt = new Date().toISOString();
    const i=state.books.findIndex(x=>x.id===book.id);
    if(i<0) state.books.unshift(book); else state.books[i]=book;
    state.activeId=book.id;
    try { localStorage.setItem(KEY,JSON.stringify(state)); $('#saveState').textContent=message; renderRecent(); renderLibrary(); }
    catch { $('#saveState').textContent='تعذر الحفظ؛ نزّل نسخة JSON'; toast('مساحة المتصفح ممتلئة. نزّل نسخة احتياطية.'); }
  }
  function toast(message){ const t=$('#toast'); t.textContent=message; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),2300); }
  function setView(name){
    $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    const titles={home:'لوحة الاستوديو',trends:'رادار الاتجاهات',ideas:'بنك الأفكار',book:'بناء الكتاب',illustrations:'الرسوم والشخصيات',activities:'التعلّم والأنشطة',publish:'تجهيز النشر',library:'مكتبتي'};
    $('#pageTitle').textContent=titles[name]||'حكاية';
    if(name==='book') renderPages(); if(name==='illustrations'||name==='publish')bindBook(); if(name==='activities')renderActivities(); if(name==='library')renderLibrary(); window.scrollTo({top:0,behavior:'smooth'});
  }
  function freshBook(){ book=emptyBook(); bindBook(); renderPages(); persist('مشروع جديد جاهز'); setView('book'); $('#bookTitle').focus(); }
  function bindBook(){
    for(const [id,key] of [['bookTitle','title'],['bookAge','age'],['bookFormat','format'],['bookGoal','goal'],['bookPremise','premise'],['bookLanguage','language'],['bookTrendNote','trendNote']]){
      const el=$(`#${id}`); if(el) el.value=book[key]||'';
    }
    for(const [id,key] of [['trimSize','trimSize'],['printColor','printColor'],['printDirection','printDirection'],['printPlatform','printPlatform']]){
      const el=$(`#${id}`); if(el) el.value=book.print?.[key]||el.value;
    }
    const c=book.characters[0]||{};
    for(const [id,key] of [['charName','name'],['charLook','appearance'],['charWardrobe','wardrobe'],['charPersonality','personality']]){const el=$(`#${id}`);if(el)el.value=c[key]||'';}
    if(c.style)$('#artStyle').value=c.style;
    $$('[data-check]').forEach(el=>el.checked=Boolean(book.checks?.[el.dataset.check]));
  }
  function readBookForm(){
    for(const [id,key] of [['bookTitle','title'],['bookAge','age'],['bookFormat','format'],['bookGoal','goal'],['bookPremise','premise'],['bookLanguage','language'],['bookTrendNote','trendNote']]) book[key]=$(`#${id}`).value.trim();
    book.print=book.print||{};
    for(const [id,key] of [['trimSize','trimSize'],['printColor','printColor'],['printDirection','printDirection'],['printPlatform','printPlatform']])book.print[key]=$(`#${id}`).value;
  }
  function renderRecent(){
    const box=$('#recentProject'); const recent=state.books.find(x=>x.id===state.activeId)||state.books[0];
    if(!recent){box.innerHTML='<span class="recent-icon">📚</span><span><b>لا يوجد كتاب محفوظ بعد</b><small>ابدأ مشروعك الأول، وسيظهر هنا تلقائياً.</small></span><button class="button button-light" id="startBook2">إنشاء كتاب</button>';$('#startBook2').onclick=freshBook;return;}
    box.innerHTML=`<span class="recent-icon">📖</span><span><b>${esc(recent.title||'كتاب بلا عنوان')}</b><small>${esc(recent.age||'')} · ${recent.pages?.length||0} صفحة · آخر تعديل ${new Date(recent.updatedAt).toLocaleDateString('ar-KW')}</small></span><button class="button button-light" id="openRecent">فتح المشروع</button>`;
    $('#openRecent').onclick=()=>openBook(recent.id);
  }
  function renderLibrary(){
    const box=$('#libraryList'); if(!box)return;
    if(!state.books.length){box.innerHTML='<div class="empty-state">مكتبتك فارغة الآن. أنشئ كتاباً لتبدأ.</div>';return;}
    box.innerHTML=state.books.map(x=>`<article class="library-card"><h3>${esc(x.title||'كتاب بلا عنوان')}</h3><p>${esc(x.age||'')} · ${esc(x.format||'')} · ${x.pages?.length||0} صفحة</p><p>آخر تعديل: ${new Date(x.updatedAt||Date.now()).toLocaleDateString('ar-KW')}</p><div class="inline-actions"><button class="button button-light" data-open="${esc(x.id)}">فتح</button><button class="button button-light" data-export="${esc(x.id)}">تنزيل</button></div></article>`).join('');
    $$('[data-open]',box).forEach(b=>b.onclick=()=>openBook(b.dataset.open));
    $$('[data-export]',box).forEach(b=>b.onclick=()=>downloadProject(state.books.find(x=>x.id===b.dataset.export)));
  }
  function openBook(id){const found=state.books.find(x=>x.id===id);if(!found)return;book=JSON.parse(JSON.stringify(found));bindBook();renderPages();renderActivities();persist();setView('book');toast('تم فتح المشروع');}
  function renderPages(){
    const box=$('#pagesList'); if(!box)return;
    if(!book.pages?.length){box.innerHTML='<div class="empty-state">لا توجد صفحات بعد. أضف صفحة وابدأ بنص قصير ومشهد واضح.</div>';return;}
    box.innerHTML=book.pages.map((p,i)=>`<article class="page-row" data-page="${esc(p.id)}"><span class="page-index">${String(i+1).padStart(2,'0')}</span><label>نص الصفحة<textarea data-field="text" placeholder="اكتب جملة أو فقرة مناسبة للعمر">${esc(p.text)}</textarea></label><label>وصف الرسم<textarea data-field="visual" placeholder="المكان، الفعل، تعبير الشخصية، ومكان النص">${esc(p.visual)}</textarea></label><button type="button" class="delete" title="حذف الصفحة" aria-label="حذف الصفحة">×</button></article>`).join('');
    $$('.page-row',box).forEach(row=>{
      $$('textarea',row).forEach(t=>t.addEventListener('input',()=>{const p=book.pages.find(x=>x.id===row.dataset.page);if(p)p[t.dataset.field]=t.value;persist();}));
      $('.delete',row).onclick=()=>{book.pages=book.pages.filter(x=>x.id!==row.dataset.page);persist();renderPages();};
    });
  }
  function addPage(){book.pages=book.pages||[];book.pages.push({id:crypto.randomUUID?.()||String(Date.now()),text:'',visual:''});persist();renderPages();const all=$$('.page-row textarea');all.at(-2)?.focus();}
  function renderNotes(){const box=$('#trendNotes');if(!state.notes.length){box.innerHTML='';return;}box.innerHTML=state.notes.map(n=>`<article class="note-item"><b>${esc(n.name)} · ${esc(n.market||'سوق غير محدد')}</b><p>${esc(n.evidence||'لا يوجد وصف للدليل بعد')} · ${esc(n.age||'')}</p><small>رُصدت ${esc(n.date)}</small>${n.source?`<br><a href="${esc(n.source)}" target="_blank" rel="noreferrer">المصدر ↗</a>`:''}</article>`).join('');}
  const ideaSeeds={
    'تعليم مبكر: حروف وأرقام ومهارات':[
      ['ليلى وحديقة الحروف','تتبع ليلى خمس بطاقات حروف في الحديقة، وتتعرف في كل محطة إلى صوت الحرف وكلمة تبدأ به.','للأعمار 3–4: تسمية الصور؛ 4–5: مطابقة الصورة بالحرف؛ 5–6: تتبع الحرف وذكر صوته.'],
      ['لولو ترسم طريقها','تساعد لولو سلحفاة صغيرة على الوصول إلى بيتها عبر خطوط ومسارات تتحول تدريجياً إلى أشكال وحروف.','يبدأ الطفل بخطوط عريضة وحركة إصبع، ثم ينتقل إلى مسارات أدق حسب قدرته.'],
      ['خمسة أشياء في السوق','يرافق طفل جدته ويعد خمسة أشياء مألوفة، ثم يصنفها حسب اللون والحجم.','عدّ ومفردات يومية مع نشاط الإشارة والمطابقة قبل الكتابة.'],
      ['أنا أتعلم كل يوم','قصة مصورة عن طفل يجرب الحروف والألوان والانتظار وطلب المساعدة في مواقف يومية.','مهارات مبكرة من خلال اللعب والموقف، بلا اختبار أو تصنيف للطفل.']
    ],
    'أنشطة وتلوين بعيداً عن الشاشة':[
      ['مغامرة الخطوط المتعرجة','دفتر أنشطة يتتبع فيه الطفل طرقاً ورسومات قصيرة حتى يساعد سلحفاة على العودة لبيتها.','تدرج التمارين من خطوط كبيرة إلى مسارات أدق.'],
      ['حديقة الأشكال الملونة','كتاب تلوين وملاحظة يبحث فيه الطفل عن دائرة ومربع ومثلث داخل حديقة مرسومة.','يجمع التلوين ومفردات الأشكال والملاحظة.'],
      ['حروفي ترسم طريقها','رحلة حرفية يصبح فيها مسار رسم كل حرف لعبة قصيرة ثم كلمة مصورة.','صفحة لكل صوت مع مساحة للتدريب بالقلم.'],
      ['مهمة خمس دقائق','بطاقات صفحات صغيرة: ارسم، صِل، لوّن، وابحث عن عنصر قبل نهاية المهمة.','مناسب لجلسات قصيرة؛ اختبره مع الأهل والأطفال.']
    ],
    'قصة مصوّرة أو كوميك قصير':[
      ['النظارة التي ترى التفاصيل','طفل يلاحظ في طريقه للمدرسة أشياء صغيرة لم ينتبه لها أحد من قبل.','قصة لوحات قصيرة بحوار قليل ومساحات بصرية واضحة.'],
      ['ماذا قالت السحابة؟','سحابة تتغير أشكالها، وكل صديق يقرأ فيها حكاية مختلفة.','كتاب صور يترك مساحة لخيال القارئ.'],
      ['الصفحة المفقودة','أختان تبحثان عن صفحة ضاعت من كتاب جدتهما وتكتشفانها في رسومات البيت.','كوميك مصغر يربط حل اللغز بالتعاون العائلي.'],
      ['صوت في المكتبة','طفل جديد يحاول أن يجد كتاباً يناسبه بمساعدة أمينة المكتبة ورف صغير.','شخصيات قليلة، موقف واضح، ونهاية مطمئنة.']
    ],
    'حكاية من الحياة اليومية والعائلة':[
      ['اسمي على الباب','طفلة تشرح لجيرانها كيف ينطقون اسمها، وتتعلم أسماءهم أيضاً.','قصة يومية عن الاسم والانتماء من دون خطاب تعليمي مباشر.'],
      ['كوب أبي الأزرق','طفل يساعد والده على إيجاد كوبه المفضل قبل زيارة العائلة.','مغامرة صغيرة داخل البيت تكشف العلاقة بالشخصيات.'],
      ['يوم في سوق الحي','طفلان يرافقان الجدة إلى السوق ويجمعان كلمات وألواناً من المحال.','مفردات محلية ورسوم أشياء مألوفة للأطفال.'],
      ['الكرسي الفارغ','طفلة تجهز مكاناً لصديقة جديدة على طاولة الرسم.','قصة عن الصداقة والاختلاف عبر فعل بسيط.']
    ],
    'كتاب تفاعلي يتعلم فيه الطفل بالممارسة':[
      ['اضغط بإصبعك وتخيل','رحلة صفحات تدعو الطفل للإشارة والعد والتخمين، مع نشاط بديل إذا كانت النسخة مطبوعة.','لا يعتمد على شاشة؛ كل تفاعل له بديل ورقي.'],
      ['حرف اليوم: أ','قصة حرفية ثنائية المسار: اسمع النطق عبر QR أو اتبع الرسم على الصفحة.','QR اختياري؛ لا تخفِ محتوى الدرس الأساسي خلف الرابط.'],
      ['ابحث عن النجمة الصغيرة','تظهر علامة متكررة في المشاهد، ويبحث عنها الطفل ثم يروي ما لاحظه.','تشجع الانتباه وإعادة قراءة الصور.'],
      ['أنا أختار النهاية','قصة قصيرة فيها خياران يؤديان إلى نشاطين مختلفين في الصفحات الأخيرة.','اختبار القصة مع الأطفال يحدد وضوح الاختيار.']
    ],
    'فكرة أكتبها بنفسي':[
      ['بذرة فكرتك: صديق غير متوقع','طفل يكتشف أن الشيء الذي كان يخشاه يمكن أن يساعده في حل مشكلة.','ابدأ بموقف صغير، ثم اختر نهاية لا تعاقب فضول الطفل.'],
      ['بذرة فكرتك: كنز في الحي','ملاحظة عادية تقود طفلين إلى لغز محلي بسيط.','ضع قرائن بصرية قابلة للمراجعة في كل صفحة.'],
      ['بذرة فكرتك: مهارة جديدة','بطل يحاول مهارة للمرة الأولى ويتعلم من المحاولة لا من محاضرة.','اجعل المحاولة والخطأ جزءاً من القصة.'],
      ['بذرة فكرتك: يوم مختلف','تغيّر روتين الأسرة ليوم واحد ويفتح مجالاً لموقف طريف.','استخرج التفاصيل من حياة الأطفال المستهدفين.']
    ]
  };
  function generateIdeas(){
    const age=$('#ideaAge').value, trend=$('#ideaTrend').value, goal=$('#ideaGoal').value.trim()||'الحروف والأصوات، الأرقام، ومسك القلم';
    const list=ideaSeeds[trend]||ideaSeeds['فكرة أكتبها بنفسي'];
    $('#ideaResults').innerHTML=list.map((x,i)=>`<article class="idea-card"><span class="idea-title">بذرة ${i+1} · ${esc(trend)}</span><h3>${esc(x[0])}</h3><p>${esc(x[1])}</p><p>${esc(x[2])}</p><span class="idea-meta">${esc(age)} · محور مقترح: ${esc(goal)}</span><br><button class="button button-light choose-idea" data-title="${esc(x[0])}" data-premise="${esc(x[1])}" data-goal="${esc(goal)}" data-trend="${esc(trend)}">حوّلها إلى مشروع كتاب</button></article>`).join('');
    $$('.choose-idea').forEach(b=>b.onclick=()=>{freshBook();book.title=b.dataset.title;book.premise=b.dataset.premise;book.goal=b.dataset.goal;book.age=age;book.language=$('#ideaLanguage').value;book.format=trend.includes('تعليم مبكر')||trend.includes('تفاعلي')?'كتاب تعليمي تفاعلي':trend.includes('أنشطة')?'كتاب تلوين وأنشطة':trend.includes('كوميك')?'كوميك مصوّر':'قصة مصوّرة';book.trendNote=`${trend} — بذرة تعليمية مقترحة لعمر ${age}. يلزم رصد محلي قبل وصفها بالرائجة.`;bindBook();persist();toast('تم نقل الفكرة إلى بطاقة الكتاب');});
  }
  function loadEducationalSample(){
    book={...emptyBook(),title:'ليلى وحديقة الحروف والألوان',age:'3–6 سنوات',format:'كتاب تعليمي تفاعلي',goal:'تمييز أصوات خمسة حروف عربية، العد من 1 إلى 5، وممارسة تتبع الخطوط',premise:'تتبع ليلى خمس بطاقات ضائعة في الحديقة؛ وفي كل محطة تكتشف حرفاً وصورة ولعبة قصيرة.',language:'العربية',trendNote:'مسودة تعليمية بعناصر مطبوعة وأنشطة قصيرة. تتصل بإشارة نمو كتب الأنشطة المطبوعة في تقرير أمريكي؛ لا تعتبر دليلاً على الطلب المحلي قبل اختباره.',characters:[{name:'ليلى',appearance:'طفلة فضولية بعمر يقارب خمس سنوات، ملامح طفولية طبيعية وتعبير واضح',wardrobe:'فستان أزرق بسيط وحقيبة بلون أصفر؛ الألوان ثابتة بكل الصفحات',personality:'تسأل وتلاحظ وتحاول من جديد، من دون مبالغة في ردود الفعل',style:'رسوم مائية مرسومة يدوياً، ألوان دافئة، تفاصيل قليلة وخلفية غير مزدحمة'}],pages:[
      {id:'sample-cover',text:'الغلاف: ليلى وحديقة الحروف والألوان',visual:'ليلى في حديقة مضيئة، حولها خمس بطاقات حروف عربية كبيرة ورسوم أرنب وبطة وتفاحة وجمل وموزة. اترك مساحة واضحة للعنوان، ولا تكتب حروفاً مولدة داخل الصورة.'},
      {id:'sample-1',text:'دخلت ليلى الحديقة، فوجدت بطاقات الحروف قد تطايرت. قالت: سأجمعها واحدة واحدة!',visual:'ليلى تمسك حقيبتها قرب بوابة الحديقة، وبطاقة فارغة تتطاير أمامها.'},
      {id:'sample-2',text:'قفز أرنب أبيض من خلف الشجرة. قالت ليلى: أَرْنَب! أسمع صوت أ في أول الكلمة.',visual:'أرنب لطيف بجوار شجرة؛ بطاقة الحرف أ واضحة كعنصر منفصل يضاف في التصميم.'},
      {id:'sample-3',text:'سبحت بطة في البركة. ابتسمت ليلى: بَطَّة تبدأ بصوت ب.',visual:'بطة صفراء تسبح قرب البركة، وليلى تشير إليها. بطاقة الحرف ب في مساحة منفصلة.'},
      {id:'sample-4',text:'وجدت ليلى تفاحة حمراء. قالت ببطء: تُفَّاحَة… ت. ثم تتبعت شكل الحرف بإصبعها.',visual:'تفاحة على غصن منخفض ويد صغيرة تتبع مساراً كبيراً متقطعاً للحرف ت.'},
      {id:'sample-5',text:'كان جمل صغير ينتظر عند الممر. قالت ليلى: جَمَل! ما الصوت الذي نسمعه أولاً؟',visual:'جمل صغير ودود عند ممر الحديقة؛ فقاعة سؤال فارغة تترك للمصمم إضافة النص.'},
      {id:'sample-6',text:'على المقعد موزة صفراء. قالت ليلى: مَوْز! وجدت البطاقة الخامسة.',visual:'موزة على مقعد خشبي، والبطاقة م بجانبها. لا تزدحم الخلفية.'},
      {id:'sample-7',text:'جمعت ليلى البطاقات: أ، ب، ت، ج، م. أعادت كل بطاقة إلى صورتها.',visual:'البطاقات الخمس مرتبة بجانب صورها، مع مساحات فارغة لتمرين المطابقة.'},
      {id:'sample-8',text:'عدّت ليلى الزهور: واحدة، اثنتان، ثلاث، أربع، خمس. ثم اختارت الزهرة الزرقاء.',visual:'خمس زهور كبيرة واضحة بألوان مختلفة، مع أرقام قابلة للإضافة في مرحلة التصميم.'},
      {id:'sample-9',text:'رسمت ليلى طريقاً متعرجاً إلى البوابة. قالت: أتدرب بهدوء، وكل مرة أتعلم شيئاً جديداً.',visual:'مسار عريض منقط يبدأ بجانب ليلى وينتهي بالبوابة؛ مناسب للتتبع بالقلم.'},
      {id:'sample-10',text:'عادت ليلى سعيدة. سألتها أمها: ما الحرف الذي أعجبك؟ اختارت ليلى حرفاً، وبدأت حكاية جديدة.',visual:'ليلى تعرض البطاقات على أمها في الحديقة؛ نهاية دافئة تترك سؤالاً مفتوحاً للطفل.'},
      {id:'sample-guide',text:'للأهل: لعمر 3–4 سنوات، سمّوا الصور وأشيروا إليها. لعمر 4–5 سنوات، طابقوا الصورة بالحرف. لعمر 5–6 سنوات، اسألوا عن الصوت الأول وتتبعوا الحرف. لا يلزم إكمال الأنشطة كلها في جلسة واحدة.',visual:'صفحة إرشاد بسيطة للأهل مع ثلاث علامات عمرية وأيقونات؛ تفصل بصرياً عن القصة.'}
    ],activities:[{id:'act-letter',name:'اسمع صوت الحروف الخمسة',type:'حرف وصوت',url:''},{id:'act-trace',name:'تتبع مسار ليلى إلى البوابة',type:'تدريب قلم',url:''},{id:'act-count',name:'عد الزهور من 1 إلى 5',type:'لغز وملاحظة',url:''},{id:'act-color',name:'لوّن البطة والتفاحة',type:'تلوين',url:''}],checks:{},print:{trimSize:'8.5x8.5',printColor:'ملون',printDirection:'من اليمين إلى اليسار',printPlatform:'Amazon KDP'}};
    bindBook();renderPages();renderActivities();persist('نموذج تعليمي محفوظ');setView('book');toast('جهزت نموذج الكتاب التعليمي لعمر 3–6');
  }
  function renderActivities(){const box=$('#activitiesList');if(!box)return;const rows=book.activities||[];if(!rows.length){box.innerHTML='<div class="empty-state">أضف نشاطاً، تمريناً، أو مورداً رقمياً مرتبطاً بصفحة.</div>';return;}box.innerHTML=rows.map(a=>`<div class="activity-row" data-id="${esc(a.id)}"><input data-a="name" value="${esc(a.name)}" placeholder="اسم النشاط"><select data-a="type"><option ${a.type==='تدريب قلم'?'selected':''}>تدريب قلم</option><option ${a.type==='حرف وصوت'?'selected':''}>حرف وصوت</option><option ${a.type==='تلوين'?'selected':''}>تلوين</option><option ${a.type==='لغز وملاحظة'?'selected':''}>لغز وملاحظة</option><option ${a.type==='صوت / QR'?'selected':''}>صوت / QR</option></select><input data-a="url" value="${esc(a.url)}" placeholder="رابط عام HTTPS اختياري"><button type="button" class="make-qr" aria-label="إنشاء رمز QR">QR</button><button type="button" class="delete-activity" aria-label="حذف النشاط">×</button></div>`).join('');$$('.activity-row',box).forEach(r=>{ $$('[data-a]',r).forEach(e=>e.addEventListener('input',()=>{const a=book.activities.find(x=>x.id===r.dataset.id);if(a){a[e.dataset.a]=e.value;persist();}}));$('.make-qr',r).onclick=()=>makeQr(book.activities.find(x=>x.id===r.dataset.id));$('.delete-activity',r).onclick=()=>{book.activities=book.activities.filter(x=>x.id!==r.dataset.id);persist();renderActivities();};});}
  function makeQr(activity){
    if(!activity?.url){toast('أضف رابطاً عاماً أولاً');return;}
    let parsed;try{parsed=new URL(activity.url);}catch{toast('الرابط غير صالح');return;}
    if(parsed.protocol!=='https:'||parsed.username||parsed.password){toast('استخدم رابط HTTPS عاماً من دون بيانات دخول');return;}
    const output=$('#qrOutput');output.replaceChildren();output.hidden=false;
    const title=document.createElement('b');title.textContent=`رمز QR: ${activity.name||activity.type||'مورد تعليمي'}`;
    const qr=document.createElement('div');qr.className='qr-image';
    const link=document.createElement('small');link.textContent=parsed.href;
    const save=document.createElement('button');save.className='button button-light';save.textContent='تنزيل صورة الرمز';save.type='button';
    output.append(title,qr,link,save);
    try{new QRCode(qr,{text:parsed.href,width:220,height:220,colorDark:'#283342',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}
    catch{output.hidden=true;toast('تعذر إنشاء الرمز؛ اختصر الرابط وجرب مرة أخرى');return;}
    save.onclick=()=>{const canvas=qr.querySelector('canvas');const img=qr.querySelector('img');const data=canvas?.toDataURL('image/png')||img?.src;if(!data){toast('الرمز لم يجهز بعد');return;}const a=document.createElement('a');a.href=data;a.download=`${safeName(activity.name||'hikaya-qr')}.png`;a.click();};
    output.scrollIntoView({behavior:'smooth',block:'center'});toast('تم إنشاء الرمز داخل جهازك');
  }
  function addActivity(){book.activities=book.activities||[];book.activities.push({id:crypto.randomUUID?.()||String(Date.now()),name:'',type:'تلوين',url:''});persist();renderActivities();}
  function promptText(){const c=book.characters[0]||{},scene=$('#scenePrompt').value.trim();if(!scene){toast('اكتب وصف المشهد أولاً');return;}const fixed=[c.name?`الشخصية: ${c.name}.`:'',c.appearance?`الملامح الثابتة: ${c.appearance}.`:'',c.wardrobe?`اللباس والألوان: ${c.wardrobe}.`:'',c.personality?`السلوك وتعبير الوجه: ${c.personality}.`:'',`المشهد: ${scene}.`,`أسلوب الرسم: ${c.style||'ألوان أطفال دافئة وواضحة'}.`,'تكوين مناسب لصفحة كتاب أطفال، تعبير واضح، خلفية غير مزدحمة، مساحة فارغة للنص.','حافظ على تصميم الشخصية نفسه في كل الصفحات. لا تضف كلمات أو حروفاً داخل الرسم.'];$('#promptOutput').value=fixed.filter(Boolean).join('\n');}
  function downloadProject(data=book){if(!data){toast('لم أجد مشروعاً للتنزيل');return;}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});download(blob,`${safeName(data.title||'hikaya-book')}.json`);}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function safeName(s){return String(s).normalize('NFKD').replace(/[^\p{L}\p{N}-]+/gu,'-').replace(/^-|-$/g,'').slice(0,60)||'hikaya-book';}
  function exportAll(){const blob=new Blob([JSON.stringify({schema:'hikayaStudio.v1',exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json;charset=utf-8'});download(blob,'hikaya-studio-backup.json');}
  function importBackup(file){const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);const incoming=Array.isArray(data.books)?data.books:(data.state?.books||[data]);if(!Array.isArray(incoming)||!incoming.length)throw Error();for(const x of incoming){if(!x||typeof x!=='object')continue;if(!x.id)x.id=crypto.randomUUID?.()||String(Date.now());const i=state.books.findIndex(y=>y.id===x.id);if(i<0)state.books.push(x);else state.books[i]=x;}if(Array.isArray(data.notes))state.notes=[...data.notes,...state.notes];else if(Array.isArray(data.state?.notes))state.notes=[...data.state.notes,...state.notes];book=state.books[0]||emptyBook();state.activeId=book.id;persist('تم استيراد النسخة');bindBook();renderPages();renderActivities();renderNotes();toast('تم استيراد نسخة المشروع');}catch{toast('الملف ليس نسخة متوافقة مع حكاية');}};r.readAsText(file);}

  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.go)));
  ['newBookTop','startBook','startBook2','newBookLibrary'].forEach(id=>{const b=$(`#${id}`);if(b)b.onclick=freshBook;});
  $('#sampleBook').onclick=loadEducationalSample;
  $('#bookForm').addEventListener('submit',e=>{e.preventDefault();readBookForm();persist('بيانات الكتاب محفوظة');toast('تم حفظ بطاقة الكتاب');});
  ['bookTitle','bookAge','bookFormat','bookGoal','bookPremise','bookLanguage','bookTrendNote'].forEach(id=>{const el=$(`#${id}`);el.addEventListener('input',()=>{readBookForm();persist();});el.addEventListener('change',()=>{readBookForm();persist();});});
  $('#addPage').onclick=addPage;$('#printBook').onclick=()=>window.print();$('#printBook2').onclick=()=>{setView('book');setTimeout(()=>window.print(),250);};$('#printFromPublish').onclick=()=>{setView('book');setTimeout(()=>window.print(),250);};
  $('#exportProject').onclick=()=>downloadProject();$('#exportAll').onclick=exportAll;
  $('#trendForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));state.notes.unshift({...d,date:new Date().toLocaleDateString('ar-KW')});persist();renderNotes();e.currentTarget.reset();toast('حُفظت ملاحظة الرصد');});
  $$('.use-trend').forEach(b=>b.onclick=()=>{$('#ideaTrend').value=b.dataset.trend;setView('ideas');$('#ideaGoal').focus();});
  $('#generateIdeas').onclick=generateIdeas;
  $('#characterForm').addEventListener('submit',e=>{e.preventDefault();book.characters=[Object.fromEntries(new FormData(e.currentTarget))];persist('مرجع الشخصيات محفوظ');toast('تم حفظ مرجع الشخصية');});
  $('#buildPrompt').onclick=promptText;$('#copyPrompt').onclick=async()=>{if(!$('#promptOutput').value){toast('كوّن وصف الرسم أولاً');return;}try{await navigator.clipboard.writeText($('#promptOutput').value);toast('نُسخ وصف الرسم');}catch{toast('تعذر الوصول إلى الحافظة');}};
  $$('[data-check]').forEach(el=>el.addEventListener('change',()=>{book.checks=book.checks||{};book.checks[el.dataset.check]=el.checked;persist();}));
  $('#addActivity').onclick=addActivity;$('#importFile').addEventListener('change',e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value='';});

  bindBook();renderRecent();renderLibrary();renderPages();renderActivities();renderNotes();
})();
