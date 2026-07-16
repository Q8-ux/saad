const CACHE = "jack-altheeb-v1";
const ASSETS = ["/", "/style.css", "/app.js", "/manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  if (event.request.url.includes("/socket.io/")) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
