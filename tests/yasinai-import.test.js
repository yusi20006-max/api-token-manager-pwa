import test from 'node:test';
import assert from 'node:assert';

const originalFetch = globalThis.fetch;

test('importToYasinAI posts credential only in request body', async () => {
  globalThis.fetch = async (url, options) => {
    assert.strictEqual(url, 'http://127.0.0.1:8000/v1/token/import');
    assert.ok(!url.includes('credential-value'));
    assert.strictEqual(options.headers['X-YasinAI-Bridge-Token'], 'bridge-token');
    const body = JSON.parse(options.body); assert.strictEqual(body.credential, 'credential-value'); assert.strictEqual(body.baseUrl, 'https://api.orcarouter.ai/v1');
    return { ok: true, status: 200, json: async () => ({ imported: true, idempotent: false, credential: { id: 'cred_123' }, health: { authenticated: true } }) };
  };
  try {
    const { importToYasinAI } = await import('../js/yasinai.js?import-test=' + Date.now());
    const result = await importToYasinAI({ status: 'healthy', providerId: 'orcarouter', apiKey: 'credential-value', baseUrl: 'https://api.orcarouter.ai/v1', model: 'orcarouter/auto' }, { baseUrl: 'http://127.0.0.1:8000', bridgeToken: 'bridge-token' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.imported, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('importToYasinAI refuses unhealthy credentials locally', async () => {
  const { importToYasinAI } = await import('../js/yasinai.js?unhealthy-test=' + Date.now());
  const result = await importToYasinAI({ status: 'failed', providerId: 'openai', apiKey: 'credential-value' }, { baseUrl: 'http://127.0.0.1:8000', bridgeToken: 'bridge-token' });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, 'CREDENTIAL_NOT_HEALTHY');
});

test('importToYasinAI redacts bridge and provider failures', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  try {
    const { importToYasinAI } = await import('../js/yasinai.js?error-test=' + Date.now());
    const result = await importToYasinAI({ status: 'healthy', providerId: 'openai', apiKey: 'credential-value' }, { baseUrl: 'http://127.0.0.1:8000', bridgeToken: 'bridge-token' });
    assert.strictEqual(result.code, 'BRIDGE_AUTH_FAILED');
    assert.ok(!result.message.includes('credential-value'));
    assert.ok(!result.message.includes('bridge-token'));
  } finally { globalThis.fetch = originalFetch; }
});
