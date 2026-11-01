const CACHE='kuwait-fiqh-v1';
const SHELL=['./','./index.html','./styles.css','./app.mjs','./engine.mjs','./search-worker.mjs','./data/catalog.json','./assets/icon.svg','./manifest.webmanifest','./assets/fonts/Cairo-Variable.woff2','./assets/fonts/Amiri-Regular.ttf'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('kuwait-fiqh-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location).pathname))return;
  // A failed connection must not poison cached source data with an HTML fallback.
  if(url.pathname.includes('/data/volumes/')||url.pathname.includes('/data/index/')){event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;})));return;}
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(async()=>{const hit=await caches.match(event.request);if(hit)return hit;if(event.request.mode==='navigate')return caches.match('./index.html');return Response.error();}));
});
