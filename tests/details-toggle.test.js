import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('details button is wired to a global handler from the ES module bridge', async () => {
  assert.match(html, /data-details-btn="\$\{api\.id\}"/);
  assert.match(html, /onclick="toggleDetails\('\$\{api\.id\}'\)"/);

  const elements = new Map();
  const makeEl = (id, open = false) => {
    const classes = new Set(open ? ['open'] : []);
    return {
      id,
      classList: {
        contains: c => classes.has(c),
        add: c => classes.add(c),
        remove: c => classes.delete(c)
      },
      textContent: 'مشخصات',
      attrs: {},
      setAttribute: (k, v) => { this; },
      _classes: classes
    };
  };

  const first = makeEl('details-one');
  const button = { textContent: 'مشخصات', setAttribute(k, v) { this[k] = v; } };
  elements.set('details-one', first);

  globalThis.document = {
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll(selector) {
      if (selector !== '.card-details.open') return [];
      return [...elements.values()].filter(e => e.classList.contains('open'));
    },
    querySelector(selector) {
      if (selector.includes('data-details-btn="one"')) return button;
      return null;
    }
  };
  globalThis.window = {};

  const mod = await import('../js/storage.js?details-regression=' + Date.now());
  assert.equal(typeof mod.toggleDetails, 'function');
  assert.equal(typeof globalThis.window.toggleDetails, 'function');

  globalThis.window.toggleDetails('one');
  assert.equal(first.classList.contains('open'), true);
  assert.equal(button['aria-expanded'], 'true');
  assert.equal(button.textContent, 'بستن');

  globalThis.window.toggleDetails('one');
  assert.equal(first.classList.contains('open'), false);
  assert.equal(button['aria-expanded'], 'false');
  assert.equal(button.textContent, 'مشخصات');

  delete globalThis.document;
  delete globalThis.window;
});
