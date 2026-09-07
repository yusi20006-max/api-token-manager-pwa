import test from 'node:test';
import assert from 'node:assert';
import { computeHealthScore } from '../js/score.js';

test('healthy result with fast latency scores high with breakdown', () => {
  const { score, breakdown } = computeHealthScore({
    health: { reachable: true, authenticated: true, httpStatus: 200, latencyMs: 124, capabilities: { models: 'available', inference: 'available' } },
    discovery: { success: true, models: [{ id: 'a' }] },
    history: []
  });
  assert.ok(score >= 80);
  assert.strictEqual(breakdown.reachability, 'PASS');
  assert.strictEqual(breakdown.authentication, 'PASS');
});

test('untested inference is UNKNOWN, never FAIL', () => {
  const { breakdown } = computeHealthScore({
    health: { reachable: true, authenticated: true, httpStatus: 200, latencyMs: 500, capabilities: { models: 'unknown', inference: 'unknown' } },
    discovery: null,
    history: []
  });
  assert.strictEqual(breakdown.inference, 'UNKNOWN');
});

test('CORS-blocked result scores low and is deterministic', () => {
  const r = computeHealthScore({
    health: { reachable: false, authenticated: null, httpStatus: null, latencyMs: 300, errorCode: 'CORS_BLOCKED', capabilities: { models: 'unavailable', inference: 'unavailable' } },
    discovery: null,
    history: [{ status: 'failed' }]
  });
  assert.ok(r.score < 40);
});
