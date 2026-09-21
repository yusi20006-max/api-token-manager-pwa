import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('API details render all capability matrix dimensions', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const key of ['Models', 'Chat', 'Responses', 'Embeddings', 'Streaming', 'Vision', 'Tools']) {
    assert.match(html, new RegExp(key));
  }
  assert.match(html, /Capability Matrix/);
  assert.match(html, /const state = caps\[key\] \|\| 'NOT_TESTED'/);
});
