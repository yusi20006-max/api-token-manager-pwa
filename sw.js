const CACHE = 'api-token-manager-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/engine.js',
  './js/contract.js',
  './js/errors.js',
  './js/registry.js',
  './js/adapters.js',
  './js/discovery.js',
  './js/smartSetup.js',
  './js/storage.js',
  './js/score.js',
  './js/capabilities.js',
  './js/models.js',
  './js/diagnostics.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((res) => {
        if (e.request.method === 'GET' && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
