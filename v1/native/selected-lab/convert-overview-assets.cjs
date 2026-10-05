// Compile the prepared Gemini-derived pixels without rescaling or matte removal.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

async function main() {
  const names = ['explore', 'research', 'incubator', 'habitat'];
  const definitions = ['#include "overview_assets.h"',
    'const uint8_t overview_pixels[OVERVIEW_SPRITE_COUNT][OVERVIEW_SPRITE_WIDTH * OVERVIEW_SPRITE_HEIGHT * 4] = {'];
  const manifest = [];
  for (const name of names) {
    const source = `../../design/reference-production/gemini-overview-family/exports/${name}.png`;
    const bytes = fs.readFileSync(path.resolve(__dirname, source));
    const { data, info } = await sharp(bytes).raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width !== 136 || info.height !== 144 || info.channels !== 4)
      throw new Error(`Invalid prepared sprite dimensions: ${name}`);
    for (let alpha = 3; alpha < data.length; alpha += 4)
      if (data[alpha] !== 255)
        throw new Error(`Expected the documented opaque backing: ${name}`);
    definitions.push(`  { /* ${name} */`);
    for (let offset = 0; offset < data.length; offset += 32)
      definitions.push('    ' + Array.from(data.subarray(offset, offset + 32)).join(', ') + ',');
    definitions.push('  },');
    manifest.push({ name, source, width: 136, height: 144, channels: 4,
      sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      rgbaSha256: crypto.createHash('sha256').update(data).digest('hex'),
      transform: 'decode only; native renderer uses 1:1 RGBA pixels' });
  }
  definitions.push('};\n');
  fs.writeFileSync(path.join(__dirname, 'overview_assets.c'), definitions.join('\n'));
  fs.writeFileSync(path.join(__dirname, 'overview-asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
