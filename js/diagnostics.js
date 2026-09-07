/**
 * Per-API diagnostics builder (secret-free).
 */
export function buildDiagnostics({ api, health = null, discovery = null, score = null, capabilities = null } = {}) {
  const safe = (v) => (v === undefined || v === null || v === '' ? '—' : String(v));
  return {
    provider: safe(api.providerId || 'custom'),
    baseUrl: safe(api.baseUrl),
    authType: safe(api.authType),
    authentication: health ? (health.authenticated === true ? 'Valid' : health.authenticated === false ? 'Failed' : 'Unknown') : 'Unknown',
    connectivity: health ? (health.reachable === true ? 'Reachable' : health.reachable === false ? 'Failed' : 'Unknown') : 'Unknown',
    httpStatus: health?.httpStatus ?? null,
    errorCode: health?.errorCode || null,
    models: discovery?.models?.length ?? (api.discoveredModels || []).length ?? 0,
    capabilities: capabilities || {},
    cors: health?.errorCode === 'CORS_BLOCKED' ? 'Blocked' : (health?.reachable ? 'OK' : 'Unknown'),
    latencyMs: health?.latencyMs ?? api.lastLatency ?? null,
    healthScore: score?.score ?? api.healthScore ?? null,
    checkedAt: health?.checkedAt || api.lastChecked || null
  };
}
