import { test, expect } from '@playwright/test';

test('PWA boots and uses delegated UI actions without inline handlers', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  expect(pageErrors).toEqual([]);
  await expect(page).toHaveTitle(/مدیر توکن‌های API/);
  await expect(page.locator('#addBtn')).toBeVisible();
  await expect(page.locator('#resetAllBtn')).toBeVisible();

  const inlineHandlers = await page.locator('[onclick]').count();
  expect(inlineHandlers).toBe(0);
});

test('reset clears managed state but preserves unrelated localStorage', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated-browser-test', 'keep'));

  await page.locator('#addBtn').click();
  await page.locator('#name').fill('Browser Test API');
  await page.locator('#baseUrl').fill('https://api.example.test/v1');
  await page.locator('#apiKey').fill('test-key');
  await page.locator('#apiForm button[type="submit"]').click();

  await expect(page.locator('.cards .card')).toHaveCount(1);

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#resetAllBtn').click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.locator('.cards .card')).toHaveCount(0);
  await expect(page.locator('#emptyState')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-browser-test'))).toBe('keep');
});

test('service worker is registered and dynamic model endpoint is not cached', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker API unavailable');
    await navigator.serviceWorker.ready;
  });

  const first = await page.evaluate(async () => {
    const response = await fetch('/models');
    return { status: response.status, body: await response.json() };
  });
  expect(first.status).toBe(200);
  expect(first.body.data[0].id).toBe('browser-test-model');

  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls = [];
    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      urls.push(...requests.map(request => request.url));
    }
    return urls;
  });

  expect(cachedUrls.some(url => url.endsWith('/models'))).toBe(false);
});
