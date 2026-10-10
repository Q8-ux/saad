/* Local teacher assistant with deliberate turn-taking, continuous dictation and spoken replies. */
function teacherIntent(text){
 const s=normalizeArabic(text);
 const routes=[['lessons',/درس|تحضير|حصه/],['meetings',/اجتماع|محضر/],['projects',/مشروع/],['workplans',/خطه|خطة|خطط/],['tasks',/مهمه|مهمة|مهام/],['studio',/تصميم|فوتوشوب|ملصق/],['evidence',/شاهد|شواهد|انجاز/],['reports',/تقرير|تقارير/],['schedule',/تقويم|جدول|مواعيد/],['analysis',/تحليل|منهج|مناهج|مصدر|ابحث/],['reader',/اقرا|قارئ|قراء|مستند|كتاب/],['resources',/مرجع|مراجع|رابط/],['settings',/نسخ|اعدادات/]];
 return routes.find(([,pattern])=>pattern.test(s))?.[0]||'';
}
(function(){
 let flow=null,returnFocus=null,recognition=null,listening=false,restartTimer=null,pending=false,turnId=0,thinkTimers=[],thinkingResolve=null,voiceEnabled=true,currentSpeech=null,committedTranscript='';
 const launcher=document.createElement('button');
 launcher.id='teacherLauncher';launcher.className='btn';launcher.textContent='✦ مساعد المعلم';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','teacherAssistant');document.body.append(launcher);
 const panel=document.createElement('aside');
 panel.id='teacherAssistant';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','teacherAssistantTitle');panel.setAttribute('aria-busy','false');
 panel.innerHTML=`<header class="teacher-head"><div><strong id="teacherAssistantTitle">مساعد المعلم</strong><small>يستمع، يفهم الطلب، ثم يجيبك كتابةً وصوتًا</small></div><button type="button" class="btn secondary" id="teacherClose" aria-label="إغلاق مساعد المعلم">×</button></header><p class="teacher-note">تحدّث بالمدة التي تحتاجها، وراجع النص، ثم اضغط «إرسال الحديث». الردود الحالية تعتمد على أدوات الموقع وسجلاتك ولا تُرسل محتواك إلى خدمة ذكاء اصطناعي خارجية. قد يعالج المتصفح الإملاء الصوتي حسب إعداداته.</p><div class="teacher-chips"><button data-teacher-start="lessons">تحضير درس</button><button data-teacher-start="workplans">إعداد خطة</button><button data-teacher-start="projects">مشروع</button><button data-teacher-start="meetings">اجتماع</button><button data-teacher-go="analysis">تحليل المناهج</button><button data-teacher-go="studio">تصميم</button></div><div id="teacherMessages" role="log" aria-live="polite" aria-relevant="additions"></div><div id="teacherThinking" class="teacher-thinking" role="status" aria-live="polite" hidden><span class="teacher-thinking-dot" aria-hidden="true"></span><strong id="teacherThinkingText">أفهم طلبك…</strong><span id="teacherCountdown" aria-label="الوقت التقديري"></span></div><div class="teacher-controls"><button class="btn secondary" id="teacherCancel" type="button">إلغاء المسودة</button><button class="btn secondary" id="teacherNew" type="button">محادثة جديدة</button><button class="btn secondary" id="teacherVoice" type="button" aria-pressed="true">🔊 الرد الصوتي مفعّل</button></div><form id="teacherChat"><label class="sr-only" for="teacherInput">طلبك للمساعد</label><textarea id="teacherInput" data-language-skip="true" rows="3" maxlength="6000" placeholder="اكتب طلبك أو اضغط الميكروفون وتحدّث…"></textarea><p id="teacherListenStatus" class="teacher-listen-status" role="status">الميكروفون جاهز. لن يُرسل شيء قبل ضغط زر الإرسال.</p><div class="teacher-send"><button class="btn teacher-submit" id="teacherSubmit" type="submit">إرسال الحديث</button><button class="btn secondary teacher-mic" id="teacherMic" type="button" aria-label="بدء الحديث الصوتي" aria-pressed="false">🎙 بدء الحديث</button></div></form>`;
 document.body.append(panel);

 const input=$('teacherInput'),mic=$('teacherMic'),submit=$('teacherSubmit'),thinking=$('teacherThinking'),thinkingText=$('teacherThinkingText'),countdown=$('teacherCountdown'),listenStatus=$('teacherListenStatus');
 const waitStep=Number.isFinite(Number(window.MANHAJ_ASSISTANT_THINK_MS))?Math.max(0,Number(window.MANHAJ_ASSISTANT_THINK_MS)):650;
 function cleanSpeech(text){return String(text).replace(/[✓•✦]/g,'').replace(/\s+/g,' ').trim()}
 function stopSpeaking(){if(window.speechSynthesis)window.speechSynthesis.cancel();currentSpeech=null}
 function speak(text){
  if(!voiceEnabled||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
  const value=cleanSpeech(text);if(!value)return;stopSpeaking();
  const utterance=new SpeechSynthesisUtterance(value);utterance.lang='ar-KW';utterance.rate=1.02;utterance.pitch=1;
  const voices=window.speechSynthesis.getVoices?.()||[];utterance.voice=voices.find(v=>/^ar(-|_)/i.test(v.lang)&&/KW/i.test(v.lang))||voices.find(v=>/^ar(-|_)/i.test(v.lang))||null;
  utterance.onend=utterance.onerror=()=>{if(currentSpeech===utterance)currentSpeech=null};currentSpeech=utterance;window.speechSynthesis.speak(utterance);
 }
 function say(text,user=false,actions=[],read=true){
  const row=document.createElement('div');row.className='teacher-message '+(user?'teacher-user':'teacher-reply');
  const p=document.createElement('p');p.textContent=text;row.append(p);
  for(const a of actions){const b=document.createElement('button');b.className='btn secondary';b.textContent=a.label;b.onclick=a.run;row.append(b)}
  $('teacherMessages').append(row);$('teacherMessages').scrollTop=$('teacherMessages').scrollHeight;
  if(!user&&read)speak(text);return row;
 }
 function clearThinking(){
  for(const timer of thinkTimers)clearTimeout(timer);thinkTimers=[];const resolve=thinkingResolve;thinkingResolve=null;thinking.hidden=true;countdown.textContent='';panel.setAttribute('aria-busy','false');resolve?.();
 }
 function deliberate(){
  clearThinking();thinking.hidden=false;panel.setAttribute('aria-busy','true');
  const phases=[['أفهم طلبك…','٣'],['أراجع ما يرتبط به في أدواتك…','٢'],['أجهّز الرد الواضح…','١']];
  thinkingText.textContent=phases[0][0];countdown.textContent=phases[0][1];
  if(!waitStep)return Promise.resolve();
  phases.slice(1).forEach(([label,n],i)=>thinkTimers.push(setTimeout(()=>{thinkingText.textContent=label;countdown.textContent=n},(i+1)*waitStep)));
  return new Promise(resolve=>{thinkingResolve=resolve;thinkTimers.push(setTimeout(()=>{thinkingResolve=null;resolve()},phases.length*waitStep))});
 }
 function updateListening(on){
  listening=on;mic.setAttribute('aria-pressed',String(on));mic.classList.toggle('recording',on);
  mic.textContent=on?'■ إيقاف التسجيل':'🎙 بدء الحديث';mic.setAttribute('aria-label',on?'إيقاف التسجيل الصوتي':'بدء الحديث الصوتي');
  listenStatus.textContent=on?'أستمع الآن… تحدّث براحتك، ثم اضغط «إرسال الحديث».':'الميكروفون جاهز. لن يُرسل شيء قبل ضغط زر الإرسال.';
 }
 function stopListening(){
  clearTimeout(restartTimer);restartTimer=null;if(!listening)return;updateListening(false);try{recognition?.stop()}catch{}
 }
 function startRecognition(){
  if(!recognition||panel.hidden||pending)return;try{recognition.start()}catch{clearTimeout(restartTimer);restartTimer=setTimeout(startRecognition,250)}
 }
 function startListening(){
  if(!recognition){say('التسجيل الصوتي غير مدعوم في هذا المتصفح. يمكنك الكتابة أو استخدام ميكروفون لوحة المفاتيح.');return}
  stopSpeaking();committedTranscript=input.value.trim();updateListening(true);startRecognition();
 }
 function open(){
  returnFocus=document.activeElement;panel.hidden=false;launcher.setAttribute('aria-expanded','true');
  input.focus();
 }
 function close(){turnId++;stopListening();clearThinking();stopSpeaking();pending=false;submit.disabled=false;mic.disabled=!recognition;input.disabled=false;panel.hidden=true;launcher.setAttribute('aria-expanded','false');returnFocus?.focus()}
 launcher.onclick=()=>panel.hidden?open():close();$('teacherClose').onclick=close;panel.addEventListener('keydown',e=>{if(e.key==='Escape')close()});

 function start(kind){flow={kind,index:0,values:{}};say('لنعدّ '+hubConfig[kind].singular+' معًا. اكتب «تخطي» للحقل الاختياري، أو ألغِ المسودة.');ask()}
 function ask(){
  const f=hubConfig[flow.kind].fields[flow.index];
  if(!f){const draft=flow;flow.ready=true;say('راجع المسودة قبل الحفظ:\n'+hubConfig[draft.kind].fields.map(([k,label])=>label+': '+(draft.values[k]||'—')).join('\n'),false,[{label:'اعتماد وحفظ السجل',run:()=>commit(draft)},{label:'مراجعة في النموذج',run:()=>{if(flow!==draft)return;fillForm(draft);flow=null;say('فتحت المسودة في نموذج الخدمة. راجعها ثم احفظها من هناك.')}}]);return}
  const [key,label,type,optional]=f,current=flow,index=flow.index;const guarded=v=>{if(flow===current&&flow.index===index&&!flow.ready)answer(v)};
  const actions=Array.isArray(type)?type.map(v=>({label:v,run:()=>guarded(v)})):[];
  if(type==='project'){actions.push({label:'مهمة مستقلة',run:()=>guarded('تخطي')});for(const p of data.hub.projects.slice(0,12))actions.push({label:p.name,run:()=>guarded(p.id)})}
  say(label+(type==='date'?' — بصيغة YYYY-MM-DD':type==='datetime-local'?' — بصيغة YYYY-MM-DDTHH:mm بتوقيت الكويت':'')+(optional?' (اختياري)':''),false,actions);
 }
 function answer(text){
  if(!flow||flow.ready)return;const [key,label,type,optional]=hubConfig[flow.kind].fields[flow.index];let value=text==='تخطي'?'':text;
  if(!value&&!optional){say('هذا الحقل مطلوب: '+label);return}
  if(type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(value)||type==='datetime-local'&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)){say('استخدم صيغة التاريخ المطلوبة.');return}
  if((type==='date'||type==='datetime-local')&&!Number.isFinite(Date.parse(value))){say('راجع التاريخ المدخل.');return}
  if(Array.isArray(type)&&!type.includes(value)){say('اختر إحدى القيم المعروضة.');return}
  if(type==='project'&&value&&!data.hub.projects.some(p=>p.id===value)){say('اختر المشروع من الأزرار أو اختر مهمة مستقلة.');return}
  flow.values[key]=value;flow.index++;ask();
 }
 function fillForm(draft){resetHubForm(draft.kind);for(const [key,value] of Object.entries(draft.values))$(draft.kind+'_'+key).value=value;show(draft.kind)}
 function commit(draft){
  if(flow!==draft||!draft.ready)return;const item={id:crypto.randomUUID(),...draft.values};const hub=upsertHub(data.hub,draft.kind,item);
  if(!validateHub(hub)){say('تعذر اعتماد البيانات؛ افتح النموذج وراجعها.');return}
  if(save({...data,hub})){flow=null;say('تم حفظ '+hubConfig[draft.kind].singular+' على هذا الجهاز.',false,[{label:'فتح السجل',run:()=>show(draft.kind)}])}else say('لم يُحفظ السجل. صدّر نسخة احتياطية وتحقق من مساحة المتصفح.');
 }
 function search(text){
  const api=window.ManhajCurriculum,hits=api?.search(text)||[];
  if(hits.length){say('وجدت شواهد لفظية في المستندات المضافة. سأعرضها مع أرقام الصفحات لتراجعها في مصدرها.');for(const h of hits)say(h.title+' — صفحة '+h.page+'\n'+h.text,false,[],false)}
  else say('لم أجد شاهدًا مطابقًا في المستندات المضافة. أضف ملف المنهج النصي أو استخدم قسم التحليل.',false,[{label:'فتح التحليل والمناهج',run:()=>show('analysis')}]);
 }
 function handle(text){
  if(flow){if(flow.ready)say('راجع المسودة واضغط اعتماد وحفظ، أو ألغِ المسودة للبدء مجددًا.');else answer(text);return}
  const kind=teacherIntent(text),normalized=normalizeArabic(text);
  if(hubConfig[kind]&&/راجع|مراجعه|مراجعة/.test(normalized)){
   const records=data.hub[kind].slice(-5);if(!records.length){say('لا توجد سجلات في هذا القسم بعد.');return}
   say('اختر السجل الذي تريد مراجعته.',false,records.map(r=>({label:r.name,run:()=>{const review=reviewTeacherRecord(kind,r,data.hub.tasks);say(r.name+'\n'+review.checks.map(c=>(c.ok?'✓ ':'• ')+c.message).join('\n')+'\n'+review.scope,false,[{label:'فتح القسم للمراجعة',run:()=>show(kind)}])}})));return;
  }
  if(kind&&/اعرض|كم|متابعه|متابعة|مواعيد|تقارير/.test(normalized)){say(hubConfig[kind]?hubConfig[kind].title+': '+data.hub[kind].length+' سجل.':'افتح '+pages[kind]+' لعرض بيانات عملك.',false,[{label:'فتح '+pages[kind],run:()=>show(kind)}]);return}
  if(/ابحث|مصدر|ما هي|ماهي|اشرح|نواتج|اهداف/.test(normalized)){search(text);return}
  if(hubConfig[kind]&&kind!=='resources'){start(kind);return}
  if(kind){say('يمكنك استخدام '+pages[kind]+'.',false,[{label:'فتح '+pages[kind],run:()=>show(kind)}]);return}
  say('فهمت طلبك على أنه يحتاج حوارًا تربويًا أوسع من أدوات الموقع الحالية. أستطيع الآن إعداد درس أو خطة أو مشروع أو اجتماع أو مهمة، ومراجعة سجلاتك والبحث في المناهج التي أضفتها. اذكر نوع العمل والمادة والصف والهدف لأساعدك بدقة أكبر.');
 }
 $('teacherChat').onsubmit=async e=>{
  e.preventDefault();if(pending)return;const text=input.value.trim();if(!text){listenStatus.textContent='تحدّث أو اكتب طلبك أولًا، ثم اضغط إرسال الحديث.';return}
  const myTurn=++turnId;stopListening();input.value='';committedTranscript='';say(text,true);pending=true;submit.disabled=true;mic.disabled=true;input.disabled=true;
  await deliberate();clearThinking();
  if(panel.hidden||myTurn!==turnId){pending=false;return}
  try{handle(text)}catch{say('تعذر تجهيز الرد. أعد المحاولة أو افتح الأداة المطلوبة من القائمة.')}
  finally{pending=false;submit.disabled=false;mic.disabled=!recognition;input.disabled=false;input.focus()}
 };
 panel.querySelectorAll('[data-teacher-start]').forEach(b=>b.onclick=()=>{if(pending)return;if(flow){say('ألغِ المسودة الحالية أولًا أو أكملها.');return}start(b.dataset.teacherStart)});
 panel.querySelectorAll('[data-teacher-go]').forEach(b=>b.onclick=()=>{if(!pending)show(b.dataset.teacherGo)});
 $('teacherCancel').onclick=()=>{flow=null;say('أُلغيت المسودة؛ لم تُحفظ بياناتها.')};
 $('teacherNew').onclick=()=>{turnId++;stopListening();clearThinking();stopSpeaking();pending=false;submit.disabled=false;mic.disabled=!recognition;input.disabled=false;flow=null;$('teacherMessages').replaceChildren();open()};
 $('teacherVoice').onclick=()=>{voiceEnabled=!voiceEnabled;$('teacherVoice').setAttribute('aria-pressed',String(voiceEnabled));$('teacherVoice').textContent=voiceEnabled?'🔊 الرد الصوتي مفعّل':'🔇 الرد الصوتي متوقف';if(!voiceEnabled)stopSpeaking()};

 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(Speech){
  recognition=new Speech();recognition.lang='ar-KW';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
  recognition.onresult=e=>{
   let interim='';for(let i=e.resultIndex||0;i<e.results.length;i++){const part=e.results[i][0]?.transcript?.trim()||'';if(!part)continue;if(e.results[i].isFinal)committedTranscript=(committedTranscript+' '+part).trim();else interim=(interim+' '+part).trim()}
   input.value=(committedTranscript+(interim?' '+interim:'')).trim();input.dispatchEvent(new Event('input',{bubbles:true}));
  };
  recognition.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){updateListening(false);listenStatus.textContent='لم يُسمح باستخدام الميكروفون. فعّل الإذن من إعدادات المتصفح أو اكتب طلبك.'}else if(e.error!=='aborted'&&listening)listenStatus.textContent='انقطع الاستماع مؤقتًا، وسأحاول استئنافه مع الحفاظ على النص.'};
  recognition.onend=()=>{if(listening&&!panel.hidden&&!pending){committedTranscript=input.value.trim();clearTimeout(restartTimer);restartTimer=setTimeout(startRecognition,250)}else updateListening(false)};
  mic.onclick=()=>listening?stopListening():startListening();
 }else{mic.disabled=true;mic.title='التسجيل الصوتي غير مدعوم في هذا المتصفح';listenStatus.textContent='التسجيل الصوتي غير مدعوم هنا؛ يمكنك الكتابة أو استخدام ميكروفون لوحة المفاتيح.'}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopListening();stopSpeaking()}});
 window.ManhajTeacher={teacherIntent,open,close,startListening,stopListening,stopSpeaking};
})();
