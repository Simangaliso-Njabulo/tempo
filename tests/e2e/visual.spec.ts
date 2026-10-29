import { expect, test } from '@playwright/test';
import { addFocusBlock } from './helpers';

const themes = ['dark', 'light'] as const;
const widths = [375, 393, 440] as const;

test.describe('visual @visual', () => {
  // Baselines are generated and reviewed on WebKit only. It is the engine the
  // iOS target actually runs, it is what CI compares, and one engine keeps the
  // baseline set small enough for a human to review every image.
  test.skip(({ browserName }) => browserName !== 'webkit', 'WebKit-only baselines');

  for (const theme of themes) {
    for (const width of widths) {
      test(`empty day ${theme} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`empty-${theme}-${width}.png`, { fullPage: true });
      });

      test(`planned day ${theme} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
        await page.goto('/');
        await addFocusBlock(page, { title: 'Deep work', start: '09:00' });
        await addFocusBlock(page, { title: 'Review', start: '10:00' });
        await page.getByRole('button', { name: 'Add block' }).click();
        await page.getByRole('tab', { name: 'Break' }).click();
        await page.getByLabel('Start time').fill('11:00');
        await page.getByRole('dialog').getByRole('button', { name: '15 min', exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`planned-${theme}-${width}.png`, { fullPage: true });
      });
    }

    test(`desktop planned day ${theme}`, async ({ page }) => {
      // The desktop layout is the third column in the feel contract: the tray
      // becomes a side panel at 1024 px and up, so it needs its own baseline.
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
      await page.goto('/');
      await addFocusBlock(page, { title: 'Deep work', start: '09:00', duration: '60' });
      await addFocusBlock(page, { title: 'Review', start: '10:00' });
      await page.getByLabel('Brain dump').fill('Draft the launch note');
      await page.getByLabel('Brain dump').press('Enter');
      await expect(
        page.getByRole('button', { name: 'Draft the launch note', exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`desktop-${theme}.png`, { fullPage: true });
    });

    test(`add sheet ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
      await page.goto('/');
      await page.getByRole('button', { name: 'Add block' }).click();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`add-sheet-${theme}.png`);
    });

    test(`reflow preview ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.clock.install({ time: new Date('2026-10-25T08:55:00') });
      await page.goto('/');
      await addFocusBlock(page, { title: 'Deep work', start: '09:00', duration: '60' });
      await addFocusBlock(page, { title: 'Review', start: '10:00' });
      await page.clock.fastForward(66 * 60 * 1000);
      await expect(page.getByText('1 block needs to move.')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`reflow-${theme}.png`);
    });

    test(`carried tray ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.clock.install({ time: new Date('2026-10-26T08:30:00') });
      await page.goto('/');
      await page.getByLabel('Brain dump').fill('Carried draft');
      await page.getByLabel('Brain dump').press('Enter');
      await page.evaluate(async () => {
        const request = indexedDB.open('tempo');
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const tx = db.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        const all = await new Promise<unknown[]>((resolve, reject) => {
          const read = store.getAll();
          read.onsuccess = () => resolve(read.result);
          read.onerror = () => reject(read.error);
        });
        const task = (all as Array<Record<string, unknown>>).find(
          (item) => item.title === 'Carried draft',
        );
        if (!task) throw new Error('Task not found');
        task.carriedFrom = '2026-10-25';
        const committed = new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        await new Promise<void>((resolve, reject) => {
          const put = store.put(task);
          put.onsuccess = () => resolve();
          put.onerror = () => reject(put.error);
        });
        await committed;
        db.close();
      });
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`carried-${theme}.png`);
    });
  }
});
