// Exact decoded source pixels, compiled for the native reference renderer.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const output = __dirname;
const names = ['data', 'energy', 'essence', 'sample-capsule', 'crown-reference', 'eye-ring-reference'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function convert() {
  const definitions = ['#include "assets.h"'];
  const rows = [];
  const manifest = { status: 'Exact decoded source-preview RGB, not production sprite masters', assets: [] };
  for (const name of [...names, 'unknown-reference']) {
    const source = name === 'unknown-reference' ? '../../design/game-art-proposals/35-vault-composition/18-c-refined.png' : `../../design/game-art-proposals/37-lab-extracted-kit/${name}.png`;
    const bytes = fs.readFileSync(path.resolve(output, source));
    let image = sharp(bytes);
    const rectangle = name === 'unknown-reference' ? { left: 548, top: 249, width: 185, height: 119 } : null;
    if (rectangle) image = image.extract(rectangle);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 3) throw new Error(`Unexpected RGB channels for ${name}`);
    const identifier = name.replaceAll('-', '_');
    const values = [];
    for (let index = 0; index < data.length; index += 24) values.push('  ' + Array.from(data.subarray(index, index + 24), value => String(value)).join(', ') + ',');
    definitions.push(`static const uint8_t ${identifier}_pixels[] = {\n${values.join('\n')}\n};`);
    rows.push(`  {"${name}", ${info.width}, ${info.height}, ${identifier}_pixels}`);
    manifest.assets.push({ name, source, sourceSha256: hash(bytes), rectangle, width: info.width, height: info.height, channels: 3, decodedRgbSha256: hash(data), process: 'Decode/extract only, no resampling or transparency removal; source is opaque' });
  }
  definitions.push(`const SelectedSprite selected_sprites[SELECTED_SPRITE_COUNT] = {\n${rows.join(',\n')}\n};\n`);
  fs.writeFileSync(path.join(output, 'assets.c'), definitions.join('\n\n'));
  fs.writeFileSync(path.join(output, 'asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Converted ${manifest.assets.length} exact source-preview RGB assets.`);
}
convert().catch(error => { console.error(error); process.exitCode = 1; });
