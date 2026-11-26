const CACHE='mirsad-web-v1';
const ASSETS=['./','./index.html','./app.css','./app.js','./web-provider.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mirsad-web-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!ASSETS.some(p=>new URL(p,self.registration.scope).pathname===u.pathname))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const saved=r.clone();caches.open(CACHE).then(c=>c.put(e.request,saved));}return r;}).catch(()=>caches.match(e.request)));});
