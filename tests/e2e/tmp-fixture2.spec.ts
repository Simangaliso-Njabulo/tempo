import { test } from '@playwright/test';
import { addFocusBlock } from './helpers';

test('spec fixture break text', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
  await page.goto('/');
  await addFocusBlock(page, { title: 'Deep work', start: '09:00' });
  await addFocusBlock(page, { title: 'Review', start: '10:00' });
  await page.getByRole('button', { name: 'Add block' }).click();
  await page.getByRole('tab', { name: 'Break' }).click();
  await page.getByLabel('Start time').fill('11:00');
  await page.getByRole('dialog').getByRole('button', { name: '15 min', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
  await page.waitForTimeout(200);

  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('article[role="button"]')].map((el) => ({
      label: el.getAttribute('aria-label'),
      text: (el.textContent ?? '').trim(),
    })),
  );
  console.log('FIXTURE ' + JSON.stringify(blocks));
});
