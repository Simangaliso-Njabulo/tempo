/**
 * Lighthouse gate for TEMPO.
 *
 * Runs Lighthouse against the production preview with a mobile preset and
 * fails when a category drops below its floor. It is a local script rather
 * than @lhci/cli because the LHCI dependency tree carried high advisories;
 * `lighthouse` itself is a pinned dev dependency and audits clean.
 *
 * Usage:
 *   npm run build
 *   node scripts/lighthouse.mjs
 *
 * Environment:
 *   CHROME_PATH     use a specific Chrome/Chromium binary
 *   LIGHTHOUSE_PORT preview port (default 4173)
 */
import { preview } from 'vite';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { writeFile } from 'node:fs/promises';

const PORT = Number(process.env.LIGHTHOUSE_PORT ?? 4173);
const REPORT = 'lighthouse-report.html';

/** The approved gates from AGENTS.md and the operations plan. */
const FLOORS = {
  performance: 0.95,
  accessibility: 1,
  'best-practices': 1,
};

const server = await preview({
  preview: { host: '127.0.0.1', port: PORT, strictPort: true },
  logLevel: 'warn',
});

const url = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${PORT}/`;
const chromeFlags = ['--headless=new', '--no-sandbox', '--disable-gpu'];
const chrome = await chromeLauncher.launch({
  chromeFlags,
  ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
});

let failed = false;
try {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: 'html',
    logLevel: 'error',
    onlyCategories: Object.keys(FLOORS),
  });

  if (!result) throw new Error('Lighthouse returned no result.');
  await writeFile(REPORT, result.report, 'utf8');

  console.log(`Lighthouse report: ${REPORT}`);
  for (const [category, floor] of Object.entries(FLOORS)) {
    const score = result.lhr.categories[category]?.score;
    const percent = score === null || score === undefined ? 'n/a' : Math.round(score * 100);
    const ok = typeof score === 'number' && score >= floor;
    if (!ok) failed = true;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${category}: ${percent} (floor ${Math.round(floor * 100)})`);
  }

  const inp = result.lhr.audits['interaction-to-next-paint']?.numericValue;
  if (typeof inp === 'number') {
    console.log(`INP: ${Math.round(inp)} ms (p75 budget 200 ms)`);
  }
} finally {
  await chrome.kill();
  await server.close();
}

if (failed) {
  console.error('Lighthouse: a category is below its floor.');
  process.exit(1);
}
console.log('Lighthouse: every category meets its floor.');
