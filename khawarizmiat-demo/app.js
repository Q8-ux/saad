(function(){
  'use strict';
  const E=window.KhawarizmiatEngine;
  const $=id=>document.getElementById(id);
  const audio=$('audio');
  const stage=$('stage');
  let episode=null,timeline=[],scene=null,started=false,finished=false,lastLineId='',lastSceneId='',lastPersist=0,lastWatchTime=0,raf=0;
  let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{}};}
  let state=E.loadState(storage),puzzleOrder=[],puzzleMessage='',dialogWasPlaying=false,cameraStream=null,toastTimer=0,chapterTimer=0;
  const icon=(name,cls='')=>'<svg class="icon '+cls+'" aria-hidden="true"><use href="#i-'+name+'"/></svg>';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const waveform=()=>'<div class="waveform" aria-hidden="true">'+Array.from({length:36},(_,i)=>'<i style="--bar:'+([20,42,61,35,78,50,84,30,69,45,90,53][i%12])+'%;--delay:-'+(i*.14).toFixed(2)+'s"></i>').join('')+'</div>';
  const door=(marks=true)=>'<div class="door-scene"><span class="door-hole"></span><span class="door-handle"></span>'+(marks?'<span class="three-marks">|||</span>':'')+(state.visits>1&&marks?'<span class="revisit-clue" aria-hidden="true"></span>':'')+'</div>';
  const save=()=>{E.saveState(storage,state);renderRecommendations();updateEvidenceCount();};
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
  function choiceLabel(choice){return choice==='publish'?'شاركت الاتهام':choice==='context'?'طلبت السياق قبل الحكم':'ما حسمت موقفك';}
  function setPlayIcon(){
    const playing=!audio.paused&&!audio.ended;
    $('playToggle').innerHTML=icon(playing?'pause':'play');
    $('playToggle').setAttribute('aria-label',playing?'إيقاف الحلقة مؤقتًا':'تشغيل الحلقة');
    stage.classList.toggle('is-playing',playing);
    const interactive=scene&&['choice','lens','puzzle','correction'].includes(scene.mode);
    $('pauseShade').hidden=playing||!started||finished||interactive||document.querySelector('dialog[open]')!==null;
  }
  function updateSocialButtons(){if(!scene)return;for(const [button,key] of [['likeButton','likes'],['saveButton','saves']]){const active=state[key].includes(scene.id);$(button).classList.toggle('is-active',active);$(button).setAttribute('aria-pressed',String(active));}}
  function renderScene(next){
    if(!next)return;
    if(scene&&scene.mode==='puzzle'&&!state.puzzleSolved){state.puzzleRevealed=true;save();}
    scene=next;lastSceneId=next.id;stage.dataset.scene=next.id;
    const modes={voice:['ريم','ر','رسالة صوتية · ٢١:١٣'],story:['الواجهة','و','#وين_ريم · داخل القصة'],call:['سالم','س','مكالمة مع دانا'],choice:['نسختك من القصة','خ','اختيارك يغيّر ترتيب الأدلة'],lens:['الملف الأصلي','أ','مرسل من مشروع سالم'],puzzle:['سجل المشروع','م','لعبة ترتيب التوقيت'],original:['ريم','ر','الصوت المتصل · ٢١:٠٢'],correction:['ملفك في القصة','خ','راجع حكمك قبل ما تكمل'],incoming:['حساب ريم','ر','رسالة ومكالمة من مصدرين'],door:['دانا','د','باب الشقة · الليل']};
    const identity=modes[next.mode]||['خوارزميات','خ',next.title];
    $('storyName').textContent=identity[0];$('storyAvatar').textContent=identity[1];$('storyMeta').textContent=identity[2];
    $('sceneCount').textContent=String(episode.scenes.indexOf(next)+1).padStart(2,'0')+' / 10';
    $('visitLabel').textContent=state.visits>1?'الزيارة '+state.visits+' · راقب التفاصيل':'المشاهدة الأولى';
    const tag='<span class="scene-tag">'+escape(next.number)+' · '+escape(next.title)+'</span>';
    let html='';
    if(next.mode==='voice')html=tag+'<div class="phone-clock" dir="ltr">21:18</div><p class="scene-copy">رسالة من قبل انتشار المقطع</p><div class="voice-card"><div class="voice-who"><span class="voice-symbol">'+icon('play')+'</span>ريم</div>'+waveform()+'<small><span>رسالة صوتية</span><time dir="ltr">21:13</time></small></div><div class="chat-row outgoing">ريم ردي علي<span class="chat-meta">دانا · الآن</span></div>'+(state.visits>1?'<p class="revisit-note">هذه المرة، تذكر إشارة الباب في آخر الحلقة.</p>':'');
    else if(next.mode==='story')html=tag+door()+'<div class="caption-strip">حبستها.</div><p class="story-trend">#وين_ريم <span id="storyMetric">المقطع يعاد تداوله</span><em>هذا الترند والأرقام ضمن أحداث القصة</em></p>';
    else if(next.mode==='call')html=tag+'<div class="call-person"><div class="call-avatar">س</div><strong>سالم</strong><span>مكالمة صوتية مع دانا</span></div><div class="file-card">'+icon('proof')+'<div><strong>التصوير الأصلي + سجل المشروع</strong><small>أرسله سالم من ملفه</small></div></div><div class="chat-row outgoing">دز لي اللي قبل الجملة<span class="chat-meta">دانا</span></div>';
    else if(next.mode==='choice')html=tag+'<h2 class="scene-heading">شنو تسوي بالمقطع؟</h2><p class="scene-copy">قرار داخل القصة. ما يتم نشر شيء على حساباتك.</p><div class="choice-buttons"><button class="choice-button '+(state.choice==='publish'?'is-selected':'')+'" data-choice="publish">أشارك الاتهام<small>المقطع اللي شفته يكفيني</small></button><button class="choice-button '+(state.choice==='context'?'is-selected':'')+'" data-choice="context">أطلب السياق<small>أشوف الأصل قبل الحكم</small></button></div><p class="choice-feedback" id="choiceFeedback">'+(state.choice?'تم حفظ موقفك: '+choiceLabel(state.choice):'يمكنك أيضًا متابعة الحلقة من دون اختيار')+'</p><div class="feed-stack" id="feedStack"></div>';
    else if(next.mode==='lens')html=tag+'<h2 class="scene-heading">ورى الكادر</h2><div class="lens-frame" id="revealFrame" style="--reveal:'+state.reveal+'%">'+door()+'<div class="crop-mask"></div><div class="original-edge"><b>REC</b><time>21:02</time></div></div><label class="reveal-label">حرّك العدسة لإظهار الحافة الأصلية<input id="revealSlider" type="range" min="0" max="100" value="'+state.reveal+'" aria-label="كشف توقيت التصوير في الإطار الأصلي"></label><div class="time-compare"><span>وقت النشر<b dir="ltr">21:17</b></span><span class="old-time">وقت التصوير<b dir="ltr" id="revealedTime">'+(state.reveal>=65?'21:02':'••:••')+'</b></span></div>';
    else if(next.mode==='puzzle')html=tag+'<h2 class="scene-heading">رتب اللي صار</h2><p class="scene-copy">المس البطاقات من الأقدم إلى الأحدث</p><div class="puzzle-slots" id="puzzleSlots"></div><div class="puzzle-options" id="puzzleOptions"></div><div class="puzzle-tools"><button class="puzzle-check" id="checkPuzzle">تحقق من الترتيب</button><button class="puzzle-reset" id="resetPuzzle">أرتب من جديد</button></div><p class="puzzle-result" id="puzzleResult"></p>';
    else if(next.mode==='original')html=tag+door()+'<p class="original-sound">'+icon('sound')+' الصوت متصل · الملف الأصلي</p>'+(state.visits>1?'<p class="revisit-note">ثلاث علامات على الحافة. نفس عدد الدقات.</p>':'')+'<div class="proof-tag">اسمع الجملة إلى نهايتها قبل ما تحكم</div>';
    else if(next.mode==='correction')html=tag+'<h2 class="scene-heading">الحين شنو موقفك؟</h2><div class="previous-choice">'+(state.previousChoice?'في زيارتك السابقة: '+choiceLabel(state.previousChoice):'قبل ما تسمع الأصل: '+choiceLabel(state.firstChoice))+'</div><div class="choice-buttons"><button class="choice-button '+(state.corrected?'is-selected':'')+'" id="correctChoice">أصحح الاتهام<small>أحفظ اعترافي بأن المقطع كان ناقصًا</small></button><button class="choice-button '+(state.saves.includes('s7')?'is-selected':'')+'" id="saveOriginal">أحتفظ بالأصل<small>أحفظ التسجيل كاملًا في ملف الأدلة</small></button></div><p class="correction-status" id="correctionStatus">'+(state.corrected?'التصحيح محفوظ في ملفك داخل القصة':'تقدر تغيّر موقفك. يبقى قرارك الأول ضمن الملف.')+'</p>';
    else if(next.mode==='incoming')html=tag+'<div class="incoming-card"><small>حساب ريم · رسالة داخل القصة</small><p>تعالي بروحج<br>أرسلت لج موقعي</p></div><div class="call-person"><div class="call-avatar">؟</div><strong>رقم غير محفوظ</strong><span>ريم تتصل من هاتف آخر</span></div><div class="incoming-pulse">'+icon('phone')+'</div>';
    else if(next.mode==='door')html=tag+'<div style="position:relative">'+door(false)+'<div class="danger-message">ريم: افتحي أنا عند الباب</div></div><div class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></div><p class="scene-copy" style="text-align:center">ثلاث دقات.</p>';
    $('sceneVisual').innerHTML=html;
    if(next.mode==='choice'){renderFeed();$('sceneVisual').querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.choice)));}
    if(next.mode==='lens')$('revealSlider').addEventListener('input',e=>{state.reveal=Number(e.target.value);$('revealFrame').style.setProperty('--reveal',state.reveal+'%');$('revealedTime').textContent=state.reveal>=65?'21:02':'••:••';save();});
    if(next.mode==='puzzle'){$('checkPuzzle').addEventListener('click',verifyPuzzle);$('resetPuzzle').addEventListener('click',()=>{puzzleOrder=[];puzzleMessage='';renderPuzzle();});renderPuzzle();}
    if(next.mode==='correction'){$('correctChoice').addEventListener('click',()=>{state.corrected=true;save();$('correctChoice').classList.add('is-selected');$('correctionStatus').textContent='حُفظ التصحيح داخل القصة. ما تم نشر شيء خارج الديمو.';toast('تم حفظ تصحيحك');});$('saveOriginal').addEventListener('click',()=>{if(!state.saves.includes('s7'))state.saves.push('s7');save();$('saveOriginal').classList.add('is-selected');$('correctionStatus').textContent='التسجيل الكامل محفوظ في ملف الأدلة.';toast('حُفظ الملف الأصلي');});}
    updateSocialButtons();setPlayIcon();updateEvidenceCount();
  }
  function renderFeed(){const stack=$('feedStack');if(!stack)return;stack.innerHTML=E.feedOrder(state.choice).map((key,i)=>'<div class="feed-item"><strong>'+(key==='accusation'?'حبستها؟':'المقطع ناقص')+'</strong><span>'+(i===0?'ظهر لك أولًا':'بعده في الترتيب')+'</span></div>').join('');}
  function choose(value){E.setChoice(state,value);save();$('sceneVisual').querySelectorAll('[data-choice]').forEach(b=>b.classList.toggle('is-selected',b.dataset.choice===value));$('choiceFeedback').textContent='حُفظ موقفك، وتغيّر ترتيب البطاقات أمامك.';renderFeed();toast(value==='publish'?'حُفظ قرار المشاركة داخل القصة فقط':'حُفظ طلبك للسياق');}
  const puzzleCards={record:{label:'التصوير',time:'21:02'},edit:{label:'القص',time:'21:09'},publish:{label:'النشر',time:'21:17'}};
  function renderPuzzle(){
    $('puzzleSlots').innerHTML=[0,1,2].map(i=>'<div class="puzzle-slot '+(puzzleOrder[i]?'filled':'')+'">'+(puzzleOrder[i]?escape(puzzleCards[puzzleOrder[i]].label)+'<br><b dir="ltr">'+puzzleCards[puzzleOrder[i]].time+'</b>':String(i+1))+'</div>').join('');
    $('puzzleOptions').innerHTML=['publish','record','edit'].map(key=>'<button class="puzzle-option '+(puzzleOrder.includes(key)?'used':'')+'" data-card="'+key+'" '+(puzzleOrder.includes(key)?'disabled':'')+'><span>'+puzzleCards[key].label+'</span><time>'+puzzleCards[key].time+'</time></button>').join('');
    $('puzzleOptions').querySelectorAll('[data-card]').forEach(button=>button.addEventListener('click',()=>{if(puzzleOrder.length<3){puzzleOrder.push(button.dataset.card);puzzleMessage='';renderPuzzle();}}));
    $('puzzleResult').textContent=puzzleMessage||(state.puzzleSolved?'سبق وحليتها: تصوير، ثم قص، ثم نشر.':'عند انتهاء هذا المشهد ينكشف الترتيب لتستمر الحكاية.');
  }
  function verifyPuzzle(){if(puzzleOrder.length!==3){puzzleMessage='اختر البطاقات الثلاث أولًا.';}else if(E.checkPuzzle(puzzleOrder)){state.puzzleSolved=true;state.puzzleRevealed=true;save();puzzleMessage='صحيح. النشر جاء بعد التصوير بـ١٥ دقيقة؛ مو دليل أنها هناك الآن.';}else{puzzleMessage='مو هذا التسلسل. انتبه لوقت التصوير، ثم وقت القص، ثم وقت النشر.';}renderPuzzle();}
  function updateEvidenceCount(){if(!episode)return;$('evidenceCount').textContent=String(evidenceItems().length);}
  function evidenceItems(){
    const items=[];
    if(state.maxPosition>15)items.push({title:'رسالة ريم',text:'طلبت من دانا الملف كاملًا قبل انتشار المقطع.',start:0});
    if(state.firstChoice)items.push({title:'موقفك الأول',text:choiceLabel(state.firstChoice)+(state.corrected?' — ثم صححت الاتهام.':'.'),start:82});
    if(state.reveal>=65||state.maxPosition>=140)items.push({title:'فرق التوقيت',text:'التصوير ٢١:٠٢ والنشر ٢١:١٧. وقت النشر لا يثبت مكانها الآن.',start:109});
    if(state.puzzleSolved||state.puzzleRevealed||state.maxPosition>=171)items.push({title:'تسلسل الملف',text:'التصوير ثم القص ثم النشر. سالم فعّل النشر المجدول في مشروعه.',start:140});
    if(state.maxPosition>=195)items.push({title:'الصوت المتصل',text:'ريم كانت تحمي الفتاة من التصوير والتهديد؛ السياق حُذف من المنشور.',start:171});
    if(state.maxPosition>=274)items.push({title:'حساب يتكلم مكانها',text:'ريم تتصل من هاتف آخر وتنفي إرسال الموقع؛ صاحب الرسالة ما زال مجهولًا.',start:242});
    if(state.completed)items.push({title:'الدقات الثلاث',text:'إشارة الحارس في التسجيل نفسه تظهر عند باب دانا، بينما ريم تنفي وجودها هناك.',start:274});
    return items;
  }
  function renderEvidence(){const items=evidenceItems();$('evidenceBody').innerHTML=(state.firstChoice?'<p class="evidence-summary">'+escape(choiceLabel(state.firstChoice))+(state.corrected?'، ثم حفظت تصحيحك.':'، وما زال بإمكانك مراجعة موقفك.')+'</p>':'')+(items.length?items.map((item,i)=>'<div class="evidence-item"><span class="evidence-index">'+String(i+1).padStart(2,'0')+'</span><div><strong>'+escape(item.title)+'</strong><p>'+escape(item.text)+'</p><button data-proof-start="'+item.start+'">أراجع المشهد</button></div></div>').join(''):'<p class="evidence-empty">ابدأ الحلقة. الأدلة اللي تكتشفها تظهر هنا مع تقدمك.</p>')+'<div class="mobile-recs"><span class="eyebrow" style="margin-top:25px">مشاهد مرتبة حسب تفاعلك</span>'+recommendationHTML()+'</div>';
    $('evidenceBody').querySelectorAll('[data-proof-start],[data-rec-start]').forEach(button=>button.addEventListener('click',()=>{const time=Number(button.dataset.proofStart??button.dataset.recStart);dialogWasPlaying=false;$('evidenceDialog').close();seekTo(time,true);}));
  }
  function recommendationHTML(){return E.rankClips(state).slice(0,3).map(clip=>'<button class="recommendation-card" data-rec-start="'+clip.start+'"><span class="rec-meta"><span>'+escape(clip.type)+'</span><time class="rec-stamp">'+clip.stamp+'</time></span><strong>'+escape(clip.title)+'</strong><span class="rec-reason">'+escape(clip.reason)+'</span></button>').join('');}
  function renderRecommendations(){if(!episode)return;$('recommendationList').innerHTML=recommendationHTML();$('recommendationList').querySelectorAll('[data-rec-start]').forEach(button=>button.addEventListener('click',()=>seekTo(Number(button.dataset.recStart),true)));}
  function persistPosition(force=false){if(!started)return;const now=performance.now();if(force||now-lastPersist>1800){state.position=E.clamp(audio.currentTime||0,0,300);state.maxPosition=Math.max(state.maxPosition,state.position);E.saveState(storage,state);lastPersist=now;updateEvidenceCount();}}
  function updateFrame(){
    if(!episode||!started)return;
    const time=E.clamp(audio.currentTime||0,0,300);const next=E.sceneAt(episode.scenes,time);
    if(next&&next.id!==lastSceneId)renderScene(next);
    $('currentTime').textContent=E.formatTime(time);if(document.activeElement!==$('seek'))$('seek').value=String(time);
    document.querySelectorAll('.segment-fill').forEach((fill,i)=>{const s=episode.scenes[i];fill.style.width=(E.clamp((time-s.start)/(s.end-s.start),0,1)*100)+'%';});
    const line=E.lineAt(timeline,time);if((line?.id||'')!==lastLineId){lastLineId=line?.id||'';$('subtitleSpeaker').textContent=line?.speaker||'';$('subtitleText').textContent=line?.text||'';$('subtitle').style.opacity=line?'1':'0';}
    if(!audio.paused&&lastWatchTime>0&&scene){const delta=time-lastWatchTime;if(delta>0&&delta<1.5)state.watched[scene.id]=(state.watched[scene.id]||0)+delta;}lastWatchTime=time;
    if(scene?.mode==='story'&&$('storyMetric'))$('storyMetric').textContent=(Math.floor((time-scene.start)*287+1400)).toLocaleString('ar-KW')+' تداول في القصة';
    if(scene?.mode==='puzzle'&&time>scene.end-5&&!state.puzzleSolved){state.puzzleRevealed=true;if($('puzzleResult'))$('puzzleResult').textContent='الترتيب: تصوير ٢١:٠٢، قص ٢١:٠٩، نشر ٢١:١٧.';}
    persistPosition();if(!audio.paused){cancelAnimationFrame(raf);raf=requestAnimationFrame(updateFrame);}
  }
  async function play(){
    if(!episode)return;if(!started){startAt(0);return;}
    if(finished){replay();return;}
    try{await audio.play();setPlayIcon();cancelAnimationFrame(raf);raf=requestAnimationFrame(updateFrame);}catch(error){setPlayIcon();if(error?.name==='AbortError')return;toast('تعذر تشغيل الصوت. جرّب زر التشغيل مرة ثانية بعد اكتمال التحميل.');}
  }
  function pause(){audio.pause();cancelAnimationFrame(raf);persistPosition(true);setPlayIcon();}
  function startAt(time=0){if(!episode)return;started=true;finished=false;$('cover').hidden=true;$('playerContent').hidden=false;$('endScreen').hidden=true;stage.classList.remove('is-cover');seekTo(time,false);play();}
  function seekTo(time,shouldPlay=false){if(!episode)return;if(!started){startAt(time);return;}finished=false;$('endScreen').hidden=true;const target=E.clamp(Number(time)||0,0,299.95);try{audio.currentTime=target;}catch{audio.addEventListener('loadedmetadata',()=>{audio.currentTime=target;updateFrame();},{once:true});}lastWatchTime=target;state.position=target;state.maxPosition=Math.max(state.maxPosition,target);updateFrame();save();setPlayIcon();if(shouldPlay)play();}
  function replay(){if(!episode)return;state.previousChoice=state.choice||state.previousChoice;state.visits+=1;state.position=0;lastLineId='';lastSceneId='';puzzleOrder=[];save();startAt(0);toast('زيارة جديدة. قرارك السابق محفوظ في ملف الأدلة.');}
  function complete(){if(finished)return;finished=true;state.completed=true;state.position=300;state.maxPosition=300;save();$('currentTime').textContent='05:00';$('seek').value='300';$('pauseShade').hidden=true;$('endScreen').hidden=false;$('endState').textContent=state.firstChoice?'موقفك الأول: '+choiceLabel(state.firstChoice)+(state.corrected?' · التصحيح محفوظ':''):'شاهدت الحكاية من دون تسجيل حكم';setPlayIcon();}
  function openDialog(id){dialogWasPlaying=!audio.paused;pause();if(id==='evidenceDialog')renderEvidence();$(id).showModal();setPlayIcon();}
  function onDialogClose(dialog){if(dialog.id==='lensDialog')stopCamera();const resume=dialogWasPlaying;dialogWasPlaying=false;setPlayIcon();if(resume&&!finished)play();}
  function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null;}$('cameraVideo').srcObject=null;$('cameraVideo').hidden=true;$('lensFallback').hidden=false;$('startCamera').textContent='تشغيل الكاميرا';}
  async function startCamera(){
    if(cameraStream){stopCamera();$('lensStatus').textContent='تم إيقاف الكاميرا. العدسة تعمل على المشهد المعدّ.';return;}
    if(!navigator.mediaDevices?.getUserMedia){$('lensStatus').textContent='الكاميرا غير متاحة في هذا المتصفح. جرّب تأثير العدسة على المشهد واحفظه.';return;}
    $('startCamera').disabled=true;
    try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:720},height:{ideal:1280}},audio:false});$('cameraVideo').srcObject=cameraStream;$('cameraVideo').hidden=false;$('lensFallback').hidden=true;await $('cameraVideo').play();$('startCamera').textContent='إيقاف الكاميرا';$('lensStatus').textContent='الكاميرا تعمل على جهازك فقط. يمكنك حفظ صورة؛ لا يتم رفعها.';}catch(error){stopCamera();$('lensStatus').textContent=error.name==='NotAllowedError'?'لم يُسمح بالكاميرا. ما زال بإمكانك تجربة العدسة على المشهد وحفظه.':'تعذر فتح الكاميرا. يمكنك استخدام المشهد المعدّ بدلًا منها.';}finally{$('startCamera').disabled=false;}
  }
  async function downloadLens(){
    try{if(document.fonts?.ready)await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;const ctx=canvas.getContext('2d');const effect=Number($('effectRange').value)/100;ctx.fillStyle='#10170a';ctx.fillRect(0,0,720,1280);
      const video=$('cameraVideo');if(cameraStream&&video.readyState>=2){const scale=Math.max(720/video.videoWidth,1280/video.videoHeight);const width=video.videoWidth*scale,height=video.videoHeight*scale;ctx.save();ctx.translate(720,0);ctx.scale(-1,1);ctx.filter='grayscale(65%) sepia(50%) hue-rotate(25deg) contrast(120%)';ctx.drawImage(video,(720-width)/2,(1280-height)/2,width,height);ctx.restore();ctx.filter='none';}else{const gradient=ctx.createRadialGradient(360,610,10,360,610,500);gradient.addColorStop(0,'#34451d');gradient.addColorStop(1,'#10170a');ctx.fillStyle=gradient;ctx.fillRect(0,0,720,1280);ctx.strokeStyle='#becf8d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(360,560,170,100,-.1,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fffc00';ctx.beginPath();ctx.arc(360,560,55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#365012';ctx.beginPath();ctx.arc(360,560,27,0,Math.PI*2);ctx.fill();ctx.textAlign='center';ctx.fillStyle='#fffc00';ctx.font='900 62px Cairo, sans-serif';ctx.fillText('نسختك',360,770);}
      ctx.fillStyle='rgba(230,255,50,'+(effect*.12)+')';for(let y=0;y<1280;y+=6)ctx.fillRect(0,y,720,1);ctx.strokeStyle='#d5ef6977';ctx.lineWidth=2;ctx.strokeRect(57,160,606,860);ctx.textAlign='right';ctx.direction='rtl';ctx.fillStyle='#fffc00';ctx.font='900 48px Cairo, sans-serif';ctx.fillText('خوارزميات',657,100);ctx.textAlign='left';ctx.direction='ltr';ctx.font='32px monospace';ctx.fillText('03',62,90);ctx.fillStyle='#0a120ae6';ctx.fillRect(48,1070,624,150);ctx.direction='rtl';ctx.textAlign='center';ctx.fillStyle='#eff4dc';ctx.font='800 38px Cairo, sans-serif';ctx.fillText('وش الجزء اللي ما شفته؟',360,1140);ctx.font='22px Cairo, sans-serif';ctx.fillStyle='#b6c79b';ctx.fillText('قبل لا تنشر · تأليف سعد روضان',360,1190);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('empty image');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='khawarizmiat-story.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('تم تجهيز صورة الستوري للتنزيل');
    }catch(error){toast('تعذر حفظ الصورة في هذا المتصفح. جرّب فتح التجربة في متصفح آخر.');}
  }
  async function share(){
    const text='خوارزميات — قبل لا تنشر. خمس دقائق داخل قصة دانا وريم. منو اللي عند الباب؟';
    const url=window.KHAWARIZMIAT_DATA?.shareUrl||(location.hostname.endsWith('github.io')?location.href.split('#')[0]:'');
    try{if(navigator.share){await navigator.share({title:'خوارزميات | قبل لا تنشر',text,...(url?{url}:{})});toast('تمت المشاركة');return;}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text+(url?'\n'+url:''));toast(url?'نُسخ رابط التجربة مع وصفها':'نُسخ وصف الحلقة للمشاركة');return;}toast('المشاركة غير متاحة هنا. تقدر تحفظ صورة الستوري من العدسة.');}catch(error){if(error.name==='AbortError')return;toast('لم تتم المشاركة. يمكنك حفظ صورة ستوري من العدسة.');}
  }
  function bind(){
    $('startButton').addEventListener('click',()=>state.completed?replay():startAt(0));$('resumeButton').addEventListener('click',()=>startAt(state.position));
    $('playToggle').addEventListener('click',()=>audio.paused?play():pause());$('centerPlay').addEventListener('click',play);
    $('seek').addEventListener('input',e=>seekTo(e.target.value));
    $('previousScene').addEventListener('click',()=>{if(!episode)return;const current=E.sceneAt(episode.scenes,audio.currentTime||0);const index=episode.scenes.indexOf(current);seekTo((audio.currentTime-current.start)>3?current.start:episode.scenes[Math.max(0,index-1)].start,!audio.paused);});
    $('nextScene').addEventListener('click',()=>{if(!episode)return;const current=E.sceneAt(episode.scenes,audio.currentTime||0);const index=episode.scenes.indexOf(current);seekTo(episode.scenes[Math.min(episode.scenes.length-1,index+1)].start,!audio.paused);});
    $('muteButton').addEventListener('click',()=>{audio.muted=!audio.muted;$('muteButton').innerHTML=icon(audio.muted?'muted':'sound');$('muteButton').setAttribute('aria-label',audio.muted?'تشغيل الصوت':'كتم الصوت');});
    $('replayButton').addEventListener('click',replay);$('replayEnd').addEventListener('click',replay);
    for(const id of ['evidenceButton','openEvidenceTop','endEvidence'])$(id).addEventListener('click',()=>openDialog('evidenceDialog'));
    $('lensButton').addEventListener('click',()=>openDialog('lensDialog'));
    $('shareButton').addEventListener('click',share);
    $('startCamera').addEventListener('click',startCamera);$('downloadLens').addEventListener('click',downloadLens);
    $('effectRange').addEventListener('input',e=>$('lensPreview').style.setProperty('--effect',String(Number(e.target.value)/100)));
    for(const [id,key,label] of [['likeButton','likes','الإعجاب'],['saveButton','saves','الحفظ']])$(id).addEventListener('click',()=>{if(!scene){toast('ابدأ الحلقة أولًا');return;}state[key]=E.toggleItem(state[key],scene.id);save();updateSocialButtons();toast(state[key].includes(scene.id)?'تم '+label+' على هذا الجهاز':'أُلغي '+label);});
    $('brandHome').addEventListener('click',event=>{event.preventDefault();pause();$('cover').hidden=false;$('playerContent').hidden=true;$('endScreen').hidden=true;stage.classList.add('is-cover');started=false;finished=false;setPlayIcon();if(state.position>0&&state.position<299)$('resumeButton').hidden=false;});
    document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
    document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>onDialogClose(dialog));dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});});
    $('clearProgress').addEventListener('click',()=>{if(!window.confirm('تبدي ملف جديد وتمسح تقدمك واختياراتك المحفوظة على هذا الجهاز؟'))return;audio.pause();cancelAnimationFrame(raf);started=false;state=E.defaultState();puzzleOrder=[];lastLineId='';lastSceneId='';save();dialogWasPlaying=false;$('evidenceDialog').close();pause();started=false;finished=false;audio.currentTime=0;$('cover').hidden=false;$('playerContent').hidden=true;$('endScreen').hidden=true;$('resumeButton').hidden=true;$('startLabel').textContent='ابدأ الحلقة';$('currentTime').textContent='00:00';$('seek').value='0';stage.classList.add('is-cover');setPlayIcon();toast('بدأ ملف جديد');});
    audio.addEventListener('play',()=>{setPlayIcon();cancelAnimationFrame(raf);raf=requestAnimationFrame(updateFrame);});audio.addEventListener('pause',()=>{setPlayIcon();persistPosition(true);});audio.addEventListener('timeupdate',updateFrame);audio.addEventListener('seeked',updateFrame);audio.addEventListener('ended',complete);audio.addEventListener('error',()=>{if(started)toast('تعذر تحميل صوت الحلقة. تأكد من اتصالك أو اكتمال ملفات النسخة.');});
    document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','BUTTON','A'].includes(event.target.tagName)||event.ctrlKey||event.metaKey||event.altKey)return;if(event.code==='Space'){event.preventDefault();audio.paused?play():pause();}else if(event.code==='ArrowLeft'){event.preventDefault();seekTo(audio.currentTime-10);}else if(event.code==='ArrowRight'){event.preventDefault();seekTo(audio.currentTime+10);}else if(event.code==='KeyM')$('muteButton').click();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&started)pause();});window.addEventListener('pagehide',()=>{persistPosition(true);stopCamera();});
  }
  async function init(){
    bind();
    try{const embedded=window.KHAWARIZMIAT_DATA;let data,lines;if(embedded?.episode&&embedded?.timeline){data=embedded.episode;lines=embedded.timeline;if(embedded.audioUrl)audio.src=embedded.audioUrl;}else{const responses=await Promise.all([fetch('assets/episode.json'),fetch('assets/timeline.json')]);if(responses.some(r=>!r.ok))throw new Error('Missing episode assets');[data,lines]=await Promise.all(responses.map(r=>r.json()));}
      if(!Array.isArray(data?.scenes)||data.scenes.length!==10||!Array.isArray(lines))throw new Error('Invalid episode structure');episode=data;timeline=lines.filter(l=>Number.isFinite(l.start)&&Number.isFinite(l.end)&&typeof l.text==='string').sort((a,b)=>a.start-b.start);$('segments').innerHTML=episode.scenes.map(()=>'<div class="segment"><div class="segment-fill"></div></div>').join('');$('startButton').disabled=false;$('startLabel').textContent=state.completed?'أعيد الحلقة':'ابدأ الحلقة';if(location.hostname.endsWith('github.io'))$('sourceLink').hidden=false;if(state.position>3&&state.position<299){$('resumeButton').hidden=false;$('resumeButton').textContent='أكمل من '+E.formatTime(state.position);}renderRecommendations();updateEvidenceCount();
    }catch(error){$('startLabel').textContent='تعذر تحميل الحلقة';$('startButton').disabled=true;const footnote=document.querySelector('.cover-footnote');footnote.textContent='ملفات الحلقة لم تكتمل أو تعذر تحميلها. افتح النسخة الكاملة أو حدّث الصفحة.';footnote.style.color='#ffd08a';}
  }
  init();
})();
