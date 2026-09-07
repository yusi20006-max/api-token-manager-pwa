/**
 * Provider profiles and adapter registry.
 */

export const PROVIDERS = {
  custom: {
    id: 'custom',
    name: 'سفارشی (Custom)',
    baseUrl: '',
    authType: 'bearer',
    testEndpoint: '',
    model: '',
    capabilities: { models: true, inference: true }
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authType: 'bearer',
    testEndpoint: 'models',
    model: 'gpt-4o-mini',
    capabilities: { models: true, inference: true }
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    authType: 'x-api-key',
    testEndpoint: 'models',
    model: 'claude-3-5-sonnet-20241022',
    capabilities: { models: false, inference: true }
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    authType: 'bearer',
    testEndpoint: 'models',
    model: 'google/gemini-2.0-flash-exp:free',
    capabilities: { models: true, inference: true }
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    authType: 'bearer',
    testEndpoint: 'models',
    model: 'deepseek-chat',
    capabilities: { models: true, inference: true }
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authType: 'query',
    testEndpoint: 'models',
    model: 'gemini-2.5-flash',
    capabilities: { models: true, inference: true }
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    authType: 'bearer',
    testEndpoint: 'models',
    model: 'llama-3.3-70b-versatile',
    capabilities: { models: true, inference: true }
  },
  zenmux: {
    id: 'zenmux',
    name: 'ZenMux',
    baseUrl: 'https://zenmux.ai/api/v1',
    authType: 'bearer',
    testEndpoint: 'models',
    model: '',
    protocol: 'openai-compatible',
    endpoints: {
      models: 'GET /models',
      chat: 'POST /chat/completions',
      responses: 'POST /responses'
    },
    capabilities: { models: true, inference: true }
  }
};

export function getProviderProfile(providerId) {
  return PROVIDERS[providerId] || PROVIDERS.custom;
}

export function listProviders() {
  return Object.values(PROVIDERS);
}
