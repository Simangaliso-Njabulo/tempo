import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('zoom the baseline row', async ({ page }) => {
  const file = process.argv.find((arg) => arg.endsWith('.png')) ?? 'bl/planned-light-393-webkit-iphone-linux.png';
  const bytes = readFileSync(join(process.cwd(), file));
  await page.setContent('<canvas id="c"></canvas>');
  await page.evaluate(
    async ({ data, scale }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      // The 11:00 row sits around y = 540..600 in the 393 x 844 capture.
      const sx = 0;
      const sy = 530;
      const sw = 200;
      const sh = 60;
      canvas.width = sw * scale;
      canvas.height = sh * scale;
      canvas.style.width = `${sw * scale}px`;
      canvas.style.height = `${sh * scale}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
    },
    { data: bytes.toString('base64'), scale: 4 },
  );
  await page.locator('#c').screenshot({ path: '.temp/baseline-row.png' });
  console.log('ZOOMED ' + file);
});
