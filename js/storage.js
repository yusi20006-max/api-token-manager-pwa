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
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Global bridge for the inline `onclick` used by the token-row details button. */
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

  window.addEventListener('DOMContentLoaded', () => {
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async () => {
          const file = input.files && input.files[0];
          if (!file) return;
          try {
            const restored = parseRestoreFileText(await file.text());
            if (!confirm(`${restored.length} مورد وارد شود؟`)) return;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
            window.location.reload();
          } catch (err) {
            const message = err && err.message === 'INVALID_JSON'
              ? 'فایل JSON معتبر نیست.'
              : err && err.message === 'NO_SUPPORTED_API_RECORDS'
                ? 'ساختار فایل معتبر است اما رکورد API قابل پشتیبانی پیدا نشد.'
                : 'خطا در خواندن یا اعتبارسنجی فایل JSON.';
            alert(message);
          }
        };
        input.click();
      };
    }

    // Add a single reset control without changing the existing compact toolbar markup.
    const toolbar = document.querySelector('.toolbar');
    const checkAllBtn = document.getElementById('checkAllBtn');
    if (!toolbar || !checkAllBtn || document.getElementById('resetAllBtn')) return;

    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetAllBtn';
    resetBtn.className = 'btn-ghost';
    resetBtn.type = 'button';
    resetBtn.textContent = '🧹 ریست / پاک کردن همه';
    resetBtn.title = 'حذف همه APIهای ذخیره‌شده و شروع تست تمیز';
    resetBtn.onclick = () => {
      if (!confirm('همه APIها و داده‌های تست محلی پاک شوند؟ این کار قابل بازگشت نیست.')) return;
      clearAllApiData();
      sessionStorage.removeItem('api-token-manager-auto');
      window.location.reload();
    };
    checkAllBtn.insertAdjacentElement('afterend', resetBtn);
  });
}
