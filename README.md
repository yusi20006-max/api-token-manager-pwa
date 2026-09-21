# API Token Manager PWA — Health & Capability Manager

یک PWA محلی برای مدیریت توکن‌های API، سنجش سلامت، کشف مدل‌ها و تشخیص هوشمند پیکربندی.

## قابلیت‌ها

- افزودن / ویرایش / حذف API (نام، provider، Base URL، کلید، مدل، test endpoint، یادداشت)
- Smart Setup: ورود URL + کلید → 🔍 تشخیص خودکار (provider، Base URL، auth، مدل‌ها)
- Provider detection: OpenAI، Anthropic، OpenRouter، DeepSeek، Google Gemini، Groq، ZenMux، OrcaRouter، Custom
- Health Engine: `checkApi(api)` با نتیجه استاندارد `HealthResult`
- Error classification قطعی: `UNAUTHORIZED`، `FORBIDDEN`، `NOT_FOUND`، `RATE_LIMITED`، `SERVER_ERROR`، `TIMEOUT`، `CORS_BLOCKED`، `NETWORK_ERROR` و غیره. در مرورگر، خطای مبهم fetch به‌عنوان `NETWORK_ERROR` باقی می‌ماند و `CORS_BLOCKED` فقط با evidence صریح ثبت می‌شود.
- Model discovery: `discoverModels(api)` با تفکیک success / empty / auth-failed / CORS / network
- Capability matrix: `models`، `chat`، `responses`، `embeddings`، `streaming`، `vision`، `tools` با وضعیت `SUPPORTED` / `UNSUPPORTED` / `UNKNOWN` / `NOT_TESTED` (صرف وجود `/models` به معنی پشتیبانی inference نیست)
- Health score قطعی ۰–۱۰۰ همراه breakdown (reachability، auth، endpoint، models، latency؛ inference تست‌نشده = UNKNOWN)
- Model intelligence: metadata مدل با `pricing: FREE / PAID / UNKNOWN` — صرف وجود کلمه `free` در نام مدل به معنی رایگان بودن نیست
- Diagnostics view برای هر API (provider، auth، connectivity، CORS، latency، score)
- Dashboard کلی (total / healthy / warning / failed، میانگین latency)
- فیلتر provider و status + جستجوی موجود
- تاریخچه امن هر چک (timestamp، status، latency، errorCode — بدون secret)
- Auto-check با intervalهای ۵/۱۵/۳۰/۶۰ دقیقه، بدون duplicate timer
- Curl fallback برای مواردی که browser evidence صریحاً اجازه دهد؛ نتیجه curl به‌عنوان browser result جعل نمی‌شود
- Export امن: پیش‌فرض فقط پیکربندی بدون secret؛ export شامل secret فقط با تأیید صریح و هشدار
- ذخیره‌سازی محلی (LocalStorage) با migration سازگار
- PWA: manifest، service worker (`api-token-manager-v3`)، آفلاین، موبایل‌فرندلی؛ فقط assetهای static همان origin cache می‌شوند و API request/responseها cache نمی‌شوند

## OrcaRouter

- Base URL: `https://api.orcarouter.ai/v1`
- Auth: `Authorization: Bearer <KEY>`
- Models: `GET /models`
- OpenAI-compatible: `POST /chat/completions`، `POST /responses`
- Runtime smoke tests use mocked HTTP fixtures; live provider credentials are not required in CI.

## Google Gemini

- Auth: `x-goog-api-key: <KEY>`
- API keys are not placed in Google request URLs by the normal adapter or Smart Setup path.

## ZenMux (target واقعی)

- Base URL canonical: `https://zenmux.ai/api/v1`
- Auth: `Authorization: Bearer <KEY>`
- Models: `GET /models`
- OpenAI-compatible: `POST /chat/completions`، `POST /responses`
- اگر مرورگر CORS را بلاک کند، نتیجه دقیق `CORS_BLOCKED` نمایش داده می‌شود، نه `INVALID_API_KEY`.

## تست‌ها

Node regression suite:

```bash
npm test
```

Browser/PWA regression suite:

```bash
npm install
npx playwright install chromium
npx playwright test
```

این suite بدون credential واقعی provider اجرا می‌شود و boot، delegated UI، reset/storage isolation و Service Worker cache isolation را پوشش می‌دهد.

## قراردادهای امنیت و runtime

