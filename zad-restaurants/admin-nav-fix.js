(()=>{
  function activate(id){
    const target=document.getElementById(id);
    if(!target)return;
    document.querySelectorAll('.admin-page').forEach(section=>section.classList.remove('active'));
    document.querySelectorAll('#adminNav button[data-page]').forEach(button=>button.classList.remove('active'));
    target.classList.add('active');
    const navButton=document.querySelector(`#adminNav button[data-page="${CSS.escape(id)}"]`);
    if(navButton)navButton.classList.add('active');
    const title=document.getElementById('pageTitle');
    if(title)title.textContent=(navButton?.textContent||target.querySelector('h2')?.textContent||'لوحة الإدارة').trim();
    try{history.replaceState(null,'',`#${id}`)}catch{}
    window.scrollTo({top:0,behavior:'instant'});
  }

  function wire(){
    const nav=document.getElementById('adminNav');
    if(nav&&!nav.dataset.navFixed){
      nav.dataset.navFixed='1';
      nav.addEventListener('click',event=>{
        const button=event.target.closest('button[data-page]');
        if(!button||!nav.contains(button))return;
        event.preventDefault();
        event.stopPropagation();
        activate(button.dataset.page);
      },true);
    }

    document.addEventListener('click',event=>{
      const jump=event.target.closest('[data-jump]');
      if(!jump)return;
      event.preventDefault();
      activate(jump.dataset.jump);
    },true);

    const hash=location.hash.replace('#','');
    if(hash&&document.getElementById(hash)?.classList.contains('admin-page'))activate(hash);
  }

  window.TamweenatAdminNavigate=activate;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
