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

  const ensureStyles=()=>{
    if(document.getElementById('tamweenat-login-nav-style'))return;
    const style=document.createElement('style');
    style.id='tamweenat-login-nav-style';
    style.textContent=`
      #tamweenat-account-entry{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;background:#163d30;color:#fff!important;text-decoration:none!important;padding:10px 16px;border-radius:11px;font-family:inherit;font-weight:800;white-space:nowrap;border:1px solid #163d30;box-shadow:none;position:static!important;inset:auto!important;margin-inline-start:10px}
      #tamweenat-account-entry:hover{background:#235f49;border-color:#235f49}
      #tamweenat-account-entry::before{content:'◉';font-size:14px}
      .tamweenat-login-slot{display:flex;align-items:center;margin-inline-start:auto}
      @media(max-width:760px){#tamweenat-account-entry{padding:9px 12px;font-size:14px;margin-inline-start:6px}.tamweenat-login-slot{width:auto}}
    `;
    document.head.appendChild(style);
  };

  const findTopContainer=()=>{
    const headers=[...document.querySelectorAll('header')].filter(el=>el.offsetParent!==null || el.getClientRects().length);
    for(const header of headers){
      const nav=header.querySelector('nav');
      if(nav)return nav;
      const row=header.querySelector('[class*="nav"],[class*="menu"],[class*="header"],[class*="actions"]');
      if(row)return row;
      return header;
    }
    const nav=document.querySelector('nav');
    return nav||null;
  };

  const addAccountEntry=()=>{
    ensureStyles();
    let a=document.getElementById('tamweenat-account-entry');
    if(!a){
      a=document.createElement('a');
      a.id='tamweenat-account-entry';
      a.href='./login.html';
      a.textContent='دخول المطعم';
      a.setAttribute('aria-label','تسجيل دخول المطعم إلى المشتريات والكريدت والفواتير');
    }

    const target=findTopContainer();
    if(!target)return;
    let slot=document.getElementById('tamweenat-login-slot');
    if(!slot){
      slot=document.createElement('span');
      slot.id='tamweenat-login-slot';
      slot.className='tamweenat-login-slot';
    }
    if(slot.parentElement!==target)target.appendChild(slot);
    if(a.parentElement!==slot)slot.appendChild(a);
  };

  const removeOldFloatingArtifacts=()=>{
    const entry=document.getElementById('tamweenat-account-entry');
    if(entry){entry.style.position='static';entry.style.left='';entry.style.bottom='';}
  };

  const run=()=>{applyBrand();removeOldFloatingArtifacts();addAccountEntry();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
