import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadServiceWorker() {
  const handlers = {};
  const cacheStore = new Map();
  const cache = {
    addAll: async () => {},
    match: async (request) => cacheStore.get(request.url) ?? undefined,
    put: async (request, response) => cacheStore.set(request.url, response)
  };

  const context = {
    URL,
    self: {
      location: { href: 'https://pwa.example/app/', origin: 'https://pwa.example' },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (name, handler) => { handlers[name] = handler; }
    },
    caches: {
      open: async () => cache,
      keys: async () => ['api-token-manager-v2'],
      delete: async () => true,
      match: async (request) => cache.match(request)
    },
    fetch: async (request) => new Response('network', { status: 200 }),
    Response
  };

  vm.runInNewContext(
    fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8'),
    context,
    { filename: 'sw.js' }
  );

  return { handlers, cacheStore };
}

function request(url, method = 'GET') {
  return new Request(url, { method });
}

async function dispatchFetch(handler, req) {
  let responsePromise;
  handler({
    request: req,
    respondWith: (promise) => { responsePromise = promise; }
  });
  return responsePromise;
}

test('service worker caches declared same-origin static assets', async () => {
  const { handlers, cacheStore } = loadServiceWorker();
  await dispatchFetch(handlers.fetch, request('https://pwa.example/app/index.html'));
  assert.equal(cacheStore.size, 1);
  assert.ok(cacheStore.has('https://pwa.example/app/index.html'));
});

test('service worker never caches cross-origin provider API requests', async () => {
  const { handlers, cacheStore } = loadServiceWorker();
  const apiRequest = request('https://api.example/v1/models');
  const response = await dispatchFetch(handlers.fetch, apiRequest);
  assert.equal(response.status, 200);
  assert.equal(cacheStore.size, 0);
});

test('service worker never caches query-authenticated API requests', async () => {
  const { handlers, cacheStore } = loadServiceWorker();
  const apiRequest = request('https://pwa.example/app/proxy?key=SECRET');
  const response = await dispatchFetch(handlers.fetch, apiRequest);
  assert.equal(response.status, 200);
  assert.equal(cacheStore.size, 0);
});

test('service worker never caches non-GET API requests', async () => {
  const { handlers, cacheStore } = loadServiceWorker();
  const apiRequest = request('https://pwa.example/app/js/engine.js', 'POST');
  const response = await dispatchFetch(handlers.fetch, apiRequest);
  assert.equal(response.status, 200);
  assert.equal(cacheStore.size, 0);
});

test('service worker serves cached static assets but not cached provider APIs', async () => {
  const { handlers, cacheStore } = loadServiceWorker();
  cacheStore.set('https://pwa.example/app/index.html', new Response('cached'));
  const response = await dispatchFetch(handlers.fetch, request('https://pwa.example/app/index.html'));
  assert.equal(await response.text(), 'cached');
  assert.equal(cacheStore.size, 1);
});
