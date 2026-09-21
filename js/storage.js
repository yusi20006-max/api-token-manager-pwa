/**
 * Normalized API state + backward-compatible storage migration.
 * Secrets (apiKey) stay in storage entry but NEVER in health/history/diagnostics.
 */
import { getProviderProfile } from './registry.js';

export const STORAGE_KEY = 'api-token-manager-v3';
export const MAX_HISTORY = 10;
export const RESET_STORAGE_PREFIX = 'atm-';

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

const IMPORT_RECORD_KEYS = ['apis', 'tokens', 'items', 'records', 'apiTokens'];
const IMPORT_WRAPPER_KEYS = ['data', 'payload', 'backup', 'export', 'result'];

function looksLikeApiRecord(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  return [
    'id', 'providerId', 'name', 'baseUrl', 'apiKey', 'authType',
    'model', 'models', 'discoveredModels', 'testEndpoint', 'status'
  ].some(key => Object.prototype.hasOwnProperty.call(item, key));
}

/** Extract API records from supported backup/export shapes without mutating state. */
export function extractImportRecords(data) {
  const seen = new Set();

  function visit(value, depth = 0) {
    if (depth > 5 || value == null) return null;

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text || seen.has(text)) return null;
      seen.add(text);
      try {
        return visit(JSON.parse(text), depth + 1);
      } catch {
        return null;
      }
    }

    if (Array.isArray(value)) {
      if (value.length && value.every(looksLikeApiRecord)) return value;
      for (const item of value) {
        const nested = visit(item, depth + 1);
        if (nested) return nested;
      }
      return null;
    }

    if (typeof value !== 'object') return null;

    for (const key of IMPORT_RECORD_KEYS) {
      if (Array.isArray(value[key])) {
        const records = value[key];
        if (records.length && records.every(looksLikeApiRecord)) return records;
        const nested = visit(records, depth + 1);
        if (nested) return nested;
      }
    }

    for (const key of IMPORT_WRAPPER_KEYS) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const nested = visit(value[key], depth + 1);
        if (nested) return nested;
      }
    }

    return null;
  }

  return visit(data);
}

export function parseRestoreFileText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('INVALID_JSON');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('INVALID_JSON');
  }
  return restoreApisFromPayload(data);
}

export function restoreApisFromPayload(data) {
  const records = extractImportRecords(data);
  if (!records || !records.length || records.some(item => !looksLikeApiRecord(item))) {
    throw new Error('NO_SUPPORTED_API_RECORDS');
  }
  return records.map(normalizeApiEntry);
}

/** Remove all API data so the next page load starts as a clean test environment. */
export function clearAllApiData() {
  if (typeof localStorage !== 'undefined') {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key === STORAGE_KEY || key.startsWith(RESET_STORAGE_PREFIX))) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  }
  if (typeof sessionStorage !== 'undefined') {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && (key === STORAGE_KEY || key.startsWith(RESET_STORAGE_PREFIX) || key === 'api-token-manager-auto')) keys.push(key);
    }
    keys.forEach(key => sessionStorage.removeItem(key));
  }
}

