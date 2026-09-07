import test from 'node:test';
import assert from 'node:assert';
import { createHealthResult } from '../js/contract.js';

test('createHealthResult produces required fields and ISO timestamp', () => {
  const result = createHealthResult({ status: 'healthy', reachable: true, latencyMs: 142 });
  assert.strictEqual(result.status, 'healthy');
  assert.strictEqual(result.reachable, true);
  assert.strictEqual(result.latencyMs, 142);
  assert.ok(result.checkedAt);
  assert.strictEqual(typeof result.checkedAt, 'string');
  assert.ok(new Date(result.checkedAt).getTime() > 0);
  assert.ok(result.capabilities);
  assert.strictEqual(result.capabilities.models, 'unknown');
});
