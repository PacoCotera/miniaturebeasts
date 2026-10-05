import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const names = ['radial-contact-base', 'radial-height-contrast', 'radial-secondary-latent', 'comparison'];
const hashes = [];
for (const name of names) {
  const source = readFileSync(new URL(name + '.svg', import.meta.url));
  const png = await sharp(source).png().toBuffer();
  writeFileSync(new URL(name + '.png', import.meta.url), png);
  hashes.push({ name, sourceSha256: createHash('sha256').update(source).digest('hex'), pngSha256: createHash('sha256').update(png).digest('hex') });
}
writeFileSync(new URL('image-manifest.json', import.meta.url), JSON.stringify(hashes, null, 2) + '\n');
console.log(JSON.stringify(hashes));
