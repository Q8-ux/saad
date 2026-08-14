(()=>{
  const API='https://tamweenat-api.onrender.com';
  const token=sessionStorage.getItem('tamweenatAdminToken');
  if(!token)return;
  const nativeFetch=window.fetch.bind(window);
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
    const url=typeof input==='string'?input:input?.url;
    const method=String(opts.method||'GET').toUpperCase();
    if(method==='GET'&&cache.has(url)){
      const p=cache.get(url);cache.delete(url);
      return p.then(r=>r?r.clone():nativeFetch(input,opts));
    }
    return nativeFetch(input,opts);
  };
  setTimeout(()=>{cache.clear();window.fetch=nativeFetch},15000);
})();