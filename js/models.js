/**
 * Model intelligence normalization.
 * Never guess free/paid/vision/reasoning from the model name alone.
 */
export function normalizeModel(raw, providerId = 'custom') {
  if (!raw) return null;
  const id = String(raw.id || raw.name || '').trim();
  if (!id) return null;
  return {
    id,
    displayName: String(raw.displayName || raw.name || id),
    provider: String(raw.provider || providerId || 'custom'),
    providerModelId: String(raw.providerModelId || id),
    available: raw.available !== false,
    contextLength: raw.contextLength ?? raw.context_length ?? 'unknown',
    inputModalities: raw.inputModalities || raw.input_modalities || 'unknown',
    outputModalities: raw.outputModalities || raw.output_modalities || 'unknown',
    capabilities: raw.capabilities || 'unknown',
    pricing: normalizePricing(raw.pricing)
  };
}

export function normalizePricing(pricing) {
  // Only accept explicit evidence; otherwise UNKNOWN.
  if (!pricing || typeof pricing !== 'object') {
    return { tier: 'UNKNOWN', source: null, confidence: 'none' };
  }
  const tier = String(pricing.tier || pricing.level || '').toUpperCase();
  if (tier === 'FREE' || tier === 'PAID') {
    return {
      tier,
      source: pricing.source || 'provider',
      confidence: pricing.confidence || 'medium',
      freeTier: pricing.freeTier ?? null,
      limits: pricing.limits ?? null
    };
  }
  return { tier: 'UNKNOWN', source: pricing.source || null, confidence: pricing.confidence || 'none' };
}

export function normalizeModelList(list, providerId = 'custom') {
  if (!Array.isArray(list)) return [];
  return list.map(m => normalizeModel(m, providerId)).filter(Boolean);
}
