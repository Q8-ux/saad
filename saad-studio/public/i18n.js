'use strict';
(()=>{
 const languages=[['ar','العربية','rtl'],['en','English','ltr'],['ur','اردو','rtl'],['hi','हिन्दी','ltr'],['fa','فارسی','rtl'],['tr','Türkçe','ltr'],['fr','Français','ltr']];
 const requested=new URLSearchParams(location.search).get('lang');let saved='';try{saved=localStorage.getItem('saad-studio-language')||''}catch{}
 const code=languages.some(l=>l[0]===requested)?requested:languages.some(l=>l[0]===saved)?saved:'ar';
 const lang=languages.find(l=>l[0]===code),dict=window.STUDIO_TRANSLATIONS?.[code];
 document.documentElement.lang=code;document.documentElement.dir=lang[2];
 try{localStorage.setItem('saad-studio-language',code)}catch{}
 function t(value){if(typeof value!=='string'||!dict)return value;const trim=value.trim();let result=dict.ui[trim];
 if(result===undefined&&trim.includes(' | SAAD STUDIO'))result=(dict.ui[trim.split(' | SAAD STUDIO')[0]]||trim.split(' | SAAD STUDIO')[0])+' | SAAD STUDIO';
 if(result===undefined&&/^\d+ (خدمة|خدمات)$/.test(trim))result=trim.split(' ')[0]+' '+dict.ui['خدمات'];
 if(result===undefined&&/^[0-9 ×]+بكسل/.test(trim))result=trim.replace('بكسل لكل شريحة',dict.ui['بكسل لكل شريحة']).replace('بكسل',dict.ui['بكسل']);
 if(result===undefined&&trim.startsWith('عرض تفاصيل '))result=dict.ui['عرض تفاصيل']+' '+trim.slice('عرض تفاصيل '.length);
 return result===undefined?value:value.replace(trim,result);
 }
 function href(value){const u=new URL(value,location.href);if(u.origin!==location.origin||!u.pathname.startsWith('/saad/saad-studio/'))return value;u.searchParams.set('lang',code);return u.href}
 if(dict){for(const c of window.STUDIO_STORE.categories){const tr=dict.categories[c.id];Object.assign(c,tr)}for(const s of window.STUDIO_STORE.services){const tr=dict.services[s.id];s.title=tr.title;s.description=tr.description;s.size=t(s.size);s.scope=t(s.scope);s.needs=s.needs.map(t)}window.STUDIO_STORE.currency='KWD'}
 window.STUDIO_I18N={code,t,href,languages};
 function localize(root){
  if(root.nodeType===Node.TEXT_NODE){if(root.parentElement?.closest('script,style,textarea,[data-artwork],.design-title,.design-mini,.menu-lines,.design-kicker,.design-signature'))return;const translated=t(root.nodeValue);if(translated!==root.nodeValue)root.nodeValue=translated;return}
  if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
  if(root.nodeType===Node.ELEMENT_NODE){
   if(root.matches('script,style,[data-artwork]'))return;
   for(const name of ['placeholder','aria-label','title']){if(root.hasAttribute(name)){const old=root.getAttribute(name),next=t(old);if(next!==old)root.setAttribute(name,next)}}
   if(root.tagName==='TEXTAREA')return;
   if(root.tagName==='A'&&root.hasAttribute('href')&&!root.closest('.language-switcher')){const old=root.getAttribute('href');if(!/^(data:|mailto:|tel:|javascript:)/.test(old)){const next=href(old);if(next!==old)root.setAttribute('href',next)}}
  }
  for(const child of Array.from(root.childNodes))localize(child);
 }
 function setup(){
  const switcher=document.createElement('nav');switcher.className='language-switcher';switcher.setAttribute('aria-label',code==='ar'?'لغة الموقع':'Language');
  for(const [id,name,dir]of languages){const a=document.createElement('a');const u=new URL(location.href);u.searchParams.set('lang',id);a.href=u.href;a.textContent=name;a.lang=id;a.dir=dir;a.hreflang=id;if(id===code){a.classList.add('active');a.setAttribute('aria-current','true')}switcher.append(a)}
  document.querySelector('header').insertAdjacentElement('afterend',switcher);
  // Artwork remains an Arabic design specimen; labels and controls are localized.
  document.querySelectorAll('.hero-departments strong').forEach(e=>{e.dataset.artwork='true';e.lang='ar';e.dir='rtl'});
  localize(document.body);document.title=t(document.title);const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=t(meta.content);
  const observer=new MutationObserver(records=>{for(const r of records){if(r.type==='characterData')localize(r.target);else if(r.type==='childList')for(const n of r.addedNodes)localize(n);else localize(r.target)}});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
