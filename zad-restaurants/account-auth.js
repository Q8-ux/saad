(()=>{
  const SESSION_KEY='tamweenatRestaurantSession';
  const TOKEN_KEY='tamweenatRestaurantToken';
  const HOME='../tamweenat/';
  const API='https://cfauiqcvhioxpjlbvsgx.supabase.co/functions/v1/tamweenat-api';
  const LEGACY_API='https://tamweenat-api.onrender.com';
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

    loadScript('./account-live.js?v=20260814-1316','accountLive');

    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-section]');
      if(!b)return;
      if(b.dataset.section==='supplies'){
        loadStyle('./supplies.css','suppliesCss');
        loadScript('./supplies.js','suppliesCatalog');
      }
    },{passive:true});
  });
})();