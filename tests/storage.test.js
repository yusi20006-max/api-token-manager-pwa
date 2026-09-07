import test from 'node:test';
import assert from 'node:assert';
import { normalizeApiEntry, sanitizeHistoryEntry, toExportPayload } from '../js/storage.js';

test('legacy entries migrate with defaults and stay loadable', () => {
  const e = normalizeApiEntry({ name: 'Old', baseUrl: 'https://x.com', apiKey: 'k' });
  assert.strictEqual(e.providerId, 'custom');
  assert.strictEqual(e.authType, 'bearer');
  assert.ok(Array.isArray(e.history));
});

test('history sanitizer never keeps secrets', () => {
  const h = sanitizeHistoryEntry({ status: 'healthy', apiKey: 'SECRET', Authorization: 'Bearer SECRET', errorMessage: 'ok' });
  assert.strictEqual(h.apiKey, undefined);
  assert.strictEqual(h.Authorization, undefined);
});

test('config export strips secrets by default', () => {
  const payload = toExportPayload([{ name: 'A', baseUrl: 'https://x.com', apiKey: 'SECRET123' }]);
  assert.strictEqual(payload[0].apiKey, '');
  const full = toExportPayload([{ name: 'A', baseUrl: 'https://x.com', apiKey: 'SECRET123' }], { includeSecrets: true });
  assert.strictEqual(full[0].apiKey, 'SECRET123');
});

test('error classification keeps CORS distinct from UNAUTHORIZED', async () => {
  const { classifyError } = await import('../js/errors.js');
  const cors = classifyError(new Error('Failed to fetch'));
  const unauth = classifyError(null, { status: 401, statusText: 'Unauthorized' }, 'unauthorized');
  assert.notStrictEqual(cors.code, unauth.code);
  assert.strictEqual(cors.code, 'CORS_BLOCKED');
});
