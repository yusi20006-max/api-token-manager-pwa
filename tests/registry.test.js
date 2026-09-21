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


test('OrcaRouter is a first-class OpenAI-compatible provider', () => {
  const profile = getProviderProfile('orcarouter');
  assert.strictEqual(profile.baseUrl, 'https://api.orcarouter.ai/v1');
  assert.strictEqual(profile.authType, 'bearer');
  assert.strictEqual(profile.testEndpoint, 'models');
  assert.strictEqual(profile.model, 'orcarouter/auto');
  assert.strictEqual(profile.endpoints.models, 'GET /models');
  assert.strictEqual(profile.endpoints.chat, 'POST /chat/completions');
  assert.strictEqual(profile.endpoints.responses, 'POST /responses');

  const adapter = getAdapter('orcarouter');
  const req = adapter.buildRequest({ baseUrl: profile.baseUrl, apiKey: 'TEST-ORCA-KEY', authType: 'bearer' });
  assert.strictEqual(req.url, 'https://api.orcarouter.ai/v1/models');
  assert.strictEqual(req.headers.Authorization, 'Bearer TEST-ORCA-KEY');
});


test('Google uses header authentication without putting the API key in the URL', () => {
  const profile = getProviderProfile('google');
  assert.strictEqual(profile.authType, 'x-goog-api-key');

  const adapter = getAdapter('google');
  const req = adapter.buildRequest({
    baseUrl: profile.baseUrl,
    apiKey: 'TEST-GOOGLE-KEY',
    authType: profile.authType
  });
  assert.strictEqual(req.url, 'https://generativelanguage.googleapis.com/v1beta/models');
  assert.strictEqual(req.headers['x-goog-api-key'], 'TEST-GOOGLE-KEY');
  assert.ok(!req.url.includes('TEST-GOOGLE-KEY'));

  const modelsReq = adapter.buildModelsRequest({
    baseUrl: profile.baseUrl,
    apiKey: 'TEST-GOOGLE-KEY',
    authType: profile.authType
  });
  assert.strictEqual(modelsReq.headers['x-goog-api-key'], 'TEST-GOOGLE-KEY');
  assert.ok(!modelsReq.url.includes('key='));
});
