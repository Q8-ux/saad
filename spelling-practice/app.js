(function(){
  'use strict';
  const C=window.SpellingCore,M=window.SpellingMotion,$=id=>document.getElementById(id),canvas=$('ink'),ctx=canvas.getContext('2d'),player=$('pronunciation');
  const digits=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  let state=C.emptyState(),tool='pen',active=null,lastClear=null,toastTimer,storageFailed=false,playAttempt=0,audioTimer,printAttempt=0;
  const demo=$('motionCanvas'),demoContext=demo.getContext('2d');
  let motionPlan=null,motionPosition=0,motionSlow=false,motionPlaying=false,motionFrame=0,motionVersion=0,motionAttempt=0,motionExport=null,motionPicture=null;
  const canRecord=Boolean(M.recordingFormat()&&demo.captureStream&&(window.AudioContext||window.webkitAudioContext));
  function motionDuration(){return motionPlan.duration*(motionSlow?1.6:1);}
  function motionBusy(busy){
    for(const id of ['motionWatch','motionSeek','motionRestart','motionSlow'])$(id).disabled=busy;
    $('motionVideo').disabled=busy||!canRecord;$('motionProgress').hidden=!busy;
    $('motionVideo').textContent=canRecord?'تنزيل فيديو الكلمة':'تصدير الفيديو غير مدعوم';
  }
  function pauseMotion(){
    motionAttempt++;motionPlaying=false;cancelAnimationFrame(motionFrame);motionFrame=0;
    $('motionWatch').textContent=motionPosition>0&&motionPlan&&motionPosition<motionDuration()?'متابعة الكتابة':'شاهد الكتابة';
  }
  function stopMotion(){
    motionVersion++;pauseMotion();motionExport?.abort();motionExport=null;motionBusy(false);
    motionPosition=0;motionPicture=null;$('motionSeek').value=0;$('motionPanel').hidden=true;
    $('motionWatch').setAttribute('aria-expanded','false');$('motionWatch').textContent='شاهد الكتابة';
    $('motionStatus').textContent='';demoContext.clearRect(0,0,M.WIDTH,M.HEIGHT);
  }
  function prepareMotion(word,recall){
    stopMotion();const enabled=!recall&&word.lang!=='ar';$('wordMotion').hidden=!enabled;
    motionPlan=enabled?M.buildPlan(word):null;
    demo.setAttribute('aria-label',enabled?'مثال كتابة '+(word.trace||word.word):'نموذج كتابة الكلمة');
  }
  function paintMotion(){
    if(!motionPlan)return;M.drawFrame(demoContext,motionPlan,M.progressAt(motionPosition,motionDuration()),{picture:motionPicture});
    $('motionSeek').value=Math.round(motionPosition/motionDuration()*1000);
  }
  async function readyMotionPicture(version){
    if(!motionPlan.picture){motionPicture=null;return true;}
    const image=$('wordImage');
    if(!image.complete||!image.naturalWidth){
      if(typeof image.decode==='function')await image.decode();
      else await new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});});
    }
    if(version!==motionVersion)return false;motionPicture=image;return true;
  }
  async function playMotion(){
    if(!motionPlan||motionExport)return;if(motionPlaying){pauseMotion();return;}
    const version=motionVersion,attempt=++motionAttempt;
    $('motionPanel').hidden=false;$('motionWatch').setAttribute('aria-expanded','true');$('motionStatus').textContent='';
    try{
      if(!await readyMotionPicture(version)||version!==motionVersion||attempt!==motionAttempt)return;
      if(motionPosition>=motionDuration())motionPosition=0;
      const start=performance.now()-motionPosition*1000;motionPlaying=true;$('motionWatch').textContent='إيقاف مؤقت';
      const tick=now=>{
        if(version!==motionVersion||attempt!==motionAttempt)return;
        motionPosition=Math.min(motionDuration(),(now-start)/1000);paintMotion();
        if(motionPosition>=motionDuration()){pauseMotion();$('motionStatus').textContent='الآن دورك. جرّب الكتابة على النقاط.';}
        else motionFrame=requestAnimationFrame(tick);
      };
      paintMotion();motionFrame=requestAnimationFrame(tick);
    }catch{if(version===motionVersion)$('motionStatus').textContent='تعذر تحميل رسمة الكلمة. أعد المحاولة.';}
  }
  try{state=C.normalizeState(JSON.parse(localStorage.getItem(C.STORAGE_KEY)));}catch{storageFailed=true;}
  let requested='';try{requested=decodeURIComponent(location.hash.slice(1));}catch{/* Ignore malformed link fragments. */}
  const requestedIndex=C.WORDS.findIndex(w=>w.id===requested);if(requestedIndex>=0){state.index=requestedIndex;state.subject=C.subjectForWord(requested,state.subject);}
  function visibleWords(){return C.subjectWords(state.subject);}
  function visiblePosition(){return visibleWords().findIndex(w=>w.id===C.WORDS[state.index].id);}
  function strokes(){const key=C.pageKey(state);return state.pages[key]||(state.pages[key]=[]);}
  function message(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
  function listening(on){$('listen').classList.toggle('playing',on);$('listenLabel').textContent=on?'أسمع وأتعلّم':'اسمع الكلمة';$('listen').setAttribute('aria-pressed',String(on));}
  function stopAudio(){playAttempt++;clearTimeout(audioTimer);player.pause();try{player.currentTime=0;}catch{}listening(false);}
  function prepareAudio(){const src='audio/'+C.WORDS[state.index].id+'.mp3?v=2';if(player.getAttribute('src')!==src){stopAudio();player.setAttribute('src',src);player.load();}}
  function audioFallback(attempt){if(attempt!==playAttempt)return;clearTimeout(audioTimer);listening(false);player.hidden=false;message('اضغط زر التشغيل في مشغّل الصوت أسفل الكلمة.');}
  function save(){
    try{localStorage.setItem(C.STORAGE_KEY,JSON.stringify(state));storageFailed=false;$('saveState').textContent='حُفظ التدريب على هذا الجهاز';$('saveState').classList.remove('error');}
    catch{storageFailed=true;$('saveState').textContent='تعذّر الحفظ؛ أبقِ الصفحة مفتوحة';$('saveState').classList.add('error');}
  }
  function updateTools(){
    $('pen').classList.toggle('active',tool==='pen');$('eraser').classList.toggle('active',tool==='eraser');$('pen').setAttribute('aria-pressed',String(tool==='pen'));$('eraser').setAttribute('aria-pressed',String(tool==='eraser'));canvas.classList.toggle('eraser',tool==='eraser');
    document.querySelectorAll('[data-color]').forEach(b=>{const on=b.dataset.color===state.color;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    $('undo').disabled=!strokes().length&&lastClear?.key!==C.pageKey(state);$('clear').disabled=!strokes().length;
  }
  function redraw(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/C.WIDTH,0,0,canvas.height/C.HEIGHT,0,0);for(const s of strokes())C.drawStroke(ctx,s);}
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,3);if(!r.width||!r.height)return;
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);redraw();
  }
  function render(){
    const w=C.WORDS[state.index],recall=state.mode==='recall';
    prepareMotion(w,recall);
    prepareAudio();
    const arabic=w.lang==='ar';
    $('wordTitle').textContent=recall?'أكتب من الذاكرة':(w.trace||w.word);$('wordTitle').classList.toggle('recall-title',recall);$('wordTitle').lang=recall||arabic?'ar':'en';$('wordTitle').dir=recall||arabic?'rtl':'ltr';
    $('wordTitle').classList.toggle('arabic-word',!recall&&arabic);
    $('wordTitle').classList.toggle('long-word',!recall&&!arabic&&(w.word.length>=5||Boolean(w.number)));
    $('meaning').textContent=recall?'أتذكّر الحروف وأكتبها وحدي.':w.meaning;$('wordCaption').textContent=recall?'أجرّب بنفسي':'أقرأ الكلمة';
    if(!recall&&w.number)$('wordCaption').textContent='أقرأ العدد وأكتب اسمه';
    const pictured=!recall&&Boolean(w.picture);
    $('wordPicture').hidden=!pictured;
    if(pictured){$('wordImage').setAttribute('src',w.picture);$('wordImage').alt='Illustration of '+w.word;$('wordCaption').textContent='أنظر إلى الصورة وأقرأ الكلمة';}
    else{$('wordImage').removeAttribute('src');$('wordImage').alt='';}
    $('pictureEntry').hidden=state.subject!=='english';
    $('printPictures').hidden=!['english','science'].includes(state.subject);
    const items=visibleWords(),position=visiblePosition();
    $('pageCount').textContent='صفحة '+digits(position+1)+' من '+digits(items.length);$('navCount').textContent=digits(position+1)+' / '+digits(items.length);
    $('subjectLabel').textContent=C.SUBJECTS.find(s=>s.id===state.subject).label+' · تدريب الإملاء';
    $('subjectTabs').innerHTML='';
    for(const subject of C.SUBJECTS){const b=document.createElement('button');b.type='button';b.textContent=subject.label+' '+digits(subject.ids.length);b.setAttribute('aria-pressed',String(state.subject===subject.id));b.addEventListener('click',()=>setSubject(subject.id));$('subjectTabs').appendChild(b);}
    $('traceMode').setAttribute('aria-pressed',String(!recall));$('recallMode').setAttribute('aria-pressed',String(recall));
    $('writingHint').textContent=recall?'اكتب الكلمة من الذاكرة. يمكنك سماعها بالضغط على «اسمع الكلمة».':(arabic?'اكتب فوق النقاط بإصبعك أو بقلم الشاشة، من اليمين إلى اليسار.':'اكتب فوق النقاط بإصبعك أو بقلم الشاشة، من اليسار إلى اليمين.');
    $('subjectNote').hidden=!arabic;
    $('guide').innerHTML=C.sheetSvg(w.trace||w.word,state.mode);
    $('wordTabs').innerHTML='';
    for(const [i,item] of items.entries()){
      const b=document.createElement('button');b.type='button';b.className='word-tab'+(state.completed[item.id]?' completed':'');b.textContent=recall?'كلمة '+digits(i+1):item.word;b.lang=recall||item.lang==='ar'?'ar':'en';b.dir=recall||item.lang==='ar'?'rtl':'ltr';
      b.setAttribute('aria-label',recall?'الكلمة '+digits(i+1):item.word);if(item.id===w.id)b.setAttribute('aria-current','page');
      b.addEventListener('click',()=>{navigate(C.WORDS.findIndex(w=>w.id===item.id));if(item.picture)$('wordPage').scrollIntoView({block:'start'});});$('wordTabs').appendChild(b);
    }
    $('previous').disabled=position===0;$('next').disabled=position===items.length-1;
    const done=Boolean(state.completed[w.id]);$('complete').setAttribute('aria-pressed',String(done));$('completeLabel').textContent=done?'أكملت هذه الكلمة':'أنهيت التدريب';
    $('progressCount').textContent=digits(Object.values(state.completed).filter(Boolean).length)+' / '+digits(C.WORDS.length)+' مكتملة';
    try{history.replaceState(null,'','#'+w.id);}catch{/* Embedded/file contexts may disallow history changes. */}
    if(storageFailed){$('saveState').textContent='الحفظ غير متاح في هذا المتصفح';$('saveState').classList.add('error');}
    updateTools();resize();
  }
  function finish(event){
    if(!active||(event&&event.pointerId!==active.id))return;
    const id=active.id;active=null;
    try{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch{}
    save();updateTools();
  }
  function navigate(index){
    if(index<0||index>=C.WORDS.length)return;finish();stopAudio();state.index=index;state.subject=C.subjectForWord(C.WORDS[index].id,state.subject);lastClear=null;save();render();
  }
  function setSubject(subject){finish();stopAudio();state.subject=subject;const items=visibleWords();if(!items.some(w=>w.id===C.WORDS[state.index].id))state.index=C.WORDS.findIndex(w=>w.id===items[0].id);lastClear=null;save();render();}
  function stepWord(delta){const word=visibleWords()[visiblePosition()+delta];if(word)navigate(C.WORDS.findIndex(w=>w.id===word.id));}
  canvas.addEventListener('pointerdown',event=>{
    if(active||event.button>0||($('penOnly').checked&&event.pointerType!=='pen'))return;
    event.preventDefault();
    if(strokes().reduce((n,s)=>n+s.points.length,0)>=30000){message('الصفحة ممتلئة. يمكنك مسحها لبدء محاولة جديدة.');return;}
    const s={tool,color:state.color,width:tool==='eraser'?34:9,points:[C.pointerPoint(event,canvas.getBoundingClientRect())]};
    strokes().push(s);active={id:event.pointerId,stroke:s};lastClear=null;
    try{canvas.setPointerCapture(event.pointerId);}catch{}C.drawStroke(ctx,s);updateTools();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!active||event.pointerId!==active.id)return;event.preventDefault();
    const s=active.stroke,from=s.points.length,rect=canvas.getBoundingClientRect();
    let events=typeof event.getCoalescedEvents==='function'?event.getCoalescedEvents():[];if(!events.length)events=[event];
    for(const e of events){if(s.points.length>=10000)break;const p=C.pointerPoint(e,rect),last=s.points[s.points.length-1];if(Math.hypot(p.x-last.x,p.y-last.y)>.65)s.points.push(p);}
    if(s.points.length>from)C.drawStroke(ctx,s,from);
  });
  canvas.addEventListener('pointerup',event=>{
    if(active?.id===event.pointerId){const p=C.pointerPoint(event,canvas.getBoundingClientRect()),s=active.stroke,last=s.points[s.points.length-1];if(Math.hypot(p.x-last.x,p.y-last.y)>.65){s.points.push(p);C.drawStroke(ctx,s,s.points.length-1);}}finish(event);
  });
  canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);canvas.addEventListener('contextmenu',e=>e.preventDefault());
  $('previous').addEventListener('click',()=>stepWord(-1));$('next').addEventListener('click',()=>stepWord(1));
  $('motionWatch').addEventListener('click',playMotion);
  $('motionRestart').addEventListener('click',()=>{pauseMotion();motionPosition=0;playMotion();});
  $('motionSlow').addEventListener('click',()=>{
    const fraction=motionPosition/motionDuration();pauseMotion();motionSlow=!motionSlow;
    $('motionSlow').setAttribute('aria-pressed',String(motionSlow));motionPosition=fraction*motionDuration();paintMotion();
  });
  $('motionSeek').addEventListener('input',()=>{pauseMotion();motionPosition=Number($('motionSeek').value)/1000*motionDuration();paintMotion();});
  $('motionClose').addEventListener('click',()=>{stopMotion();$('motionWatch').focus();});
  $('motionVideo').addEventListener('click',async()=>{
    if(!motionPlan||!canRecord||motionExport)return;
    const version=motionVersion;pauseMotion();stopAudio();motionBusy(true);
    const controller=new AbortController();motionExport=controller;
    let audioContext;
    const abortAudio=()=>{if(audioContext&&audioContext.state!=='closed')audioContext.close().catch(()=>{});};
    controller.signal.addEventListener('abort',abortAudio,{once:true});
    $('motionStatus').textContent='جارٍ تجهيز المقطع مع نطق الكلمة. أبقِ الصفحة ظاهرة حتى يكتمل.';
    try{
      // Unlock audio synchronously in the tap before image decoding yields.
      audioContext=new (window.AudioContext||window.webkitAudioContext)();
      const [pictureReady]=await Promise.all([readyMotionPicture(version),audioContext.resume()]);
      if(!pictureReady||version!==motionVersion)return;
      const result=await M.recordLesson(demo,{...motionPlan,duration:motionDuration()},{audioUrl:'audio/'+motionPlan.id+'.mp3?v=2',picture:motionPicture,audioContext,signal:controller.signal,onProgress:value=>{$('motionProgress').value=value;}});
      if(version!==motionVersion)return;
      const url=URL.createObjectURL(result.blob),link=document.createElement('a');link.href=url;link.download=motionPlan.id+'-writing.'+result.extension;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
      $('motionStatus').textContent='جهز فيديو الكلمة مع صوتها للتنزيل.';
    }catch(error){
      if(version===motionVersion)$('motionStatus').textContent=error.name==='AbortError'?'ألغي التصدير.':error.message==='hidden'?'توقف التصدير لأن الصفحة أصبحت مخفية. أعد المحاولة مع إبقائها ظاهرة.':'تعذر تجهيز الفيديو بالصوت. يمكنك متابعة العرض والتدريب أو المحاولة بمتصفح أحدث.';
    }finally{
      controller.signal.removeEventListener('abort',abortAudio);
      if(audioContext&&audioContext.state!=='closed')await audioContext.close();
      if(version===motionVersion){motionExport=null;motionBusy(false);paintMotion();}
    }
  });
  $('openPictures').addEventListener('click',()=>{setSubject('english');navigate(C.WORDS.findIndex(w=>w.id===C.PICTURE_IDS[0]));$('wordPage').scrollIntoView({block:'start'});});
  $('pen').addEventListener('click',()=>{finish();tool='pen';updateTools();});$('eraser').addEventListener('click',()=>{finish();tool='eraser';updateTools();});
  document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{finish();state.color=b.dataset.color;tool='pen';save();updateTools();}));
  $('undo').addEventListener('click',()=>{finish();if(lastClear?.key===C.pageKey(state)){state.pages[C.pageKey(state)]=lastClear.strokes;lastClear=null;}else strokes().pop();redraw();save();updateTools();});
  $('clear').addEventListener('click',()=>{finish();if(!strokes().length)return;lastClear={key:C.pageKey(state),strokes:strokes()};state.pages[C.pageKey(state)]=[];redraw();save();updateTools();message('مُسحت الصفحة. اضغط «تراجع» لاستعادتها.');});
  function setMode(mode){finish();state.mode=mode;lastClear=null;save();render();}
  $('traceMode').addEventListener('click',()=>setMode('trace'));$('recallMode').addEventListener('click',()=>setMode('recall'));
  $('penOnly').addEventListener('change',()=>{finish();if($('penOnly').checked)message('الكتابة بقلم الشاشة فقط. أزل العلامة للكتابة بالإصبع.');});
  $('complete').addEventListener('click',()=>{finish();const id=C.WORDS[state.index].id;state.completed[id]=!state.completed[id];save();render();if(state.completed[id])message(Object.values(state.completed).filter(Boolean).length===C.WORDS.length?'أحسنت! أكملت تدريب جميع الكلمات.':'أحسنت! يمكنك الانتقال إلى الكلمة التالية.');});
  $('listen').addEventListener('click',()=>{
    stopAudio();prepareAudio();const attempt=++playAttempt;
    try{
      // Keep play() in the student's tap handler so mobile audio policies allow it.
      const playing=player.play();if(playing&&typeof playing.catch==='function')playing.catch(()=>audioFallback(attempt));
      audioTimer=setTimeout(()=>{if(attempt===playAttempt&&player.paused)audioFallback(attempt);},6000);
    }catch{audioFallback(attempt);}
  });
  player.addEventListener('playing',()=>{clearTimeout(audioTimer);listening(true);});
  player.addEventListener('ended',()=>{clearTimeout(audioTimer);listening(false);});
  player.addEventListener('pause',()=>listening(false));
  player.addEventListener('error',()=>{clearTimeout(audioTimer);listening(false);player.hidden=false;message('تعذّر تحميل صوت الكلمة. أعد المحاولة بعد اتصال الإنترنت.');});
  function print(words){
    finish();$('printArea').innerHTML=C.printMarkup(words);
    // A first-time print must wait for all the separate image files to be ready.
    const attempt=++printAttempt,pictures=[...$('printArea').querySelectorAll('img')];
    if(!pictures.length){window.print();return;}
    Promise.all(pictures.map(img=>{
      if(typeof img.decode==='function')return img.decode();
      if(img.complete&&img.naturalWidth>0)return Promise.resolve();
      return new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});});
    })).then(()=>{if(attempt===printAttempt)window.print();},()=>{if(attempt===printAttempt)message('تعذّر تحميل إحدى الرسومات. أعد المحاولة قبل الطباعة.');});
  }
  $('printOne').addEventListener('click',()=>print([C.WORDS[state.index]]));$('printAll').addEventListener('click',()=>print(C.WORDS));
  $('printSubject').addEventListener('click',()=>print(visibleWords()));
  $('printPictures').addEventListener('click',()=>print(C.pictureWords()));
  window.addEventListener('beforeprint',()=>{if(!$('printArea').innerHTML)$('printArea').innerHTML=C.printMarkup([C.WORDS[state.index]]);});
  window.addEventListener('afterprint',()=>{printAttempt++;$('printArea').innerHTML='';});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finish();save();stopAudio();stopMotion();}});window.addEventListener('pagehide',()=>{finish();save();stopAudio();stopMotion();});
  window.addEventListener('hashchange',()=>{const id=location.hash.slice(1),i=C.WORDS.findIndex(w=>w.id===id);if(i>=0&&i!==state.index)navigate(i);});
  window.addEventListener('resize',resize);if('ResizeObserver'in window)new ResizeObserver(resize).observe($('paper'));
  render();
  if(requestedIndex>=0&&C.WORDS[state.index].picture)$('wordPage').scrollIntoView({block:'start'});
})();
