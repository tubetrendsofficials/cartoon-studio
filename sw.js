/* Cartoon Studio — service worker (offline-first app shell) */
const CACHE_NAME = 'cartoon-studio-v13';
const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/dashboard.js',
  './js/editor.js',
  './js/export.js',
  './js/text.js',
  './js/anim.js',
  './js/audio.js',
  './js/imaging.js',
  './js/effects.js',
  './js/charbuilder.js',
  './js/utils.js',
  './js/assets.js',
  './assets/manifest.json',
  './manifest.json',
  './favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline and not cached: ' + request.url);
      });
    })
  );
});
