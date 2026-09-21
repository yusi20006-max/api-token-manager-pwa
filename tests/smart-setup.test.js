import test from 'node:test';
import assert from 'node:assert';

const originalFetch = globalThis.fetch;

function response(status, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
    text: async () => body
  };
}

test('Smart Setup does not report success when discovery fails', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/models')) {
      return response(401, 'invalid api key');
    }
    return response(200, '{}');
  };

  try {
    const { discoverApiConfiguration } = await import('../js/smartSetup.js');
    const result = await discoverApiConfiguration('https://api.example.test/v1', 'test-key');

    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errorCode, 'INVALID_API_KEY');
    assert.strictEqual(result.authenticated, true);
    assert.strictEqual(result.authenticationSource, 'health');
    assert.strictEqual(result.verification.discovery.authenticated, false);
    assert.strictEqual(result.verification.health.authenticated, true);
    assert.strictEqual(result.errorCode, 'INVALID_API_KEY');
    assert.strictEqual(result.capabilities.models, 'unavailable');
    assert.strictEqual(result.capabilities.inference, 'unknown');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Smart Setup reports verified success only when discovery and health succeed', async () => {
  globalThis.fetch = async () => response(200, JSON.stringify({ data: [{ id: 'demo-model' }] }));

  try {
    const { discoverApiConfiguration } = await import('../js/smartSetup.js');
    const result = await discoverApiConfiguration('https://api.example.test/v1', 'test-key');

    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.reachable, true);
    assert.strictEqual(result.authenticated, true);
    assert.strictEqual(result.capabilities.models, 'available');
    assert.strictEqual(result.capabilities.inference, 'unknown');
    assert.strictEqual(result.discoveredModels.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('Smart Setup exposes independent discovery and health authentication evidence', async () => {
  globalThis.fetch = async (url) => String(url).endsWith('/models')
    ? response(401, 'invalid api key')
    : response(200, '{}');

  try {
    const { discoverApiConfiguration } = await import('../js/smartSetup.js?issue30=' + Date.now());
    const result = await discoverApiConfiguration('https://api.example.test/v1', 'test-key');
    assert.equal(result.verification.discovery.authenticated, false);
    assert.equal(result.verification.health.authenticated, true);
    assert.equal(result.authenticationSource, 'health');
    assert.equal(result.success, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('Smart Setup detects OrcaRouter from its canonical API URL', async () => {
  const { detectProvider, detectAuthType } = await import('../js/smartSetup.js?orcarouter=' + Date.now());
  assert.strictEqual(detectProvider('https://api.orcarouter.ai/v1'), 'orcarouter');
  assert.strictEqual(detectAuthType('orcarouter', 'https://api.orcarouter.ai/v1'), 'bearer');
});


test('Smart Setup selects Google header authentication', async () => {
  const { detectAuthType } = await import('../js/smartSetup.js?google-auth=' + Date.now());
  assert.strictEqual(detectAuthType('google', 'https://generativelanguage.googleapis.com/v1beta'), 'x-goog-api-key');
  assert.strictEqual(detectAuthType('custom', 'https://generativelanguage.googleapis.com/v1beta'), 'x-goog-api-key');
});
