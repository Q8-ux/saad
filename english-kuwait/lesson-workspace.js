(function(){
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function currentUnit(){try{return state&&state.unit&&state.grade?CURRICULUM[state.grade].units.find(x=>x.id===state.unit):null}catch(e){return null}}
  function makeWorksheet(u){return `
    <div class="worksheet-card">
      <h3>📝 ورقة عمل الدرس</h3>
      <ol>
        <li>اكتب معنى ثلاث كلمات: ${u.vocab.slice(0,3).map(v=>`<b>${esc(v[0])}</b>`).join('، ')}</li>
        <li>اكتب جملتين باستخدام القاعدة: <b>${esc(u.grammar)}</b></li>
        <li>استمع للمقطع ثم أجب: <b>${esc(u.question.q)}</b></li>
      </ol>
      <details><summary>نموذج الإجابة</summary><p>إجابة الاستماع: <b>${esc(u.question.choices[u.question.answer])}</b></p><p>الكتابة: تُقبل أي جملة صحيحة نحويًا ومناسبة لموضوع الدرس.</p></details>
      <button class="ghost" onclick="window.print()">طباعة ورقة العمل</button>
    </div>`;
  }
  function lessonAnalysis(u){
    const vocab=u.vocab.map(v=>v[0]);
    return `
      <div class="analysis-grid">
        <div><span>موضوع الدرس</span><b>${esc(u.theme)}</b></div>
        <div><span>المفردات الأساسية</span><b>${vocab.slice(0,4).map(esc).join(' • ')}</b></div>
        <div><span>النقطة النحوية</span><b>${esc(u.grammar)}</b></div>
        <div><span>مهارة الاستماع</span><b>فهم الفكرة الرئيسة والتفاصيل</b></div>
      </div>`;
  }
  function renderWorkspace(tab='overview'){
    const u=currentUnit(); if(!u) return;
    const panel=document.querySelector('#lessonPanel'); if(!panel) return;
    const tabs=[['overview','تحليل الدرس'],['vocab','الكلمات'],['grammar','القواعد'],['listening','الاستماع'],['speaking','النطق'],['quiz','التدريب'],['worksheet','ورقة العمل']];
    panel.classList.add('lesson-workspace');
    panel.innerHTML=`
      <section class="workspace-head">
        <div><span class="eyebrow">${esc(CURRICULUM[state.grade].title)} • الفصل ${esc(state.semester)}</span><h2>${esc(u.title)}</h2><p>${esc(u.theme)}</p></div>
        <div class="workspace-actions"><button class="primary" onclick="completeLesson()">✓ إكمال الدرس</button></div>
      </section>
      ${lessonAnalysis(u)}
      <nav class="workspace-tabs">${tabs.map(([k,n])=>`<button class="${tab===k?'active':''}" onclick="window.renderLessonWorkspace('${k}')">${n}</button>`).join('')}</nav>
      <section id="workspaceContent" class="workspace-content"></section>`;
    const c=document.querySelector('#workspaceContent');
    if(tab==='overview') c.innerHTML=`<div class="lesson-card"><h3>🎯 هدف الدرس</h3><p>يفهم الطالب موضوع <b>${esc(u.theme)}</b> ويستخدم المفردات والقاعدة في مواقف مناسبة.</p><h3>🧭 مسار الدراسة</h3><p>1) اقرأ الكلمات واستمع لها. 2) افهم القاعدة. 3) شغّل الاستماع مرتين. 4) أجب على السؤال. 5) تدرب على النطق. 6) حل ورقة العمل.</p></div>`;
    if(tab==='vocab') c.innerHTML=`<div class="word-grid">${u.vocab.map(([e,a])=>`<button class="word" onclick='speakText(${JSON.stringify(e)})'><b>${esc(e)} 🔊</b><span>${esc(a)}</span></button>`).join('')}</div>`;
    if(tab==='grammar') c.innerHTML=`<div class="lesson-card"><h3>📘 القاعدة</h3><p>${esc(u.grammar)}</p><p>كوّن 3 جمل من حياتك مستخدماً نفس النمط، ثم اقرأها بصوت عالٍ.</p></div>`;
    if(tab==='listening') c.innerHTML=`<div class="audio-box"><h3>🎧 تشغيل الاستماع</h3><p>استمع أولاً دون قراءة النص، ثم أعد التشغيل.</p><div class="audio-controls"><button class="primary" onclick='speakText(${JSON.stringify(u.listen)})'>▶ تشغيل</button><button class="ghost" onclick="try{speechSynthesis.cancel()}catch(e){}">■ إيقاف</button><button class="ghost" onclick="document.querySelector('#workspaceTranscript').classList.toggle('hidden')">إظهار / إخفاء النص</button></div><p id="workspaceTranscript" class="hidden" dir="ltr">${esc(u.listen)}</p></div>${typeof quizHTML==='function'?quizHTML(u,'Listening'):''}`;
    if(tab==='speaking') c.innerHTML=`<div class="audio-box"><h3>🎙️ تدريب النطق</h3><p dir="ltr"><b>${esc(u.speak)}</b></p><div class="audio-controls"><button class="primary" onclick='speakText(${JSON.stringify(u.speak)})'>🔊 استمع للنموذج</button><button class="ghost" onclick='startRecognition(${JSON.stringify(u.speak)})'>🎙️ سجل نطقك</button></div><p id="speechResult" aria-live="polite">سيظهر تقييم التقارب هنا.</p></div>`;
    if(tab==='quiz') c.innerHTML=(typeof quizHTML==='function'?quizHTML(u,'Grammar'):'')+`<div class="lesson-card"><h3>✍️ تدريب كتابي</h3><textarea id="writing" class="writing-box" placeholder="Write your sentence here..."></textarea><button class="ghost" onclick="reviewWriting()">مراجعة سريعة</button><p id="writingFeedback"></p></div>`;
    if(tab==='worksheet') c.innerHTML=makeWorksheet(u);
  }
  window.renderLessonWorkspace=renderWorkspace;
  const originalOpen=window.openUnit;
  window.openUnit=function(uid){
    if(typeof originalOpen==='function') originalOpen(uid);
    setTimeout(()=>{renderWorkspace('overview'); const shell=document.querySelector('.learning-shell'); if(shell) shell.scrollIntoView({behavior:'smooth',block:'start'});},0);
  };
  window.renderLesson=function(tab){renderWorkspace(tab)};
})();
