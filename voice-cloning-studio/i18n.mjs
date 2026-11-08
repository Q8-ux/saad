export const uiLanguages={ar:'العربية',en:'English',fr:'Français',es:'Español',de:'Deutsch',tr:'Türkçe',zh:'中文'};
let locale='ar',source={},catalog={},bySource=new Map(),reverse=new Map(),fragments=[],observer,changing=false;
const texts=new WeakMap(),attributes=new WeakMap();
const excluded='script,style,code,pre,textarea,input,[translate="no"],[data-no-i18n],.voice-card-top h3,.voice-avatar,.history-text,.history-head b,.item-title,.story-clip-head strong,.youtube-result h3,#youtube-video-title,#youtube-video-meta,#record-file-name';
export const getUILocale=()=>locale;
export function translate(text){
 const value=String(text??'');if(locale==='ar'||!value)return value;
 const trimmed=value.trim(),key=bySource.get(trimmed);
 if(key&&catalog[key])return value.replace(trimmed,catalog[key]);
 // Generated counters and voice names contain values alongside fixed UI text.
 const parts=trimmed.split(/(\s+[—·]\s+|:\s*|\s+\[|\]\s*)/);
 if(parts.length>1){const changed=parts.map(part=>catalog[bySource.get(part.trim())]?part.replace(part.trim(),catalog[bySource.get(part.trim())]):part).join('');if(changed!==trimmed)return value.replace(trimmed,changed);}
 const number=trimmed.match(/^([\d.,٠-٩]+)\s+(.+)$/);
 if(number&&catalog[bySource.get(number[2])])return value.replace(trimmed,number[1]+' '+catalog[bySource.get(number[2])]);
 for(const fragment of fragments){
  if(trimmed.startsWith(fragment+' ')||trimmed.startsWith(fragment+'«'))return value.replace(trimmed,catalog[bySource.get(fragment)]+' '+translate(trimmed.slice(fragment.length).trimStart()));
  if(trimmed.endsWith(' '+fragment))return value.replace(trimmed,translate(trimmed.slice(0,-fragment.length).trimEnd())+' '+catalog[bySource.get(fragment)]);
 }
 return value;
}
function localize(root=document){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  if(!node.parentElement||node.parentElement.closest(excluded))continue;
  let record=texts.get(node);if(!record||record.last!==node.data){const raw=node.data,base=reverse.get(raw.trim());record={source:base?raw.replace(raw.trim(),base):raw,last:raw};}
  const next=translate(record.source);record.last=next;texts.set(node,record);if(node.data!==next)node.data=next;
 }
 const elements=root.nodeType===1?[root,...root.querySelectorAll('[placeholder],[aria-label],[title],meta[name="description"]')]:root.querySelectorAll('[placeholder],[aria-label],[title],meta[name="description"]');
 for(const el of elements){
  if(el.closest('[translate="no"],[data-no-i18n]'))continue;
  let records=attributes.get(el);if(!records){records={};attributes.set(el,records);}
  for(const attr of ['placeholder','aria-label','title',...(el.matches('meta[name="description"]')?['content']:[])]){
   if(!el.hasAttribute(attr))continue;const current=el.getAttribute(attr);let record=records[attr];if(!record||record.last!==current){const base=reverse.get(current.trim());record={source:base?current.replace(current.trim(),base):current,last:current};}
   const next=translate(record.source);record.last=next;records[attr]=record;if(current!==next)el.setAttribute(attr,next);
  }
 }
}
async function loadLanguage(next){
 const data=next==='ar'?source:await fetch(new URL('./locales/'+next+'.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Language file unavailable');return r.json();});
 if(Object.keys(source).some(k=>typeof data[k]!=='string'||!data[k]))throw new Error('Incomplete language file');
 for(const [key,value] of Object.entries(data))reverse.set(value,source[key]);
 catalog=data;locale=next;document.documentElement.lang=next;document.documentElement.dir=next==='ar'?'rtl':'ltr';
 try{localStorage.setItem('voice-ui-locale',next);}catch{}
 localize();document.title=translate(document.title);const select=document.getElementById('ui-language');if(select)select.value=next;
}
export async function initI18n(){
 source=await fetch(new URL('./locales/source.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Locale source unavailable');return r.json();});
 bySource=new Map(Object.entries(source).map(([key,value])=>[value,key]));
 fragments=[...bySource.keys()].filter(value=>value.length>=12).sort((a,b)=>b.length-a.length);
 let saved;try{saved=localStorage.getItem('voice-ui-locale');}catch{}
 await loadLanguage(uiLanguages[saved]?saved:'ar').catch(()=>loadLanguage('ar'));
 observer=new MutationObserver(records=>{for(const r of records){if(r.type==='childList'){for(const n of r.addedNodes){if(n.nodeType===1)localize(n);else if(n.nodeType===3&&n.parentElement)localize(n.parentElement);}}else if(r.target.nodeType===3&&r.target.parentElement)localize(r.target.parentElement);else if(r.target.nodeType===1)localize(r.target);}});
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});
 document.getElementById('ui-language')?.addEventListener('change',async event=>{
  if(changing)return;changing=true;const select=event.target,previous=locale;select.disabled=true;
  try{await loadLanguage(select.value);window.dispatchEvent(new CustomEvent('voice-locale-change',{detail:{locale}}));}
  catch{select.value=previous;window.alert('Unable to load this language. Please try again.');}
  finally{changing=false;select.disabled=false;}
 });
 document.getElementById('ui-language')?.removeAttribute('disabled');
 return locale;
}
