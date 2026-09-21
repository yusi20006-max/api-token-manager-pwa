import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { getAdapter } from '../js/adapters.js';

test('OrcaRouter runtime smoke covers models, chat, and responses with mocked HTTP', async () => {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, url: req.url, authorization: req.headers.authorization, body });

    if (req.url === '/v1/models') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: 'orcarouter/auto' }] }));
      return;
    }

    if (req.url === '/v1/chat/completions' || req.url === '/v1/responses') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'mock-response', output_text: 'ok' }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = 'http://127.0.0.1:' + port + '/v1';
  const apiKey = 'test-orca-key';
  const adapter = getAdapter('orcarouter');

  try {
    const modelsRequest = adapter.buildEndpointRequest({ baseUrl, apiKey, authType: 'bearer' }, 'models');
    assert.equal(modelsRequest.method, 'GET');
    assert.equal(modelsRequest.url, baseUrl + '/models');
    assert.equal(modelsRequest.headers.Authorization, 'Bearer ' + apiKey);

    const modelsResponse = await fetch(modelsRequest.url, { method: modelsRequest.method, headers: modelsRequest.headers });
    assert.equal(modelsResponse.status, 200);
    assert.deepEqual(adapter.parseModelsResponse(await modelsResponse.json()).map(m => m.id), ['orcarouter/auto']);

    const chatBody = { model: 'orcarouter/auto', messages: [{ role: 'user', content: 'hello' }] };
    const chatRequest = adapter.buildEndpointRequest({ baseUrl, apiKey, authType: 'bearer' }, 'chat', chatBody);
    assert.equal(chatRequest.method, 'POST');
    assert.equal(chatRequest.url, baseUrl + '/chat/completions');
    assert.equal(chatRequest.headers.Authorization, 'Bearer ' + apiKey);
    assert.deepEqual(JSON.parse(chatRequest.body), chatBody);

    const chatResponse = await fetch(chatRequest.url, { method: chatRequest.method, headers: chatRequest.headers, body: chatRequest.body });
    assert.equal(chatResponse.status, 200);
    assert.equal((await chatResponse.json()).output_text, 'ok');

    const responsesBody = { model: 'orcarouter/auto', input: 'hello' };
    const responsesRequest = adapter.buildEndpointRequest({ baseUrl, apiKey, authType: 'bearer' }, 'responses', responsesBody);
    assert.equal(responsesRequest.method, 'POST');
    assert.equal(responsesRequest.url, baseUrl + '/responses');
    assert.deepEqual(JSON.parse(responsesRequest.body), responsesBody);

    const responsesResponse = await fetch(responsesRequest.url, { method: responsesRequest.method, headers: responsesRequest.headers, body: responsesRequest.body });
    assert.equal(responsesResponse.status, 200);
    assert.equal((await responsesResponse.json()).id, 'mock-response');

    assert.deepEqual(requests.map(r => [r.method, r.url]), [['GET', '/v1/models'], ['POST', '/v1/chat/completions'], ['POST', '/v1/responses']]);
    assert.ok(requests.every(r => r.authorization === 'Bearer ' + apiKey));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
