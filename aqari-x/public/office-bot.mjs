import { api, icon, toast } from './ui.mjs';
import { getLocale, translate as t } from './i18n.mjs';
import { escapeHTML as esc, money } from './core.mjs';

let panel, launcher, log, input, sendButton, micButton, voiceButton, status;
let listening=false, recognition, speaking=false, pending=false, readReplies=false;
let history=[], filters={}, propertyIds=[], lastReply='';
const languageCode=()=>({ar:'ar-KW',en:'en-US',ur:'ur-PK'}[getLocale()]);
const label=(key)=>t(key);
const dispatch=(name,detail={})=>document.dispatchEvent(new CustomEvent(name,{detail}));
function tell(message){status.textContent=message;}
function setListening(value){listening=value;micButton.classList.toggle('listening',value);micButton.setAttribute('aria-pressed',String(value));micButton.setAttribute('aria-label',label(value?'إيقاف الاستماع':'ابدأ التحدث'));if(value)tell('جارٍ الاستماع…');}
function stopVoice(){if(recognition){recognition.onend=null;recognition.abort();}setListening(false);if('speechSynthesis' in window)speechSynthesis.cancel();speaking=false;panel?.classList.remove('speaking');}
function message(role,text){const item=document.createElement('article');item.className='bot-message '+role;item.setAttribute('data-i18n-skip','');const speaker=document.createElement('small');speaker.textContent=label(role==='user'?'أنت':'المساعد');const paragraph=document.createElement('p');paragraph.textContent=text;item.append(speaker,paragraph);log.append(item);log.scrollTop=log.scrollHeight;return item;}
function greet(){message('assistant',label('مرحباً، أساعدك في البحث عن العقارات والمقارنة وترتيب المعاينة. ما المنطقة والميزانية المناسبتان لك؟'));}
function actionButton(key,action,id=''){return `<button type="button" class="bot-action" data-bot-action="${action}" ${id?`data-id="${esc(id)}"`:''}>${esc(label(key))}</button>`;}
function showResult(result){
  const reply=message('assistant',result.message);lastReply=result.message;
  const controls=document.createElement('div');controls.className='bot-reply-controls';controls.innerHTML=`<button type="button" class="icon-btn" data-bot-action="read" aria-label="${esc(label('قراءة الرد صوتياً'))}">${icon('volume')}</button>`;reply.append(controls);
  const read=controls.querySelector('button');read.addEventListener('click',()=>speak(result.message));
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
  if(speaking&&'speechSynthesis' in window)speechSynthesis.cancel();
  pending=true;sendButton.disabled=true;input.value='';message('user',text);tell('أبحث في عروض المكتب…');
  const requestLocale=getLocale();
  try{
    const result=await api('/assistant',{method:'POST',data:{message:text,locale:requestLocale,filters,propertyIds}});
    if(getLocale()!==requestLocale)return;
    filters=result.filters||result.intent?.filters||{};propertyIds=(result.properties||[]).map(x=>x.id);
    history.push({role:'user',content:text},{role:'assistant',content:result.message});history=history.slice(-10);
    showResult(result);tell('المعلومات من قاعدة المكتب، ويؤكد المكتب التوفر قبل الحجز.');
    if(readReplies||voice)await speak(result.message,{quiet:true});
  }catch(error){message('assistant',t(error.message));tell('تعذر إكمال الطلب؛ حاول مجدداً.');}
  finally{pending=false;sendButton.disabled=false;}
}
async function speak(text,{quiet=false}={}){
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
function listen(){
  if(listening){recognition?.stop();return;}
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
  initOfficeAssistant();panel.hidden=false;launcher.setAttribute('aria-expanded','true');if(ids.length)propertyIds=ids;input.focus();if(initialMessage)send(initialMessage);
}
export function initOfficeAssistant(){
  if(panel)return;
  launcher=document.createElement('button');launcher.type='button';launcher.className='assistant-fab';launcher.id='office-assistant-launcher';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-label','مساعد المكتب');launcher.innerHTML=icon('spark')+'<span>اسأل المساعد</span>';launcher.onclick=()=>panel.hidden?openOfficeAssistant():close();
  panel=document.createElement('section');panel.id='office-assistant-panel';panel.className='assistant-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','office-assistant-title');
  panel.innerHTML=`<header class="bot-header"><div><strong id="office-assistant-title">مساعد المكتب</strong><small>ابحث واستفسر بالكتابة أو الصوت</small></div><button type="button" class="icon-btn" data-bot-action="close" aria-label="إغلاق المساعد">${icon('close')}</button></header><div class="bot-options"><button type="button" class="bot-action" data-bot-action="new">محادثة جديدة</button><button type="button" class="bot-action" data-bot-action="auto-voice" aria-pressed="false">${icon('volume')} <span>شغّل الرد الصوتي</span></button><button type="button" class="icon-btn" data-bot-action="stop-voice" aria-label="إيقاف الصوت">${icon('stop')}</button></div><div class="bot-log" role="log" aria-live="polite" aria-label="المحادثة" data-i18n-skip></div><p class="bot-status" role="status">المعلومات من قاعدة المكتب، ويؤكد المكتب التوفر قبل الحجز.</p><form class="bot-form"><label class="sr-only" for="office-bot-input">أرسل رسالة للمساعد</label><input id="office-bot-input" name="message" required maxlength="500" placeholder="اكتب سؤالك عن العقارات أو المواعيد…" autocomplete="off"><button type="button" class="icon-btn bot-mic" aria-label="ابدأ التحدث" aria-pressed="false">${icon('mic')}</button><button type="submit" class="btn primary small">إرسال</button></form><p class="bot-voice-note">الصوت متاح حسب أصوات جهازك ومتصفحك.</p>`;
  document.body.append(launcher,panel);log=panel.querySelector('.bot-log');input=panel.querySelector('input');sendButton=panel.querySelector('[type=submit]');micButton=panel.querySelector('.bot-mic');status=panel.querySelector('.bot-status');voiceButton=panel.querySelector('[data-bot-action=auto-voice]');
  panel.querySelector('form').onsubmit=event=>{event.preventDefault();send(input.value);};micButton.onclick=listen;
  panel.addEventListener('click',event=>{const button=event.target.closest('[data-bot-action]');if(!button)return;const action=button.dataset.botAction;
    if(action==='close')close();
    else if(action==='new'){stopVoice();history=[];filters={};propertyIds=[];lastReply='';log.replaceChildren();greet();tell('المعلومات من قاعدة المكتب، ويؤكد المكتب التوفر قبل الحجز.');}
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
