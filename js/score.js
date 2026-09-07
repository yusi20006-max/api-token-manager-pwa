/**
 * Deterministic health score 0-100 with breakdown.
 * Factors: reachability, authentication, endpoint availability,
 * model discovery, latency, recent failures.
 * Untested inference stays UNKNOWN, never FAIL.
 */
export function computeHealthScore({ health = null, discovery = null, history = [] } = {}) {
  const breakdown = {
    reachability: 'UNKNOWN',
    authentication: 'UNKNOWN',
    endpoint: 'UNKNOWN',
    models: 'UNKNOWN',
    inference: 'UNKNOWN',
    latency: 'UNKNOWN'
  };
  let score = 0;

  if (!health) {
    return { score: 0, breakdown };
  }

  // Reachability (0-25)
  if (health.reachable === true) { score += 25; breakdown.reachability = 'PASS'; }
  else if (health.reachable === false) { breakdown.reachability = 'FAIL'; }
  else { score += 5; }

  // Authentication (0-25)
  if (health.authenticated === true) { score += 25; breakdown.authentication = 'PASS'; }
  else if (health.authenticated === false) { breakdown.authentication = 'FAIL'; }
  else { score += 5; }

  // Endpoint availability (0-15)
  if (health.httpStatus && health.httpStatus >= 200 && health.httpStatus < 300) {
    score += 15; breakdown.endpoint = 'PASS';
  } else if (health.httpStatus && health.httpStatus >= 500) {
    breakdown.endpoint = 'FAIL';
  } else if (health.httpStatus) {
    score += 3; breakdown.endpoint = 'FAIL';
  }

  // Models (0-15)
  if (discovery && discovery.success && discovery.models && discovery.models.length > 0) {
    score += 15; breakdown.models = 'PASS';
  } else if (health.capabilities && health.capabilities.models === 'available') {
    score += 10; breakdown.models = 'PASS';
  } else if (discovery && discovery.status === 'empty') {
    score += 8; breakdown.models = 'PASS';
  }

  // Inference: never FAIL when untested
  if (health.capabilities && health.capabilities.inference === 'available') {
    breakdown.inference = 'PASS';
  } else {
    breakdown.inference = 'UNKNOWN';
  }

  // Latency (0-10): GOOD <800ms, OK <2500ms, SLOW otherwise
  if (typeof health.latencyMs === 'number') {
    if (health.latencyMs < 800) { score += 10; breakdown.latency = 'GOOD'; }
    else if (health.latencyMs < 2500) { score += 7; breakdown.latency = 'OK'; }
    else { score += 3; breakdown.latency = 'SLOW'; }
  }

  // Recent failures penalty (0-10)
  const recent = (history || []).slice(-5);
  const fails = recent.filter(h => h.status === 'failed' || h.status === 'error').length;
  score += Math.max(0, 10 - fails * 2);

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, breakdown };
}
