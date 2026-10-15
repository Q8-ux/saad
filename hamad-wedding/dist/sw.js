const CACHE = 'hamad-wedding-v9';
const ASSETS = ['./','./index.html','./assets/style.css','./assets/style.css?v=invitation-v9','./assets/app.mjs','./assets/app.mjs?v=invitation-v9','./assets/event.mjs','./assets/event.mjs?v=invitation-v9','./assets/invitation-original.jpg','./assets/venue-background.jpg','./assets/location-qr.svg','./assets/invitation-qr.svg','./assets/fonts/Amiri-Regular.woff2','./assets/fonts/Amiri-Bold.woff2','./assets/icon.svg','./assets/apple-touch-icon.png','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('hamad-wedding-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window' });
    for (const client of windows) {
      const url = new URL(client.url);
      if (!url.href.startsWith(self.registration.scope) || url.searchParams.get('v') === CACHE) continue;
      url.searchParams.set('v', CACHE);
      // Start navigation without holding activation open for its fetch.
      void client.navigate(url.href).catch(() => {});
    }
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).then(response => {
      if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put('./index.html', copy)); }
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request)));
});
