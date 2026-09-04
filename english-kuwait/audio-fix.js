(()=>{
  const synth=window.speechSynthesis;
  const state={utterance:null,heartbeat:null,timeout:null};
  const clear=()=>{
    if(state.heartbeat){clearInterval(state.heartbeat);state.heartbeat=null}
    if(state.timeout){clearTimeout(state.timeout);state.timeout=null}
    state.utterance=null;
  };
  const stop=()=>{
    try{ if(synth) synth.cancel(); }catch(e){}
    clear();
  };
  const pickVoice=()=>{
    if(!synth)return null;
    const voices=synth.getVoices? synth.getVoices():[];
    return voices.find(v=>/^en-(US|GB)/i.test(v.lang)) || voices.find(v=>/^en/i.test(v.lang)) || null;
  };
  window.speakText=(text)=>{
    if(!text)return;
    if(!synth || !window.SpeechSynthesisUtterance){alert('ميزة الاستماع غير مدعومة في هذا المتصفح');return;}
    stop();
    const u=new SpeechSynthesisUtterance(String(text));
    u.lang='en-US'; u.rate=.86; u.pitch=1; u.volume=1;
    const voice=pickVoice(); if(voice)u.voice=voice;
    u.onend=clear;
    u.onerror=()=>{ clear(); alert('تعذر تشغيل الصوت. حاول مرة أخرى أو ارفع مستوى صوت الجهاز.'); };
    state.utterance=u;
    try{
      synth.speak(u);
      state.heartbeat=setInterval(()=>{
        try{ if(synth.paused) synth.resume(); }catch(e){}
      },700);
      const maxMs=Math.min(30000,Math.max(8000,String(text).length*95));
      state.timeout=setTimeout(()=>{ stop(); },maxMs);
    }catch(e){
      clear();
      alert('تعذر بدء الاستماع على هذا الجهاز.');
    }
  };
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) stop(); });
  window.addEventListener('pagehide',stop);
  window.addEventListener('beforeunload',stop);
  if(synth && typeof synth.getVoices==='function'){
    try{synth.getVoices();}catch(e){}
  }
})();
