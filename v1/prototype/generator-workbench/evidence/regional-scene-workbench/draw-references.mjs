import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const names = ['regional-eyes-skin', 'regional-eyes-scales', 'regional-generated-window-1'];
const hashes = [];
for (const name of names) {
  const source = new URL(name + '.svg', import.meta.url);
  const image = await sharp(readFileSync(source)).png().toBuffer();
  writeFileSync(new URL(name + '.png', import.meta.url), image);
  hashes.push({ name, sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'), pngSha256: createHash('sha256').update(image).digest('hex') });
}
writeFileSync(new URL('image-manifest.json', import.meta.url), JSON.stringify(hashes, null, 2) + '\n');
console.log(JSON.stringify(hashes));
