const CACHE_NAME = 'annies-fjarilar-v1.5.34';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css?v=1.5.34',
  './script.js?v=1.5.34',
  './supabase-config.js?v=1.5.34',
  './manifest.webmanifest?v=1.5.34',
  './assets/favicon.svg',
  './assets/butterfly-placeholder.svg',
  './assets/annie-refined-full-head.png?v=1.5.34',
  './assets/annie-refined-full-head-blink.png?v=1.5.34',
  './data/butterflies.json?v=1.5.34',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isAppShell = request.mode === 'navigate' || ['document', 'script', 'style', 'manifest'].includes(request.destination);

  // Network-first for app files prevents older local development builds from sticking in cache.
  if (isAppShell) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first is still useful for static art/data once the correct version is active.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
