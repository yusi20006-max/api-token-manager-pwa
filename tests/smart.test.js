import test from 'node:test';
import assert from 'node:assert';
import { normalizeBaseUrl, detectProvider, detectAuthType } from '../js/smartSetup.js';

test('normalizeBaseUrl handles various URL formats correctly', () => {
  assert.strictEqual(normalizeBaseUrl('zenmux.ai'), 'https://zenmux.ai/api/v1');
  assert.strictEqual(normalizeBaseUrl('https://zenmux.ai/'), 'https://zenmux.ai/api/v1');
  assert.strictEqual(normalizeBaseUrl('https://zenmux.ai/api/v1/'), 'https://zenmux.ai/api/v1');
  assert.strictEqual(normalizeBaseUrl('https://api.openai.com/v1'), 'https://api.openai.com/v1');
  assert.strictEqual(normalizeBaseUrl('  https://api.openai.com  '), 'https://api.openai.com/v1');
  assert.strictEqual(normalizeBaseUrl('invalid-url-string'), '');
});

test('detectProvider identifies known providers including ZenMux', () => {
  assert.strictEqual(detectProvider('https://zenmux.ai/api/v1'), 'zenmux');
  assert.strictEqual(detectProvider('https://api.openai.com/v1'), 'openai');
  assert.strictEqual(detectProvider('https://api.anthropic.com/v1'), 'anthropic');
  assert.strictEqual(detectProvider('https://openrouter.ai/api/v1'), 'openrouter');
  assert.strictEqual(detectProvider('https://unknown-provider.com'), 'custom');
});

test('detectAuthType assigns correct auth strategy', () => {
  assert.strictEqual(detectAuthType('zenmux', 'https://zenmux.ai/api/v1'), 'bearer');
  assert.strictEqual(detectAuthType('openai', 'https://api.openai.com/v1'), 'bearer');
  assert.strictEqual(detectAuthType('anthropic', 'https://api.anthropic.com/v1'), 'x-api-key');
  assert.strictEqual(detectAuthType('google', 'https://generativelanguage.googleapis.com'), 'query');
});
