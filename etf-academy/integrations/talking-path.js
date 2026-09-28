/* Adapted from Q8-ux/saad talking-path (21ecb3ce), browser mode only. */
(function(g){'use strict';
 function create(opts={}){
  const onState=opts.onState||(()=>{}),lang=opts.language||'ar-KW';let rec=null,active=false,run=0,current=null,pending=null,finishSpeech=null;
  function status(state,message=''){onState({state,message});}
  function stop(){run++;if(rec){const r=rec;rec=null;r.onend=null;r.onresult=null;r.onerror=null;try{r.abort();}catch{}}if(pending){pending.reject(new Error('cancelled'));pending=null;}if(current){current.onstart=null;current.onend=null;current.onerror=null;if(g.speechSynthesis)g.speechSynthesis.cancel();}current=null;if(finishSpeech){finishSpeech(false);finishSpeech=null;}active=false;status('idle','تم الإيقاف.');}
  function support(){const synth=g.speechSynthesis;return {speak:!!(synth&&g.SpeechSynthesisUtterance),arabic:!!synth?.getVoices().some(v=>/^ar(?:-|$)/i.test(v.lang)),listen:!!(g.SpeechRecognition||g.webkitSpeechRecognition)};}
  function speak(text){
   stop();const synth=g.speechSynthesis;if(!synth||!g.SpeechSynthesisUtterance){status('error','القراءة الصوتية غير مدعومة في هذا المتصفح.');return Promise.resolve(false);}
   const voice=synth.getVoices().find(v=>/^ar(?:-|$)/i.test(v.lang));if(!voice){status('error','لا يتوفر صوت عربي على هذا المتصفح حاليًا. يمكنك متابعة النص أو تجربة جهاز يدعم صوتًا عربيًا.');return Promise.resolve(false);}
   const clean=String(text).replace(/\s+/g,' ').trim(),chunks=[];let remaining=clean;while(remaining){let end=Math.min(180,remaining.length);if(end<remaining.length){const space=remaining.lastIndexOf(' ',end);if(space>0)end=space;}chunks.push(remaining.slice(0,end));remaining=remaining.slice(end).trimStart();}if(!chunks.length)return Promise.resolve(false);const token=run;let index=0;
   return new Promise(resolve=>{finishSpeech=resolve;function finish(ok,message,state='idle'){if(token!==run){resolve(false);return;}current=null;active=false;finishSpeech=null;status(state,message);resolve(ok);}function next(){if(token!==run){resolve(false);return;}if(index>=chunks.length){finish(true,'انتهت القراءة.');return;}const u=new g.SpeechSynthesisUtterance(chunks[index++]);current=u;u.lang=voice.lang||lang;u.voice=voice;u.rate=.93;u.onstart=()=>{if(token===run){active=true;status('speaking','جارٍ قراءة النص…');}};u.onend=next;u.onerror=()=>finish(false,'تعذر إكمال القراءة الصوتية على هذا الجهاز.','error');try{active=true;status('speaking','جارٍ تجهيز القراءة…');synth.speak(u);}catch{finish(false,'تعذر تشغيل القراءة الصوتية على هذا الجهاز.','error');}}next();});
  }
  function listen(){
   stop();const SR=g.SpeechRecognition||g.webkitSpeechRecognition;if(!SR){status('error','الإملاء الصوتي غير مدعوم هنا. اكتب سؤالك بدلًا منه.');return Promise.resolve(null);}
   const token=run;return new Promise((resolve,reject)=>{pending={reject};rec=new SR();rec.lang=lang;rec.interimResults=false;rec.continuous=false;let heard=false,failed=false;rec.onstart=()=>{active=true;status('listening','الميكروفون يعمل. قل سؤالًا قصيرًا.');};rec.onresult=e=>{if(token!==run)return;heard=true;const text=e.results?.[0]?.[0]?.transcript||'';pending=null;resolve(text);};rec.onerror=e=>{if(token!==run)return;failed=true;pending=null;active=false;status('error',e.error==='not-allowed'?'لم يُسمح بالميكروفون. يمكنك كتابة السؤال.':'تعذّر سماع السؤال. جرّب الكتابة.');reject(new Error(e.error));};rec.onend=()=>{if(token!==run)return;rec=null;active=false;if(failed)return;if(!heard&&pending){pending=null;resolve(null);}status('idle',heard?'راجع النص ثم اضغط ابحث.':'انتهى الاستماع. يمكنك كتابة السؤال.');};try{active=true;status('listening','بانتظار الميكروفون… يمكنك الإيقاف في أي وقت.');rec.start();}catch(e){pending=null;rec=null;active=false;status('error','تعذّر تشغيل الميكروفون.');reject(e);}});
  }
  return {speak,listen,stop,support,isActive:()=>active};
 }
 g.TalkingPath={create};
})(typeof window!=='undefined'?window:globalThis);
