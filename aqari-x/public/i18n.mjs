import { translations, phrases } from './locales-dictionary.mjs';

export const LOCALES = ['ar', 'en', 'ur'];
const canonical = text => String(text ?? '').replace(/\s+/g, ' ').trim();
const exact = new Map(Object.entries(translations).map(([key, value]) => [canonical(key), value]));
const originals = new Map(Object.entries(translations).flatMap(([source,value])=>Object.values(value).map(text=>[canonical(text),source])));
const fragments = Object.entries(phrases).sort((a,b)=>b[0].length-a[0].length);
const escapeRE = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const digits = text => String(text).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
function initialLocale() {
  if(typeof location === 'undefined') return 'ar';
  const requested = new URLSearchParams(location.search).get('lang');
  try { const saved = localStorage.getItem('aqari-locale'); return LOCALES.includes(requested) ? requested : LOCALES.includes(saved) ? saved : 'ar'; }
  catch { return LOCALES.includes(requested) ? requested : 'ar'; }
}
let activeLocale = initialLocale();
export const getLocale = () => activeLocale;
export function translate(text, locale = activeLocale) {
  const raw = String(text ?? '');
  if(locale === 'ar') return originals.get(canonical(raw)) || raw;
  const key = originals.get(canonical(raw)) || canonical(raw);
  if(!key) return raw;
  const direct = exact.get(key)?.[locale] ?? phrases[key]?.[locale];
  if(direct) return direct;
  let match;
  if((match=key.match(/^(\d+) عقار$/))) return `${match[1]} ${locale==='en' ? Number(match[1])===1?'property':'properties' : 'جائیدادیں'}`;
  if((match=key.match(/^(\d+) غرف( فأكثر)?$/))) return locale==='en' ? `${match[1]}${match[2]?'+':''} bedrooms` : `${match[2]?'کم از کم ':''}${match[1]} کمرے`;
  if((match=key.match(/^(\d[\d,.٠-٩۰-۹]*) د\.ك(?: (.+))?$/))) return `${digits(match[1])} ${locale==='en'?'KWD':'کویتی دینار'}${match[2]?' '+translate(match[2],locale):''}`;
  if((match=key.match(/^(\d[\d,.]*) م²$/))) return `${match[1]} ${locale==='en'?'m²':'مربع میٹر'}`;
  if((match=key.match(/^(.+) مطلوب وبحد أقصى (\d+) حرفاً$/))) return locale==='en' ? `${translate(match[1],locale)} is required (maximum ${match[2]} characters).` : `${translate(match[1],locale)} ضروری ہے (زیادہ سے زیادہ ${match[2]} حروف)۔`;
  if((match=key.match(/^تم تسجيل الطلب · (\d+) عروض قد تطابقه$/))) return locale==='en' ? `Request recorded · ${match[1]} potentially matching listings` : `درخواست محفوظ ہوگئی · ${match[1]} ممکنہ موزوں اشتہارات`;
  if((match=key.match(/^حُفظ الإعلان للمراجعة(?: · (\d+) صور مرفقة)?$/))) return locale==='en' ? `Listing saved for review${match[1]?` · ${match[1]} images attached`:''}` : `اشتہار جائزے کے لیے محفوظ ہوگیا${match[1]?` · ${match[1]} تصاویر منسلک`:''}`;
  if((match=key.match(/^(\d+) عرض مطابق حالياً$/))) return locale==='en'?`${match[1]} matching listings now`:`اس وقت ${match[1]} موزوں اشتہارات`;
  if((match=key.match(/^(\d+) عرض$/))) return locale==='en'?`${match[1]} listings`:`${match[1]} اشتہارات`;
  if((match=key.match(/^الميزانية: (.+)$/))) return `${locale==='en'?'Budget':'بجٹ'}: ${translate(match[1],locale)}`;
  if(!/\p{Script=Arabic}/u.test(key)) return raw;
  let result = key;
  for(const [source, target] of fragments) {
    if(!target?.[locale] || !result.includes(source)) continue;
    result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRE(source)}(?![\\p{L}\\p{N}])`,'gu'), target[locale]);
  }
  return digits(result);
}

const nodeSources = new WeakMap();
const attributeSources = new WeakMap();
let observer;
let scheduled = false;
const skip = element => !element || element.closest('script,style,textarea,input,code,pre,[contenteditable="true"],[data-i18n-skip]');
function processText(node) {
  if(skip(node.parentElement)) return;
  let state=nodeSources.get(node);
  if(!state || node.nodeValue!==state.rendered) state={source:node.nodeValue,rendered:node.nodeValue};
  const source=state.source;
  if(node.parentElement.tagName==='OPTION' && !node.parentElement.hasAttribute('value')) node.parentElement.setAttribute('value',source.trim());
  const value=translate(source);
  const translated=value===source?source:source.match(/^\s*/)[0]+value+source.match(/\s*$/)[0];
  state.rendered=translated;nodeSources.set(node,state);
  if(node.nodeValue!==translated) node.nodeValue=translated;
}
function processAttributes(element) {
  if(!element || element.closest('script,style,code,pre,[contenteditable="true"],[data-i18n-skip]')) return;
  const prior=attributeSources.get(element)||{};
  for(const name of ['placeholder','aria-label','title','alt']) {
    if(!element.hasAttribute(name)) continue;
    const current=element.getAttribute(name);
    let state=prior[name];if(!state || state.rendered!==current)state={source:current,rendered:current};
    const value=translate(state.source);state.rendered=value;prior[name]=state;
    if(current!==value)element.setAttribute(name,value);
  }
  attributeSources.set(element,prior);
}
export function localize(root=document.documentElement) {
  if(root.nodeType===Node.TEXT_NODE){processText(root);return;}
  if(root.nodeType!==Node.ELEMENT_NODE||skip(root))return;
  processAttributes(root);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode;
    if(node.nodeType===Node.TEXT_NODE)processText(node);else processAttributes(node);
  }
}
export function setLocale(locale) {
  if(!LOCALES.includes(locale))return;
  activeLocale=locale;
  try{localStorage.setItem('aqari-locale',locale);}catch{}
  document.documentElement.lang=locale;
  document.documentElement.dir=locale==='en'?'ltr':'rtl';
  const url=new URL(location.href);url.searchParams.set('lang',locale);history.replaceState(null,'',url);
  document.querySelectorAll('[data-locale]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.locale===locale)));
  localize();
  document.dispatchEvent(new CustomEvent('aqari:locale',{detail:{locale}}));
}
export function initI18n(){
  if(observer)return;
  document.documentElement.lang=activeLocale;document.documentElement.dir=activeLocale==='en'?'ltr':'rtl';
  const actions=document.querySelector('.top-actions');
  if(actions&&!document.getElementById('language-switch')){
    const group=document.createElement('div');group.id='language-switch';group.className='language-switch';group.setAttribute('role','group');group.setAttribute('aria-label','Language');group.setAttribute('data-i18n-skip','');
    group.innerHTML=LOCALES.map(code=>`<button type="button" data-locale="${code}" lang="${code}" aria-pressed="${code===activeLocale}">${{ar:'العربية',en:'English',ur:'اردو'}[code]}</button>`).join('');
    group.addEventListener('click',event=>{const button=event.target.closest('[data-locale]');if(button)setLocale(button.dataset.locale);});actions.prepend(group);
  }
  localize();
  observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;localize();});});
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title','alt']});
}
if(typeof document!=='undefined')queueMicrotask(initI18n);
