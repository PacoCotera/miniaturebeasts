import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const names = ['radial-eyes-skin', 'radial-eyes-scales', 'radial-eyes-skin.depth', 'radial-eyes-scales.depth', 'comparison'];
const hashes = [];
for (const name of names) {
  const source = readFileSync(new URL(name + '.svg', import.meta.url));
  const png = await sharp(source).png().toBuffer();
  writeFileSync(new URL(name + '.png', import.meta.url), png);
  hashes.push({ name, sourceSha256: createHash('sha256').update(source).digest('hex'), pngSha256: createHash('sha256').update(png).digest('hex') });
}
writeFileSync(new URL('image-manifest.json', import.meta.url), JSON.stringify(hashes, null, 2) + '\n');
writeFileSync(new URL('pet-renderer.prompt.txt', import.meta.url), 'Turn the attached critter into a cute digital pet, shown alone in rich high-bit pixel art.');
console.log(JSON.stringify(hashes));
