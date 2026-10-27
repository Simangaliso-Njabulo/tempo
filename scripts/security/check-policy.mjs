import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const fail = (message) => errors.push(message);

async function readJson(file) {
  return JSON.parse(await readFile(path.join(root, file), 'utf8'));
}

async function walk(dir) {
  const entries = await readdir(path.join(root, dir), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(relative)));
    else files.push(relative);
  }
  return files;
}

const policy = await readJson('security/policy.json').catch(() => {
  console.error('security-policy: security/policy.json is missing or invalid.');
  process.exit(1);
});

for (const key of [
  'version',
  'requiredChecks',
  'protectedPaths',
  'csp',
  'waiverDays',
  'attestationDays',
  'limits',
]) {
  if (!(key in policy)) fail(`policy is missing ${key}.`);
}
if (policy.version !== 1) fail('policy version must be 1.');
if (!Array.isArray(policy.requiredChecks) || policy.requiredChecks.length < 14) {
  fail('requiredChecks is incomplete.');
}

const html = await readFile(path.join(root, 'dist/index.html'), 'utf8').catch(() => {
  fail('dist/index.html is missing; run npm run build first.');
  return '';
});
const meta = html.match(
  /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]+)"/i,
);
if (!meta) fail('the production CSP meta tag is missing.');
else if (meta[1].trim() !== policy.csp.trim()) {
  fail('the production CSP does not match security/policy.json.');
}
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail('index.html contains an inline script.');
if (/<style\b/i.test(html)) fail('index.html contains an inline style block.');
if (/\son[a-z]+\s*=\s*["']/i.test(html)) fail('index.html contains an inline event handler.');

const workflowFiles = await walk('.github/workflows').catch(() => []);
for (const file of workflowFiles.filter((item) => item.endsWith('.yml') || item.endsWith('.yaml'))) {
  const text = await readFile(path.join(root, file), 'utf8');
  if (/pull_request_target\s*:/.test(text)) fail(`${file} uses pull_request_target.`);
  if (/secrets\s*:\s*inherit/.test(text)) fail(`${file} uses secrets: inherit.`);
  for (const match of text.matchAll(/^\s*uses:\s*([^\s#]+)/gm)) {
    const uses = match[1];
    if (uses.startsWith('./')) continue;
    if (!/@[0-9a-f]{40}$/.test(uses)) fail(`${file} has an unpinned action: ${uses}`);
  }
  if (!/^permissions\s*:/m.test(text)) fail(`${file} has no top-level permissions block.`);
}

const sourceFiles = await walk('src').catch(() => []);
const forbidden = [
  [/dangerouslySetInnerHTML/, 'dynamic HTML'],
  [/\beval\s*\(/, 'eval'],
  [/\bnew\s+Function\s*\(/, 'new Function'],
  [/\.innerHTML\s*=/, 'innerHTML assignment'],
  [/document\.write\s*\(/, 'document.write'],
  [/fetch\s*\(\s*['"`]https?:/, 'third-party fetch'],
];
for (const file of sourceFiles.filter((item) => /\.(ts|tsx|js|jsx)$/.test(item))) {
  const text = await readFile(path.join(root, file), 'utf8');
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) fail(`${file} contains ${label}.`);
  }
}

const secretPatterns = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /BEGIN (RSA|OPENSSH|EC) PRIVATE KEY/,
];
for (const file of [...sourceFiles, ...workflowFiles]) {
  const text = await readFile(path.join(root, file), 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) fail(`${file} looks like it contains a secret.`);
  }
}

async function checkExpiringDir(dir, kind) {
  const files = await readdir(path.join(root, dir)).catch(() => []);
  for (const file of files.filter((item) => item.endsWith('.json'))) {
    const record = await readJson(path.join(dir, file)).catch(() => null);
    if (!record) {
      fail(`${dir}/${file} is not valid JSON.`);
      continue;
    }
    for (const key of ['control', 'owner', 'approver', 'expires', 'evidence']) {
      if (!record[key]) fail(`${dir}/${file} is missing ${key}.`);
    }
    if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
      fail(`${dir}/${file} needs at least one evidence entry.`);
    }
    if (record.severity === 'critical') fail(`${dir}/${file} tries to waive a critical finding.`);
    if (kind === 'waiver' && !['high', 'medium'].includes(record.severity)) {
      fail(`${dir}/${file} has an invalid severity.`);
    }
    const limit = kind === 'waiver' ? policy.waiverDays[record.severity] : policy.attestationDays;
    const started = Date.parse(record.attestedAt ?? record.approvedAt);
    const expires = Date.parse(record.expires);
    const remaining = (expires - Date.now()) / 86_400_000;
    const window = (expires - started) / 86_400_000;
    if (!Number.isFinite(remaining) || remaining < 0) fail(`${dir}/${file} is expired.`);
    if (!Number.isFinite(window) || window > limit) {
      fail(`${dir}/${file} exceeds the ${kind} limit of ${limit} days.`);
    }
  }
}
await checkExpiringDir('security/waivers', 'waiver');
await checkExpiringDir('security/attestations', 'attestation');

if (process.env.GITHUB_EVENT_NAME === 'pull_request' && process.env.GITHUB_EVENT_PATH) {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const labels = new Set((event.pull_request?.labels ?? []).map((label) => label.name));
  const body = event.pull_request?.body ?? '';
  for (const heading of [
    '## Issue',
    '## Risk',
    '## Decision IDs and references',
    '## Verification',
    '## Not verified',
    '## Data or migration impact',
  ]) {
    if (!body.includes(heading)) fail(`the PR body is missing ${heading}.`);
  }
  const base = event.pull_request.base.ref;
  try {
    execFileSync('git', ['fetch', 'origin', base, '--depth=1'], { stdio: 'ignore' });
  } catch {
    // The ref may already be present from the checkout; the diff below decides.
  }
  let changed = [];
  try {
    changed = execFileSync('git', ['diff', '--name-only', `origin/${base}...HEAD`], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    fail(`could not diff against origin/${base}; fetch the base branch before running.`);
  }
  const protectedFiles = changed.filter((file) =>
    policy.protectedPaths.some((pattern) => new RegExp(pattern).test(file)),
  );
  if (protectedFiles.length > 0 && !labels.has('risk:high')) {
    fail(`protected paths need risk:high: ${protectedFiles.join(', ')}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`security-policy: ${error}`);
  process.exit(1);
}
console.log(
  'security-policy: policy, CSP, pins, secrets, waivers, attestations, and PR evidence are valid.',
);
