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

/**
 * Extract API records from supported backup shapes without mutating state.
 * Supported: [...], {apis:[...]}, {data:[...]}, {tokens:[...]}, {items:[...]},
 * and one nested data wrapper such as {data:{apis:[...]}}.
 */
export function extractImportRecords(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return null;

  const directKeys = ['apis', 'tokens', 'items'];
  for (const key of directKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  if (data.data && typeof data.data === 'object') {
    if (Array.isArray(data.data)) return data.data;
    for (const key of directKeys) {
      if (Array.isArray(data.data[key])) return data.data[key];
    }
  }

  return null;
}

export function restoreApisFromPayload(data) {
  const records = extractImportRecords(data);
  if (!records || !records.length || records.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('NO_SUPPORTED_API_RECORDS');
  }
  return records.map(normalizeApiEntry);
}

/**
 * Global bridge for the inline `onclick` used by the token-row details button.
 * index.html is an ES module, so its local toggleDetails function is not on window.
 * Expose a single safe browser handler while keeping Node tests/browser imports valid.
 */
export function toggleDetails(id) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('details-' + id);
  if (!el) return;
  const wasOpen = el.classList.contains('open');

  document.querySelectorAll('.card-details.open').forEach(other => {
    other.classList.remove('open');
    const otherId = other.id.replace(/^details-/, '');
    const otherBtn = document.querySelector('[data-details-btn="' + otherId + '"]');
    if (otherBtn) {
      otherBtn.textContent = 'مشخصات';
      otherBtn.setAttribute('aria-expanded', 'false');
    }
  });

  if (!wasOpen) {
    el.classList.add('open');
    const btn = document.querySelector('[data-details-btn="' + id + '"]');
    if (btn) {
      btn.textContent = 'بستن';
      btn.setAttribute('aria-expanded', 'true');
    }
  }
}

if (typeof window !== 'undefined') {
  window.toggleDetails = toggleDetails;

  // Replace the legacy importer after the document has been parsed. This keeps
  // index.html backward-compatible while guaranteeing validation before state replacement.
  window.addEventListener('DOMContentLoaded', () => {
    const importBtn = document.getElementById('importBtn');
    if (!importBtn) return;

    importBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          const records = extractImportRecords(data);
          if (!records || !records.length) {
            throw new Error('NO_SUPPORTED_API_RECORDS');
          }
          if (records.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
            throw new Error('INVALID_API_RECORD');
          }
          const restored = restoreApisFromPayload(data);
          if (!confirm(`${restored.length} مورد وارد شود؟`)) return;

          // Only replace state after the complete payload has parsed and normalized.
          // The app's module scope exposes `apis`/`save`/`render` only internally, so
          // dispatch a typed event consumed by the page rather than touching storage here.
          window.dispatchEvent(new CustomEvent('api-token-manager:restore', { detail: restored }));
        } catch (err) {
          const message = err && err.message === 'NO_SUPPORTED_API_RECORDS'
            ? 'هیچ رکورد API قابل پشتیبانی در فایل پیدا نشد.'
            : 'خطا در خواندن یا اعتبارسنجی فایل JSON.';
          window.dispatchEvent(new CustomEvent('api-token-manager:restore-error', { detail: message }));
        }
      };
      input.click();
    };
  });
}
