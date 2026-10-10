/* Local teacher assistant with deliberate turn-taking and continuous dictation. */
function teacherIntent(text){
 const s=normalizeArabic(text);
 const routes=[['lessons',/درس|تحضير|حصه/],['meetings',/اجتماع|محضر/],['projects',/مشروع/],['workplans',/خطه|خطة|خطط/],['tasks',/مهمه|مهمة|مهام/],['studio',/تصميم|فوتوشوب|ملصق/],['evidence',/شاهد|شواهد|انجاز/],['reports',/تقرير|تقارير/],['schedule',/تقويم|جدول|مواعيد/],['analysis',/تحليل|منهج|مناهج|مصدر|ابحث/],['reader',/اقرا|قارئ|قراء|مستند|كتاب/],['resources',/مرجع|مراجع|رابط/],['settings',/نسخ|اعدادات/]];
 return routes.find(([,pattern])=>pattern.test(s))?.[0]||'';
}
(function(){
 let returnFocus=null,recognition=null,listening=false,recognitionActive=false,restartTimer=null,pending=false,turnId=0,thinkTimers=[],thinkingResolve=null,committedTranscript='';
 const launcher=document.createElement('button');
 launcher.id='teacherLauncher';launcher.className='btn';launcher.textContent='✦ مساعد المعلم';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','teacherAssistant');document.body.append(launcher);
 const panel=document.createElement('aside');
 panel.id='teacherAssistant';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','teacherAssistantTitle');panel.setAttribute('aria-busy','false');
 panel.innerHTML=`<header class="teacher-head"><div class="teacher-identity"><span class="teacher-mark" aria-hidden="true">✦</span><div><strong id="teacherAssistantTitle">مساعد المعلم</strong><small>يحلّل طلبك وينجزه ويعرضه هنا</small></div></div><div class="teacher-head-actions"><button type="button" class="teacher-head-button" id="teacherNew" aria-label="بدء محادثة جديدة">↻</button><button type="button" class="teacher-head-button" id="teacherClose" aria-label="إغلاق مساعد المعلم">×</button></div></header><p class="teacher-note">اكتب طلبك أو تحدّث كما تريد. بعد الإرسال سأحلّله، وأنشئ العمل المطلوب، وأحفظه تلقائيًا، ثم أعرضه كاملًا هنا.</p><div class="teacher-chips"><button data-teacher-start="lessons">تحضير درس</button><button data-teacher-start="workplans">إعداد خطة</button><button data-teacher-start="projects">مشروع</button><button data-teacher-start="meetings">اجتماع</button><button data-teacher-start="analysis">تحليل المناهج</button><button data-teacher-start="studio">تصميم</button></div><div id="teacherMessages" role="log" aria-live="polite" aria-relevant="additions"></div><div id="teacherThinking" class="teacher-thinking" role="status" aria-live="polite" hidden><span class="teacher-thinking-dot" aria-hidden="true"></span><strong id="teacherThinkingText">أفهم طلبك…</strong><span id="teacherCountdown" aria-label="الوقت التقديري"></span></div><form id="teacherChat"><label class="sr-only" for="teacherInput">طلبك للمساعد</label><textarea id="teacherInput" data-language-skip="true" rows="3" maxlength="6000" placeholder="اكتب طلبك أو اضغط الميكروفون وتحدّث…"></textarea><div id="teacherRecording" class="teacher-recording" role="status" hidden><span class="teacher-live-dot" aria-hidden="true"></span><strong>التسجيل مستمر</strong><span class="teacher-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><small>لن يتوقف حتى تضغط «إيقاف التسجيل»</small></div><p id="teacherListenStatus" class="teacher-listen-status" role="status">الميكروفون جاهز. لن يُرسل شيء قبل ضغط زر الإرسال.</p><div class="teacher-send"><button class="btn teacher-submit" id="teacherSubmit" type="submit">إرسال وإنجاز الطلب</button><button class="btn secondary teacher-mic" id="teacherMic" type="button" aria-label="بدء الحديث الصوتي" aria-pressed="false">🎙 بدء الحديث</button></div></form>`;
 document.body.append(panel);

 const chat=$('teacherChat'),rawInput=$('teacherInput'),attachmentList=document.createElement('div'),inputRow=document.createElement('div'),addButton=document.createElement('button'),attachmentMenu=document.createElement('div');
 attachmentList.id='teacherAttachments';attachmentList.className='teacher-attachments';attachmentList.hidden=true;inputRow.className='teacher-input-row';addButton.id='teacherAdd';addButton.type='button';addButton.className='btn secondary teacher-add';addButton.textContent='+';addButton.setAttribute('aria-label','إضافة صورة أو ملف PDF');addButton.setAttribute('aria-expanded','false');addButton.setAttribute('aria-controls','teacherAttachMenu');
 attachmentMenu.id='teacherAttachMenu';attachmentMenu.className='teacher-attach-menu';attachmentMenu.hidden=true;attachmentMenu.setAttribute('role','menu');attachmentMenu.innerHTML='<button type="button" data-attach-picker="camera">📷 تصوير بالكاميرا</button><button type="button" data-attach-picker="images">🖼 رفع صور</button><button type="button" data-attach-picker="pdf">PDF رفع ملف</button>';
 const cameraInput=document.createElement('input'),imagesInput=document.createElement('input'),pdfInput=document.createElement('input');
 cameraInput.id='teacherCamera';cameraInput.type='file';cameraInput.accept='image/jpeg,image/png,image/webp';cameraInput.setAttribute('capture','environment');imagesInput.id='teacherImages';imagesInput.type='file';imagesInput.accept='image/jpeg,image/png,image/webp';imagesInput.multiple=true;pdfInput.id='teacherPdf';pdfInput.type='file';pdfInput.accept='application/pdf,.pdf';pdfInput.multiple=true;for(const field of [cameraInput,imagesInput,pdfInput]){field.hidden=true;field.setAttribute('aria-hidden','true')}
 rawInput.before(attachmentList,inputRow,attachmentMenu);inputRow.append(addButton,rawInput);chat.append(cameraInput,imagesInput,pdfInput);

 const input=$('teacherInput'),mic=$('teacherMic'),submit=$('teacherSubmit'),thinking=$('teacherThinking'),thinkingText=$('teacherThinkingText'),countdown=$('teacherCountdown'),listenStatus=$('teacherListenStatus'),recordingStatus=$('teacherRecording'),messages=$('teacherMessages');
 const waitStep=Number.isFinite(Number(window.MANHAJ_ASSISTANT_THINK_MS))?Math.max(0,Number(window.MANHAJ_ASSISTANT_THINK_MS)):650;
 const attachmentManager=window.ManhajAssistantAttachments.create({list:attachmentList,onStatus:(message,busy)=>{listenStatus.textContent=message;if(pending&&busy)thinkingText.textContent=message}});
 function hideAttachmentMenu(){attachmentMenu.hidden=true;addButton.setAttribute('aria-expanded','false')}
 addButton.onclick=()=>{attachmentMenu.hidden=!attachmentMenu.hidden;addButton.setAttribute('aria-expanded',String(!attachmentMenu.hidden))};
 attachmentMenu.querySelector('[data-attach-picker="camera"]').onclick=()=>{hideAttachmentMenu();cameraInput.click()};attachmentMenu.querySelector('[data-attach-picker="images"]').onclick=()=>{hideAttachmentMenu();imagesInput.click()};attachmentMenu.querySelector('[data-attach-picker="pdf"]').onclick=()=>{hideAttachmentMenu();pdfInput.click()};
 async function addAttachments(files){try{await attachmentManager.addFiles(files)}catch(e){listenStatus.textContent=e.message||'تعذر إضافة المرفق.'}}
 for(const field of [cameraInput,imagesInput,pdfInput])field.onchange=async()=>{const files=field.files;field.value='';await addAttachments(files)};
 function scrollConversation(){requestAnimationFrame(()=>{messages.scrollTop=messages.scrollHeight})}
 function say(text,user=false,actions=[]){
  const row=document.createElement('div');row.className='teacher-message '+(user?'teacher-user':'teacher-reply');
  const p=document.createElement('p');p.textContent=text;row.append(p);
  for(const a of actions){const b=document.createElement('button');b.className='btn secondary';b.textContent=a.label;b.onclick=a.run;row.append(b)}
  messages.append(row);scrollConversation();return row;
 }
 function resultText(kind,item){return hubConfig[kind].title+'\n'+hubConfig[kind].fields.map(([key,label])=>label+': '+(item[key]||'غير محدد')).join('\n')}
 async function copyResult(kind,item,button){
  const value=resultText(kind,item);try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);else{const field=document.createElement('textarea');field.value=value;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();document.execCommand('copy');field.remove()}button.textContent='تم النسخ';setTimeout(()=>button.textContent='نسخ النتيجة',1600)}catch{button.textContent='تعذر النسخ'}
 }
 function sayResult(kind,item,saved){
  const row=document.createElement('div');row.className='teacher-message teacher-reply teacher-result-message';
  const card=document.createElement('article');card.className='teacher-result';
  const head=document.createElement('header'),badge=document.createElement('span'),title=document.createElement('h3');badge.className='teacher-result-badge';badge.textContent=saved?'تم الإنجاز والحفظ':'تم الإنجاز';title.textContent=item.name||hubConfig[kind].singular;head.append(badge,title);card.append(head);
  const list=document.createElement('dl');for(const [key,label] of hubConfig[kind].fields){const group=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=item[key]||'غير محدد';group.append(dt,dd);list.append(group)}card.append(list);
  const footer=document.createElement('footer'),status=document.createElement('span'),copy=document.createElement('button');status.className='teacher-save-status';status.textContent=saved?'✓ حُفظ تلقائيًا في أعمالك':'تعذر الحفظ المحلي؛ النتيجة ما زالت ظاهرة هنا';copy.type='button';copy.className='btn secondary';copy.textContent='نسخ النتيجة';copy.onclick=()=>copyResult(kind,item,copy);footer.append(status,copy);card.append(footer);row.append(card);messages.append(row);scrollConversation();return row;
 }
 function clearThinking(){
  for(const timer of thinkTimers)clearTimeout(timer);thinkTimers=[];const resolve=thinkingResolve;thinkingResolve=null;thinking.hidden=true;countdown.textContent='';panel.setAttribute('aria-busy','false');resolve?.();
 }
 function deliberate(){
  clearThinking();thinking.hidden=false;panel.setAttribute('aria-busy','true');
  const phases=[['أحلّل طلبك…','٣'],['أُنشئ العمل المطلوب…','٢'],['أحفظه وأجهّز النتيجة…','١']];
  thinkingText.textContent=phases[0][0];countdown.textContent=phases[0][1];
  if(!waitStep)return Promise.resolve();
  phases.slice(1).forEach(([label,n],i)=>thinkTimers.push(setTimeout(()=>{thinkingText.textContent=label;countdown.textContent=n},(i+1)*waitStep)));
  return new Promise(resolve=>{thinkingResolve=resolve;thinkTimers.push(setTimeout(()=>{thinkingResolve=null;resolve()},phases.length*waitStep))});
 }
 function updateListening(on){
  listening=on;mic.setAttribute('aria-pressed',String(on));mic.classList.toggle('recording',on);recordingStatus.hidden=!on;
  mic.textContent=on?'■ إيقاف التسجيل':'🎙 بدء الحديث';mic.setAttribute('aria-label',on?'إيقاف التسجيل الصوتي':'بدء الحديث الصوتي');
  listenStatus.textContent=on?'التسجيل يعمل باستمرار. راقب الحركة أعلاه واضغط إيقاف عندما تنتهي.':'الميكروفون جاهز. لن يُرسل شيء قبل ضغط زر الإرسال.';
 }
 function stopListening(){clearTimeout(restartTimer);restartTimer=null;if(!listening&&!recognitionActive)return;updateListening(false);if(recognitionActive)try{recognition?.stop()}catch{}}
 function startRecognition(){if(!recognition||!listening||recognitionActive||panel.hidden||pending||document.hidden)return;try{recognition.start()}catch{clearTimeout(restartTimer);restartTimer=setTimeout(startRecognition,180)}}
 function startListening(){if(!recognition){say('التسجيل الصوتي غير مدعوم في هذا المتصفح. يمكنك الكتابة أو استخدام ميكروفون لوحة المفاتيح.');return}committedTranscript=input.value.trim();updateListening(true);startRecognition()}
 function open(){returnFocus=document.activeElement;panel.hidden=false;document.documentElement.classList.add('teacher-open');launcher.setAttribute('aria-expanded','true');input.focus()}
 function close(){turnId++;stopListening();clearThinking();pending=false;submit.disabled=false;mic.disabled=!recognition;addButton.disabled=false;input.disabled=false;hideAttachmentMenu();panel.hidden=true;document.documentElement.classList.remove('teacher-open');launcher.setAttribute('aria-expanded','false');returnFocus?.focus()}
 launcher.onclick=()=>panel.hidden?open():close();$('teacherClose').onclick=close;panel.addEventListener('keydown',e=>{if(e.key==='Escape')close()});

 function latinDigits(value){return String(value).replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.includes(c)?'٠١٢٣٤٥٦٧٨٩'.indexOf(c):'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))}
 function kuwaitDate(delta=0){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kuwait',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date()),get=t=>Number(parts.find(p=>p.type===t)?.value);const d=new Date(Date.UTC(get('year'),get('month')-1,get('day')+delta));return d.toISOString().slice(0,10)}
 function validDate(y,m,d){const value=new Date(Date.UTC(y,m-1,d));return value.getUTCFullYear()===y&&value.getUTCMonth()===m-1&&value.getUTCDate()===d}
 function contextDate(text,withTime=false){
  const raw=latinDigits(text),normalized=normalizeArabic(raw);let y,m,d,match,delta=null;
  if(match=raw.match(/\b(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/))[,y,m,d]=match.map(Number);
  else if(match=raw.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/)){d=Number(match[1]);m=Number(match[2]);y=Number(match[3])}
  else if(/بعد باجر|بعد بكره|بعد غد/.test(normalized))delta=2;else if(/باجر|بكره|غدا/.test(normalized))delta=1;else if(/الاسبوع القادم|الاسبوع المقبل|بعد اسبوع/.test(normalized))delta=7;else if(/اليوم/.test(normalized))delta=0;
  if(y&&!validDate(y,m,d))return '';
  let date=y?String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'):delta!==null?kuwaitDate(delta):'';
  if(!date){const names=[['الاحد',0],['الاثنين',1],['الثلاثاء',2],['الاربعاء',3],['الخميس',4],['الجمعه',5],['السبت',6]],found=names.find(([name])=>normalized.includes(name));if(found){const base=new Date(kuwaitDate()+'T12:00:00Z'),add=(found[1]-base.getUTCDay()+7)%7||7;date=kuwaitDate(add)}}
  if(!date||!withTime)return date;
  let hour=9,minute=0;if(match=raw.match(/الساع(?:ة|ه)\s*(\d{1,2})(?:[:٫](\d{1,2}))?\s*(ص|م|صباح|صباحا|مساء|مساءً|الظهر)?/)){hour=Number(match[1]);minute=Number(match[2]||0);if(/^(م|مساء|مساءً|الظهر)$/.test(match[3]||'')&&hour<12)hour+=12;if(/^(ص|صباح|صباحا)$/.test(match[3]||'')&&hour===12)hour=0;if(hour>23||minute>59){hour=9;minute=0}}
  return date+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
 }
 function contextValue(text,pattern){const match=text.match(pattern);return match?.[1]?.trim().replace(/[.،؛]+$/,'').slice(0,200)||''}
 function brief(text,max=850){return String(text).replace(/\n*محتوى مستخرج من المرفقات:\s*/,' ').replace(/\s+/g,' ').trim().slice(0,max)}
 function contextTitle(kind,text){let title=contextValue(text,/(?:بعنوان|العنوان|اسمه|اسمها)\s*[:\-]?\s*([^،؛.\n]+)/i)||contextValue(text,/(?:عن|حول|بخصوص)\s+([^،؛.\n]+)/i);if(title)title=title.split(/\s+(?:في\s+مادة|لمادة|للصف|اليوم|باجر|بكرة|غدًا|غدا|الأسبوع|الاسبوع|بتاريخ|يوم|والمسؤول|بحضور|مع\s+نشاط)(?:\s|$)/)[0].trim();if(!title){title=text.replace(/^(?:أريد|اريد|أبي|ابي|اعمل|أنشئ|انشئ|جهز|حضّر|حضر|سو|سوي|إعداد|اعداد)\s+(?:لي\s+)?/i,'').trim().split('\n')[0].slice(0,80)}return title||hubConfig[kind].singular+' جديد'}
 function objectiveFrom(text,fallback){const explicit=contextValue(text,/(?:الهدف|ناتج التعلم|نواتج التعلم)\s*(?:هو|هي|أن|ان|:|\-)?\s*([^؛.\n]+)/i);return explicit?(explicit.startsWith('أن ')?explicit:'أن '+explicit):fallback}
 function objectiveTopic(value){return String(value).replace(/^أن\s+/,'').replace(/^(?:يفسر|يشرح|يتعرف|يقارن|يطبق|يحدد|يستنتج|يميز|يحلل)\s+(?:المتعلم|الطالب)\s+/,'').slice(0,100)}
 function contextDraft(kind,text){
  const name=contextTitle(kind,text),summary=brief(text),owner=contextValue(text,/(?:المسؤول|يتولاه|يقوم به|إعداد|اعداد)\s*(?:هو|:)?\s*([^،؛.\n]+)/i)||'المعلم',state=/مكتمل|منجز/.test(text)?(kind==='tasks'?'منجزة':kind==='projects'?'مكتمل':'مكتملة'):/قيد التنفيذ/.test(text)?'قيد التنفيذ':'';
  if(kind==='projects'){const goal=contextValue(text,/(?:الهدف|وهدفه|هدفه)\s*(?:هو|أن|ان|:)?\s*([^،؛.\n]+)/i)||summary;return {name,date:contextDate(text),owner,goal,state:state||'لم يبدأ'}}
  if(kind==='workplans'){const type=['أسبوعية','شهرية','فصلية','سنوية','علاجية','تطوير مهني'].find(v=>normalizeArabic(text).includes(normalizeArabic(v)))||'أسبوعية',goal=objectiveFrom(text,summary);return {name,date:contextDate(text),type,goal,steps:'1. تحديد الأولويات والنتائج المتوقعة.\n2. توزيع الأعمال والموارد اللازمة.\n3. تنفيذ الخطوات وفق المدة المحددة.\n4. متابعة مؤشرات الإنجاز وتوثيقها.\n5. مراجعة النتائج والتحسين المستمر.',state:state||'قيد التنفيذ'}}
  if(kind==='meetings'){const attendees=contextValue(text,/(?:بحضور|الحضور|المشاركون)\s*[:\-]?\s*([^،؛.\n]+)/i),held=/عقد|تم الاجتماع/.test(text);return {name,date:contextDate(text,true),attendees,agenda:'1. عرض هدف الاجتماع: '+name+'.\n2. مناقشة النقاط الواردة في طلب المعلم.\n3. تحديد الإجراءات والمسؤوليات ومواعيد المتابعة.',minutes:held?summary:'',decisions:held?'متابعة الإجراءات المتفق عليها وتوثيق إنجازها.':'',state:held?'عُقد':'مجدول'}}
  if(kind==='tasks'){const priority=/عاجل|عالية/.test(text)?'عالية':/منخفضة/.test(text)?'منخفضة':'متوسطة';return {name,date:contextDate(text),owner,project:'',priority,state:state||'لم تبدأ'}}
  if(kind==='lessons'){
   const subjects=['اللغة العربية','اللغة الإنجليزية','الرياضيات','العلوم','الاجتماعيات','التربية الإسلامية','الحاسوب','اللغة الفرنسية'],subject=subjects.find(v=>normalizeArabic(text).includes(normalizeArabic(v)))||'',grade=contextValue(latinDigits(text),/(?:للصف|الصف)\s+((?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|\d+)(?:\s+(?:الابتدائي|المتوسط|الثانوي))?)/i),goal=objectiveFrom(text,'أن يشرح المتعلم '+name+' ويطبقه بدقة في نشاط مناسب.'),fromAttachment=/من (?:الصوره|الصورة|الملف|المرفق)/.test(normalizeArabic(name)),lessonName=fromAttachment?objectiveTopic(goal)||('درس '+(subject||'تعليمي')):name;
   return {name:lessonName,date:contextDate(text),subject,grade,goal,steps:'1. تمهيد قصير يربط '+lessonName+' بخبرة المتعلمين السابقة — 5 دقائق.\n2. عرض المفاهيم والأمثلة الرئيسة بتدرج واضح — 10 دقائق.\n3. نشاط تطبيقي فردي أو جماعي مرتبط بناتج التعلم — 15 دقيقة.\n4. مناقشة النتائج وتصحيح الفهم — 10 دقائق.\n5. تقويم ختامي وتكليف امتدادي — 5 دقائق.',assessment:'سؤال قبلي موجز، وملاحظة الأداء أثناء النشاط، ثم بطاقة خروج تقيس تحقق ناتج التعلم.',materials:'سبورة أو شاشة عرض، أوراق عمل، وبطاقات أو صور مرتبطة بموضوع الدرس.'}
  }
  return Object.fromEntries(hubConfig[kind].fields.map(([key])=>[key,'']));
 }
 function completeTeacherWork(kind,text){const item={id:crypto.randomUUID(),...contextDraft(kind,text)},hub=upsertHub(data.hub,kind,item),valid=validateHub(hub),saved=valid&&save({...data,hub});sayResult(kind,item,saved);if(!valid)say('أنجزت النتيجة، لكن بعض البيانات المستخرجة لم تجتز التحقق المحلي، لذلك لم أضفها إلى السجلات.');return saved?item:null}
 function start(kind){const prompts={lessons:'حضّر لي درسًا عن ',workplans:'أعد لي خطة ',projects:'أنشئ لي مشروعًا عن ',meetings:'جهّز لي اجتماعًا عن ',analysis:'حلّل لي محتوى المنهج حول ',studio:'جهّز لي فكرة تصميم تعليمي عن '};input.value=prompts[kind]||'';input.focus();input.setSelectionRange(input.value.length,input.value.length);listenStatus.textContent='أكمل وصفك بصورة طبيعية، ثم اضغط «إرسال وإنجاز الطلب».'}
 function search(text){const api=window.ManhajCurriculum,hits=api?.search(text)||[];if(hits.length){say('اكتمل البحث داخل المناهج والمستندات المحفوظة. هذه الشواهد موجودة أمامك هنا:');for(const h of hits)say(h.title+' — صفحة '+h.page+'\n'+h.text)}else say('اكتمل البحث، ولم أجد شاهدًا مطابقًا في المناهج المضافة. أرفق صفحة أو ملف PDF هنا وسأحلله مباشرة.')}
 function attachmentSource(text,report){return (text+'\n\nمحتوى مستخرج من المرفقات:\n'+report.excerpt).slice(0,7800)}
 function attachmentSummary(report){const files=report.items.length+' مرفق'+(report.items.length>1?'ات':''),read=report.ready.length+' مقروء',pages=report.pageCount+' صفحة/صورة',words=report.wordCount+' كلمة';let value='اكتمل تحليل المرفقات: '+[files,read,pages,words].join(' • ')+'.';if(report.suggestedLabel)value+='\nالنوع المرجح: '+report.suggestedLabel+'.';if(report.keyLines.length)value+='\n\nأبرز ما استخرجته:\n• '+report.keyLines.slice(0,5).join('\n• ');if(report.evidence.length)value+='\n\nشواهد مرتبطة بطلبك:\n• '+report.evidence.slice(0,3).map(v=>v.source+' — صفحة '+v.page+': '+v.text.trim()).join('\n• ');if(report.warnings.length)value+='\n\nتنبيهات القراءة:\n• '+report.warnings.slice(0,4).join('\n• ');return value}
 async function saveAttachmentReport(report){const api=window.ManhajCurriculum;if(!api?.importAssistantAttachment)return 0;let saved=0;for(const item of report.ready){if(!item.pages.some(p=>p.text?.trim()))continue;try{await api.importAssistantAttachment(item);saved++}catch{}}return saved}
 async function handleAttachments(text,report){
  if(!report.usable){say('لم أستخرج نصًا كافيًا من المرفقات، لذلك لم أنشئ نتيجة غير موثوقة. جرّب صورة أوضح أو ملف PDF نصيًا.'+(report.warnings.length?'\n'+report.warnings.join('\n'):''));return}
  const imported=await saveAttachmentReport(report),summary=attachmentSummary(report)+(imported?'\n\n✓ حُفظ المصدر تلقائيًا في قاعدة التحليل.':'');say(summary);const source=attachmentSource(text,report),requested=teacherIntent(text),kind=hubConfig[requested]&&requested!=='resources'?requested:hubConfig[report.suggestedKind]?report.suggestedKind:'';
  if(kind){completeTeacherWork(kind,source);return}say('التحليل الكامل ظاهر أعلاه. لم أفترض نوع عمل غير واضح؛ اكتب «حضّر درسًا» أو «أنشئ خطة» مع المرفق إذا أردت تحويله إلى سجل تعليمي.');
 }
 async function handle(text,attachmentReport=null){
  if(attachmentReport){await handleAttachments(text,attachmentReport);return}
  const kind=teacherIntent(text),normalized=normalizeArabic(text);
  if(hubConfig[kind]&&/راجع|مراجعه|مراجعة/.test(normalized)){const records=data.hub[kind].slice(-5);if(!records.length){say('لا توجد سجلات في هذا القسم بعد.');return}say('اختر السجل الذي تريد مراجعته.',false,records.map(r=>({label:r.name,run:()=>{const review=reviewTeacherRecord(kind,r,data.hub.tasks);say(r.name+'\n'+review.checks.map(c=>(c.ok?'✓ ':'• ')+c.message).join('\n')+'\n'+review.scope)}})));return}
  if(kind&&/اعرض|كم|متابعه|متابعة|مواعيد|تقارير/.test(normalized)){say(hubConfig[kind]?hubConfig[kind].title+': '+data.hub[kind].length+' سجل.':'يمكنني عرض التفاصيل هنا عندما تحدد نوع العمل أو الفترة المطلوبة.');return}
  if(hubConfig[kind]&&kind!=='resources'){completeTeacherWork(kind,text);return}
  if(/ابحث|مصدر|ما هي|ماهي|اشرح|نواتج|اهداف/.test(normalized)){search(text);return}
  if(kind==='analysis'){search(text);return}
  if(kind==='studio'){say('حللت طلب التصميم. أضف المقاس والنص أو صورة مرجعية هنا، وسأرتب لك المحتوى والتوجيه البصري داخل المحادثة.');return}
  if(kind){say('فهمت الأداة المطلوبة. اكتب ما الذي تريد إنجازه فيها، وسأعرض النتيجة هنا دون نقلك إلى صفحة أخرى.');return}
  say('أستطيع إنجاز درس أو خطة أو مشروع أو اجتماع أو مهمة، وتحليل صورة أو PDF. اذكر العمل المطلوب بطريقتك العادية وسأكمله مباشرة.');
 }
 async function run(text){
  text=String(text??'').trim();if(!text||pending)return false;open();const myTurn=++turnId;stopListening();input.value='';committedTranscript='';say(text,true);pending=true;submit.disabled=true;mic.disabled=true;addButton.disabled=true;input.disabled=true;
  await deliberate();clearThinking();if(panel.hidden||myTurn!==turnId){pending=false;return false}
  try{await handle(text);return true}catch{say('تعذر تجهيز النتيجة. أعد المحاولة مع وصف أقصر أو أوضح.');return false}
  finally{pending=false;submit.disabled=false;mic.disabled=!recognition;addButton.disabled=false;input.disabled=false;input.focus();scrollConversation()}
 }
 $('teacherChat').onsubmit=async e=>{
  e.preventDefault();if(pending)return;const typed=input.value.trim(),hasAttachments=attachmentManager.count()>0;if(!typed&&!hasAttachments){listenStatus.textContent='اكتب طلبك أو أضف صورة أو PDF أولًا، ثم اضغط إرسال.';return}const text=typed||'حلّل المرفقات واستنتج نوع العمل المناسب للمعلم.';
  const names=attachmentManager.snapshot().map(item=>item.name),myTurn=++turnId;stopListening();input.value='';committedTranscript='';say((typed||'تحليل المرفقات')+(names.length?'\nالمرفقات: '+names.join('، '):''),true);pending=true;submit.disabled=true;mic.disabled=true;addButton.disabled=true;input.disabled=true;
  await Promise.all([deliberate(),attachmentManager.wait()]);clearThinking();if(panel.hidden||myTurn!==turnId){pending=false;return}
  try{const report=hasAttachments?attachmentManager.analyze(text):null;await handle(text,report);if(hasAttachments)attachmentManager.clear()}catch{say('تعذر تجهيز النتيجة. أعد المحاولة مع وصف أقصر أو مرفق أوضح.')}
  finally{pending=false;submit.disabled=false;mic.disabled=!recognition;addButton.disabled=false;input.disabled=false;input.focus();scrollConversation()}
 };
 panel.querySelectorAll('[data-teacher-start]').forEach(b=>b.onclick=()=>{if(!pending)start(b.dataset.teacherStart)});
 $('teacherNew').onclick=()=>{turnId++;stopListening();clearThinking();pending=false;submit.disabled=false;mic.disabled=!recognition;addButton.disabled=false;input.disabled=false;attachmentManager.clear();hideAttachmentMenu();messages.replaceChildren();input.value='';open()};

 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(Speech){
  recognition=new Speech();recognition.lang='ar-KW';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
  recognition.onstart=()=>{recognitionActive=true};
  recognition.onresult=e=>{let interim='';for(let i=e.resultIndex||0;i<e.results.length;i++){const part=e.results[i][0]?.transcript?.trim()||'';if(!part)continue;if(e.results[i].isFinal)committedTranscript=(committedTranscript+' '+part).trim();else interim=(interim+' '+part).trim()}input.value=(committedTranscript+(interim?' '+interim:'')).trim();input.dispatchEvent(new Event('input',{bubbles:true}))};
  recognition.onerror=e=>{recognitionActive=false;if(e.error==='not-allowed'||e.error==='service-not-allowed'){updateListening(false);listenStatus.textContent='لم يُسمح باستخدام الميكروفون. فعّل الإذن من إعدادات المتصفح أو اكتب طلبك.'}else if(e.error!=='aborted'&&listening)listenStatus.textContent='التسجيل ما زال مستمرًا؛ أعيد وصل الاستماع مع الحفاظ على النص.'};
  recognition.onend=()=>{recognitionActive=false;if(listening&&!panel.hidden&&!pending&&!document.hidden){committedTranscript=input.value.trim();clearTimeout(restartTimer);restartTimer=setTimeout(startRecognition,180)}else if(!listening)updateListening(false)};
  mic.onclick=()=>listening?stopListening():startListening();
 }else{mic.disabled=true;mic.title='التسجيل الصوتي غير مدعوم في هذا المتصفح';listenStatus.textContent='التسجيل الصوتي غير مدعوم هنا؛ يمكنك الكتابة أو استخدام ميكروفون لوحة المفاتيح.'}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(recognitionActive)try{recognition.stop()}catch{};if(listening)listenStatus.textContent='التسجيل متوقف مؤقتًا لأن التطبيق في الخلفية، وسيستأنف عند عودتك.'}else if(listening){listenStatus.textContent='التسجيل مستمر؛ اضغط إيقاف عندما تنتهي.';startRecognition()}});
 window.ManhajTeacher={teacherIntent,open,close,run,startListening,stopListening,contextDate,contextDraft,addAttachments,attachmentSnapshot:attachmentManager.snapshot};
})();
