import assert from 'node:assert/strict';
import test from 'node:test';
import { STORAGE_KEY, clearAllApiData } from '../js/storage.js';

test('clearAllApiData removes the persisted API record set', () => {
  const store = new Map([
    [STORAGE_KEY, JSON.stringify([{ id: 'api-1', name: 'Test API' }])],
    ['atm-auto', JSON.stringify({ enabled: true })],
    ['atm-theme', 'light'],
    ['unrelated', 'keep']
  ]);
  globalThis.localStorage = {
    get length() { return store.size; },
    key(index) { return [...store.keys()][index] ?? null; },
    removeItem(key) { store.delete(key); },
    getItem(key) { return store.get(key) ?? null; }
  };
  const session = new Map([['api-token-manager-auto', 'stale'], ['atm-session', 'stale'], ['other', 'keep']]);
  globalThis.sessionStorage = {
    get length() { return session.size; },
    key(index) { return [...session.keys()][index] ?? null; },
    removeItem(key) { session.delete(key); },
    getItem(key) { return session.get(key) ?? null; }
  };

  assert.ok(globalThis.localStorage.getItem(STORAGE_KEY));
  assert.ok(globalThis.localStorage.getItem('atm-auto'));
  clearAllApiData();
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEY), null);
  assert.equal(globalThis.localStorage.getItem('atm-auto'), null);
  assert.equal(globalThis.localStorage.getItem('atm-theme'), null);
  assert.equal(globalThis.localStorage.getItem('unrelated'), 'keep');
  assert.equal(globalThis.sessionStorage.getItem('api-token-manager-auto'), null);
  assert.equal(globalThis.sessionStorage.getItem('atm-session'), null);
  assert.equal(globalThis.sessionStorage.getItem('other'), 'keep');

  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});

test('reset control remains wired to the canonical reset boundary', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../js/storage.js', import.meta.url), 'utf8');
  assert.match(source, /id = 'resetAllBtn'/);
  assert.match(source, /🧹 ریست \/ پاک کردن همه/);
  assert.match(source, /clearAllApiData\(\)/);
  assert.match(source, /window\.location\.reload\(\)/);
});
