import { api, icon, toast } from './ui.mjs';
import { getLocale, translate as t } from './i18n.mjs';
import { escapeHTML as esc, money } from './core.mjs';

let panel, launcher, log, input, sendButton, micButton, voiceButton, status;
let listening=false, recognition, speaking=false, pending=false, readReplies=false;
let history=[], filters={}, propertyIds=[], lastReply='';
let serviceSession,servicePromise,player,playerURL,voiceController,recorder,recordStream,recordTimer,discardRecording=false,voiceEpoch=0,transcribing=false;
const audioCache=new Map();
const defaultStatus='المعلومات من قاعدة المكتب، ويؤكد المكتب التوفر قبل الحجز.';
async function ensureService(){
  if(serviceSession?.expiresAt>Date.now())return serviceSession;
  servicePromise??=api('/assistant/session',{method:'POST',data:{}}).then(value=>{
    serviceSession=value;
    panel.querySelector('.bot-mode').textContent=value.chatReady?'مساعد ذكي وصوت سحابي':'بحث من بيانات المكتب';
    panel.querySelector('.bot-voice-note').textContent=value.voiceReady?'صوت مولّد بالذكاء الاصطناعي. يبدأ التسجيل عند ضغط الميكروفون فقط.':'الصوت متاح حسب أصوات جهازك ومتصفحك.';
    return value;
  }).finally(()=>{servicePromise=null;});
  return servicePromise;
}
const languageCode=()=>({ar:'ar-KW',en:'en-US',ur:'ur-PK'}[getLocale()]);
const label=(key)=>t(key);
const dispatch=(name,detail={})=>document.dispatchEvent(new CustomEvent(name,{detail}));
function tell(message){status.textContent=message;}
function setListening(value){listening=value;micButton.classList.toggle('listening',value);micButton.setAttribute('aria-pressed',String(value));micButton.setAttribute('aria-label',label(value?'إيقاف الاستماع':'ابدأ التحدث'));if(value)tell('جارٍ الاستماع…');}
function stopVoice(){voiceEpoch++;voiceController?.abort();clearTimeout(recordTimer);discardRecording=true;if(recorder?.state==='recording')recorder.stop();recordStream?.getTracks().forEach(track=>track.stop());recordStream=null;if(recognition){recognition.onend=null;recognition.abort();}setListening(false);if('speechSynthesis' in window)speechSynthesis.cancel();if(player){player.pause();player.src='';player=null;}if(playerURL){URL.revokeObjectURL(playerURL);playerURL=null;}speaking=false;panel?.classList.remove('speaking');}
function message(role,text){const item=document.createElement('article');item.className='bot-message '+role;item.setAttribute('data-i18n-skip','');const speaker=document.createElement('small');speaker.textContent=label(role==='user'?'أنت':'المساعد');const paragraph=document.createElement('p');paragraph.textContent=text;item.append(speaker,paragraph);log.append(item);log.scrollTop=log.scrollHeight;return item;}
function greet(){message('assistant',label('مرحباً، أساعدك في البحث عن العقارات والمقارنة وترتيب المعاينة. ما المنطقة والميزانية المناسبتان لك؟'));}
function actionButton(key,action,id=''){return `<button type="button" class="bot-action" data-bot-action="${action}" ${id?`data-id="${esc(id)}"`:''}>${esc(label(key))}</button>`;}
function showResult(result){
  const reply=message('assistant',result.message);lastReply=result.message;
  const controls=document.createElement('div');controls.className='bot-reply-controls';controls.innerHTML=`<button type="button" class="icon-btn" data-bot-action="read" aria-label="${esc(label('قراءة الرد صوتياً'))}">${icon('volume')}</button>`;reply.append(controls);
  const read=controls.querySelector('button');read.addEventListener('click',()=>speak(result.message,{ticket:result.speechTicket}));
  if(result.speechSummary)read.setAttribute('aria-label',label('قراءة مختصرة للرد الطويل'));
  if(result.properties?.length){
    const list=document.createElement('div');list.className='bot-properties';
    for(const property of result.properties.slice(0,4)){
      const item=document.createElement('div');item.className='bot-property';
      const suffix={monthly:'شهرياً',unit_monthly:'للوحدة / شهرياً',exchange_difference:'فرق البدل',annual:'سنوياً',total:'سعر العقار'}[property.priceBasis]||'';
      item.innerHTML=`<strong>${esc(t(property.title))}</strong><span>${esc(t(property.location))}</span><b>${esc(t(money(property.priceFils)))} ${property.priceFils===null?'':esc(t(suffix))}</b>${actionButton('عرض تفاصيل العقار','property',property.id)}`;
      list.append(item);
    }reply.append(list);
  }
  const actions=document.createElement('div');actions.className='bot-actions';
  const offered=result.actions||['request','appointment','whatsapp'];
  actions.innerHTML=offered.map(action=>{
    const data={request:['سجّل طلبك العقاري','request'],appointment:['احجز موعداً','appointment'],whatsapp:['تواصل مع المكتب','whatsapp'],calculator:['حاسبة العمولة','calculator'],results:['عرض النتائج في البحث','results']};
    return data[action]?actionButton(...data[action]):'';
  }).join('');reply.append(actions);log.scrollTop=log.scrollHeight;
}
async function send(text,{voice=false}={}){
  text=String(text||'').trim();if(!text||pending)return;
  if(text.length>500){toast(label('السؤال حتى 500 حرف'),true);return;}
  stopVoice();
  pending=true;sendButton.disabled=true;input.value='';message('user',text);tell('أبحث في عروض المكتب…');
  const requestLocale=getLocale();
  try{
    const service=await ensureService().catch(()=>null);
    const result=await api('/assistant',{method:'POST',data:{message:text,locale:requestLocale,filters,propertyIds,history:history.slice(-6),token:service?.token}});
    if(getLocale()!==requestLocale)return;
    filters=result.filters||result.intent?.filters||{};propertyIds=(result.properties||[]).map(x=>x.id);
    history.push({role:'user',content:text},{role:'assistant',content:result.message});history=history.slice(-10);
    showResult(result);tell(result.fallback==='usage_limit'?'بلغ المساعد الحد اليومي؛ استخدمت البحث من بيانات المكتب.':result.fallback?'تعذر الاتصال بالمساعد الذكي؛ استخدمت البحث من بيانات المكتب.':defaultStatus);
    if((readReplies||voice)&&!panel.hidden)speak(result.message,{quiet:true,ticket:result.speechTicket}).catch(()=>{});
  }catch(error){message('assistant',t(error.message));tell('تعذر إكمال الطلب؛ حاول مجدداً.');}
  finally{pending=false;sendButton.disabled=false;}
}
async function speak(text,{quiet=false,ticket}={}){
  stopVoice();const epoch=voiceEpoch;
  if(ticket&&serviceSession?.voiceReady){
    try{
      voiceController=new AbortController();tell('أجهز الرد الصوتي…');
      if(!audioCache.has(ticket)){
        if(audioCache.size>=5)audioCache.delete(audioCache.keys().next().value);
        audioCache.set(ticket,api('/assistant/speech',{method:'POST',data:{token:serviceSession.token,ticket},binary:true,signal:AbortSignal.any([voiceController.signal,AbortSignal.timeout(65000)])}));
      }
      const blob=await audioCache.get(ticket);if(epoch!==voiceEpoch||panel.hidden)return;
      playerURL=URL.createObjectURL(blob);player=new Audio(playerURL);
      player.onplay=()=>{speaking=true;panel.classList.add('speaking');tell('جارٍ قراءة الرد…');};
      player.onended=()=>{speaking=false;panel.classList.remove('speaking');tell('اكتملت قراءة الرد.');if(playerURL){URL.revokeObjectURL(playerURL);playerURL=null;}};
      await player.play();return;
    }catch(error){audioCache.delete(ticket);if(epoch!==voiceEpoch||error.name==='AbortError')return;tell('تعذر تشغيل الصوت السحابي؛ يمكنك إعادة المحاولة أو قراءة النص.');return;}
  }
  await browserSpeak(text,{quiet});
}
async function browserSpeak(text,{quiet=false}={}){
  if(!('speechSynthesis' in window)){if(!quiet)tell('قراءة النص غير متاحة في هذا المتصفح.');return;}
  recognition?.abort();setListening(false);speechSynthesis.cancel();
  let voices=speechSynthesis.getVoices();
  if(!voices.length){await new Promise(resolve=>{let ended=false;const finish=()=>{if(ended)return;ended=true;speechSynthesis.removeEventListener('voiceschanged',finish);resolve();};speechSynthesis.addEventListener('voiceschanged',finish);setTimeout(finish,900);});voices=speechSynthesis.getVoices();}
  const locale=getLocale(),code=languageCode();
  const voice=voices.find(v=>v.lang.toLowerCase()===code.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(locale));
  if(!voice){tell('لا يوجد صوت لهذه اللغة على جهازك.');return;}
  const utterance=new SpeechSynthesisUtterance(String(text).replace(/https?:\/\/\S+/g,''));utterance.lang=code;utterance.voice=voice;utterance.rate=locale==='ur'?0.92:0.96;
  utterance.onstart=()=>{speaking=true;panel.classList.add('speaking');};
  const ended=()=>{speaking=false;panel.classList.remove('speaking');};utterance.onend=ended;utterance.onerror=ended;
  speechSynthesis.speak(utterance);
}
async function listen(){
  if(listening){if(recorder?.state==='recording')recorder.stop();else recognition?.stop();return;}
  if(pending||transcribing)return;
  const service=await ensureService().catch(()=>null);
  if(service?.voiceReady&&navigator.mediaDevices?.getUserMedia&&window.MediaRecorder){
    stopVoice();discardRecording=false;const epoch=voiceEpoch,locale=getLocale();
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      if(epoch!==voiceEpoch||panel.hidden){stream.getTracks().forEach(track=>track.stop());return;}
      recordStream=stream;
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
      recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});const chunks=[];let size=0;
      recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);size+=event.data.size;if(size>1200000){discardRecording=true;recorder.stop();tell('التسجيل طويل؛ حاول بسؤال أقصر.');}}};
      recorder.onstop=async()=>{
        clearTimeout(recordTimer);stream.getTracks().forEach(track=>track.stop());recordStream=null;setListening(false);
        if(discardRecording||epoch!==voiceEpoch||panel.hidden)return;
        transcribing=true;sendButton.disabled=true;micButton.disabled=true;tell('أحوّل سؤالك الصوتي إلى نص…');
        try{
          const blob=new Blob(chunks,{type:recorder.mimeType});const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
          voiceController=new AbortController();
          const out=await api('/assistant/transcribe',{method:'POST',data:{token:service.token,locale,mime:blob.type,content:btoa(binary)},signal:AbortSignal.any([voiceController.signal,AbortSignal.timeout(50000)])});
          if(epoch!==voiceEpoch||getLocale()!==locale||panel.hidden)return;
          input.value=out.text;transcribing=false;await send(out.text,{voice:true});
        }catch(error){if(error.name!=='AbortError'&&epoch===voiceEpoch)tell(t(error.message));}
        finally{transcribing=false;sendButton.disabled=pending;micButton.disabled=false;}
      };
      recorder.start();setListening(true);recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},45000);
    }catch(error){setListening(false);tell(error.name==='NotAllowedError'?'لم يسمح المتصفح باستخدام الميكروفون.':'الميكروفون غير متاح؛ يمكنك كتابة سؤالك.');}
    return;
  }
  browserListen();
}
function browserListen(){
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){tell('ميزة التحدث غير متاحة في هذا المتصفح. يمكنك الكتابة.');return;}
  if('speechSynthesis' in window)speechSynthesis.cancel();speaking=false;
  recognition=new Speech();recognition.lang=languageCode();recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
  let finalText='',failed=false;
  recognition.onstart=()=>setListening(true);
  recognition.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const value=event.results[i][0]?.transcript||'';if(event.results[i].isFinal)finalText+=value;else interim+=value;}input.value=(finalText||interim).trim();};
  recognition.onerror=event=>{failed=true;setListening(false);if(event.error==='aborted')return;tell(event.error==='not-allowed'||event.error==='service-not-allowed'?'لم يسمح المتصفح باستخدام الميكروفون.':event.error==='no-speech'?'لم أسمع كلاماً واضحاً. حاول مرة أخرى.':'تعذر الاتصال بخدمة التعرف الصوتي. يمكنك الكتابة.');};
  recognition.onend=()=>{setListening(false);if(finalText.trim()&&!failed)send(finalText,{voice:true});else if(!failed)tell('لم أسمع كلاماً واضحاً. حاول مرة أخرى.');};
  try{recognition.start();}catch{tell('تعذر الاتصال بخدمة التعرف الصوتي. يمكنك الكتابة.');}
}
function close(){stopVoice();panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();}
export function openOfficeAssistant(initialMessage='',ids=[]){
  initOfficeAssistant();panel.hidden=false;launcher.setAttribute('aria-expanded','true');if(ids.length)propertyIds=ids;input.focus();ensureService().catch(()=>{});if(initialMessage)send(initialMessage);
}
export function initOfficeAssistant(){
  if(panel)return;
  launcher=document.createElement('button');launcher.type='button';launcher.className='assistant-fab';launcher.id='office-assistant-launcher';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-label','مساعد المكتب');launcher.innerHTML=icon('spark')+'<span>اسأل المساعد</span>';launcher.onclick=()=>panel.hidden?openOfficeAssistant():close();
  panel=document.createElement('section');panel.id='office-assistant-panel';panel.className='assistant-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','office-assistant-title');
  panel.innerHTML=`<header class="bot-header"><div><strong id="office-assistant-title">مساعد المكتب</strong><small class="bot-mode">ابحث واستفسر بالكتابة أو الصوت</small></div><button type="button" class="icon-btn" data-bot-action="close" aria-label="إغلاق المساعد">${icon('close')}</button></header><div class="bot-options"><button type="button" class="bot-action" data-bot-action="new">محادثة جديدة</button><button type="button" class="bot-action" data-bot-action="auto-voice" aria-pressed="false">${icon('volume')} <span>شغّل الرد الصوتي</span></button><button type="button" class="icon-btn" data-bot-action="stop-voice" aria-label="إيقاف الصوت">${icon('stop')}</button></div><div class="bot-log" role="log" aria-live="polite" aria-label="المحادثة" data-i18n-skip></div><p class="bot-status" role="status">المعلومات من قاعدة المكتب، ويؤكد المكتب التوفر قبل الحجز.</p><form class="bot-form"><label class="sr-only" for="office-bot-input">أرسل رسالة للمساعد</label><input id="office-bot-input" name="message" required maxlength="500" placeholder="اكتب سؤالك عن العقارات أو المواعيد…" autocomplete="off"><button type="button" class="icon-btn bot-mic" aria-label="ابدأ التحدث" aria-pressed="false">${icon('mic')}</button><button type="submit" class="btn primary small">إرسال</button></form><p class="bot-voice-note">الصوت متاح حسب أصوات جهازك ومتصفحك.</p>`;
  document.body.append(launcher,panel);log=panel.querySelector('.bot-log');input=panel.querySelector('input');sendButton=panel.querySelector('[type=submit]');micButton=panel.querySelector('.bot-mic');status=panel.querySelector('.bot-status');voiceButton=panel.querySelector('[data-bot-action=auto-voice]');
  panel.querySelector('form').onsubmit=event=>{event.preventDefault();send(input.value);};micButton.onclick=listen;
  panel.addEventListener('click',event=>{const button=event.target.closest('[data-bot-action]');if(!button)return;const action=button.dataset.botAction;
    if(action==='close')close();
    else if(action==='new'){stopVoice();history=[];filters={};propertyIds=[];lastReply='';audioCache.clear();log.replaceChildren();greet();tell('المعلومات من قاعدة المكتب، ويؤكد المكتب التوفر قبل الحجز.');}
    else if(action==='auto-voice'){readReplies=!readReplies;voiceButton.setAttribute('aria-pressed',String(readReplies));voiceButton.querySelector('span').textContent=readReplies?'أوقف الرد الصوتي':'شغّل الرد الصوتي';if(!readReplies)stopVoice();}
    else if(action==='stop-voice')stopVoice();
    else if(action==='property'){propertyIds=[button.dataset.id,...propertyIds.filter(id=>id!==button.dataset.id)];dispatch('aqari:property-details',{id:button.dataset.id});}
    else if(action==='request')dispatch('aqari:request',{id:propertyIds[0]||''});
    else if(action==='appointment')dispatch('aqari:appointment',{id:propertyIds[0]||''});
    else if(action==='calculator')dispatch('aqari:navigate',{view:'calculator'});
    else if(action==='results'){dispatch('aqari:assistant-filter',{filters});close();}
    else if(action==='whatsapp')dispatch('aqari:office-whatsapp');
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close();});
  log.setAttribute('aria-label',label('المحادثة'));
  document.addEventListener('aqari:locale',()=>{stopVoice();log.setAttribute('aria-label',label('المحادثة'));tell('المعلومات من قاعدة المكتب، ويؤكد المكتب التوفر قبل الحجز.');log.replaceChildren();greet();});
  greet();
}
