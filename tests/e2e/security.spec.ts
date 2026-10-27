import { expect, test } from '@playwright/test';

test('the production shell has a strict CSP and no third-party requests', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('http')) origins.add(new URL(url).origin);
  });

  await page.goto('/');
  await expect(page.getByText('TEMPO', { exact: true })).toBeVisible();

  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("style-src 'self'");
  expect(csp).not.toContain("'unsafe-inline'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'none'");

  expect(await page.locator('script:not([src])').count()).toBe(0);
  expect(await page.locator('style').count()).toBe(0);
  expect([...origins]).toEqual(['http://127.0.0.1:4173']);
});

test('task text is rendered as text, never as markup', async ({ page }) => {
  await page.goto('/');
  const title = '<img src=x onerror="window.__tempoXss=1">';
  await page.getByLabel('Brain dump').fill(title);
  await page.getByLabel('Brain dump').press('Enter');
  await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as { __tempoXss?: number }).__tempoXss)).toBeUndefined();
});
