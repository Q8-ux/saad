(()=>{
  const BRAND_AR='تموينات',BRAND_EN='Tamweenat';
  const replaceText=node=>{
    if(!node)return;
    if(node.nodeType===Node.TEXT_NODE){
      node.nodeValue=(node.nodeValue||'').replace(/زاد المطاعم/g,'تموينات').replace(/زاد/g,'تموينات').replace(/ZAD RESTAURANTS/gi,'TAMWEENAT').replace(/ZAD/gi,'TAMWEENAT');
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE||['SCRIPT','STYLE','NOSCRIPT'].includes(node.tagName))return;
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    let t;
    while((t=walker.nextNode())){
      const p=t.parentElement;
      if(p&&['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))continue;
      t.nodeValue=(t.nodeValue||'').replace(/زاد المطاعم/g,'تموينات').replace(/زاد/g,'تموينات').replace(/ZAD RESTAURANTS/gi,'TAMWEENAT').replace(/ZAD/gi,'TAMWEENAT');
    }
  };
  const applyBrandOnce=()=>{
    document.title=document.title.replace(/زاد المطاعم/g,BRAND_AR).replace(/زاد/g,BRAND_AR).replace(/ZAD/gi,BRAND_EN);
    replaceText(document.body);
  };
  const ensureStyles=()=>{
    if(document.getElementById('tamweenat-login-nav-style'))return;
    const s=document.createElement('style');
    s.id='tamweenat-login-nav-style';
    s.textContent=`#tamweenat-account-entry,#tamweenat-admin-entry{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;text-decoration:none!important;padding:10px 15px;border-radius:11px;font-family:inherit;font-weight:800;white-space:nowrap;position:static!important;inset:auto!important}#tamweenat-account-entry{background:#163d30;color:#fff!important;border:1px solid #163d30}#tamweenat-account-entry:hover{background:#235f49}#tamweenat-admin-entry{background:#fff;color:#163d30!important;border:1px solid #cfdcd5;margin-inline-start:6px}#tamweenat-account-entry::before{content:'◉';font-size:14px}#tamweenat-admin-entry::before{content:'⚙';font-size:13px}.tamweenat-login-slot{display:flex;align-items:center;margin-inline-start:auto;gap:4px}@media(max-width:760px){#tamweenat-account-entry,#tamweenat-admin-entry{padding:9px 11px;font-size:13px}.tamweenat-login-slot{width:auto}}`;
    document.head.appendChild(s);
  };
  const findTopContainer=()=>{
    const headers=[...document.querySelectorAll('header')].filter(el=>el.offsetParent!==null||el.getClientRects().length);
    for(const h of headers)return h.querySelector('nav')||h.querySelector('[class*="nav"],[class*="menu"],[class*="actions"]')||h;
    return document.querySelector('nav');
  };
  const addEntries=()=>{
    ensureStyles();
    const target=findTopContainer();
    if(!target)return false;
    let slot=document.getElementById('tamweenat-login-slot');
    if(!slot){slot=document.createElement('span');slot.id='tamweenat-login-slot';slot.className='tamweenat-login-slot'}
    if(slot.parentElement!==target)target.appendChild(slot);
    let user=document.getElementById('tamweenat-account-entry');
    if(!user){user=document.createElement('a');user.id='tamweenat-account-entry';user.href='./login.html';user.textContent='دخول المطعم'}
    let admin=document.getElementById('tamweenat-admin-entry');
    if(!admin){admin=document.createElement('a');admin.id='tamweenat-admin-entry';admin.href='./admin-login.html';admin.textContent='الإدارة'}
    if(user.parentElement!==slot)slot.appendChild(user);
    if(admin.parentElement!==slot)slot.appendChild(admin);
    return true;
  };
  const init=()=>{
    applyBrandOnce();
    addEntries();
    let scheduled=false;
    const observer=new MutationObserver(records=>{
      for(const r of records){
        for(const n of r.addedNodes)replaceText(n);
      }
      if(!scheduled){
        scheduled=true;
        requestAnimationFrame(()=>{scheduled=false;addEntries()});
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),12000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();