(function(){
  const PHONE_RE=/501\s*6\s*8888|50168888|\+?965\s*501\s*6\s*8888/i;
  const WA_RE=/واتساب|whatsapp|واٹس\s*ایپ/i;
  function normText(el){return (el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim()}
  function ancestors(el,max=8){const out=[];let n=el;for(let i=0;n&&i<max;i++,n=n.parentElement)out.push(n);return out}
  function fixedAncestor(el){
    for(const n of ancestors(el,10)){
      try{const p=getComputedStyle(n).position;if(p==='fixed'||p==='sticky')return n}catch{}
      const c=String(n.className||'');if(/floating|fixed|whatsapp-float|wa-float/i.test(c))return n;
    }
    return null;
  }
  function clickableCard(el){
    for(const n of ancestors(el,10)){
      const tag=n.tagName;
      const c=String(n.className||'');
      if(tag==='A'||tag==='BUTTON'||/whatsapp|support|cta|card/i.test(c))return n;
    }
    return el;
  }
  function keepVectorOnly(container){
    if(!container||container.dataset.waVectorOnly==='1')return;
    let icon=container.querySelector('svg');
    if(icon) icon=icon.cloneNode(true);
    else {
      const img=container.querySelector('img');
      if(img) icon=img.cloneNode(true);
    }
    if(!icon){
      icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
      icon.setAttribute('viewBox','0 0 32 32');
      icon.innerHTML='<path fill="currentColor" d="M16 3a13 13 0 0 0-11 20l-2 6 6-2A13 13 0 1 0 16 3Zm0 2a11 11 0 1 1-5.6 20.5l-.7-.4-3.5 1.1 1.1-3.4-.4-.7A11 11 0 0 1 16 5Zm-4.5 5.5c-.3 0-.6.1-.8.4-.4.4-1.4 1.3-1.4 3.2s1.4 3.8 1.6 4c.2.3 2.8 4.3 6.8 6 3.3 1.4 4 .9 4.7.8.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.8-.1-.2-.4-.3-.8-.5l-2.6-1.2c-.4-.2-.7-.3-1 .3-.3.5-1.1 1.2-1.4 1.5-.3.3-.5.3-1 .1-.5-.2-2-.7-3.8-2.3-1.4-1.2-2.4-2.8-2.6-3.2-.3-.5 0-.7.2-.9l.7-.8c.2-.3.3-.5.5-.8.2-.3.1-.6 0-.8l-1.2-2.8c-.3-.8-.7-.7-.9-.7h-.8Z"/>';
    }
    container.replaceChildren(icon);
    container.dataset.waVectorOnly='1';
    container.removeAttribute('href');
    container.removeAttribute('target');
    container.setAttribute('aria-label','WhatsApp');
    container.style.cssText+=';width:64px!important;height:64px!important;min-width:64px!important;min-height:64px!important;border-radius:50%!important;padding:14px!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;';
    icon.style.cssText='width:100%!important;height:100%!important;display:block!important;';
  }
  function clean(){
    const all=[...document.querySelectorAll('body *')];
    for(const el of all){
      const t=normText(el);
      if(!t)continue;
      if(PHONE_RE.test(t)||WA_RE.test(t)){
        const fixed=fixedAncestor(el);
        if(fixed && (PHONE_RE.test(normText(fixed))||WA_RE.test(normText(fixed)))){
          keepVectorOnly(fixed);
          continue;
        }
        if(PHONE_RE.test(t) && t.length<120){
          const card=clickableCard(el);
          if(card && !fixedAncestor(card)){card.remove();continue;}
        }
        if(WA_RE.test(t) && t.length<120){
          const card=clickableCard(el);
          if(card && !fixedAncestor(card)){card.remove();continue;}
        }
      }
    }
  }
  const start=()=>{clean();new MutationObserver(clean).observe(document.body,{childList:true,subtree:true,characterData:true});let n=0;const id=setInterval(()=>{clean();if(++n>30)clearInterval(id)},500)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();