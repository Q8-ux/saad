(function(){
  'use strict';
  const C=window.SpellingCore,$=id=>document.getElementById(id),canvas=$('ink'),ctx=canvas.getContext('2d'),player=$('pronunciation');
  const digits=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  let state=C.emptyState(),tool='pen',active=null,lastClear=null,toastTimer,storageFailed=false,playAttempt=0,audioTimer;
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
    prepareAudio();
    $('wordTitle').textContent=recall?'أكتب من الذاكرة':w.word;$('wordTitle').classList.toggle('recall-title',recall);$('wordTitle').lang=recall?'ar':'en';$('wordTitle').dir=recall?'rtl':'ltr';
    $('wordTitle').classList.toggle('long-word',!recall&&w.word.length>=5);
    $('meaning').textContent=recall?'أتذكّر الحروف وأكتبها وحدي.':w.meaning;$('wordCaption').textContent=recall?'أجرّب بنفسي':'أقرأ الكلمة';
    const items=visibleWords(),position=visiblePosition();
    $('pageCount').textContent='صفحة '+digits(position+1)+' من '+digits(items.length);$('navCount').textContent=digits(position+1)+' / '+digits(items.length);
    $('subjectLabel').textContent=C.SUBJECTS.find(s=>s.id===state.subject).label+' · تدريب الإملاء';
    $('subjectTabs').innerHTML='';
    for(const subject of C.SUBJECTS){const b=document.createElement('button');b.type='button';b.textContent=subject.label+' '+digits(subject.ids.length);b.setAttribute('aria-pressed',String(state.subject===subject.id));b.addEventListener('click',()=>setSubject(subject.id));$('subjectTabs').appendChild(b);}
    $('traceMode').setAttribute('aria-pressed',String(!recall));$('recallMode').setAttribute('aria-pressed',String(recall));
    $('writingHint').textContent=recall?'اكتب الكلمة من الذاكرة. يمكنك سماعها بالضغط على «اسمع الكلمة».':'اكتب فوق النقاط بإصبعك أو بقلم الشاشة، من اليسار إلى اليمين.';
    $('guide').innerHTML=C.sheetSvg(w.word,state.mode);
    $('wordTabs').innerHTML='';
    for(const [i,item] of items.entries()){
      const b=document.createElement('button');b.type='button';b.className='word-tab'+(state.completed[item.id]?' completed':'');b.textContent=recall?'كلمة '+digits(i+1):item.word;b.lang=recall?'ar':'en';b.dir=recall?'rtl':'ltr';
      b.setAttribute('aria-label',recall?'الكلمة '+digits(i+1):item.word);if(item.id===w.id)b.setAttribute('aria-current','page');
      b.addEventListener('click',()=>navigate(C.WORDS.findIndex(w=>w.id===item.id)));$('wordTabs').appendChild(b);
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
  function print(words){finish();$('printArea').innerHTML=C.printMarkup(words);window.print();}
  $('printOne').addEventListener('click',()=>print([C.WORDS[state.index]]));$('printAll').addEventListener('click',()=>print(C.WORDS));
  $('printSubject').addEventListener('click',()=>print(visibleWords()));
  window.addEventListener('beforeprint',()=>{if(!$('printArea').innerHTML)$('printArea').innerHTML=C.printMarkup([C.WORDS[state.index]]);});
  window.addEventListener('afterprint',()=>$('printArea').innerHTML='');
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finish();save();stopAudio();}});window.addEventListener('pagehide',()=>{finish();save();stopAudio();});
  window.addEventListener('hashchange',()=>{const id=location.hash.slice(1),i=C.WORDS.findIndex(w=>w.id===id);if(i>=0&&i!==state.index)navigate(i);});
  window.addEventListener('resize',resize);if('ResizeObserver'in window)new ResizeObserver(resize).observe($('paper'));
  render();
})();
