import { expect, type Page } from '@playwright/test';

export async function addFocusBlock(
  page: Page,
  input: { title: string; start: string; duration?: '15' | '30' | '45' | '60' | '90' },
) {
  await page.getByRole('button', { name: 'Add block' }).click();
  await page.getByRole('tab', { name: 'Focus' }).click();
  await page.getByLabel('Title').fill(input.title);
  await page.getByLabel('Start time').fill(input.start);
  const duration = input.duration ?? '30';
  const durationLabel = duration === '60' ? '1h' : duration === '90' ? '1h 30m' : `${duration} min`;
  await page.getByRole('dialog').getByRole('button', { name: durationLabel, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

export async function addTask(page: Page, title: string) {
  await page.getByLabel('Brain dump').fill(title);
  await page.getByLabel('Brain dump').press('Enter');
  await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
}

/**
 * Drag a tray chip onto the timeline at a given minute of the day.
 *
 * The timeline is scrolled so the target minute is visible, then the drop
 * point is measured from the live scroll offset. Scrolling to the top and
 * aiming at 09:00 would land outside the viewport on a phone.
 */
export async function dragToTimeline(page: Page, sourceName: string, startMinute: number) {
  const source = page.getByRole('button', { name: sourceName, exact: true });
  const box = await source.boundingBox();
  if (!box) throw new Error('Drag source has no box');

  const timeline = page.locator('#timeline');
  const minuteOffset = (startMinute / 60) * 88;
  const scrollTop = Math.max(0, minuteOffset - 160);
  await timeline.evaluate((element, top) => {
    element.scrollTop = top;
  }, scrollTop);

  const target = await timeline.boundingBox();
  if (!target) throw new Error('Timeline has no box');

  const y = target.y + minuteOffset - scrollTop;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 80, y, { steps: 12 });
  await page.mouse.up();
}
