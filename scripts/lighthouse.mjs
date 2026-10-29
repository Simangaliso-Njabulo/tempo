/**
 * Lighthouse gate for TEMPO.
 *
 * Runs Lighthouse against the production preview with a mobile preset and
 * fails when a category's median score across three runs drops below its
 * floor. It is a local script rather than @lhci/cli because the LHCI
 * dependency tree carried high advisories; `lighthouse` itself is a pinned
 * dev dependency and audits clean.
 *
 * Median of three, not one run: a shared CI runner is occasionally
 * descheduled mid-task, and a single 1.9 s long task for work that takes
 * 0.11 s on the same bundle is a bad measurement, not a regression. LHCI
 * gates the median for the same reason. The floors themselves are unchanged,
 * and every sample is printed so a disagreement between runs is visible
 * rather than hidden behind a summary number.
 *
 * Usage:
 *   npm run build
 *   node scripts/lighthouse.mjs
 *
 * Environment:
 *   CHROME_PATH       use a specific Chrome/Chromium binary
 *   LIGHTHOUSE_PORT   preview port (default 4173)
 *   LIGHTHOUSE_RUNS   number of samples (default 3; must be odd)
 */
import { preview } from 'vite';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { writeFile } from 'node:fs/promises';

const PORT = Number(process.env.LIGHTHOUSE_PORT ?? 4173);
const REPORT = 'lighthouse-report.html';
const RUNS = Number(process.env.LIGHTHOUSE_RUNS ?? 3);

if (!Number.isInteger(RUNS) || RUNS < 3 || RUNS % 2 === 0) {
  throw new Error('LIGHTHOUSE_RUNS must be an odd integer of 3 or more.');
}

/** The approved gates from AGENTS.md and the operations plan. */
const FLOORS = {
  performance: 0.95,
  accessibility: 1,
  'best-practices': 1,
};

/** Metrics worth printing when a run is slow, so the failure is diagnosable. */
const METRICS = [
  ['first-contentful-paint', 'FCP'],
  ['largest-contentful-paint', 'LCP'],
  ['total-blocking-time', 'TBT'],
  ['cumulative-layout-shift', 'CLS'],
  ['bootup-time', 'bootup'],
];

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

/** Middle value of a sorted copy; RUNS is odd, so this is a real sample. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) / 2];
}

function describe(lhr) {
  const parts = METRICS.map(([audit, label]) => {
    const value = lhr.audits[audit]?.numericValue;
    if (typeof value !== 'number') return null;
    return `${label} ${audit === 'cumulative-layout-shift' ? value.toFixed(3) : `${Math.round(value)} ms`}`;
  }).filter(Boolean);
  const benchmark = lhr.environment?.benchmarkIndex;
  if (typeof benchmark === 'number') parts.push(`benchmark ${Math.round(benchmark)}`);
  return parts.join(', ');
}

let failed = false;
try {
  const samples = [];
  for (let run = 1; run <= RUNS; run += 1) {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'html',
      logLevel: 'error',
      onlyCategories: Object.keys(FLOORS),
    });
    if (!result) throw new Error(`Lighthouse returned no result on run ${run}.`);

    const scores = Object.fromEntries(
      Object.keys(FLOORS).map((category) => [category, result.lhr.categories[category]?.score ?? 0]),
    );
    samples.push({ run, scores, lhr: result.lhr, report: result.report });
    console.log(`run ${run}/${RUNS}: ${describe(result.lhr)}`);
  }

  const medians = Object.fromEntries(
    Object.keys(FLOORS).map((category) => [
      category,
      median(samples.map((sample) => sample.scores[category])),
    ]),
  );

  // The artifact should be the run the gate judged, not an arbitrary sample.
  const judged = samples.find((sample) => sample.scores.performance === medians.performance);
  await writeFile(REPORT, judged.report, 'utf8');

  console.log(`Lighthouse report: ${REPORT} (median performance run ${judged.run})`);
  for (const [category, floor] of Object.entries(FLOORS)) {
    const score = medians[category];
    const percent = Math.round(score * 100);
    const ok = score >= floor;
    if (!ok) failed = true;
    const spread = samples.map((sample) => Math.round(sample.scores[category] * 100)).join('/');
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${category}: ${percent} median of ${spread} (floor ${Math.round(floor * 100)})`,
    );
  }

  const inp = judged.lhr.audits['interaction-to-next-paint']?.numericValue;
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
