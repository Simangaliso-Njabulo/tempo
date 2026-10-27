import { test } from '@playwright/test';

test('visual fixture break text', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add block' }).click();
  await page.getByLabel('Title').fill('Deep work');
  await page.getByLabel('Start time').fill('09:00');
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add block' }).click();
  await page.getByLabel('Title').fill('Review');
  await page.getByLabel('Start time').fill('10:00');
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add block' }).click();
  await page.getByRole('tab', { name: 'Break' }).click();
  await page.getByLabel('Start time').fill('11:00');
  await page.getByRole('dialog').getByRole('button', { name: '15 min', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();

  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('article[role="button"]')].map((el) => ({
      label: el.getAttribute('aria-label'),
      text: (el.textContent ?? '').trim(),
      bodyClass: (el.firstElementChild as HTMLElement | null)?.className ?? '',
    })),
  );
  console.log('BLOCKS ' + JSON.stringify(blocks, null, 1));
});
