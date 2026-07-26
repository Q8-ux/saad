const CACHE_VERSION = "jack-altheeb-v5";
const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/auth-client.js",
  "/manifest.webmanifest",
  "/assets/hero-v5.webp",
  "/assets/wolf-mark-v5.webp",
  "/assets/avatar-mishal.webp",
  "/assets/avatar-turki.webp",
  "/assets/avatar-bunasser.webp",
  "/assets/avatar-dahim.webp",
  "/assets/avatar-wolf.webp",
  "/assets/icon-192.png",
  "/assets/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/") ||
    url.pathname === "/healthz" ||
    url.pathname === "/version"
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const refreshed = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || refreshed;
    })
  );
});