- هیچ کلیدی در console، history، HealthResult، error، DOM، URL، export پیش‌فرض یا git commit قرار نمی‌گیرد.
- CORS با احراز هویت ناموفق ترکیب نمی‌شود؛ browser-ambiguous fetch به‌طور صادقانه `NETWORK_ERROR` است.
- Smart Setup شواهد discovery و health را جدا نگه می‌دارد و در تضاد 401/200 حالت `CONFLICTING_EVIDENCE` را گزارش می‌کند.
- Capability Matrix یک evidence ledger است: `SUPPORTED` فقط با evidence واقعی ثبت می‌شود و `UNKNOWN`/`NOT_TESTED` به معنی عدم اجرای inference probe است.
- Reset فقط state مدیریت‌شده API/session را پاک می‌کند و state نامرتبط را دست‌نخورده می‌گذارد.
- Service Worker فقط assetهای static همان origin را cache می‌کند؛ requestهای provider API، `Authorization` و query-authenticated URLs cache نمی‌شوند.

جزئیات قراردادها در `docs/PROVIDER-RUNTIME-CONTRACT.md` و `docs/CORS-ERROR-CONTRACT.md` نگهداری می‌شود.

## لینک

https://github.com/yusi20006-max/api-token-manager-pwa


## اجرا و Runbook

این پروژه یک **static PWA** است و bundler یا build/dev server اختصاصی ندارد. اجرای محلی برای پذیرش UI با یک HTTP server ساده انجام می‌شود.

### اجرای محلی PWA در Termux / Android

`bash
cd ~/api-token-manager-pwa
python -m http.server 8090
`

سپس:

`text
http://127.0.0.1:8090/
`

برای اجرای server در پورت دیگر، همان دستور را با پورت آزاد جایگزین کنید.

**نکته:** این server فقط فایل‌های static را سرو می‌کند و backend API برای پروژه ایجاد نمی‌کند.

### تست‌های محلی

Node regression:

`bash
cd ~/api-token-manager-pwa
npm test
`

آخرین پذیرش نسخه `v1.0.0`:

`text
60/60 tests passed
`

### Browser/PWA regression

Suite مرورگر در CI با Ubuntu و Chromium اجرا می‌شود:

`bash
npm install
npx playwright install chromium
npx playwright test
`

این suite boot، delegated UI، reset/storage isolation و Service Worker cache isolation را بررسی می‌کند و به credential واقعی provider نیاز ندارد.

**محدودیت Termux/Android:** نصب و اجرای Playwright Chromium به‌صورت native روی Android توسط Playwright پشتیبانی نمی‌شود و با خطای:

`Unsupported platform: android`

متوقف می‌شود. این یک محدودیت محیط اجرای تست است، نه شکست محصول. Browser/PWA CI برای commit نهایی `a00e8fc` با موفقیت PASS شده است.

### GitHub Pages

انتشار hosted پروژه از GitHub Pages انجام می‌شود. وضعیت deploy نسخه `v1.0.0` در GitHub Actions باید از workflow مربوط به Pages بررسی شود.

## مسیرهای اجرای تأییدشده

| هدف | روش | وضعیت |
| --- | --- | --- |
| توسعه/مشاهده محلی PWA | `python -m http.server 8090` | PASS |
| تست JavaScript/Node | `npm test` | PASS — 60/60 |
| Browser/PWA | GitHub Actions + Playwright/Chromium | PASS |
| Browser/PWA روی native Termux | Playwright Chromium | BLOCKED — Android unsupported |
| Hosted PWA | GitHub Pages | PASS |
| Release | Git tag + GitHub Release | `v1.0.0` |

## مشکلات اولیه، راه‌حل‌ها و نکات عملیاتی

### 1. اجرای Browser suite با `npm run test:browser`

این script در `package.json` تعریف نشده بود. بنابراین دستور درست اجرای suite، مطابق workflow و README، مستقیم با Playwright است:

`bash
npm install
npx playwright install chromium
npx playwright test
`

### 2. `npm ci` در repository

repository در این release فایل `package-lock.json` ندارد؛ بنابراین `npm ci` قابل استفاده نیست و با خطای نبود lockfile متوقف می‌شود.

راه درست برای نصب وابستگی‌های توسعه‌ای در این repository:

`bash
npm install
`

فایل‌های `node_modules/` و `package-lock.json` تولیدشده در تست محلی نباید به این release commit شوند مگر اینکه سیاست dependency management پروژه تغییر کند.

### 3. Playwright روی native Termux

دستور:

`bash
npx playwright install chromium
`

روی Android/Termux با `Unsupported platform: android` متوقف شد. `npx playwright test` نیز به همان دلیل قابل اجرای native نیست.

راه‌حل عملی استفاده از Browser/PWA CI در GitHub Actions است؛ این مسیر روی Ubuntu/Chromium اجرا و برای commit نهایی PASS شد. تست native Termux به‌عنوان **environment limitation** ثبت شده و به‌عنوان product failure تلقی نمی‌شود.

