import { expect, test } from '@playwright/test';
import { addTask } from './helpers';

test('unfinished work returns quietly at midnight with a carried badge', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-25T22:50:00') });
  await page.goto('/');

  await addTask(page, 'Unfinished draft');
  await page.getByRole('button', { name: 'Place Unfinished draft' }).click();
  await page.getByLabel('Start time').fill('23:00');
  await page.getByRole('dialog').getByRole('button', { name: '30 min', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByRole('button', { name: /Task Unfinished draft/ })).toBeVisible();
  await page.clock.fastForward(80 * 60 * 1000);

  const carried = page.getByRole('button', { name: /^Unfinished draft/ });
  await expect(carried).toBeVisible();
  await expect(carried.getByText('Carried over')).toBeVisible();
  await expect(page.getByRole('button', { name: /Task Unfinished draft/ })).toBeHidden();
});

test('a completed task does not carry over', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-25T22:50:00') });
  await page.goto('/');

  await addTask(page, 'Finished today');
  await page.getByRole('button', { name: 'Place Finished today' }).click();
  await page.getByLabel('Start time').fill('23:00');
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: /Task Finished today/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Complete' }).click();

  await page.clock.fastForward(80 * 60 * 1000);

  await expect(page.getByRole('button', { name: 'Finished today', exact: true })).toBeHidden();
  await expect(page.getByText('Carried over')).toBeHidden();
});
