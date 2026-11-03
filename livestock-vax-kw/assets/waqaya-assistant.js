/* Waqaya smart assistant + voice route */
(() => {
  const state = { voice: true, open: false };
  const storeKey = "waqaya.design.requests";

  function readJson(key, fallback=[]){
    try { const v=JSON.parse(localStorage.getItem(key)||"null"); return v ?? fallback; } catch { return fallback; }
  }
  function writeJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function say(text){
    if(!state.voice || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-KW";
    u.rate = 0.95;
    speechSynthesis.speak(u);
  }
  function navTo(label){
    const btns=[...document.querySelectorAll("button")];
    const b=btns.find(x=>x.textContent.trim().includes(label));
    if(b){ b.click(); return true; }
    return false;
  }
  function createDesignBrief(text){
    const req={id:"DES-"+Date.now(),createdAt:new Date().toISOString(),source:"assistant",brief:text,route:"canva",preProcess:"compositor",status:"queued"};
    const list=readJson(storeKey,[]);
    list.unshift(req); writeJson(storeKey,list.slice(0,100));
    return req;
  }
  function localAnswer(q){
    const t=q.trim();
    if(!t) return "اكتب سؤالك أو اضغط الميكروفون.";
    if(/مواعيد|موعد/.test(t)){ navTo("نظرة"); return "فتحت لك نظرة المواعيد الحالية."; }
    if(/طلب|طلبات/.test(t)){ navTo("طلبات"); return "فتحت قسم طلبات التحصين."; }
    if(/قطيع|قطعان|مربي/.test(t)){ navTo("القطعان"); return "فتحت قسم القطعان والمربين."; }
    if(/فريق|الفرق/.test(t)){ navTo("الفرق"); return "فتحت قسم الفرق الميدانية."; }
    if(/تحصين|جرعة|سجل/.test(t)){ navTo("سجل"); return "فتحت سجل التحصينات والجرعات."; }
    if(/تقرير|تقارير|مؤشر/.test(t)){ navTo("التقارير"); return "فتحت التقارير والمؤشرات."; }
    if(/صمم|تصميم|بوستر|منشور|ستوري/.test(t)){
      const r=createDesignBrief(t);
      return "تم تجهيز طلب تصميم رقم "+r.id+" لمسار كانفا، مع معالجة الصور أولاً عبر مسار Compositor.";
    }
    if(/صورة|عدل الصورة|حسن الصورة|قص|خلفية/.test(t)){
      return "تم التعرف على طلب معالجة صورة. مسار Compositor مهيأ لاستقبال الصورة ثم تمرير الناتج لمسار التصميم.";
    }
    if(/كم.*طلب/.test(t)){
      const x=readJson("waqaya.requests",[]);
      return "عدد الطلبات المحفوظة محلياً في هذه النسخة هو "+x.length+".";
    }
    if(/كم.*تحصين|كم.*جرعة/.test(t)){
      const x=readJson("waqaya.vaccinations",[]);
      return "عدد سجلات التحصين المحفوظة محلياً في هذه النسخة هو "+x.length+".";
    }
    return "أستطيع مساعدتك في المواعيد، الطلبات، القطعان، الفرق، التحصينات، التقارير، أو تجهيز طلب تصميم وصوت. الذكاء الكامل يحتاج ربط الـ Backend المعتمد.";
  }
  function addMsg(role,text){
    const box=document.querySelector(".wq-assistant-messages");
    if(!box) return;
    const d=document.createElement("div");
    d.className="wq-msg "+role; d.textContent=text; box.appendChild(d);
    box.scrollTop=box.scrollHeight;
  }
  function handle(text){
    addMsg("user",text);
    const ans=localAnswer(text);
    setTimeout(()=>{ addMsg("assistant",ans); say(ans); },120);
  }
  function startVoice(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ const m="التعرف الصوتي غير مدعوم في هذا المتصفح."; addMsg("assistant",m); say(m); return; }
    const r=new SR(); r.lang="ar-KW"; r.interimResults=false; r.maxAlternatives=1;
    const mic=document.querySelector(".wq-mic");
    if(mic) mic.classList.add("listening");
    r.onresult=e=>{ const text=e.results[0][0].transcript; const input=document.querySelector(".wq-assistant-input"); if(input) input.value=text; handle(text); };
    r.onerror=()=>addMsg("assistant","تعذر التقاط الصوت. حاول مرة أخرى.");
    r.onend=()=>{ if(mic) mic.classList.remove("listening"); };
    r.start();
  }
  function mount(){
    let launcher=document.querySelector(".wq-assistant-launcher");
    if(!launcher){
      launcher=document.createElement("button");
      launcher.className="wq-assistant-launcher";
      launcher.innerHTML='<span>🎙</span><b>مساعد وقاية</b>';
      document.body.appendChild(launcher);
    }

    let panel=document.querySelector(".wq-assistant-panel");
    if(!panel){
      panel=document.createElement("section");
      panel.className="wq-assistant-panel";
      panel.innerHTML=`
        <header><div><strong>مساعد وقاية</strong><small>نص + صوت + تصميم</small></div><button class="wq-close" aria-label="إغلاق">×</button></header>
        <div class="wq-assistant-messages"><div class="wq-msg assistant">مرحباً. اسألني عن المواعيد والطلبات والقطعان والفرق والتحصينات، أو اطلب تصميماً.</div></div>
        <div class="wq-quick">
          <button data-q="افتح المواعيد">المواعيد</button>
          <button data-q="افتح الطلبات">الطلبات</button>
          <button data-q="صمم بوستر توعوي عن التحصين">تصميم</button>
        </div>
        <div class="wq-input-row">
          <button class="wq-mic" aria-label="تحدث">🎤</button>
          <input class="wq-assistant-input" placeholder="اكتب أو تحدث..." />
          <button class="wq-send">إرسال</button>
        </div>`;
      document.body.appendChild(panel);
    }

    launcher.onclick=()=>panel.classList.add("open");
    panel.querySelector(".wq-close").onclick=()=>panel.classList.remove("open");
    panel.querySelector(".wq-send").onclick=()=>{ const i=panel.querySelector(".wq-assistant-input"); if(i.value.trim()){ handle(i.value); i.value=""; } };
    panel.querySelector(".wq-assistant-input").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); panel.querySelector(".wq-send").click(); } });
    panel.querySelector(".wq-mic").onclick=startVoice;
    panel.querySelectorAll(".wq-quick button").forEach(b=>b.onclick=()=>handle(b.dataset.q));
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount); else mount();
  window.WaqayaAssistant={handle,startVoice,createDesignBrief,mount};
})();