import { expect, test } from '@playwright/test';
import { addFocusBlock, addTask, dragToTimeline } from './helpers';

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

// The hint is gated on an iOS user agent (D-021), so only the iOS project sees it.
test.describe('install hint', () => {
  test.skip(({ browserName }) => browserName !== 'webkit', 'Install hint is iOS-only (D-021).');

  test('appears in the tray footer, never over the composer', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 664 });
    await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
    await page.goto('/');

    const hint = page.getByRole('button', { name: /Keep TEMPO one tap away/ });

    // Never on the first plan.
    await addFocusBlock(page, { title: 'First block', start: '09:00' });
    await expect(hint).toBeHidden();

    await addFocusBlock(page, { title: 'Second block', start: '10:00' });
    await expect(hint).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dismiss install tip' })).toBeVisible();

    const hintBox = await hint.boundingBox();
    const inputBox = await page.getByLabel('Brain dump').boundingBox();
    const trayBox = await page.getByRole('region', { name: 'Task tray' }).boundingBox();
    if (!hintBox || !inputBox || !trayBox) throw new Error('missing box');

    // It is a footer: below the brain dump, inside the tray, on top of nothing.
    expect(hintBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height);
    expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(trayBox.y + trayBox.height + 1);

    // It is reachable, not just painted over the tray.
    await hint.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Add to Home Screen');
  });
});
