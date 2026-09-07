/**
 * Normalized API state + backward-compatible storage migration.
 * Secrets (apiKey) stay in storage entry but NEVER in health/history/diagnostics.
 */
import { getProviderProfile } from './registry.js';

export const STORAGE_KEY = 'api-token-manager-v3';
export const MAX_HISTORY = 10;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function normalizeApiEntry(item) {
  return {
    id: item.id || uid(),
    providerId: item.providerId || 'custom',
    name: item.name || 'بدون نام',
    baseUrl: item.baseUrl || '',
    apiKey: item.apiKey || '',
    authType: item.authType || 'bearer',
    model: item.model || '',
    models: Array.isArray(item.models) ? item.models : [],
    discoveredModels: Array.isArray(item.discoveredModels) ? item.discoveredModels : [],
    capabilities: item.capabilities && typeof item.capabilities === 'object' ? item.capabilities : {},
    health: item.health && typeof item.health === 'object' ? item.health : null,
    healthScore: typeof item.healthScore === 'number' ? item.healthScore : null,
    testEndpoint: item.testEndpoint || '',
    notes: item.notes || '',
    status: item.status || 'unknown',
    lastChecked: item.lastChecked || null,
    lastMessage: item.lastMessage || null,
    lastLatency: item.lastLatency ?? null,
    history: Array.isArray(item.history)
      ? item.history.map(sanitizeHistoryEntry).slice(-MAX_HISTORY)
      : [],
    createdAt: item.createdAt || Date.now()
  };
}

export function sanitizeHistoryEntry(h) {
  const clean = {
    time: h.time || h.checkedAt || Date.now(),
    checkedAt: h.checkedAt || (h.time ? new Date(h.time).toISOString() : new Date().toISOString()),
    status: h.status || 'unknown',
    latencyMs: h.latencyMs ?? h.latency ?? null,
    httpStatus: h.httpStatus ?? null,
    errorCode: h.errorCode || null,
    errorMessage: h.errorMessage || h.message || '',
    providerId: h.providerId || undefined,
    model: h.model || undefined
  };
  // Never persist secrets
  delete clean.apiKey; delete clean.token; delete clean.Authorization;
  delete clean.authorization; delete clean.headers;
  return clean;
}

/** Export without secrets unless explicitly requested. */
export function toExportPayload(apis, { includeSecrets = false } = {}) {
  return apis.map(a => {
    const base = normalizeApiEntry(a);
    if (!includeSecrets) {
      const { apiKey, ...rest } = base;
      return { ...rest, apiKey: '' };
    }
    return base;
  });
}
