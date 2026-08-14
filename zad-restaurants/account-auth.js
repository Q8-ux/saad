(()=>{
  const SESSION_KEY='tamweenatRestaurantSession';
  const TOKEN_KEY='tamweenatRestaurantToken';
  const HOME='../tamweenat/';
  const API='https://cfauiqcvhioxpjlbvsgx.supabase.co/functions/v1/tamweenat-api';
  const LEGACY_API='https://tamweenat-api.onrender.com';
  const LOGO=`<svg viewBox="0 0 64 64" aria-hidden="true" style="width:46px;height:46px;display:block" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b6b43"/><stop offset="1" stop-color="#063d29"/></linearGradient><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4d66a"/><stop offset="1" stop-color="#c99519"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="#f7fbf8" stroke="#d9b348" stroke-width="2"/><path d="M12 17h7l4 25h25l6-18H22" fill="none" stroke="url(#tg)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 25h24l-4 12H27z" fill="url(#tg)" opacity=".96"/><circle cx="29" cy="48" r="4" fill="url(#gold)" stroke="#0b5a3a" stroke-width="2"/><circle cx="46" cy="48" r="4" fill="url(#gold)" stroke="#0b5a3a" stroke-width="2"/><path d="M47 17c5 2 7 7 5 12-5 0-9-2-11-7 1-3 3-4 6-5z" fill="#2f9b59"/><path d="M51 13c1 3 1 7-1 11M54 18l4-3M53 22l5 1M51 17l-3-4" fill="none" stroke="url(#gold)" stroke-width="2.3" stroke-linecap="round"/></svg>`;
  const raw=sessionStorage.getItem(SESSION_KEY),token=sessionStorage.getItem(TOKEN_KEY);
  if(!raw||!token){location.replace('./login.html');return}
  let session={};
  try{session=JSON.parse(raw)||{}}catch{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(TOKEN_KEY);location.replace('./login.html');return}

  const originalFetch=window.fetch.bind(window);
  const normalizeInput=input=>{
    if(typeof input==='string')return input.startsWith(LEGACY_API)?API+input.slice(LEGACY_API.length):input;
    if(input instanceof Request&&input.url.startsWith(LEGACY_API))return new Request(API+input.url.slice(LEGACY_API.length),input);
    return input;
  };
  const nativeFetch=(input,opts={})=>originalFetch(normalizeInput(input),opts);
  const authHeaders={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const prefetched=new Map();
  const prefetch=(url,opts={})=>{
    const p=nativeFetch(url,{...opts,cache:'no-store'}).then(r=>r.clone()).catch(()=>null);
    prefetched.set(url,p);
  };
  prefetch(`${API}/health`);
  prefetch(`${API}/api/me`,{headers:authHeaders});
  window.fetch=(input,opts={})=>{
    const normalized=normalizeInput(input);
    const url=typeof normalized==='string'?normalized:normalized?.url;
    const method=String(opts.method||normalized?.method||'GET').toUpperCase();
    if(method==='GET'&&prefetched.has(url)){
      const p=prefetched.get(url);prefetched.delete(url);
      return p.then(r=>r?r.clone():originalFetch(normalized,opts));
    }
    return originalFetch(normalized,opts);
  };
  setTimeout(()=>prefetched.clear(),15000);

  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-section="assistant"],#assistant,.voice-panel,.voice-console,.voice-orb').forEach(el=>el.remove());
    const mark=document.querySelector('.brand-mark');
    if(mark){mark.innerHTML=LOGO;mark.style.background='transparent';mark.style.width='48px';mark.style.height='48px';mark.style.padding='0';}
    const logout=document.getElementById('logoutBtn');
    if(logout)logout.addEventListener('click',()=>{
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      location.replace(HOME);
    });
    const userLabel=document.getElementById('loggedInUser');
    if(userLabel)userLabel.textContent=`${session.restaurantName||'المطعم'} — ${session.name||session.username||''}`;

    const loadScript=(src,key)=>{
      if(document.querySelector(`script[data-${key}]`))return;
      const s=document.createElement('script');s.src=src;s.dataset[key]='1';document.body.appendChild(s);
    };
    const loadStyle=(href,key)=>{
      if(document.querySelector(`link[data-${key}]`))return;
      const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key]='1';document.head.appendChild(l);
    };

    loadScript('./account-live.js?v=20260814-1323','accountLive');

    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-section]');
      if(!b)return;
      if(b.dataset.section==='supplies'){
        loadStyle('./supplies.css?v=20260814-1640','suppliesCss');
        loadScript('./supplies.js?v=20260814-1640','suppliesCatalog');
      }
    },{passive:true});
  });
})();