import { apiUrl } from './runtime-urls';
import { sections } from './analytics-contract';
export function startVisitorAnalytics() {
  const nav=navigator as Navigator & {globalPrivacyControl?:boolean};
  if(nav.doNotTrack==='1'||nav.globalPrivacyControl||nav.webdriver)return ()=>{};
  try { if(localStorage.getItem('sabeq-analytics-opt-out')==='1'||localStorage.getItem('sabeq-analytics-internal')==='1')return ()=>{}; } catch { return ()=>{}; }
  const read=(storage:Storage|null,key:string)=>{try{return storage?.getItem(key)||null;}catch{return null;}};
  const write=(storage:Storage|null,key:string,value:string)=>{try{storage?.setItem(key,value);}catch{}};
  const key='sabeq-analytics-visitor';const visitor=read(localStorage,key)||crypto.randomUUID();write(localStorage,key,visitor);
  let sessionStore:Storage|null=null;try{sessionStore=window.sessionStorage;}catch{}
  let sessionAt=0;
  let session='',lastInput=Date.now(),lastTick=performance.now(),pendingSeconds=0,page='home',closed=false;
  const device=/iPad|Tablet/i.test(nav.userAgent)||(nav.maxTouchPoints>1&&/Macintosh/.test(nav.userAgent))?'tablet':/Mobi/i.test(nav.userAgent)?'mobile':'desktop';
  let source='direct';try{if(document.referrer){const h=new URL(document.referrer).hostname;source=h===location.hostname?'internal':/google\.|bing\.|yahoo\./.test(h)?'search':/instagram\.|facebook\.|t\.co$|twitter\.|youtube\./.test(h)?'social':h==='q8-ux.github.io'?'github':'other';}}catch{source='other';}
  const ensureSession=()=>{const raw=read(sessionStore,'sabeq-analytics-session');let saved:{id?:string;at?:number}={};try{saved=JSON.parse(raw||'{}');}catch{}const now=Date.now();session=saved.id&&now-Number(saved.at)<1800000?saved.id:session&&now-sessionAt<1800000?session:crypto.randomUUID();sessionAt=now;write(sessionStore,'sabeq-analytics-session',JSON.stringify({id:session,at:now}));};
  const send=(event:string,seconds=0)=>{if(closed)return;ensureSession();const body=JSON.stringify({id:crypto.randomUUID(),session,visitor,event,page,seconds,source,device});void fetch(apiUrl('/api/analytics/collect'),{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit',signal:AbortSignal.timeout(8000)}).catch(()=>{});};
  const input=()=>{lastInput=Date.now();};
  const tick=()=>{const now=performance.now(),delta=Math.min(30,(now-lastTick)/1000);lastTick=now;if(document.visibilityState==='visible'&&Date.now()-lastInput<90000)pendingSeconds+=delta;if(pendingSeconds>=1){const seconds=Math.floor(pendingSeconds);pendingSeconds-=seconds;send('heartbeat',seconds);}};
  const hidden=()=>{tick();};
  const hash=()=>{const id=location.hash.slice(1);const next=(sections as readonly string[]).includes(id)?id:'home';if(next!==page){tick();page=next;send('page_view');}};
  const section=(event:Event)=>{const id=(event as CustomEvent).detail;if(!(sections as readonly string[]).includes(id)||id===page)return;tick();page=id;send('page_view');};
  // Opt-out in the privacy tab must also stop a tracker already running here.
  const preference=(event:StorageEvent)=>{if(event.key!=='sabeq-analytics-opt-out'||event.newValue!=='1')return;closed=true;pendingSeconds=0;try{localStorage.removeItem(key);sessionStore?.removeItem('sabeq-analytics-session');}catch{}};
  window.addEventListener('storage',preference);
  send('page_view');const timer=setInterval(tick,15000);
  ['pointerdown','keydown','scroll','touchstart'].forEach(e=>window.addEventListener(e,input,{passive:true}));
  window.addEventListener('hashchange',hash);window.addEventListener('sabeq-analytics-section',section);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',hidden);
  return()=>{tick();closed=true;clearInterval(timer);['pointerdown','keydown','scroll','touchstart'].forEach(e=>window.removeEventListener(e,input));window.removeEventListener('hashchange',hash);window.removeEventListener('sabeq-analytics-section',section);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',hidden);window.removeEventListener('storage',preference);};
}
