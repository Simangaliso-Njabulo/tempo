import { expect, test } from '@playwright/test';

test('the built shell reloads with no network', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => 'serviceWorker' in navigator);

  // Registration is asynchronous. Reloading before the worker has activated
  // would leave the new document uncontrolled and the reload would prove
  // nothing, so wait for the activated worker first.
  await page.evaluate(async () => {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active?.state === 'activated') return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Service worker did not activate');
  });

  // The now-active worker controls the next document from its first request.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText('TEMPO', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Task tray')).toBeVisible();

  await context.setOffline(false);
});
