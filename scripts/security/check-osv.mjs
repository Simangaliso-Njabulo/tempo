import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Runs OSV-Scanner over the lockfile and fails closed on every finding that is
// not covered by an unexpired, approved waiver in security/waivers/.
//
// Why this exists: `osv-scanner scan --format json` exits 1 on ANY finding,
// while docs/security/verification.md says the control is "Block or waiver"
// and docs/security/README.md says only high and critical findings block
// merge outright. This script keeps the strict scan and adds the second half:
// a finding may pass only if a dated, owned, expiring waiver names it, and an
// expired, revoked, or malformed waiver stops covering it immediately.
//
// Usage:
//   node scripts/security/check-osv.mjs                # runs osv-scanner
//   node scripts/security/check-osv.mjs --input f.json # reads captured JSON
//
// The agent may not create or extend a waiver. See docs/security/waivers/README.md.

const root = process.cwd();
const waiverDir = path.join(root, 'security', 'waivers');
const errors = [];
const fail = (message) => errors.push(message);

const inputIndex = process.argv.indexOf('--input');
const scanner = process.env.OSV_SCANNER || 'osv-scanner';

async function scanJson() {
  if (inputIndex !== -1) {
    const file = process.argv[inputIndex + 1];
    if (!file) {
      console.error('security-osv: --input needs a file.');
      process.exit(1);
    }
    return readFile(path.resolve(file), 'utf8');
  }
  try {
    return execFileSync(scanner, ['scan', '-L', 'package-lock.json', '--format', 'json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // osv-scanner exits 1 when it finds something; the report is still on stdout.
    const stdout = typeof error.stdout === 'string' ? error.stdout : '';
    if (stdout.trim()) return stdout;
    const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : '';
    console.error(`security-osv: ${scanner} did not run: ${stderr || error.message}`);
    process.exit(1);
  }
}

function collectFindings(report) {
  const findings = [];
  for (const result of report.results ?? []) {
    for (const entry of result.packages ?? []) {
      const pkg = entry.package ?? {};
      for (const vulnerability of entry.vulnerabilities ?? []) {
        if (!vulnerability || typeof vulnerability.id !== 'string') continue;
        findings.push({
          id: vulnerability.id,
          aliases: Array.isArray(vulnerability.aliases) ? vulnerability.aliases : [],
          summary: typeof vulnerability.summary === 'string' ? vulnerability.summary : '',
          advisorySeverity:
            (vulnerability.database_specific && vulnerability.database_specific.severity) || '',
          maxSeverity: entry.groups?.[0]?.max_severity ?? '',
          name: pkg.name ?? 'unknown package',
          version: pkg.version ?? 'unknown version',
          ecosystem: pkg.ecosystem ?? '',
          groups: Array.isArray(entry.dependency_groups) ? entry.dependency_groups.join(', ') : '',
        });
      }
    }
  }
  return findings;
}

async function loadWaivers() {
  const files = await readdir(waiverDir).catch(() => []);
  const waivers = [];
  for (const file of files.filter((item) => item.endsWith('.json')).sort()) {
    const record = await readFile(path.join(waiverDir, file), 'utf8').then(
      (text) => JSON.parse(text),
      () => null,
    );
    if (!record) {
      fail(`security/waivers/${file} is not valid JSON, so it covers nothing.`);
      continue;
    }
    waivers.push({ file, record });
  }
  return waivers;
}

function waiverCovers(waiver, finding) {
  const { record } = waiver;
  if (record.status !== 'approved') return false;
  const expires = Date.parse(record.expires);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const ids = new Set();
  if (Array.isArray(record.advisories)) for (const id of record.advisories) ids.add(String(id));
  if (Array.isArray(record.findings)) for (const id of record.findings) ids.add(String(id));
  if (typeof record.finding === 'string') ids.add(record.finding);
  const named = [finding.id, ...finding.aliases].some(
    (id) => ids.has(id) || [...ids].some((value) => value.includes(id)),
  );
  if (!named) return false;

  if (record.package) {
    const wanted = String(record.package);
    const actual = `${finding.name}@${finding.version}`;
    if (wanted !== actual && wanted !== finding.name) return false;
  }
  return true;
}

const raw = await scanJson();
let report;
try {
  report = JSON.parse(raw);
} catch {
  fail(`osv-scanner output is not JSON. First 200 characters: ${raw.slice(0, 200)}`);
  report = null;
}
if (report && !Array.isArray(report.results)) {
  fail('osv-scanner output has no results array.');
}

const findings = report ? collectFindings(report) : [];
const waivers = await loadWaivers();

const covered = [];
const uncovered = [];
for (const finding of findings) {
  const waiver = waivers.find((candidate) => waiverCovers(candidate, finding));
  if (waiver) covered.push({ finding, waiver });
  else uncovered.push(finding);
}

for (const { finding, waiver } of covered) {
  console.log(
    `security-osv: ${finding.id} in ${finding.name}@${finding.version} covered by ${waiver.file} until ${waiver.record.expires}.`,
  );
}
for (const finding of uncovered) {
  const scope = finding.groups ? ` (${finding.groups} dependencies)` : '';
  fail(
    `${finding.id} in ${finding.name}@${finding.version}${scope} has no unexpired approved waiver. ` +
      `https://osv.dev/vulnerability/${finding.id}`,
  );
}

if (errors.length > 0) {
  for (const error of errors) console.error(`security-osv: ${error}`);
  process.exit(1);
}
console.log(
  findings.length === 0
    ? 'security-osv: no known vulnerabilities in package-lock.json.'
    : `security-osv: ${findings.length} known vulnerabilit${findings.length === 1 ? 'y' : 'ies'}, all covered by an unexpired approved waiver.`,
);
