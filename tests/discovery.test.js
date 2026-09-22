import test from 'node:test';
import assert from 'node:assert';
import { getAdapter } from '../js/adapters.js';

test('adapter parses OpenAI/OpenRouter model list response', () => {
  const adapter = getAdapter('openai');
  const rawData = {
    data: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
    ]
  };
  const parsed = adapter.parseModelsResponse(rawData);
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].id, 'gpt-4o');
  assert.strictEqual(parsed[1].displayName, 'GPT-4o Mini');
  assert.strictEqual(parsed[0].available, true);
});


function response(status, body = '') { return { ok: status >= 200 && status < 300, status, statusText: status === 200 ? 'OK' : 'Error', text: async () => body }; }
const originalFetch = globalThis.fetch;

test('discoverModels returns unsupported without fetch', async () => {
  const { discoverModels } = await import('../js/discovery.js?unsupported=' + Date.now());
  const result = await discoverModels({ providerId: 'local' });
  assert.strictEqual(result.status, 'unsupported');
  assert.strictEqual(result.errorCode, 'NOT_SUPPORTED');
});

test('discoverModels handles populated and empty model catalogs', async () => {
  const { discoverModels } = await import('../js/discovery.js?catalog=' + Date.now());
  globalThis.fetch = async () => response(200, JSON.stringify({ data: [{ id: 'demo' }] }));
  try { const ok = await discoverModels({ providerId: 'openai', baseUrl: 'https://api.example.test/v1', apiKey: 'secret-key', authType: 'bearer' }); assert.strictEqual(ok.status, 'available'); assert.strictEqual(ok.models[0].id, 'demo');
    globalThis.fetch = async () => response(200, JSON.stringify({ data: [] })); const empty = await discoverModels({ providerId: 'openai', baseUrl: 'https://api.example.test/v1', apiKey: 'secret-key', authType: 'bearer' }); assert.strictEqual(empty.status, 'empty'); assert.deepStrictEqual(empty.models, []);
  } finally { globalThis.fetch = originalFetch; }
});

test('discoverModels normalizes authorization and not-found responses without leaking secrets', async () => {
  const { discoverModels } = await import('../js/discovery.js?http=' + Date.now());
  for (const status of [401, 403, 404]) { globalThis.fetch = async () => response(status, 'secret-key invalid'); const result = await discoverModels({ providerId: 'openai', baseUrl: 'https://api.example.test/v1', apiKey: 'secret-key', authType: 'bearer' }); assert.ok(['unauthorized','failed'].includes(result.status)); assert.ok(!result.errorMessage.includes('secret-key')); }
  globalThis.fetch = originalFetch;
});

test('discoverModels handles malformed JSON, network errors, and timeout', async () => {
  const { discoverModels } = await import('../js/discovery.js?failures=' + Date.now());
  globalThis.fetch = async () => response(200, '{bad'); let result = await discoverModels({ providerId: 'openai', baseUrl: 'https://api.example.test/v1', apiKey: 'secret-key', authType: 'bearer' }); assert.strictEqual(result.errorCode, 'MALFORMED_RESPONSE');
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); }; result = await discoverModels({ providerId: 'openai', baseUrl: 'https://api.example.test/v1', apiKey: 'secret-key', authType: 'bearer' }); assert.strictEqual(result.errorCode, 'NETWORK_ERROR');
  globalThis.fetch = async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }; result = await discoverModels({ providerId: 'openai', baseUrl: 'https://api.example.test/v1', apiKey: 'secret-key', authType: 'bearer' }, 1); assert.strictEqual(result.errorCode, 'TIMEOUT');
  globalThis.fetch = originalFetch;
});
