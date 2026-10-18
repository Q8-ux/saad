import { apiUrl } from './runtime-urls';
import { sections } from './analytics-contract';

export type AnalyticsConsent = 'granted' | 'denied' | 'unset' | 'unavailable';
export const analyticsConsentEvent = 'sabeq-analytics-consent-change';
const consentKey = 'sabeq-analytics-consent';
let preferenceUnavailable = false;

export function getAnalyticsConsent(): AnalyticsConsent {
  if (preferenceUnavailable) return 'unavailable';
  try {
    if (localStorage.getItem('sabeq-analytics-opt-out') === '1') return 'denied';
    const value = localStorage.getItem(consentKey);
    return value === 'granted' || value === 'denied' ? value : 'unset';
  } catch { return 'unavailable'; }
}

export function analyticsRestricted() {
  const nav=navigator as Navigator & {globalPrivacyControl?:boolean};
  try { return nav.doNotTrack === '1' || !!nav.globalPrivacyControl || !!nav.webdriver || localStorage.getItem('sabeq-analytics-internal') === '1'; }
  catch { return true; }
}

function clearAnalyticsIdentifiers() {
  try { localStorage.removeItem('sabeq-analytics-visitor'); } catch {}
  try { window.sessionStorage.removeItem('sabeq-analytics-session'); } catch {}
}

export function setAnalyticsConsent(choice: 'granted' | 'denied') {
  let saved = false;
  try {
    localStorage.setItem('sabeq-analytics-opt-out', choice === 'denied' ? '1' : '0');
    localStorage.setItem(consentKey, choice);
    saved = true;
  } catch {}
  preferenceUnavailable = !saved;
  if (choice === 'denied' || !saved || analyticsRestricted()) clearAnalyticsIdentifiers();
  window.dispatchEvent(new Event(analyticsConsentEvent));
  return saved;
}

function analyticsAllowed() {
  return getAnalyticsConsent() === 'granted' && !analyticsRestricted();
}

export function startVisitorAnalytics() {
  let stop: (() => void) | undefined;
  const sync = () => {
    if (analyticsAllowed()) {
      if (!stop) stop = startConsentedAnalytics(sync);
    } else {
      stop?.(); stop = undefined;
      clearAnalyticsIdentifiers();
    }
  };
  const storage = (event: StorageEvent) => {
    // A delayed refusal event must still discard the old tracking session.
    if (event.key === null || (event.key === consentKey && event.newValue !== 'granted') || (['sabeq-analytics-opt-out', 'sabeq-analytics-internal'].includes(event.key) && event.newValue === '1')) {
      stop?.(); stop = undefined; clearAnalyticsIdentifiers(); return;
    }
    if ([consentKey, 'sabeq-analytics-opt-out', 'sabeq-analytics-internal'].includes(event.key)) sync();
  };
  window.addEventListener(analyticsConsentEvent, sync);
  window.addEventListener('storage', storage);
  sync();
  return () => {
    window.removeEventListener(analyticsConsentEvent, sync);
    window.removeEventListener('storage', storage);
    stop?.(); stop = undefined;
  };
}

function startConsentedAnalytics(checkConsent: () => void) {
  const nav = navigator;
  const controller = new AbortController();
  const read=(storage:Storage|null,key:string)=>{try{return storage?.getItem(key)||null;}catch{return null;}};
  const write=(storage:Storage|null,key:string,value:string)=>{try{storage?.setItem(key,value);}catch{}};
  const key='sabeq-analytics-visitor';const visitor=read(localStorage,key)||crypto.randomUUID();write(localStorage,key,visitor);
  let sessionStore:Storage|null=null;try{sessionStore=window.sessionStorage;}catch{}
  let sessionAt=0;
  let session='',lastInput=Date.now(),lastTick=performance.now(),pendingSeconds=0,page='home',closed=false;
  const device=/iPad|Tablet/i.test(nav.userAgent)||(nav.maxTouchPoints>1&&/Macintosh/.test(nav.userAgent))?'tablet':/Mobi/i.test(nav.userAgent)?'mobile':'desktop';
  let source='direct';try{if(document.referrer){const h=new URL(document.referrer).hostname;source=h===location.hostname?'internal':/google\.|bing\.|yahoo\./.test(h)?'search':/instagram\.|facebook\.|t\.co$|twitter\.|youtube\./.test(h)?'social':h==='q8-ux.github.io'?'github':'other';}}catch{source='other';}
  const ensureSession=()=>{const raw=read(sessionStore,'sabeq-analytics-session');let saved:{id?:string;at?:number}={};try{saved=JSON.parse(raw||'{}');}catch{}const now=Date.now();session=saved.id&&now-Number(saved.at)<1800000?saved.id:session&&now-sessionAt<1800000?session:crypto.randomUUID();sessionAt=now;write(sessionStore,'sabeq-analytics-session',JSON.stringify({id:session,at:now}));};
  const send=(event:string,seconds=0)=>{if(closed)return;if(!analyticsAllowed()){checkConsent();return;}ensureSession();const body=JSON.stringify({id:crypto.randomUUID(),session,visitor,event,page,seconds,source,device});void fetch(apiUrl('/api/analytics/collect'),{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])}).catch(()=>{});};
  const input=()=>{lastInput=Date.now();};
  const tick=()=>{if(closed)return;if(!analyticsAllowed()){checkConsent();return;}const now=performance.now(),delta=Math.min(30,(now-lastTick)/1000);lastTick=now;if(document.visibilityState==='visible'&&Date.now()-lastInput<90000)pendingSeconds+=delta;if(pendingSeconds>=1){const seconds=Math.floor(pendingSeconds);pendingSeconds-=seconds;send('heartbeat',seconds);}};
  const hidden=()=>{tick();};
  const hash=()=>{const id=location.hash.slice(1);const next=(sections as readonly string[]).includes(id)?id:'home';if(next!==page){tick();page=next;send('page_view');}};
  const section=(event:Event)=>{const id=(event as CustomEvent).detail;if(!(sections as readonly string[]).includes(id)||id===page)return;tick();page=id;send('page_view');};
  send('page_view');const timer=setInterval(tick,15000);
  ['pointerdown','keydown','scroll','touchstart'].forEach(e=>window.addEventListener(e,input,{passive:true}));
  window.addEventListener('hashchange',hash);window.addEventListener('sabeq-analytics-section',section);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',hidden);
  return()=>{closed=true;pendingSeconds=0;controller.abort();clearInterval(timer);['pointerdown','keydown','scroll','touchstart'].forEach(e=>window.removeEventListener(e,input));window.removeEventListener('hashchange',hash);window.removeEventListener('sabeq-analytics-section',section);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',hidden);};
}
