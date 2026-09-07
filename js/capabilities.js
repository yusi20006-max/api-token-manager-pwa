/**
 * Standardized capability matrix.
 * States: SUPPORTED | UNSUPPORTED | UNKNOWN | NOT_TESTED
 */
export const CAPABILITY_KEYS = ['models', 'chat', 'responses', 'embeddings', 'streaming', 'vision', 'tools'];
export const CAP_STATES = ['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN', 'NOT_TESTED'];

export function emptyCapabilities() {
  const out = {};
  for (const k of CAPABILITY_KEYS) out[k] = 'NOT_TESTED';
  return out;
}

/**
 * Evidence-based capability inference.
 * - models: SUPPORTED only if discovery returned >=1 model; UNSUPPORTED if endpoint unsupported; UNKNOWN otherwise.
 * - chat/responses/etc: UNKNOWN unless explicit evidence provided (never inferred from /models alone).
 */
export function buildCapabilityMatrix({ discovery = null, health = null, evidence = {} } = {}) {
  const caps = emptyCapabilities();
  if (discovery) {
    if (discovery.success && Array.isArray(discovery.models) && discovery.models.length > 0) {
      caps.models = 'SUPPORTED';
    } else if (discovery.status === 'unsupported' || discovery.errorCode === 'NOT_SUPPORTED' || discovery.errorCode === 'UNSUPPORTED') {
      caps.models = 'UNSUPPORTED';
    } else if (discovery.status === 'empty') {
      caps.models = 'SUPPORTED'; // endpoint works, catalog empty
    } else {
      caps.models = 'UNKNOWN';
    }
  }
  for (const k of ['chat', 'responses', 'embeddings', 'streaming', 'vision', 'tools']) {
    if (evidence[k] === 'SUPPORTED' || evidence[k] === 'UNSUPPORTED') caps[k] = evidence[k];
    else if (evidence[k] === true) caps[k] = 'SUPPORTED';
    else if (evidence[k] === false) caps[k] = 'UNSUPPORTED';
    else caps[k] = health && health.authenticated === true && k === 'chat' ? 'UNKNOWN' : 'NOT_TESTED';
    // Never claim SUPPORTED from /models alone: keep UNKNOWN/NOT_TESTED.
  }
  return caps;
}
