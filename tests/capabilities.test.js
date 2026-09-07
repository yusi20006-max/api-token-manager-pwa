import test from 'node:test';
import assert from 'node:assert';
import { buildCapabilityMatrix, emptyCapabilities } from '../js/capabilities.js';

test('empty capabilities are NOT_TESTED, never SUPPORTED by default', () => {
  const caps = emptyCapabilities();
  assert.strictEqual(caps.models, 'NOT_TESTED');
  assert.strictEqual(caps.chat, 'NOT_TESTED');
});

test('/models success does not imply chat SUPPORTED', () => {
  const caps = buildCapabilityMatrix({
    discovery: { success: true, models: [{ id: 'x' }] },
    health: { authenticated: true }
  });
  assert.strictEqual(caps.models, 'SUPPORTED');
  assert.notStrictEqual(caps.chat, 'SUPPORTED');
});

test('unsupported endpoint maps to UNSUPPORTED, empty catalog stays SUPPORTED', () => {
  const unsup = buildCapabilityMatrix({ discovery: { success: false, status: 'unsupported', errorCode: 'UNSUPPORTED' } });
  assert.strictEqual(unsup.models, 'UNSUPPORTED');
  const empty = buildCapabilityMatrix({ discovery: { success: true, status: 'empty', models: [] } });
  assert.strictEqual(empty.models, 'SUPPORTED');
});
