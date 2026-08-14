(()=>{
  const SESSION_KEY='tamweenatRestaurantSession';
  const TOKEN_KEY='tamweenatRestaurantToken';
  const HOME='../tamweenat/';
  const API='https://tamweenat-api.onrender.com';
  const raw=sessionStorage.getItem(SESSION_KEY),token=sessionStorage.getItem(TOKEN_KEY);
  if(!raw||!token){location.replace('./login.html');return}
  let session={};
  try{session=JSON.parse(raw)||{}}catch{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(TOKEN_KEY);location.replace('./login.html');return}

  const nativeFetch=window.fetch.bind(window);
  const authHeaders={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const prefetched=new Map();
  const prefetch=(url,opts={})=>{
    const p=nativeFetch(url,{...opts,cache:'no-store'}).then(r=>r.clone()).catch(()=>null);
    prefetched.set(url,p);
  };
  prefetch(`${API}/health`);
  prefetch(`${API}/api/me`,{headers:authHeaders});
  window.fetch=(input,opts={})=>{
    const url=typeof input==='string'?input:input?.url;
    const method=String(opts.method||'GET').toUpperCase();
    if(method==='GET'&&prefetched.has(url)){
      const p=prefetched.get(url);prefetched.delete(url);
      return p.then(r=>r?r.clone():nativeFetch(input,opts));
    }
    return nativeFetch(input,opts);
  };
  setTimeout(()=>{prefetched.clear();window.fetch=nativeFetch},15000);

  const advancedStyle=document.createElement('link');advancedStyle.rel='stylesheet';advancedStyle.href='./account-advanced.css';document.head.appendChild(advancedStyle);

  document.addEventListener('DOMContentLoaded',()=>{
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

    // Core account data first.
    loadScript('./account-advanced.js','accountAdvanced');

    // Heavy catalog and voice helpers load only when the user opens those sections.
    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-section]');
      if(!b)return;
      if(b.dataset.section==='supplies'){
        loadStyle('./supplies.css','suppliesCss');
        loadScript('./supplies.js','suppliesCatalog');
      }
      if(b.dataset.section==='assistant')loadScript('./account-voice-fallback.js','voiceFallback');
    },{passive:true});
  });
})();