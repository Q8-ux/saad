(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
let activeAudio=null;

function setAudioStatus(msg){const el=document.getElementById('audioStatus');if(el)el.textContent=msg||'';}
function stopAudio(){
  if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0;}catch(e){}activeAudio=null;}
  try{speechSynthesis?.cancel?.();}catch(e){}
}
window.stopListening=function(){stopAudio();setAudioStatus('تم إيقاف الاستماع.');};

window.playLessonAudio=function(kind){
  if(!state.unit)return;
  stopAudio();
  const src=`./audio/${state.unit}-${kind}.wav`;
  const audio=new Audio(src);
  activeAudio=audio;
  audio.preload='auto';
  audio.oncanplay=()=>setAudioStatus('جاهز للتشغيل');
  audio.onplay=()=>setAudioStatus('🔊 جاري التشغيل');
  audio.onended=()=>{setAudioStatus('✓ انتهى الاستماع');activeAudio=null;};
  audio.onerror=()=>{setAudioStatus('تعذر تحميل الملف الصوتي. أعد المحاولة بعد تحديث الصفحة.');activeAudio=null;};
  setAudioStatus('جاري تحميل الصوت…');
  const p=audio.play();
  if(p&&typeof p.catch==='function')p.catch(()=>setAudioStatus('اضغط تشغيل مرة أخرى للسماح للمتصفح بتشغيل الصوت.'));
};

window.speakText=function(text){
  const value=String(text||'').trim();
  if(!value)return;
  if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined'){
    setAudioStatus('نطق الكلمات غير مدعوم هنا، لكن استماع الدرس والنموذج يعملان بملفات صوت مستقلة.');
    return;
  }
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(value);u.lang='en-US';u.rate=.84;
    speechSynthesis.speak(u);
  }catch(e){}
};

function lessonWorkspace(u){
  const vocab=u.vocab.map(([e,a])=>`<button class="word" onclick='speakText(${JSON.stringify(e)})'><b>${e} 🔊</b><span>${a}</span></button>`).join('');
  const choices=u.question.choices.map((c,i)=>`<button class="choice" onclick="answer(this,${i},${u.question.answer},'Grammar')">${c}</button>`).join('');
  return `<div class="lesson-head"><div><span class="eyebrow">${CURRICULUM[state.grade].title}</span><h2>${u.title}</h2><p>${u.theme}</p></div><button class="primary" onclick="completeLesson()">✓ إكمال الدرس</button></div>
  <div class="lesson-tabs"><button onclick="document.getElementById('summaryBlock').scrollIntoView()">الشرح</button><button onclick="document.getElementById('vocabBlock').scrollIntoView()">الكلمات</button><button onclick="document.getElementById('listenBlock').scrollIntoView()">الاستماع</button><button onclick="document.getElementById('practiceBlock').scrollIntoView()">التدريب</button></div>
  <section id="summaryBlock" class="audio-box"><h3>تحليل الدرس</h3><p><b>الموضوع:</b> ${u.theme}</p><p><b>القاعدة:</b> ${u.grammar}</p><p>ابدأ بالكلمات، ثم القاعدة، ثم الاستماع، وبعدها التدريب.</p></section>
  <section id="vocabBlock"><h3>الكلمات</h3><div class="word-grid">${vocab}</div></section>
  <section class="audio-box"><h3>القواعد</h3><p>${u.grammar}</p></section>
  <section id="listenBlock" class="audio-box"><h3>🎧 الاستماع</h3><p>يعمل من ملف صوت مباشر ولا يعتمد على محرك صوت المتصفح.</p><div class="audio-controls"><button class="primary" onclick="playLessonAudio('listen')">▶ تشغيل</button><button class="ghost" onclick="stopListening()">■ إيقاف</button><button class="ghost" onclick="const t=document.getElementById('transcript');t.hidden=!t.hidden">النص</button></div><p id="audioStatus" aria-live="polite"></p><p id="transcript" hidden dir="ltr">${u.listen}</p></section>
  <section class="audio-box"><h3>🎙️ النطق</h3><p dir="ltr"><b>${u.speak}</b></p><div class="audio-controls"><button class="ghost" onclick="playLessonAudio('speak')">🔊 النموذج</button><button class="ghost" onclick='startRecognition(${JSON.stringify(u.speak)})'>🎙️ سجّل</button></div><p id="speechResult"></p></section>
  <section id="practiceBlock" class="quiz-box"><h3>${u.question.q}</h3>${choices}<p class="feedback"></p></section>
  <section class="audio-box"><h3>📝 الكتابة</h3><textarea id="writing" class="writing-box" placeholder="Write your sentence here..."></textarea><button class="ghost" onclick="reviewWriting()">مراجعة</button><p id="writingFeedback"></p></section>
  <section class="audio-box"><h3>ورقة العمل ونموذج الإجابة</h3><p>1. استخدم ثلاث كلمات من الدرس في جمل.</p><p>2. طبّق القاعدة في جملتين.</p><p>3. أجب عن سؤال الاستماع أعلاه.</p><details><summary>نموذج الإجابة</summary><p><b>${u.question.choices[u.question.answer]}</b></p></details><button class="ghost" onclick="window.print()">🖨️ طباعة</button></section>`;
}

window.selectGrade=function(id){
  if(!CURRICULUM[id])return;
  state.grade=id;state.unit=null;renderGrades();
  const g=CURRICULUM[id];
  $('#sideTitle').textContent=g.title+' — الفصل '+state.semester;
  $('#unitList').innerHTML=g.units.map((u,i)=>`<button class="unit-btn" onclick="openUnit('${u.id}')"><b>الوحدة ${i+1}: ${u.title}</b><small>${u.theme}</small></button>`).join('');
  if(g.units[0]) openUnit(g.units[0].id);
};

window.openUnit=function(uid){
  stopAudio();
  const u=findUnit(uid);if(!u)return;
  state.unit=uid;
  $$('.unit-btn').forEach(b=>b.classList.toggle('active',b.getAttribute('onclick')?.includes(uid)));
  const panel=$('#lessonPanel');
  panel.innerHTML=lessonWorkspace(u);
  if(typeof updateTutorContext==='function') updateTutorContext();
  requestAnimationFrame(()=>panel.scrollIntoView({block:'start',behavior:'auto'}));
};

window.openTool=function(type){
  const b=$('#modalBody');if(!b)return;$('#modal').classList.remove('hidden');
  if(type==='books'){
    b.innerHTML='<h2>📚 المصادر الرسمية</h2><p>لضمان عدم ظهور روابط كتب مكسورة، نفتح بوابة مكتبة الطالب الرسمية فقط.</p><p><a class="primary link-btn" href="https://elibrary.moe.edu.kw/StudentsLibrary" target="_blank" rel="noopener">مكتبة الطالب – وزارة التربية ↗</a></p>';
    return;
  }
  if(type==='worksheet'&&state.unit){const u=findUnit(state.unit);b.innerHTML=`<h2>📝 ورقة عمل</h2><h3>${u.title}</h3><p>استخدم كلمات الدرس في ثلاث جمل، وطبّق القاعدة في جملتين.</p><details><summary>نموذج الإجابة</summary><p>سؤال الاستماع: <b>${u.question.choices[u.question.answer]}</b></p></details>`;return;}
  b.innerHTML='<h2>الأداة متاحة داخل صفحة الدرس</h2><p>اختر الصف والدرس وستجد الاستماع والنطق والتدريب وورقة العمل في صفحة واحدة.</p>';
};

window.addEventListener('pagehide',stopAudio,{passive:true});
})();