### 4. تداخل پورت هنگام اجرای server محلی

در یک اجرای اولیه، پورت `8080` همزمان با ترافیک OpenFeed استفاده شد و درخواست‌هایی مانند `/api/status`، `/api/channel/*` و `/api/image` به static server پروژه رسیدند و 404 شدند.

این درخواست‌ها متعلق به OpenFeed بودند، نه API Token Manager PWA.

برای پذیرش محلی پروژه از یک پورت جدا استفاده شد:

`bash
cd ~/api-token-manager-pwa
python -m http.server 8090
`

سپس PWA در `http://127.0.0.1:8090/` با موفقیت باز و بررسی شد.

### 5. Service Worker و API cache

در نسخه نهایی، Service Worker فقط assetهای static همان origin را cache می‌کند. API request/responseها، از جمله provider APIها و `/models`، cache نمی‌شوند.

Browser regression این isolation را به‌صورت مشخص بررسی می‌کند.

### 6. Google authentication

Google Gemini از header زیر استفاده می‌کند:

`text
x-goog-api-key: <KEY>
`

کلید در URL قرار نمی‌گیرد.

### 7. CORS و تشخیص خطا

در browser، fetch مبهم نباید به‌صورت خودکار `INVALID_API_KEY` یا `CORS_BLOCKED` اعلام شود. در نبود evidence صریح، نتیجه `NETWORK_ERROR` است و `CORS_BLOCKED` فقط با evidence مناسب ثبت می‌شود.

### 8. Reset و storage isolation

Reset فقط state مدیریت‌شده API/session را پاک می‌کند و storage نامرتبط را دست‌نخورده می‌گذارد. Browser regression این رفتار را بررسی می‌کند.

### 9. Smart Setup و evidence

Smart Setup شواهد discovery و health را از هم جدا می‌کند. در صورت شواهد متناقض، مانند 401 در برابر 200، وضعیت `CONFLICTING_EVIDENCE` به‌جای نتیجه‌گیری نادرست گزارش می‌شود.

### 10. Capability Matrix و OrcaRouter

وجود `/models` به‌تنهایی به معنی پشتیبانی inference نیست. Capabilityها فقط با evidence واقعی `SUPPORTED` می‌شوند و موارد تست‌نشده `UNKNOWN` یا `NOT_TESTED` باقی می‌مانند.

OrcaRouter در نسخه نهایی runtime smoke coverage برای:

`text
/models
/chat/completions
/responses
`

دارد و تست‌ها با HTTP fixture اجرا می‌شوند؛ credential واقعی provider برای CI لازم نیست.

## تاریخچه اجرای پروژه تا v1.0.0

در مسیر نهایی، gap/regression audit به مجموعه‌ای از اصلاحات مستقل تبدیل شد و به‌ترتیب merge شد:

- #35 Service Worker / API cache isolation → PR #45
- #36 CORS runtime contract → PR #46
- #37 Google header authentication → PR #47
- #38 حذف automation قدیمی Phase 6 → PR #48
- #49 Smart Setup alignment → PR #50
- #39 Smart Setup auth evidence → PR #51
- #40 reset single invocation → PR #52
- #41 جداسازی UI از storage → PR #53
- #42 browser/PWA regression suite → PR #54
- #43 provider/runtime documentation → PR #55
- #44 OrcaRouter runtime smoke → PR #56

تمام موارد فوق merge شدند و release نهایی روی:

`a00e8fcbe4f6345ee762173086b4d67110080cdd`

قرار گرفت.

## Release v1.0.0

`text
Release: v1.0.0
Commit:  a00e8fcbe4f6345ee762173086b4d67110080cdd
Branch:  main
`

Release شامل این محورهای اصلی است:

- API token CRUD و local storage امن
- Smart Setup و provider detection
- Health checks و deterministic error classification
- Model discovery و capability matrix
- Google Gemini header authentication
- OrcaRouter runtime smoke coverage
- Service Worker API-cache isolation
- Browser/PWA regression coverage
- GitHub Pages deployment support

## Acceptance record

آخرین پذیرش release:

`text
Main synced and clean
Node tests: 60/60 PASS
Browser/PWA CI: PASS
GitHub Pages: PASS
Local PWA on Termux: PASS
Native Termux Playwright: BLOCKED (Android unsupported)
Release v1.0.0: PASS
`

این repository برای implementation جزئیات را نگه می‌دارد؛ مستندات سیستم‌سطح در YASIN-DOCS و قواعد عملیاتی در Yasin-Operations نگهداری می‌شوند.
