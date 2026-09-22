import test from 'node:test';
import assert from 'node:assert';

const originalFetch = globalThis.fetch;

function response(status, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: async () => body
  };
}

test('checkApi keeps inference unknown after successful model-listing health check', async () => {
  globalThis.fetch = async () => response(200, JSON.stringify({ data: [{ id: 'demo-model' }] }));

  try {
    const { checkApi } = await import('../js/engine.js');
    const result = await checkApi({
      providerId: 'openai',
      baseUrl: 'https://api.example.test/v1',
      apiKey: 'test-key',
      model: 'demo-model',
      authType: 'bearer'
    });

    assert.strictEqual(result.status, 'healthy');
    assert.strictEqual(result.reachable, true);
    assert.strictEqual(result.authenticated, true);
    assert.strictEqual(result.capabilities.models, 'available');
    assert.strictEqual(result.capabilities.inference, 'unknown');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('checkApi keeps inference unknown on successful response without model evidence', async () => {
  globalThis.fetch = async () => response(200, '{}');

  try {
    const { checkApi } = await import('../js/engine.js');
    const result = await checkApi({
      providerId: 'openai',
      baseUrl: 'https://api.example.test/v1',
      apiKey: 'test-key',
      authType: 'bearer'
    });

    assert.strictEqual(result.capabilities.models, 'available');
    assert.strictEqual(result.capabilities.inference, 'unknown');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('checkApi classifies browser-ambiguous fetch failures as NETWORK_ERROR', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  try {
    const { checkApi } = await import('../js/engine.js?cors-contract=' + Date.now());
    const result = await checkApi({
      providerId: 'openai',
      baseUrl: 'https://api.example.test/v1',
      apiKey: 'test-key',
      authType: 'bearer'
    });

    assert.strictEqual(result.errorCode, 'NETWORK_ERROR');
    assert.strictEqual(result.reachable, false);
    assert.strictEqual(result.authenticated, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('checkApi marks server errors as reachable but authentication unknown', async () => {
  globalThis.fetch = async () => response(503, 'temporary failure');
  try {
    const { checkApi } = await import('../js/engine.js?server-semantics=' + Date.now());
    const result = await checkApi({ providerId: 'openai', baseUrl: 'https://api.example.test/v1', apiKey: 'test-key', authType: 'bearer' });
    assert.strictEqual(result.httpStatus, 503);
    assert.strictEqual(result.errorCode, 'SERVER_ERROR');
    assert.strictEqual(result.reachable, true);
    assert.strictEqual(result.authenticated, null);
  } finally { globalThis.fetch = originalFetch; }
});

test('checkApi preserves UNKNOWN for unclassified exceptions', async () => {
  globalThis.fetch = async () => { throw new Error('unexpected provider adapter failure'); };
  try {
    const { checkApi } = await import('../js/engine.js?unknown-semantics=' + Date.now());
    const result = await checkApi({ providerId: 'openai', baseUrl: 'https://api.example.test/v1', apiKey: 'test-key', authType: 'bearer' });
    assert.strictEqual(result.errorCode, 'UNKNOWN');
    assert.strictEqual(result.reachable, null);
    assert.strictEqual(result.authenticated, null);
  } finally { globalThis.fetch = originalFetch; }
});
