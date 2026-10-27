import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const assetDir = 'dist/assets';
if (!existsSync(assetDir)) {
  console.error('dist/assets is missing. Run npm run build first.');
  process.exit(1);
}

const files = readdirSync(assetDir);
const gzipSize = (file) => gzipSync(readFileSync(join(assetDir, file))).length;
const rawSize = (file) => readFileSync(join(assetDir, file)).length;
const total = (extension, sizeOf) =>
  files.filter((file) => file.endsWith(extension)).reduce((sum, file) => sum + sizeOf(file), 0);

/**
 * The budget counts the app bundle, not `sw.js`; the service worker never runs
 * on the main thread. If the app crosses a budget, fix the cause. Do not raise
 * the budget without a new decision in `docs/design/decisions.md`.
 */
const checks = [
  ['JavaScript (gzip)', total('.js', gzipSize), 180 * 1024],
  ['CSS (gzip)', total('.css', gzipSize), 30 * 1024],
  ['UI font (raw WOFF2)', total('.woff2', rawSize), 40 * 1024],
];

let failed = false;
for (const [label, value, limit] of checks) {
  const ok = value <= limit;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${label}: ${(value / 1024).toFixed(1)} KB / ${(limit / 1024).toFixed(1)} KB`,
  );
  if (!ok) failed = true;
}

if (failed) process.exit(1);
