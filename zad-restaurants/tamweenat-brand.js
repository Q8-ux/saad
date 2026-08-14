(()=>{
  const BRAND_AR='تموينات';
  const BRAND_EN='Tamweenat';
  const replaceText=node=>{
    if(node.nodeType===Node.TEXT_NODE){
      let v=node.nodeValue||'';
      v=v.replace(/زاد المطاعم/g,'تموينات').replace(/زاد/g,'تموينات').replace(/ZAD RESTAURANTS/gi,'TAMWEENAT').replace(/ZAD/gi,'TAMWEENAT');
      node.nodeValue=v;
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    if(['SCRIPT','STYLE','NOSCRIPT'].includes(node.tagName))return;
    [...node.childNodes].forEach(replaceText);
    ['aria-label','title','alt','placeholder'].forEach(a=>{
      const v=node.getAttribute?.(a);
      if(v)node.setAttribute(a,v.replace(/زاد المطاعم/g,'تموينات').replace(/زاد/g,'تموينات').replace(/ZAD RESTAURANTS/gi,'TAMWEENAT').replace(/ZAD/gi,'TAMWEENAT'));
    });
  };
  const applyBrand=()=>{
    document.title=document.title.replace(/زاد المطاعم/g,BRAND_AR).replace(/زاد/g,BRAND_AR).replace(/ZAD/gi,BRAND_EN);
    replaceText(document.body);
  };
  const addAccountEntry=()=>{
    if(document.getElementById('tamweenat-account-entry'))return;
    const a=document.createElement('a');
    a.id='tamweenat-account-entry';
    a.href='./login.html';
    a.textContent='دخول المطعم';
    a.setAttribute('aria-label','تسجيل دخول المطعم إلى المشتريات والكريدت والفواتير');
    document.body.appendChild(a);
    const style=document.createElement('style');
    style.textContent=`#tamweenat-account-entry{position:fixed;left:18px;bottom:18px;z-index:9999;background:#163d30;color:#fff;text-decoration:none;padding:12px 18px;border-radius:14px;font-family:inherit;font-weight:700;box-shadow:0 10px 28px rgba(22,61,48,.28);border:1px solid rgba(255,255,255,.18)}#tamweenat-account-entry:hover{background:#235f49}@media(max-width:640px){#tamweenat-account-entry{left:12px;bottom:12px;padding:11px 15px}}`;
    document.head.appendChild(style);
  };
  const run=()=>{applyBrand();addAccountEntry();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;applyBrand();addAccountEntry();});});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
