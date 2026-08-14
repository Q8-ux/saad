(()=>{
  const BRAND_AR='تموينات',BRAND_EN='Tamweenat';
  const API='https://cfauiqcvhioxpjlbvsgx.supabase.co/functions/v1/tamweenat-api';
  const LOGO=`<svg viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tg2" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b6b43"/><stop offset="1" stop-color="#063d29"/></linearGradient><linearGradient id="gold2" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4d66a"/><stop offset="1" stop-color="#c99519"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="#f7fbf8" stroke="#d9b348" stroke-width="2"/><path d="M12 17h7l4 25h25l6-18H22" fill="none" stroke="url(#tg2)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 25h24l-4 12H27z" fill="url(#tg2)"/><circle cx="29" cy="48" r="4" fill="url(#gold2)" stroke="#0b5a3a" stroke-width="2"/><circle cx="46" cy="48" r="4" fill="url(#gold2)" stroke="#0b5a3a" stroke-width="2"/><path d="M47 17c5 2 7 7 5 12-5 0-9-2-11-7 1-3 3-4 6-5z" fill="#2f9b59"/><path d="M51 13c1 3 1 7-1 11M54 18l4-3M53 22l5 1M51 17l-3-4" fill="none" stroke="url(#gold2)" stroke-width="2.3" stroke-linecap="round"/></svg>`;
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
    s.textContent=`#tamweenat-logo-entry{display:inline-flex!important;align-items:center;gap:9px;text-decoration:none!important;color:#163d30!important;font-family:inherit;font-weight:900;white-space:nowrap;margin-inline-end:12px}#tamweenat-logo-entry svg{width:46px;height:46px;display:block}#tamweenat-logo-entry b{font-size:22px}#tamweenat-account-entry,#tamweenat-admin-entry{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;text-decoration:none!important;padding:10px 15px;border-radius:11px;font-family:inherit;font-weight:800;white-space:nowrap;position:static!important;inset:auto!important}#tamweenat-account-entry{background:#163d30;color:#fff!important;border:1px solid #163d30}#tamweenat-account-entry:hover{background:#235f49}#tamweenat-admin-entry{background:#fff;color:#163d30!important;border:1px solid #cfdcd5;margin-inline-start:6px}#tamweenat-account-entry::before{content:'◉';font-size:14px}#tamweenat-admin-entry::before{content:'⚙';font-size:13px}.tamweenat-login-slot{display:flex;align-items:center;margin-inline-start:auto;gap:4px}@media(max-width:760px){#tamweenat-logo-entry b{display:none}#tamweenat-logo-entry svg{width:40px;height:40px}#tamweenat-account-entry,#tamweenat-admin-entry{padding:9px 11px;font-size:13px}.tamweenat-login-slot{width:auto}}`;
    document.head.appendChild(s);
  };
  const findTopContainer=()=>{
    const headers=[...document.querySelectorAll('header')].filter(el=>el.offsetParent!==null||el.getClientRects().length);
    for(const h of headers)return h.querySelector('nav')||h.querySelector('[class*="nav"],[class*="menu"],[class*="actions"]')||h;
    return document.querySelector('nav');
  };
  const addLogo=()=>{
    const target=findTopContainer(); if(!target)return false;
    let logo=document.getElementById('tamweenat-logo-entry');
    if(!logo){logo=document.createElement('a');logo.id='tamweenat-logo-entry';logo.href='/saad/tamweenat/';logo.innerHTML=`${LOGO}<b>تموينات</b>`;target.prepend(logo)}
    return true;
  };
  const addEntries=()=>{
    ensureStyles();
    const target=findTopContainer();
    if(!target)return false;
    addLogo();
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
  const warmBackend=()=>fetch(`${API}/health`,{cache:'no-store',mode:'cors'}).catch(()=>{});
  const init=()=>{
    warmBackend();
    applyBrandOnce();
    addEntries();
    let scheduled=false;
    const observer=new MutationObserver(records=>{
      for(const r of records)for(const n of r.addedNodes)replaceText(n);
      if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;addEntries()});}
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),8000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();