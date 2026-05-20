// Regenerates raster PWA icons from public/favicon.svg using sharp.
// Run once before deploy if you update the logo. For first-time setup:
//   npm i -D sharp
//   node scripts/gen-icons.mjs
// We intentionally don't list sharp as a regular dep — icons rarely change.

import fs from 'node:fs/promises';
import path from 'node:path';

let sharp;
try { sharp = (await import('sharp')).default; } catch {
  console.error('sharp is not installed. Run: npm i -D sharp');
  process.exit(1);
}

const svg = await fs.readFile('public/favicon.svg');
const out = (size, name, opts = {}) => sharp(svg).resize(size, size).png().toFile(path.join('public', name)).then(() => console.log('wrote', name));

await out(192, 'icon-192.png');
await out(512, 'icon-512.png');
await out(512, 'icon-512-maskable.png');
console.log('done');
