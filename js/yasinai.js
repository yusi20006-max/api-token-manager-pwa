/**
 * Explicit API Token Manager -> Yasin-AI credential import boundary.
 * Credentials are sent only in POST bodies and are never included in URLs or diagnostics.
 */
const CONFIG_KEY = 'atm-yasinai-config';
const SESSION_TOKEN_KEY = 'atm-yasinai-bridge-token';

export function getYasinAIConfig() {
  let config = {};
  try { config = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch { config = {}; }
  return {
    baseUrl: String(config.baseUrl || '').replace(/\/$/, ''),
    bridgeToken: String(sessionStorage.getItem(SESSION_TOKEN_KEY) || '')
  };
}

export function saveYasinAIConfig({ baseUrl, bridgeToken }) {
  const normalized = String(baseUrl || '').trim().replace(/\/$/, '');
  if (!normalized) throw new Error('YASINAI_BASE_URL_REQUIRED');
  if (!/^https?:\/\//i.test(normalized)) throw new Error('YASINAI_BASE_URL_INVALID');
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ baseUrl: normalized }));
  sessionStorage.setItem(SESSION_TOKEN_KEY, String(bridgeToken || ''));
  return { baseUrl: normalized };
}

function safeError(status, code) {
  if (status === 401 || status === 403) return { code: 'BRIDGE_AUTH_FAILED', message: 'احراز هویت اتصال Yasin-AI ناموفق بود.' };
  if (status === 422) return { code: 'CREDENTIAL_NOT_HEALTHY', message: 'Yasin-AI اعتبارنامه را پس از اعتبارسنجی مجدد سالم تشخیص نداد.' };
  if (status === 400) return { code: 'INVALID_IMPORT_REQUEST', message: 'درخواست Import نامعتبر است.' };
  return { code: code || 'YASINAI_IMPORT_FAILED', message: 'Import به Yasin-AI ناموفق بود.' };
}

export async function importToYasinAI(api, config = getYasinAIConfig(), fetchImpl = fetch) {
  if (!api || api.status !== 'healthy' || !api.apiKey) return { success: false, ...safeError(422, 'CREDENTIAL_NOT_HEALTHY') };
  if (!config.baseUrl || !config.bridgeToken) return { success: false, code: 'YASINAI_CONFIG_REQUIRED', message: 'ابتدا اتصال Yasin-AI را تنظیم کنید.' };

  let response;
  try {
    response = await fetchImpl(config.baseUrl + '/v1/token/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-YasinAI-Bridge-Token': config.bridgeToken, Origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost' },
      body: JSON.stringify({
        provider: api.providerId || 'custom',
        credential: api.apiKey,
        model: api.model || undefined,
        baseUrl: api.baseUrl || undefined,
        label: api.name || undefined,
        metadata: { source: 'api-token-manager-pwa' }
      })
    });
  } catch {
    return { success: false, code: 'YASINAI_NETWORK_ERROR', message: 'اتصال به Yasin-AI برقرار نشد.' };
  }

  if (!response.ok) return { success: false, ...safeError(response.status) };

  let data;
  try { data = await response.json(); }
  catch { return { success: false, code: 'YASINAI_INVALID_RESPONSE', message: 'پاسخ Yasin-AI معتبر نبود.' }; }

  return { success: true, imported: data.imported === true, idempotent: data.idempotent === true, credential: data.credential, health: data.health };
}
