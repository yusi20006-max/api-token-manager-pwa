/**
 * Smart API Setup & Discovery Engine (Issue #8)
 */

import { getProviderProfile, listProviders } from './registry.js';
import { discoverModels } from './discovery.js';
import { checkApi } from './engine.js';
import { classifyError } from './errors.js';

/**
 * Normalizes input API URL into a clean canonical base URL.
 */
export function normalizeBaseUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return '';
  let trimmed = inputUrl.trim();
  if (!trimmed) return '';

  // Add protocol if missing
  if (!/^https?:\/\//i.test(trimmed)) {
    // If it looks like a domain or localhost/ip
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed) || trimmed.startsWith('localhost') || trimmed.includes(':')) {
      trimmed = 'https://' + trimmed;
    } else {
      return '';
    }
  }

  try {
    const parsed = new URL(trimmed);
    let pathname = parsed.pathname.replace(/\/+$/, '');

    // Normalize known common provider path suffixes
    if (/^\/v1\/v1$/i.test(pathname)) {
      pathname = '/v1';
    }

    // Handle zenmux or similar canonical forms
    if (parsed.hostname.includes('zenmux.ai')) {
      if (!pathname || pathname === '/' || pathname === '/api') {
        pathname = '/api/v1';
      }
    } else if (parsed.hostname.includes('openai.com')) {
      if (!pathname || pathname === '/') {
        pathname = '/v1';
      }
    } else if (parsed.hostname.includes('anthropic.com')) {
      if (!pathname || pathname === '/') {
        pathname = '/v1';
      }
    } else if (parsed.hostname.includes('openrouter.ai')) {
      if (!pathname || pathname === '/') {
        pathname = '/api/v1';
      }
    } else if (parsed.hostname.includes('deepseek.com')) {
      if (!pathname || pathname === '/') {
        pathname = '/v1';
      }
    } else if (parsed.hostname.includes('groq.com')) {
      if (!pathname || pathname === '/') {
        pathname = '/openai/v1';
      }
    }

    parsed.pathname = pathname;
    let result = parsed.toString().replace(/\/$/, '');
    return result;
  } catch {
    return '';
  }
}

/**
 * Detects provider from URL hostname or metadata.
 */
export function detectProvider(url) {
  if (!url) return 'custom';
  const lower = url.toLowerCase();

  if (lower.includes('zenmux.ai')) return 'zenmux';
  if (lower.includes('openai.com')) return 'openai';
  if (lower.includes('anthropic.com')) return 'anthropic';
  if (lower.includes('openrouter.ai')) return 'openrouter';
  if (lower.includes('deepseek.com')) return 'deepseek';
  if (lower.includes('googleapis.com') || lower.includes('generativelanguage')) return 'google';
  if (lower.includes('groq.com')) return 'groq';

  return 'custom';
}

/**
 * Detects authentication type based on provider profile or URL characteristics.
 */
export function detectAuthType(providerId, url) {
  if (providerId === 'zenmux') return 'bearer';
  if (providerId === 'openai') return 'bearer';
  if (providerId === 'anthropic') return 'x-api-key';
  if (providerId === 'openrouter') return 'bearer';
  if (providerId === 'deepseek') return 'bearer';
  if (providerId === 'google') return 'query';
  if (providerId === 'groq') return 'bearer';

  const profile = getProviderProfile(providerId);
  if (profile && profile.authType) return profile.authType;

  if (url && url.toLowerCase().includes('googleapis.com')) return 'query';
  return 'bearer';
}

/**
 * Full Smart Discovery Orchestration for an API input.
 */
export async function discoverApiConfiguration(inputUrl, apiKey) {
  const normalizedUrl = normalizeBaseUrl(inputUrl);
  if (!normalizedUrl) {
    return {
      success: false,
      error: 'INVALID_URL',
      message: 'آدرس URL معتبر نیست.'
    };
  }

  const providerId = detectProvider(normalizedUrl);
  const authType = detectAuthType(providerId, normalizedUrl);
  let providerName = providerId === 'zenmux' ? 'ZenMux' : getProviderProfile(providerId).name;

  const tempApi = {
    providerId: providerId === 'zenmux' ? 'custom' : providerId, // adapter support
    baseUrl: normalizedUrl,
    apiKey: apiKey || '',
    authType: authType
  };

  // If zenmux or custom OpenAI compatible, adjust base url if needed
  if (providerId === 'zenmux' && !normalizedUrl.endsWith('/api/v1')) {
    tempApi.baseUrl = normalizedUrl.replace(/\/$/, '') + '/api/v1';
  }

  // Run model discovery & health check
  const discoveryResult = await discoverModels(tempApi);
  const healthResult = await checkApi(tempApi);

  return {
    success: true,
    providerId: providerId === 'zenmux' ? 'custom' : providerId,
    providerName,
    baseUrl: tempApi.baseUrl,
    authType,
    protocol: 'OpenAI-compatible / REST',
    reachable: healthResult.reachable,
    authenticated: healthResult.authenticated,
    httpStatus: healthResult.httpStatus,
    latencyMs: healthResult.latencyMs,
    errorCode: healthResult.errorCode,
    errorMessage: healthResult.errorMessage,
    capabilities: {
      models: discoveryResult.success ? 'available' : 'unavailable',
      inference: healthResult.authenticated ? 'available' : 'unknown'
    },
    discoveredModels: discoveryResult.models || []
  };
}
