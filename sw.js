const CACHE_NAME = 'annies-fjarilar-v1.5.62';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css?v=1.5.62',
  './script.js?v=1.5.62',
  './supabase-config.js?v=1.5.62',
  './manifest.webmanifest?v=1.5.62',
  './assets/favicon.svg',
  './assets/favicon/favicon-128x128.png',
  './assets/favicon/favicon-16x16.png',
  './assets/favicon/favicon-256x256.png',
  './assets/favicon/favicon-32x32.png',
  './assets/favicon/favicon-48x48.png',
  './assets/favicon/favicon-96x96.png',
  './assets/favicon/favicon.ico',
  './assets/favicon/favicon.svg',
  './assets/apple/apple-touch-icon-152x152.png',
  './assets/apple/apple-touch-icon-167x167.png',
  './assets/apple/apple-touch-icon.png',
  './assets/pwa/icon-1024x1024.png',
  './assets/pwa/icon-192x192.png',
  './assets/map-pin-clean.svg',
  './assets/pwa/icon-384x384.png',
  './assets/pwa/icon-512x512.png',
  './assets/pwa/maskable-icon-1024x1024.png',
  './assets/pwa/maskable-icon-192x192.png',
  './assets/pwa/maskable-icon-384x384.png',
  './assets/pwa/maskable-icon-512x512.png',
  './assets/favicon.ico',
  './assets/favicon-16.png',
  './assets/favicon-32.png',
  './assets/apple-touch-icon.png',
  './assets/pwa-icon-192.png',
  './assets/pwa-icon-512.png',
  './assets/pwa-maskable-512.png',
  './assets/butterfly-placeholder.svg',
  './assets/annie-refined-full-head.png?v=1.5.62',
  './assets/annie-refined-full-head-blink.png?v=1.5.62',
  './data/butterflies.json?v=1.5.62',
  './assets/species/alggrasparlemorfjaril.webp',
  './assets/species/amiral.webp',
  './assets/species/angsparlemorfjaril.webp',
  './assets/species/angssmygare.webp',
  './assets/species/aurorafjaril-hane.webp',
  './assets/species/aurorafjaril-hona.webp',
  './assets/species/brunflackig-parlemorfjaril.webp',
  './assets/species/citronfjaril.webp',
  './assets/species/gronsnabbvinge.webp',
  './assets/species/hedblavinge-hane.webp',
  './assets/species/hedblavinge-hona.webp',
  './assets/species/kalfjaril.webp',
  './assets/species/kamgrasfjaril.webp',
  './assets/species/luktgrasfjaril.webp',
  './assets/species/makaonfjaril.webp',
  './assets/species/mindre-guldvinge.webp',
  './assets/species/mindre-tatelsmygare.webp',
  './assets/species/nasselfjaril.webp',
  './assets/species/pafageloga.webp',
  './assets/species/parlgrasfjaril.webp',
  './assets/species/puktorneblavinge-hane.webp',
  './assets/species/puktorneblavinge-hona.webp',
  './assets/species/rapsfjaril.webp',
  './assets/species/rovfjaril.webp',
  './assets/species/silverstreckad-parlemorfjaril.webp',
  './assets/species/skogsnatfjaril.webp',
  './assets/species/skogsparlemorfjaril.webp',
  './assets/species/slattergrasfjaril.webp',
  './assets/species/sorgmantel.webp',
  './assets/species/tistelfjaril.webp',
  './assets/species/tosteblavinge.webp',
  './assets/species/vinbarsfuks.webp',
  './assets/species/vitflackig-guldvinge.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const currentCaches = new Set([CACHE_NAME]);
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => !currentCaches.has(key)).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin !== self.location.origin) return;

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
