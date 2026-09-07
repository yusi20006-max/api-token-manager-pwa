/**
 * Deterministic API error classification engine.
 */

export const ERROR_CODES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
  CORS_BLOCKED: 'CORS_BLOCKED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  UNSUPPORTED: 'UNSUPPORTED',
  UNKNOWN: 'UNKNOWN'
};

export function classifyError(err, response = null, responseBody = '') {
  if (err) {
    if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('timeout')) {
      return { code: ERROR_CODES.TIMEOUT, message: 'درخواست به دلیل انقضای زمان (Timeout) متوقف شد.' };
    }
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('load failed'))) {
      return { code: ERROR_CODES.CORS_BLOCKED, message: 'خطای شبکه یا CORS (لطفاً از دستور curl استفاده کنید).' };
    }
    return { code: ERROR_CODES.NETWORK_ERROR, message: err.message || 'خطای ناشناخته شبکه' };
  }

  if (response) {
    const status = response.status;
    let bodyLower = '';
    try {
      bodyLower = typeof responseBody === 'string' ? responseBody.toLowerCase() : JSON.stringify(responseBody || {}).toLowerCase();
    } catch {}

    if (status === 401) {
      if (bodyLower.includes('invalid') || bodyLower.includes('api key') || bodyLower.includes('token') || bodyLower.includes('credential')) {
        return { code: ERROR_CODES.INVALID_API_KEY, message: 'کلید API نامعتبر است (401 Unauthorized)' };
      }
      return { code: ERROR_CODES.UNAUTHORIZED, message: 'احراز هویت ناموفق بود (401 Unauthorized)' };
    }
    if (status === 403) {
      if (bodyLower.includes('quota') || bodyLower.includes('insufficient') || bodyLower.includes('balance') || bodyLower.includes('credit')) {
        return { code: ERROR_CODES.QUOTA_EXCEEDED, message: 'سهمیه یا اعتبار حساب به اتمام رسیده است (403 Forbidden)' };
      }
      return { code: ERROR_CODES.FORBIDDEN, message: 'دسترسی غیرمجاز (403 Forbidden)' };
    }
    if (status === 404) {
      return { code: ERROR_CODES.NOT_FOUND, message: 'آدرس یا منبع مورد نظر یافت نشد (404 Not Found)' };
    }
    if (status === 429) {
      return { code: ERROR_CODES.RATE_LIMITED, message: 'تعداد درخواست‌ها بیش از حد مجاز است (429 Rate Limited)' };
    }
    if (status >= 400 && status < 500) {
      return { code: ERROR_CODES.BAD_REQUEST, message: `خطای درخواست (وضعیت ${status} ${response.statusText || ''})`.trim() };
    }
    if (status >= 500) {
      return { code: ERROR_CODES.SERVER_ERROR, message: `خطای سرور (وضعیت ${status} ${response.statusText || ''})`.trim() };
    }
  }

  return { code: ERROR_CODES.UNKNOWN, message: 'خطای ناشناخته' };
}
