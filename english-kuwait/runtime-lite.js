(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
let audioTimer=null;

window.speakText=function(text){
  if(!text||!('speechSynthesis' in window)) return;
  try{
    clearTimeout(audioTimer);
    speechSynthesis.cancel();
    if(speechSynthesis.paused) speechSynthesis.resume();
    const u=new SpeechSynthesisUtterance(String(text));
    u.lang='en-US';u.rate=.88;u.pitch=1;
    u.onend=u.onerror=()=>clearTimeout(audioTimer);
    speechSynthesis.speak(u);
    audioTimer=setTimeout(()=>{try{speechSynthesis.cancel()}catch(e){}},20000);
  }catch(e){console.warn('audio unavailable',e)}
};
window.stopListening=function(){try{clearTimeout(audioTimer);speechSynthesis.cancel()}catch(e){}};

function lessonWorkspace(u){
  const vocab=u.vocab.map(([e,a])=>`<button class="word" onclick='speakText(${JSON.stringify(e)})'><b>${e} 🔊</b><span>${a}</span></button>`).join('');
  const choices=u.question.choices.map((c,i)=>`<button class="choice" onclick="answer(this,${i},${u.question.answer},'Grammar')">${c}</button>`).join('');
  return `<div class="lesson-head"><div><span class="eyebrow">${CURRICULUM[state.grade].title}</span><h2>${u.title}</h2><p>${u.theme}</p></div><button class="primary" onclick="completeLesson()">✓ إكمال الدرس</button></div>
  <div class="lesson-tabs"><button onclick="document.getElementById('summaryBlock').scrollIntoView()">الشرح</button><button onclick="document.getElementById('vocabBlock').scrollIntoView()">الكلمات</button><button onclick="document.getElementById('listenBlock').scrollIntoView()">الاستماع</button><button onclick="document.getElementById('practiceBlock').scrollIntoView()">التدريب</button></div>
  <section id="summaryBlock" class="audio-box"><h3>تحليل الدرس</h3><p><b>الموضوع:</b> ${u.theme}</p><p><b>القاعدة:</b> ${u.grammar}</p><p>ابدأ بالكلمات، ثم القاعدة، ثم الاستماع، وبعدها التدريب.</p></section>
  <section id="vocabBlock"><h3>الكلمات</h3><div class="word-grid">${vocab}</div></section>
  <section class="audio-box"><h3>القواعد</h3><p>${u.grammar}</p></section>
  <section id="listenBlock" class="audio-box"><h3>🎧 الاستماع</h3><div class="audio-controls"><button class="primary" onclick='speakText(${JSON.stringify(u.listen)})'>▶ تشغيل</button><button class="ghost" onclick="stopListening()">■ إيقاف</button><button class="ghost" onclick="const t=document.getElementById('transcript');t.hidden=!t.hidden">النص</button></div><p id="transcript" hidden dir="ltr">${u.listen}</p></section>
  <section class="audio-box"><h3>🎙️ النطق</h3><p dir="ltr"><b>${u.speak}</b></p><div class="audio-controls"><button class="ghost" onclick='speakText(${JSON.stringify(u.speak)})'>🔊 النموذج</button><button class="ghost" onclick='startRecognition(${JSON.stringify(u.speak)})'>🎙️ سجّل</button></div><p id="speechResult"></p></section>
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

window.addEventListener('pagehide',window.stopListening,{passive:true});
})();
