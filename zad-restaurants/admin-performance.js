(()=>{
  const API='https://cfauiqcvhioxpjlbvsgx.supabase.co/functions/v1/tamweenat-api';
  const LEGACY_API='https://tamweenat-api.onrender.com';
  const token=sessionStorage.getItem('tamweenatAdminToken');
  if(!token)return;
  const originalFetch=window.fetch.bind(window);
  const normalizeInput=input=>{
    if(typeof input==='string')return input.startsWith(LEGACY_API)?API+input.slice(LEGACY_API.length):input;
    if(input instanceof Request&&input.url.startsWith(LEGACY_API))return new Request(API+input.url.slice(LEGACY_API.length),input);
    return input;
  };
  const nativeFetch=(input,opts={})=>originalFetch(normalizeInput(input),opts);
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const cache=new Map();
  const prefetch=(url,opts={})=>{
    const p=nativeFetch(url,{...opts,cache:'no-store'}).then(r=>r.clone()).catch(()=>null);
    cache.set(url,p);
  };
  prefetch(`${API}/health`);
  prefetch(`${API}/api/admin/dashboard`,{headers});
  prefetch(`${API}/api/admin/restaurants`,{headers});
  window.fetch=(input,opts={})=>{
    const normalized=normalizeInput(input);
    const url=typeof normalized==='string'?normalized:normalized?.url;
    const method=String(opts.method||normalized?.method||'GET').toUpperCase();
    if(method==='GET'&&cache.has(url)){
      const p=cache.get(url);cache.delete(url);
      return p.then(r=>r?r.clone():originalFetch(normalized,opts));
    }
    return originalFetch(normalized,opts);
  };
  setTimeout(()=>cache.clear(),15000);
})();