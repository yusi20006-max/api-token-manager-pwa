/**
 * Model discovery engine with capability-safe results.
 */

import { getAdapter } from './adapters.js';
import { classifyError } from './errors.js';

export async function discoverModels(api, timeoutMs = 12000) {
  const adapter = getAdapter(api.providerId || 'custom');
  if (!adapter.profile.capabilities.models && !api.testEndpoint) {
    return {
      success: false,
      status: 'unsupported',
      errorCode: 'NOT_SUPPORTED',
      errorMessage: 'این ارائه‌دهنده از کشف خودکار مدل پشتیبانی نمی‌کند.',
      models: []
    };
  }

  const { url, headers } = adapter.buildModelsRequest(api);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
      mode: 'cors'
    });
    clearTimeout(timeoutId);
    const text = await res.text().catch(() => '');

    if (!res.ok) {
      const errInfo = classifyError(null, res, text);
      return {
        success: false,
        status: res.status === 401 || res.status === 403 ? 'unauthorized' : 'failed',
        errorCode: errInfo.code,
        errorMessage: errInfo.message,
        httpStatus: res.status,
        models: []
      };
    }

    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false,
        status: 'malformed',
        errorCode: 'MALFORMED_RESPONSE',
        errorMessage: 'پاسخ سرور معتبر (JSON) نبود.',
        models: []
      };
    }

    const models = adapter.parseModelsResponse(json);
    return {
      success: true,
      status: models.length > 0 ? 'available' : 'empty',
      errorCode: null,
      errorMessage: models.length > 0 ? `${models.length} مدل کشف شد.` : 'کاتالوگ مدل‌ها خالی است.',
      models
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const errInfo = classifyError(err, null, null);
    return {
      success: false,
      status: 'network_error',
      errorCode: errInfo.code,
      errorMessage: errInfo.message,
      models: []
    };
  }
}
