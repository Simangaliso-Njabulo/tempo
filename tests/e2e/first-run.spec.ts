import { expect, test } from '@playwright/test';
import { addTask, dragToTimeline } from './helpers';

test('brain dump, drag to the timeline, and undo the placement', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
  await page.goto('/');

  await addTask(page, 'Write the brief');
  await dragToTimeline(page, 'Write the brief', 9 * 60);

  const block = page.getByRole('button', { name: /Write the brief.*9:00/ });
  await expect(block).toBeVisible();
  await expect(page.getByRole('button', { name: 'Place Write the brief' })).toBeHidden();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(block).toBeHidden();
  await expect(page.getByRole('button', { name: 'Write the brief', exact: true })).toBeVisible();
});

test('a task can be placed without dragging', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
  await page.goto('/');

  await addTask(page, 'Place with a button');
  await page.getByRole('button', { name: 'Place Place with a button' }).click();
  await page.getByLabel('Start time').fill('14:00');
  await page.getByRole('button', { name: '45 min' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByRole('button', { name: /Task Place with a button/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Place Place with a button' })).toBeHidden();
});
