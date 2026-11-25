'use strict';
const CACHE_PREFIX = 'ukr-shell-';
const CACHE_NAME = CACHE_PREFIX + '6ea6b0a67bc579';
const APP_URL = new URL('./', self.location.href).href;
const APP_PATH = new URL(APP_URL).pathname;
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./styles.css?v=3d54333d047b", "./app.js?v=346354beeac7", "./assets/favicon.svg", "./assets/poster.jpg", "./assets/mohanad-regular.woff", "./assets/mohanad-bold.woff", "./assets/saad-signature.svg?v=f500fcd1854a", "./assets/app-icon-192.png", "./assets/app-icon-512.png"];
const ASSET_URLS = new Set(ASSETS.map(path => new URL(path, self.location.href).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(APP_PATH)) return;
  // Film media and byte ranges always use the original network request.
  if (request.destination === 'video' || request.headers.has('range') || /\.(?:mp4|webm|m3u8|m4s|ts)$/i.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(APP_URL,response.clone())));
      return response;
    }).catch(async () => (await caches.open(CACHE_NAME)).match(APP_URL)));
  } else if (ASSET_URLS.has(url.href)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match(request)) || fetch(request)));
  }
});
