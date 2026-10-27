import { expect, test } from '@playwright/test';
import { addFocusBlock } from './helpers';

test('overrun previews, applies, and undoes the shift', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-25T08:55:00') });
  await page.goto('/');

  await addFocusBlock(page, { title: 'Deep work', start: '09:00', duration: '60' });
  await addFocusBlock(page, { title: 'Review', start: '10:00' });

  // 09:00-10:00 overruns into the 10:00 block, so the rest of the day moves.
  await page.clock.fastForward(66 * 60 * 1000);

  await expect(page.getByText('1 block needs to move.')).toBeVisible();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('button', { name: /Review.*10:05/ })).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /Review.*10:00/ })).toBeVisible();
});

test('a completed overrun does not ask to reflow', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-25T08:55:00') });
  await page.goto('/');

  await addFocusBlock(page, { title: 'Finished early', start: '09:00', duration: '60' });
  await addFocusBlock(page, { title: 'Later work', start: '10:00' });

  await page.getByRole('button', { name: /Finished early/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Complete' }).click();

  await page.clock.fastForward(66 * 60 * 1000);
  await expect(page.getByText(/block needs to move/)).toBeHidden();
});
