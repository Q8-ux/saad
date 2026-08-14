(()=>{
  const safeId=id=>String(id||'').replace(/[^a-zA-Z0-9_-]/g,'');
  function activate(rawId){
    const id=safeId(rawId);
    const target=document.getElementById(id);
    if(!target||!target.classList.contains('admin-page'))return false;
    document.querySelectorAll('.admin-page').forEach(section=>section.classList.remove('active'));
    document.querySelectorAll('#adminNav button[data-page]').forEach(button=>button.classList.remove('active'));
    target.classList.add('active');
    const navButton=[...document.querySelectorAll('#adminNav button[data-page]')].find(b=>b.dataset.page===id);
    if(navButton)navButton.classList.add('active');
    const title=document.getElementById('pageTitle');
    if(title)title.textContent=(navButton?.textContent||target.querySelector('h2')?.textContent||'لوحة الإدارة').trim();
    try{history.replaceState(null,'',`#${id}`)}catch{}
    try{window.scrollTo(0,0)}catch{}
    return true;
  }
  function wire(){
    const nav=document.getElementById('adminNav');
    if(nav&&!nav.dataset.navFixed){
      nav.dataset.navFixed='1';
      nav.style.touchAction='manipulation';
      const handle=event=>{
        const button=event.target.closest?.('button[data-page]');
        if(!button||!nav.contains(button))return;
        event.preventDefault();
        event.stopPropagation();
        activate(button.dataset.page);
      };
      nav.addEventListener('click',handle,true);
      nav.addEventListener('pointerup',event=>{
        if(event.pointerType==='touch')handle(event);
      },true);
    }
    document.addEventListener('click',event=>{
      const jump=event.target.closest?.('[data-jump]');
      if(!jump)return;
      event.preventDefault();
      activate(jump.dataset.jump);
    },true);
    const hash=safeId(location.hash.replace('#',''));
    if(hash)activate(hash);
  }
  window.TamweenatAdminNavigate=activate;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
