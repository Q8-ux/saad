const CACHE = 'hamad-wedding-v3';
const ASSETS = ['./','./index.html','./assets/style.css','./assets/style.css?v=amiri-v3','./assets/app.mjs','./assets/event.mjs','./assets/invitation-original.jpg','./assets/venue-background.jpg','./assets/location-qr.svg','./assets/invitation-qr.svg','./assets/fonts/Amiri-Regular.woff2','./assets/fonts/Amiri-Bold.woff2','./assets/icon.svg','./assets/apple-touch-icon.png','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest','./hamad-wedding.ics'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('hamad-wedding-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
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
