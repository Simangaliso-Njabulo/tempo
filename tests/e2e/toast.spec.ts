import { expect, test } from '@playwright/test';
import { addFocusBlock } from './helpers';

async function openAt(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
  await page.goto('/');
}

test('the undo toast sits above the tray, never on its controls', async ({ page }) => {
  await openAt(page);
  await addFocusBlock(page, { title: 'Deep work', start: '09:00' });

  const toast = page.getByRole('status').filter({ hasText: 'Focus added.' });
  await expect(toast).toBeVisible();

  const toastBox = await toast.boundingBox();
  const trayBox = await page.getByRole('region', { name: 'Task tray' }).boundingBox();
  if (!toastBox || !trayBox) throw new Error('missing box');

  // The toast must stop before the tray starts.
  expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(trayBox.y + 1);

  // The tray controls stay exposed and usable under it.
  await expect(page.getByRole('button', { name: 'Add block' })).toBeVisible();
  await page.getByRole('button', { name: 'Add block' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('the tray keeps the toast above it when the tray grows', async ({ page }) => {
  await openAt(page);
  await addFocusBlock(page, { title: 'Deep work', start: '09:00' });
  await page.getByRole('button', { name: 'Plan' }).click();

  const toast = page.getByRole('status').filter({ hasText: 'Focus added.' });
  await expect(toast).toBeVisible();

  const toastBox = await toast.boundingBox();
  const trayBox = await page.getByRole('region', { name: 'Task tray' }).boundingBox();
  if (!toastBox || !trayBox) throw new Error('missing box');
  expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(trayBox.y + 1);
});
