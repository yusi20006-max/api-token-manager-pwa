import test from 'node:test';
import assert from 'node:assert';
import { classifyError, ERROR_CODES } from '../js/errors.js';

test('classifyError handles 401 unauthorized & invalid key', () => {
  const res = { status: 401, statusText: 'Unauthorized' };
  const errKey = classifyError(null, res, '{"error": {"message": "Invalid API Key provided"}}');
  assert.strictEqual(errKey.code, ERROR_CODES.INVALID_API_KEY);

  const errAuth = classifyError(null, res, 'Unauthorized');
  assert.strictEqual(errAuth.code, ERROR_CODES.UNAUTHORIZED);
});

test('classifyError handles 403 forbidden & quota', () => {
  const res = { status: 403, statusText: 'Forbidden' };
  const errQuota = classifyError(null, res, 'Insufficient quota or credit balance');
  assert.strictEqual(errQuota.code, ERROR_CODES.QUOTA_EXCEEDED);

  const errForbidden = classifyError(null, res, 'Access denied');
  assert.strictEqual(errForbidden.code, ERROR_CODES.FORBIDDEN);
});

test('classifyError handles 404, 429, 5xx', () => {
  assert.strictEqual(classifyError(null, { status: 404 }).code, ERROR_CODES.NOT_FOUND);
  assert.strictEqual(classifyError(null, { status: 429 }).code, ERROR_CODES.RATE_LIMITED);
  assert.strictEqual(classifyError(null, { status: 500 }).code, ERROR_CODES.SERVER_ERROR);
});

test('classifyError handles network and timeout errors', () => {
  const abortErr = new Error('Aborted');
  abortErr.name = 'AbortError';
  assert.strictEqual(classifyError(abortErr).code, ERROR_CODES.TIMEOUT);

  const netErr = new Error('Failed to fetch');
  assert.strictEqual(classifyError(netErr).code, ERROR_CODES.CORS_BLOCKED);
});
