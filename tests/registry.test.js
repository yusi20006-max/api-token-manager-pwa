import test from 'node:test';
import assert from 'node:assert';
import { getProviderProfile, listProviders } from '../js/registry.js';
import { getAdapter } from '../js/adapters.js';

test('provider registry has custom and known providers', () => {
  const providers = listProviders();
  assert.ok(providers.length >= 6);
  
  const openai = getProviderProfile('openai');
  assert.strictEqual(openai.id, 'openai');
  assert.strictEqual(openai.authType, 'bearer');

  const unknown = getProviderProfile('non-existent');
  assert.strictEqual(unknown.id, 'custom');
});

test('adapter builds request and curl correctly without exposing token in logs', () => {
  const adapter = getAdapter('openai');
  const req = adapter.buildRequest({ baseUrl: 'https://api.openai.com/v1', apiKey: 'TEST-PLACEHOLDER-KEY', authType: 'bearer' });
  assert.strictEqual(req.headers['Authorization'], 'Bearer TEST-PLACEHOLDER-KEY');
  assert.ok(req.url.includes('models'));

  const curl = adapter.buildCurl({ baseUrl: 'https://api.openai.com/v1', apiKey: 'TEST-PLACEHOLDER-KEY', authType: 'bearer' });
  assert.ok(curl.includes('curl -sS'));
  assert.ok(curl.includes('Authorization: Bearer TEST-PLACEHOLDER-KEY'));
});
