import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/icons/icon-192.png',
  'dist/icons/icon-512.png',
  'dist/icons/icon-1024.png',
  'dist/icons/icon-maskable-512.png',
  'dist/icons/apple-touch-icon.png',
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`Missing PWA files:\n${missing.join('\n')}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
const requiredFields = [
  'name',
  'short_name',
  'start_url',
  'scope',
  'display',
  'theme_color',
  'background_color',
  'icons',
];

for (const field of requiredFields) {
  if (!manifest[field]) {
    console.error(`Manifest is missing ${field}`);
    process.exit(1);
  }
}

if (manifest.display !== 'standalone') {
  console.error('Manifest display must be standalone');
  process.exit(1);
}

const sizes = new Set((manifest.icons ?? []).map((icon) => icon.sizes));
for (const size of ['192x192', '512x512']) {
  if (!sizes.has(size)) {
    console.error(`Manifest is missing a ${size} icon`);
    process.exit(1);
  }
}

if (!(manifest.icons ?? []).some((icon) => icon.purpose === 'maskable')) {
  console.error('Manifest is missing a maskable icon');
  process.exit(1);
}

const sw = readFileSync('dist/sw.js', 'utf8');
if (!sw.includes('workbox') && !sw.includes('precache')) {
  console.error('dist/sw.js does not look like a generated service worker');
  process.exit(1);
}

const html = readFileSync('dist/index.html', 'utf8');
if (!html.includes('http-equiv="Content-Security-Policy"')) {
  console.error('dist/index.html is missing the production CSP');
  process.exit(1);
}
if (/style=|unsafe-inline|https?:\/\//.test(html)) {
  console.error('dist/index.html has an inline style or a third-party origin');
  process.exit(1);
}

console.log('PWA artifacts are valid.');
