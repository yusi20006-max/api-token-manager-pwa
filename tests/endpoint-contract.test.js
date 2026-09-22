import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdapter } from '../js/adapters.js';

test('explicit endpoint contracts are used for OrcaRouter and ZenMux', () => {
  for (const provider of ['orcarouter', 'zenmux']) {
    const adapter = getAdapter(provider);

    assert.deepEqual(
      adapter.buildEndpointRequest({ apiKey: 'test-key' }, 'models'),
      {
        url: adapter.profile.baseUrl + '/models',
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer test-key'
        }
      }
    );

    const chat = adapter.buildEndpointRequest(
      { apiKey: 'test-key' },
      'chat',
      { model: 'test-model', messages: [{ role: 'user', content: 'hello' }] }
    );

    assert.equal(chat.url, adapter.profile.baseUrl + '/chat/completions');
    assert.equal(chat.method, 'POST');
    assert.equal(chat.headers.Authorization, 'Bearer test-key');
    assert.equal(chat.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(chat.body), {
      model: 'test-model',
      messages: [{ role: 'user', content: 'hello' }]
    });
  }
});

test('undeclared endpoint contracts fail explicitly instead of using generic fallbacks', () => {
  const adapter = getAdapter('custom');

  assert.throws(
    () => adapter.buildEndpointRequest({ baseUrl: 'https://example.test', apiKey: 'test-key' }, 'chat'),
    /Provider custom does not declare endpoint: chat/
  );

  assert.throws(
    () => adapter.buildEndpointRequest({ baseUrl: 'https://example.test', apiKey: 'test-key' }, 'unknown'),
    /Provider custom does not declare endpoint: unknown/
  );
});
