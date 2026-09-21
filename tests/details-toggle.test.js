import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('details behavior remains in the UI layer and uses delegated data-action wiring', async () => {
  assert.match(html, /data-details-btn=/);
  assert.match(html, /data-action="toggle-details"/);
  assert.match(html, /function toggleDetails\(id\)/);
  assert.doesNotMatch(html, /onclick="toggleDetails/);

  const storage = await import('../js/storage.js?details-storage-regression=' + Date.now());
  assert.equal('toggleDetails' in storage, false);
});
