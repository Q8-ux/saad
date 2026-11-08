import {VoiceboxAPI,APIError} from './api.mjs';
export class MediaAPI extends VoiceboxAPI {
 constructor(base){super(base,'');}
 async catalog(language=''){return (await this.request('/voices'+(language?'?language='+encodeURIComponent(language):''),{timeout:40000})).voices;}
}
export function videoId(value){
 value=String(value||'').trim();
 if(/^[A-Za-z0-9_-]{11}$/.test(value))return value;
 let u;try{u=new URL(value);}catch{throw new Error('أدخل رابط فيديو يوتيوب صالحًا.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw new Error('رابط يوتيوب يجب أن يستخدم HTTPS دون بيانات دخول.');
 const host=u.hostname.toLowerCase();let id;
 if(host==='youtu.be')id=u.pathname.slice(1).split('/')[0];
 else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host)){
  if(u.pathname==='/watch')id=u.searchParams.get('v');
  else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split('/')[2];
 }
 if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))throw new Error('اختر فيديو يوتيوب واحدًا؛ الروابط الأخرى وقوائم التشغيل غير مدعومة.');
 return id;
}
export function embedURL(value,start=0,end){const id=videoId(value),u=new URL('https://www.youtube-nocookie.com/embed/'+id);if(start)u.searchParams.set('start',String(Math.max(0,Math.floor(start))));if(end)u.searchParams.set('end',String(Math.floor(end)));u.searchParams.set('rel','0');return u.href;}
export function getDeviceVoices(){return globalThis.speechSynthesis?.getVoices?.()||[];}
export function speakDevice(text,voiceURI,language='ar'){
 if(!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)throw new Error('القراءة الصوتية غير مدعومة في هذا المتصفح. اختر خدمة الأصوات الجاهزة.');
 const voice=getDeviceVoices().find(v=>v.voiceURI===voiceURI);if(!voice)throw new Error('الصوت غير متاح على هذا الجهاز؛ أعد قراءة قائمة الأصوات.');
 speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang||language;
 return {utterance,start:()=>speechSynthesis.speak(utterance),stop:()=>speechSynthesis.cancel()};
}
