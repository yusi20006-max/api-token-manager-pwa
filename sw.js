const CACHE = 'api-token-manager-v3';
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

const ASSET_PATHS = new Set(
  ASSETS.map((asset) => new URL(asset, self.location.href).pathname)
);

function isCacheableAsset(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  return url.origin === self.location.origin && ASSET_PATHS.has(url.pathname);
}

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
  if (!isCacheableAsset(e.request)) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
