import test from 'node:test';
import assert from 'node:assert';
import { getAdapter } from '../js/adapters.js';

test('adapter parses OpenAI/OpenRouter model list response', () => {
  const adapter = getAdapter('openai');
  const rawData = {
    data: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
    ]
  };
  const parsed = adapter.parseModelsResponse(rawData);
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].id, 'gpt-4o');
  assert.strictEqual(parsed[1].name, 'GPT-4o Mini');
  assert.strictEqual(parsed[0].available, true);
});
