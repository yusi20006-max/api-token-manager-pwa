/**
 * Normalized HealthResult contract definition and factory helper.
 */

export function createHealthResult(overrides = {}) {
  return {
    status: "unknown",     // "healthy" | "partial" | "failed" | "unknown"
    reachable: null,       // boolean | null
    authenticated: null,   // boolean | null
    httpStatus: null,      // number | null
    latencyMs: null,       // number | null
    errorCode: null,       // string | null
    errorMessage: null,    // string | null
    checkedAt: new Date().toISOString(),
    capabilities: {
      models: "unknown",     // "unknown" | "available" | "unavailable"
      inference: "unknown"   // "unknown" | "available" | "unavailable"
    },
    ...overrides
  };
}
