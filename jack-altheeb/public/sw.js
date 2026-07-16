const CACHE = "jack-altheeb-v5";
const ASSETS = [
  "/",
  "/style.css?v=20260716-5",
  "/enhancements.css?v=20260716-5",
  "/app.js?v=20260716-5",
  "/i18n.js?v=20260716-5",
  "/manifest.webmanifest?v=5",
  "/assets/art.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.url.includes("/socket.io/")) return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
