(()=>{
  const NAME=/Saad\.alnabhan/gi;
  const clean=()=>{
    document.querySelectorAll('footer .signature').forEach(el=>el.remove());
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode())){
      if(NAME.test(n.nodeValue||''))n.nodeValue=(n.nodeValue||'').replace(NAME,'').replace(/\s{2,}/g,' ').trim();
      NAME.lastIndex=0;
    }
    document.querySelectorAll('[aria-label],[title]').forEach(el=>{
      for(const a of ['aria-label','title']){
        const v=el.getAttribute(a);if(v&&NAME.test(v))el.setAttribute(a,v.replace(NAME,'').trim());NAME.lastIndex=0;
      }
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});else clean();
  let scheduled=false;
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;clean()})});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setTimeout(()=>observer.disconnect(),12000);
})();