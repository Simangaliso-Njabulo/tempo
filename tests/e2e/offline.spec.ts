import { expect, test } from '@playwright/test';

test('the built shell reloads with no network', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => 'serviceWorker' in navigator);

  // First load registers the worker. A second load lets it control the page.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText('TEMPO', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Task tray')).toBeVisible();

  await context.setOffline(false);
});
