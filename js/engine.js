/**
 * Provider-agnostic API Health Check Engine.
 */

import { createHealthResult } from './contract.js';
import { classifyError, ERROR_CODES } from './errors.js';
import { getAdapter } from './adapters.js';

export async function checkApi(api, timeoutMs = 12000) {
  const adapter = getAdapter(api.providerId || 'custom');
  const { url, headers } = adapter.buildRequest(api);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
      mode: 'cors'
    });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);
    const text = await res.text().catch(() => '');

    if (res.ok) {
      let authenticated = true;
      let modelMatch = true;
      let msg = `✓ وضعیت ${res.status} — ${latencyMs}ms`;

      if (api.model && text) {
        const found = text.toLowerCase().includes(api.model.toLowerCase());
        if (!found) {
          modelMatch = false;
          msg = `✗ کلید اوکی است ولی مدل «${api.model}» در خروجی یافت نشد — ${latencyMs}ms`;
        } else {
          msg = `✓ مدل «${api.model}» تأیید شد — ${latencyMs}ms`;
        }
      }

      return createHealthResult({
        status: modelMatch ? 'healthy' : 'partial',
        reachable: true,
        authenticated: true,
        httpStatus: res.status,
        latencyMs,
        errorCode: null,
        errorMessage: msg,
        capabilities: {
          models: 'available',
          inference: 'available'
        }
      });
    } else {
      const errInfo = classifyError(null, res, text);
      return createHealthResult({
        status: 'failed',
        reachable: true,
        authenticated: ![401, 403].includes(res.status),
        httpStatus: res.status,
        latencyMs,
        errorCode: errInfo.code,
        errorMessage: `${errInfo.message} (${latencyMs}ms)`,
        capabilities: {
          models: [401, 403].includes(res.status) ? 'unavailable' : 'unknown',
          inference: 'unknown'
        }
      });
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);
    const errInfo = classifyError(err, null, null);

    return createHealthResult({
      status: 'failed',
      reachable: errInfo.code !== ERROR_CODES.TIMEOUT && errInfo.code !== ERROR_CODES.CORS_BLOCKED && errInfo.code !== ERROR_CODES.NETWORK_ERROR ? null : false,
      authenticated: null,
      httpStatus: null,
      latencyMs,
      errorCode: errInfo.code,
      errorMessage: `${errInfo.message} — ${latencyMs}ms`,
      capabilities: {
        models: 'unavailable',
        inference: 'unavailable'
      }
    });
  }
}
