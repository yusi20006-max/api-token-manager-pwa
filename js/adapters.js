/**
 * Provider-aware health and model discovery adapters.
 */

import { getProviderProfile } from './registry.js';
import { normalizeModelList } from './models.js';

export function getAdapter(providerId) {
  const profile = getProviderProfile(providerId || 'custom');

  return {
    id: profile.id,
    name: profile.name,
    profile,

    buildRequest(api) {
      let baseUrl = (api.baseUrl || profile.baseUrl || '').replace(/\/$/, '');
      let authType = api.authType || profile.authType || 'bearer';
      let apiKey = api.apiKey || '';
      let testEndpoint = api.testEndpoint || profile.testEndpoint || '';

      let url = baseUrl;
      if (testEndpoint) {
        url = testEndpoint.startsWith('http')
          ? testEndpoint
          : `${baseUrl}/${testEndpoint.replace(/^\//, '')}`;
      } else if (api.model || profile.model) {
        if (profile.id === 'google') {
          url = `${baseUrl}/models`;
        } else if (baseUrl.endsWith('/v1')) {
          url = `${baseUrl}/models`;
        } else {
          url = `${baseUrl}/v1/models`;
        }
      }

      const headers = { 'Accept': 'application/json' };

      if (authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (authType === 'x-api-key') {
        if (profile.id === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['x-api-key'] = apiKey;
        }
      } else if (authType === 'query') {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}key=${encodeURIComponent(apiKey)}`;
      }

      return { url, headers, authType };
    },

    buildModelsRequest(api) {
      let baseUrl = (api.baseUrl || profile.baseUrl || '').replace(/\/$/, '');
      let authType = api.authType || profile.authType || 'bearer';
      let apiKey = api.apiKey || '';

      let url = `${baseUrl}/models`;
      if (profile.id === 'google') {
        url = `${baseUrl}/models`;
      }

      const headers = { 'Accept': 'application/json' };
      if (authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (authType === 'x-api-key') {
        if (profile.id === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['x-api-key'] = apiKey;
        }
      } else if (authType === 'query') {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}key=${encodeURIComponent(apiKey)}`;
      }

      return { url, headers };
    },

    parseModelsResponse(data) {
      if (!data) return [];
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data.models)) {
        list = data.models;
      }

      return normalizeModelList(list, profile.id);
    },

    buildCurl(api) {
      const { url, headers, authType } = this.buildRequest(api);
      let cmd = 'curl -sS';
      for (const [k, v] of Object.entries(headers)) {
        cmd += ` -H "${k}: ${v}"`;
      }
      cmd += ` "${url}"`;
      return cmd;
    }
  };
}
