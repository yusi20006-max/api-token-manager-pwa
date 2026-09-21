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
