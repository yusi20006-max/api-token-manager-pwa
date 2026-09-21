import test from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { normalizeApiEntry, parseRestoreFileText, restoreApisFromPayload, toExportPayload } from '../js/storage.js';

test('rendering template contains no inline JavaScript handlers', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /onclick\s*=\s*["']/i);
  assert.match(html, /data-action="check"/);
  assert.match(html, /data-action="copy-key"/);
});

test('malicious imported fields remain data after normalization', () => {
  const payload = [{
    id: 'x" data-action="delete',
    name: '<img src=x onerror=alert(1)>',
    providerId: 'custom',
    baseUrl: 'https://example.test/v1',
    apiKey: 'test-secret',
    model: 'x" onclick="alert(1)',
    testEndpoint: 'models"><script>alert(1)</script>',
    notes: '<script>alert(1)</script>'
  }];
  const restored = restoreApisFromPayload(payload);
  assert.strictEqual(restored.length, 1);
  assert.strictEqual(restored[0].name, payload[0].name);
  assert.strictEqual(restored[0].id, payload[0].id);
  assert.strictEqual(restored[0].model, payload[0].model);
  assert.strictEqual(restored[0].testEndpoint, payload[0].testEndpoint);
  assert.strictEqual(restored[0].notes, payload[0].notes);
});

test('supported wrapped imports use the canonical restore path', () => {
  const wrapped = JSON.stringify({ backup: { apis: [{ name: 'Valid', baseUrl: 'https://example.test', apiKey: 'k' }] } });
  const restored = parseRestoreFileText(wrapped);
  assert.strictEqual(restored.length, 1);
  assert.strictEqual(restored[0].name, 'Valid');
});

test('invalid restore input fails before replacement data can be produced', () => {
  assert.throws(() => parseRestoreFileText('{bad json'), /INVALID_JSON/);
  assert.throws(() => restoreApisFromPayload({ unsupported: [{ foo: 'bar' }] }), /NO_SUPPORTED_API_RECORDS/);
});

test('secret-free export remains secret-free', () => {
  const payload = toExportPayload([normalizeApiEntry({
    name: 'A', baseUrl: 'https://example.test', apiKey: 'REAL_SECRET'
  })]);
  assert.strictEqual(payload[0].apiKey, '');
  assert.notStrictEqual(JSON.stringify(payload), JSON.stringify({ apiKey: 'REAL_SECRET' }));
});
