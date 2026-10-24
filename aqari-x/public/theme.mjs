// Light is the default. Dark is used only after the visitor chooses it.
let theme='light';
try { if(localStorage.getItem('aqari-theme')==='dark')theme='dark'; } catch {}
function applyTheme(){
  document.documentElement.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0c1114':'#f5f6f2');
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content',theme);
  const button=document.getElementById('theme-switch');
  if(button){
    button.setAttribute('aria-pressed',String(theme==='dark'));
    const path=theme==='dark'?'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0':'M20.5 13A8.5 8.5 0 0 1 11 3.5a8.5 8.5 0 1 0 9.5 9.5';
    button.innerHTML=`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="${path}"/></svg><span>${theme==='dark'?'الوضع النهاري':'الوضع الليلي'}</span>`;
  }
}
applyTheme();
queueMicrotask(()=>{
  const target=document.querySelector('.sidebar-bottom');if(!target)return;
  const button=document.createElement('button');button.id='theme-switch';button.type='button';button.className='theme-switch';
  button.onclick=()=>{theme=theme==='light'?'dark':'light';try{localStorage.setItem('aqari-theme',theme);}catch{}applyTheme();};
  target.prepend(button);applyTheme();
});
