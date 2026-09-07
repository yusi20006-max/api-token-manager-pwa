import test from 'node:test';
import assert from 'node:assert';
import { normalizeModel, normalizePricing } from '../js/models.js';

test('model name containing free does not imply FREE pricing', () => {
  const m = normalizeModel({ id: 'google/gemini-2.0-flash-exp:free' }, 'openrouter');
  assert.strictEqual(m.pricing.tier, 'UNKNOWN');
});

test('explicit pricing evidence is preserved with source', () => {
  const m = normalizeModel({ id: 'x', pricing: { tier: 'FREE', source: 'provider-docs', confidence: 'high' } }, 'custom');
  assert.strictEqual(m.pricing.tier, 'FREE');
  assert.strictEqual(m.pricing.source, 'provider-docs');
});

test('missing metadata yields unknown, not guessed values', () => {
  const m = normalizeModel({ id: 'm1' }, 'custom');
  assert.strictEqual(m.contextLength, 'unknown');
  assert.strictEqual(m.pricing.tier, 'UNKNOWN');
});

test('normalizePricing rejects free-form strings', () => {
  assert.strictEqual(normalizePricing('free').tier, 'UNKNOWN');
  assert.strictEqual(normalizePricing(null).tier, 'UNKNOWN');
});
