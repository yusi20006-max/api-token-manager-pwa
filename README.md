# API Token Manager PWA — Health & Capability Manager

یک PWA محلی برای مدیریت توکن‌های API، سنجش سلامت، کشف مدل‌ها و تشخیص هوشمند پیکربندی.

## قابلیت‌ها

- افزودن / ویرایش / حذف API (نام، provider، Base URL، کلید، مدل، test endpoint، یادداشت)
- Smart Setup: ورود URL + کلید → 🔍 تشخیص خودکار (provider، Base URL، auth، مدل‌ها)
- Provider detection: OpenAI، Anthropic، OpenRouter، DeepSeek، Google Gemini، Groq، ZenMux، Custom
- Health Engine: `checkApi(api)` با نتیجه استاندارد `HealthResult`
- Error classification قطعی: `UNAUTHORIZED`، `FORBIDDEN`، `NOT_FOUND`، `RATE_LIMITED`، `SERVER_ERROR`، `TIMEOUT`، `CORS_BLOCKED`، `NETWORK_ERROR` و غیره (CORS هرگز با کلید نامعتبر اشتباه گرفته نمی‌شود)
- Model discovery: `discoverModels(api)` با تفکیک success / empty / auth-failed / CORS / network
- Capability matrix: `models`، `chat`، `responses`، `embeddings`، `streaming`، `vision`، `tools` با وضعیت `SUPPORTED` / `UNSUPPORTED` / `UNKNOWN` / `NOT_TESTED` (صرف وجود `/models` به معنی پشتیبانی inference نیست)
- Health score قطعی ۰–۱۰۰ همراه breakdown (reachability، auth، endpoint، models، latency؛ inference تست‌نشده = UNKNOWN)
- Model intelligence: metadata مدل با `pricing: FREE / PAID / UNKNOWN` — صرف وجود کلمه `free` در نام مدل به معنی رایگان بودن نیست
- Diagnostics view برای هر API (provider، auth، connectivity، CORS، latency، score)
- Dashboard کلی (total / healthy / warning / failed، میانگین latency)
- فیلتر provider و status + جستجوی موجود
- تاریخچه امن هر چک (timestamp، status، latency، errorCode — بدون secret)
- Auto-check با intervalهای ۵/۱۵/۳۰/۶۰ دقیقه، بدون duplicate timer
- Curl fallback برای CORS-blocked (نتیجه curl به‌عنوان browser result جعل نمی‌شود)
- Export امن: پیش‌فرض فقط پیکربندی بدون secret؛ export شامل secret فقط با تأیید صریح و هشدار
- ذخیره‌سازی محلی (LocalStorage) با migration سازگار
- PWA: manifest، service worker (`api-token-manager-v2`)، آفلاین، موبایل‌فرندلی

## ZenMux (target واقعی)

- Base URL canonical: `https://zenmux.ai/api/v1`
- Auth: `Authorization: Bearer <KEY>`
- Models: `GET /models`
- OpenAI-compatible: `POST /chat/completions`، `POST /responses`
- اگر مرورگر CORS را بلاک کند، نتیجه دقیق `CORS_BLOCKED` نمایش داده می‌شود، نه `INVALID_API_KEY`.

## تست‌ها

```bash
npm test
```

## امنیت

- هیچ کلیدی در console، history، HealthResult، error، DOM، URL، export پیش‌فرض یا git commit قرار نمی‌گیرد.
- CORS با احراز هویت ناموفق ترکیب نمی‌شود.

## لینک

https://github.com/yusi20006-max/api-token-manager-pwa
