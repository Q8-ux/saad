const VERSION = '20261109-night-4';
const CACHE = 'dhikr-' + VERSION;
const versioned = path => `${path}?v=${VERSION}`;
const SHELL = ['./','./index.html',...['./styles.css','./app.mjs','./library.mjs','./i18n.mjs','./updates.mjs','./assets/icon.svg','./manifest.webmanifest'].map(versioned),'./data/quran.json','./data/translations.json','./assets/cairo.woff2','./assets/amiri-quran.woff2','./assets/naskh.woff2',...Array.from({length:7},(_,i)=>`./assets/dua-${i+1}.mp3`)];

self.addEventListener('install',event=>{
  // Precache fresh responses rather than recycling the browser's older HTTP cache.
  const requests=SHELL.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'}));
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(requests)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('dhikr-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  // Recovery must always reach its own document; never replace it with an old app shell.
  if(url.pathname.endsWith('/refresh.html')){
    event.respondWith(fetch(event.request,{cache:'no-store'}));return;
  }
  const stableMedia=/\.(?:woff2|mp3)$/.test(url.pathname);
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(stableMedia){const hit=await cache.match(event.request);if(hit)return hit;}
    try{
      const response=await fetch(event.request,{cache:'no-store'});
      if(response.ok){
        const key=event.request.mode==='navigate'?new URL('./index.html',self.registration.scope).href:event.request;
        event.waitUntil(cache.put(key,response.clone()).catch(()=>{}));
      }
      return response;
    }catch(error){
      const cached=await cache.match(event.request)||(event.request.mode==='navigate'?await cache.match(new URL('./index.html',self.registration.scope).href):null);
      if(cached)return cached;
      throw error;
    }
  })());
});
