import test from 'node:test';
import assert from 'node:assert';
import { MAX_HISTORY, extractImportRecords, restoreApisFromPayload, toExportPayload } from '../js/storage.js';

function realisticApi() {
  return {
    id: 'gemini-full',
    providerId: 'custom',
    name: 'Gemini Full',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: 'SECRET-123',
    authType: 'query',
    model: 'models/gemini-2.5-flash-preview-tts',
    models: Array.from({ length: 120 }, (_, i) => ({ id: `models/test-${i}`, name: `models/test-${i}`, available: true })),
    discoveredModels: Array.from({ length: 120 }, (_, i) => ({ id: `models/test-${i}`, name: `models/test-${i}`, providerModelId: `models/test-${i}`, available: true })),
    capabilities: { models: 'NOT_TESTED', chat: 'UNKNOWN', responses: 'NOT_TESTED' },
    health: { reachable: true, authenticated: true, httpStatus: 200, latencyMs: 23 },
    healthScore: 95,
    testEndpoint: '/models',
    notes: 'backup regression',
    status: 'healthy',
    lastChecked: 1788846724511,
    lastMessage: 'healthy',
    lastLatency: 23,
    history: Array.from({ length: MAX_HISTORY }, (_, i) => ({
      time: 1788846700000 + i,
      checkedAt: new Date(1788846700000 + i).toISOString(),
      status: 'healthy',
      latencyMs: 20 + i,
      httpStatus: 200,
      errorCode: null,
      errorMessage: 'ok',
      providerId: 'custom',
      model: 'models/gemini-2.5-flash-preview-tts'
    })),
    createdAt: 1788840000000
  };
}

test('full export -> array restore preserves API and secret', () => {
  const source = realisticApi();
  const backup = toExportPayload([source], { includeSecrets: true });
  const restored = restoreApisFromPayload(backup);

  assert.strictEqual(restored.length, 1);
  assert.strictEqual(restored[0].apiKey, source.apiKey);
  assert.strictEqual(restored[0].providerId, source.providerId);
  assert.strictEqual(restored[0].baseUrl, source.baseUrl);
  assert.strictEqual(restored[0].model, source.model);
  assert.deepStrictEqual(restored[0].models, source.models);
  assert.deepStrictEqual(restored[0].discoveredModels, source.discoveredModels);
  assert.deepStrictEqual(restored[0].health, source.health);
  assert.strictEqual(restored[0].healthScore, source.healthScore);
  assert.deepStrictEqual(restored[0].history, source.history);
});

test('wrapped backups restore without dropping records', () => {
  const records = [realisticApi(), { ...realisticApi(), id: 'second', name: 'Second' }];
  assert.strictEqual(extractImportRecords({ apis: records }).length, 2);
  assert.strictEqual(extractImportRecords({ data: records }).length, 2);
  assert.strictEqual(extractImportRecords({ data: { apis: records } }).length, 2);
  assert.strictEqual(extractImportRecords({ tokens: records }).length, 2);
  assert.strictEqual(restoreApisFromPayload({ apis: records }).length, 2);
});

test('restore validation is filename-independent', () => {
  const backup = JSON.stringify(toExportPayload([realisticApi()], { includeSecrets: true }));
  const arbitraryFilenames = ['backup.json', 'test.json', 'anything.json', 'my-api-data.json', '123.json'];

  for (const filename of arbitraryFilenames) {
    // The restore parser receives file contents, not the filename. This explicitly
    // documents the contract that renaming a valid JSON backup cannot affect restore.
    const parsed = JSON.parse(backup);
    const restored = restoreApisFromPayload(parsed);
    assert.strictEqual(restored.length, 1, `restore failed for ${filename}`);
    assert.strictEqual(restored[0].id, 'gemini-full');
  }
});

test('invalid or empty payload is rejected before state replacement', () => {
  for (const payload of [null, {}, { apis: [] }, [], { apis: [null] }, { apis: 'not-an-array' }]) {
    assert.throws(() => restoreApisFromPayload(payload), /NO_SUPPORTED_API_RECORDS/);
  }
});

test('config export still strips secret while full backup keeps it', () => {
  const source = realisticApi();
  const config = toExportPayload([source]);
  const full = toExportPayload([source], { includeSecrets: true });
  assert.strictEqual(config[0].apiKey, '');
  assert.strictEqual(full[0].apiKey, source.apiKey);
  assert.strictEqual(full[0].discoveredModels.length, source.discoveredModels.length);
});
