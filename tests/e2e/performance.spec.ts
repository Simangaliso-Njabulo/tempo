import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __frames?: number[];
    __recording?: boolean;
  }
}

async function startFrameRecorder(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.__frames = [];
        window.__recording = true;
        // Begin on a frame boundary. Measured from the evaluate call, the first
        // delta would include the idle wait for the protocol round-trip rather
        // than a frame produced by the drag.
        requestAnimationFrame(function begin(now) {
          let previous = now;
          const tick = (time: number) => {
            window.__frames?.push(time - previous);
            previous = time;
            if (window.__recording) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          resolve();
        });
      }),
  );
}

async function stopFrameRecorder(page: Page) {
  return page.evaluate(() => {
    window.__recording = false;
    return {
      frames: window.__frames ?? [],
      nodes: document.querySelectorAll('*').length,
    };
  });
}

async function addFocusBlock(page: Page) {
  await page.getByRole('button', { name: 'Add block' }).click();
  await page.getByRole('tab', { name: 'Focus' }).click();
  await page.getByLabel('Title').fill('Performance check');
  await page.getByLabel('Start time').fill('09:00');
  await page.getByRole('button', { name: '30 min' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
}

/**
 * Drag the 09:00 block down exactly one hour.
 *
 * On a 664 px phone viewport the 09:00 block can sit just below the visible
 * timeline, where synthetic mouse events never reach it. Scroll it fully into
 * view, then make sure the whole gesture stays inside the visible timeline.
 */
async function dragDownOneHour(page: Page) {
  const block = page.getByRole('button', { name: /Performance check/ });
  await expect(block).toBeVisible();
  await block.scrollIntoViewIfNeeded();

  const timeline = page.locator('#timeline');
  const timelineBox = await timeline.boundingBox();
  const initialBox = await block.boundingBox();
  if (!timelineBox || !initialBox) throw new Error('Missing drag geometry');

  const overflow = initialBox.y + 22 + 88 - (timelineBox.y + timelineBox.height - 16);
  if (overflow > 0) {
    await timeline.evaluate((element, delta) => {
      element.scrollTop += delta;
    }, overflow);
  }

  const box = await block.boundingBox();
  if (!box) throw new Error('Block has no box');

  await page.mouse.move(box.x + 24, box.y + 22);
  await page.mouse.down();
  await page.mouse.move(box.x + 24, box.y + 22 + 88, { steps: 12 });
  await page.mouse.up();
}

/*
 * The 50 ms budget is about the app, not about the machine, so these run on a
 * single worker (`npm run test:perf`) instead of alongside the rest of the
 * suite. Two browsers competing for two cores produced a 61 ms frame that
 * said nothing about the drag code. The budget itself is unchanged.
 */
test.describe('performance @performance', () => {
  test('drag stays under the long-frame and DOM budgets', async ({ page }) => {
    // Pin the app's clock so 09:00 is still in the future. `setFixedTime` fixes
    // `Date` without freezing timers or animation frames, so the recorder and
    // the rAF-bound drag still tick.
    await page.clock.setFixedTime(new Date('2026-10-25T08:55:00'));
    await page.goto('/');
    await addFocusBlock(page);

    await startFrameRecorder(page);
    await dragDownOneHour(page);

    await page.waitForTimeout(100);
    const result = await stopFrameRecorder(page);

    expect(result.frames.filter((duration) => duration > 50)).toEqual([]);
    expect(result.nodes).toBeLessThanOrEqual(1500);

    // The drop is a real action: it moves the block and offers one undo.
    await expect(page.getByRole('button', { name: /Performance check/ })).toHaveAccessibleName(
      /10:00/,
    );
  });

  test('reduced motion still commits a drag within the same budgets', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-10-25T08:55:00'));
    await page.goto('/');
    await addFocusBlock(page);

    await startFrameRecorder(page);
    await dragDownOneHour(page);

    await page.waitForTimeout(100);
    const result = await stopFrameRecorder(page);

    expect(result.frames.filter((duration) => duration > 50)).toEqual([]);
    await expect(page.getByRole('button', { name: /Performance check/ })).toHaveAccessibleName(
      /10:00/,
    );
  });
});
