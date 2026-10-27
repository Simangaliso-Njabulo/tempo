import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
}

/**
 * Pin the clock before mounting: "Close day" only appears late in the day, so
 * an unpinned run audits a different DOM depending on when CI happens to run.
 */
async function openApp(page: Page) {
  await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
  await page.goto('/');
}

test.describe('accessibility @a11y', () => {
  test('day and sheets have no serious or critical axe violations', async ({ page }) => {
    await openApp(page);
    await expectNoSeriousViolations(page);

    await page.getByRole('button', { name: 'Add block' }).click();
    await expectNoSeriousViolations(page);
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByRole('button', { name: 'Settings' }).click();
    await expectNoSeriousViolations(page);
    await page.getByRole('button', { name: 'Data and backup' }).click();
    await expectNoSeriousViolations(page);
  });

  test('visible targets are at least 44 by 44 CSS pixels', async ({ page }) => {
    await openApp(page);
    const targets = await page
      .locator('button:visible, [role="button"]:visible, a:visible, input:visible, select:visible')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return {
            label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.tagName,
            width: box.width,
            height: box.height,
          };
        }),
      );

    for (const target of targets) {
      expect(target.width, `${target.label} width`).toBeGreaterThanOrEqual(44);
      expect(target.height, `${target.label} height`).toBeGreaterThanOrEqual(44);
    }
  });

  test('keyboard opens a block and Escape returns focus', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Add block' }).click();
    await page.getByLabel('Title').fill('Keyboard check');
    await page.getByLabel('Start time').fill('09:00');
    await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();

    const block = page.locator('#timeline').getByRole('button', { name: /Keyboard check/ });
    await block.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(block).toBeFocused();
  });
});
