import assert from 'node:assert/strict';
import test from 'node:test';
import { STORAGE_KEY, clearAllApiData } from '../js/storage.js';

test('clearAllApiData removes the persisted API record set', () => {
  const store = new Map([[STORAGE_KEY, JSON.stringify([{ id: 'api-1', name: 'Test API' }])]]);
  globalThis.localStorage = {
    removeItem(key) { store.delete(key); },
    getItem(key) { return store.get(key) ?? null; }
  };

  assert.ok(globalThis.localStorage.getItem(STORAGE_KEY));
  clearAllApiData();
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEY), null);

  delete globalThis.localStorage;
});

test('reset control is wired in the storage bridge', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../js/storage.js', import.meta.url), 'utf8');
  assert.match(source, /id = 'resetAllBtn'/);
  assert.match(source, /🧹 ریست \/ پاک کردن همه/);
  assert.match(source, /clearAllApiData\(\)/);
  assert.match(source, /window\.location\.reload\(\)/);
});
