/* Static Arabic recordings; playback never needs installed speech voices. */
(function(root){'use strict';
 function create(audio,options={}){
  const report=options.onState||(()=>{}),beforePlay=options.beforePlay||(()=>{});
  let queue=[],index=0,token=0,pendingSeek=false,finished=false,destroyed=false,loading=false;
  const listeners={};
  const current=()=>queue[index];
  const state=(name,message)=>{if(!destroyed)report({state:name,message,track:current(),index,total:queue.length});};
  function seek(){const t=current();if(!t||!pendingSeek||audio.readyState<1)return;try{audio.currentTime=t.start||0;pendingSeek=false;}catch{/* Retry when the metadata event arrives. */}}
  function select(){const t=current();if(!t)return;audio.pause();finished=false;pendingSeek=true;loading=true;const same=audio.getAttribute('src')===t.src;if(!same)audio.src=t.src;seek();state('ready',t.title);}
  function play(){
   if(!current()||destroyed)return Promise.resolve(false);
   if(finished){index=0;select();}beforePlay();seek();const run=token;loading=true;state('loading','جارٍ تحميل التسجيل…');
   try{return Promise.resolve(audio.play()).then(()=>run===token&&!destroyed).catch(error=>{if(run===token){loading=false;state('error',error.name==='NotAllowedError'?'اضغط زر التشغيل في مشغّل الصوت أدناه.':'تعذّر تحميل التسجيل. أعد المحاولة أو افتح الملف الصوتي مباشرة.');}return false;});}
   catch{loading=false;state('error','تعذّر تشغيل التسجيل في هذا المتصفح. افتح الملف الصوتي مباشرة.');return Promise.resolve(false);}
  }
  function next(){if(destroyed||finished)return;if(index+1<queue.length){index++;select();void play();}else{finished=true;loading=false;audio.pause();state('ended','انتهى الاستماع.');}}
  function stop(){token++;loading=false;finished=false;audio.pause();if(current()){pendingSeek=true;seek();}state('idle','تم إيقاف الصوت.');}
  function setQueue(items){stop();queue=items.filter(t=>t&&typeof t.src==='string'&&Number.isFinite(t.start||0)&&Number.isFinite(t.end)&&t.end>(t.start||0));index=0;if(queue.length)select();else{audio.removeAttribute('src');state('idle','لا يوجد تسجيل لهذا المقطع.');}}
  listeners.loadedmetadata=seek;
  listeners.play=()=>{beforePlay();if(finished){index=0;select();void play();return;}seek();};
  listeners.playing=()=>{loading=false;state('playing','جارٍ الاستماع: '+current()?.title);};
  listeners.waiting=()=>{if(!audio.paused){loading=true;state('loading','جارٍ تحميل التسجيل…');}};
  listeners.pause=()=>{if(!finished&&!destroyed){loading=false;state('paused','الاستماع متوقف مؤقتًا.');}};
  listeners.timeupdate=()=>{const t=current();if(t&&!audio.paused&&!pendingSeek&&!loading&&!finished&&audio.currentTime>=t.end)next();};
  listeners.ended=next;
  listeners.error=()=>{loading=false;state('error','تعذّر تحميل التسجيل. أعد المحاولة أو افتح الملف الصوتي مباشرة.');};
  for(const [name,fn] of Object.entries(listeners))audio.addEventListener(name,fn);
  function destroy(){token++;destroyed=true;for(const [name,fn] of Object.entries(listeners))audio.removeEventListener(name,fn);audio.pause();audio.removeAttribute('src');audio.load();queue=[];}
  return {setQueue,play,stop,destroy};
 }
 root.ETFRecordedAudio={create};if(typeof module!=='undefined')module.exports=root.ETFRecordedAudio;
})(typeof window!=='undefined'?window:globalThis);
