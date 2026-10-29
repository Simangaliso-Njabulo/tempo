/**
 * Licence gate for TEMPO.
 *
 * Two questions, both answered from the lockfile so the gate needs no network
 * and no GitHub API token:
 *
 * 1. Is every licence in the production dependency closure on the allowlist?
 * 2. Does the notice we ship name every one of those packages?
 *
 * Only the production closure is checked. Development tools (Playwright,
 * Vitest, TypeScript) never reach a user's device, so their licences are an
 * attribution question for the repository, not for the app. Permissive
 * licences such as MPL-2.0 and CC-BY-4.0 appear only in that dev tree.
 *
 * `actions/dependency-review-action` used to answer question 1. It needs a
 * GitHub API token and fails with "Dependency review is not supported on this
 * repository" whenever the installation rate limit is exhausted, so a real
 * finding and an infrastructure hiccup looked the same. This script asks the
 * same question from `package-lock.json`.
 *
 * Usage:
 *   npm run security:licenses
 *
 * Exit code 1 whenever a package is disallowed or the shipped notice is stale.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

/**
 * Licences approved for code that ships to a user's device. Each is
 * permissive, allows redistribution in a bundle, and needs only attribution.
 * Adding one is a policy decision: update docs/security/controls.md too.
 */
const ALLOWED = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Unlicense',
]);

const NOTICE = 'public/licenses/THIRD-PARTY-NOTICES.txt';
const FONT_LICENCE = 'public/licenses/geist-OFL.txt';
const FONT_PACKAGE = '@fontsource-variable/geist';

const errors = [];

/** Read JSON from the repository root, or null when it is absent. */
async function readJson(file) {
  try {
    return JSON.parse(await readFile(path.join(root, file), 'utf8'));
  } catch {
    return null;
  }
}

const lock = await readJson('package-lock.json');
if (!lock?.packages) {
  console.error('security:licenses: package-lock.json is missing or has no packages.');
  process.exit(1);
}
const packages = lock.packages;

/**
 * Resolve a dependency name the way Node does: from the requiring package
 * upwards, so a nested copy wins over a hoisted one.
 */
function resolveFrom(fromPath, name) {
  let base = fromPath;
  for (;;) {
    const candidate = `${base ? `${base}/` : ''}node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const nested = base.lastIndexOf('/node_modules/');
    base = nested === -1 ? '' : base.slice(0, nested);
  }
}

/** Split an SPDX expression at the top level, outside parentheses. */
function splitTopLevel(expression, operator) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expression.length; i += 1) {
    const character = expression[i];
    if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    else if (depth === 0) {
      const slice = expression.slice(i, i + operator.length);
      if (slice === operator) {
        parts.push(expression.slice(start, i));
        i += operator.length - 1;
        start = i + 1;
      }
    }
  }
  parts.push(expression.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** True when at least one branch of an SPDX `OR`/`AND` expression is usable. */
function isAllowed(expression) {
  const parenthesised = expression.match(/^\s*\((.*)\)\s*$/);
  if (parenthesised) return isAllowed(parenthesised[1]);

  const alternatives = splitTopLevel(expression, ' OR ');
  if (alternatives.length > 1) return alternatives.some(isAllowed);

  const conjuncts = splitTopLevel(expression, ' AND ');
  if (conjuncts.length > 1) return conjuncts.every(isAllowed);

  // `Apache-2.0 WITH LLVM-exception` is decided by the base licence.
  const [base] = expression.split(/\s+WITH\s+/i);
  return ALLOWED.has(base.trim());
}

/** The licence as declared in the lockfile, normalised to one string. */
function licenceOf(entry) {
  const declared = entry.license ?? entry.licenses;
  if (Array.isArray(declared)) return declared.join(' OR ');
  return typeof declared === 'string' ? declared : '';
}

const closure = [];
const seen = new Set();
const queue = Object.keys(packages['']?.dependencies ?? {}).map((name) => ({
  name,
  from: '',
}));

while (queue.length > 0) {
  const { name, from } = queue.shift();
  const resolved = resolveFrom(from, name);
  if (!resolved || seen.has(resolved)) continue;
  seen.add(resolved);

  const entry = packages[resolved];
  const resolvedName = entry.name ?? name;
  closure.push({
    name: resolvedName,
    version: entry.version ?? '0.0.0',
    licence: licenceOf(entry),
  });

  for (const dependency of Object.keys(entry.dependencies ?? {})) {
    queue.push({ name: dependency, from: resolved });
  }
}

if (closure.length === 0) errors.push('the production dependency closure is empty.');

for (const { name, version, licence } of closure.sort((a, b) => a.name.localeCompare(b.name))) {
  if (!licence) {
    errors.push(`${name}@${version} declares no licence.`);
  } else if (!isAllowed(licence)) {
    errors.push(`${name}@${version} is ${licence}, which is not on the allowlist.`);
  }
}

// The notice must name exactly the packages that ship. A dependency added
// without a notice entry is a licence-compliance defect, not a style nit.
const notice = await readFile(path.join(root, NOTICE), 'utf8').catch(() => null);
if (notice === null) {
  errors.push(`${NOTICE} is missing.`);
} else {
  for (const { name, version, licence } of closure) {
    const line = new RegExp(
      `^Package: ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@${version.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      )} \\| Licence: `,
      'm',
    );
    const match = notice.match(line);
    if (!match) errors.push(`${NOTICE} does not name ${name}@${version}.`);
    else if (licence && !notice.slice(match.index).split('\n')[0].includes(licence)) {
      errors.push(`${NOTICE} lists ${name}@${version} under a different licence than ${licence}.`);
    }
  }

  for (const { name } of closure) {
    if (!notice.includes(name)) errors.push(`${NOTICE} never mentions ${name}.`);
  }
}

// The UI font is a separate shipped asset whose licence requires the text to
// travel with it, so it has its own file rather than a line in the notice.
const fontLicence = await readFile(path.join(root, FONT_LICENCE), 'utf8').catch(() => null);
if (fontLicence === null) {
  errors.push(`${FONT_LICENCE} is missing.`);
} else if (!/SIL OPEN FONT LICENSE/i.test(fontLicence)) {
  errors.push(`${FONT_LICENCE} does not contain the SIL Open Font License text.`);
} else {
  // The font arrives as a devDependency whose WOFF2 is imported into the
  // bundle, so it is absent from the production closure above and is tracked
  // by name here instead.
  const fontPackage = packages[`node_modules/${FONT_PACKAGE}`];
  if (fontPackage?.version && !fontLicence.includes(`${FONT_PACKAGE}@${fontPackage.version}`)) {
    errors.push(`${FONT_LICENCE} does not name ${FONT_PACKAGE}@${fontPackage.version}.`);
  }
}

if (errors.length > 0) {
  console.error('security:licenses: failed');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`security:licenses: ${closure.length} production package(s), all allowed.`);
for (const { name, version, licence } of closure) {
  console.log(`  ${name}@${version}  ${licence}`);
}
console.log(`security:licenses: ${NOTICE} and ${FONT_LICENCE} match.`);
