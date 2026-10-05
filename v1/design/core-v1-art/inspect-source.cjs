// Integer-enlarged diagnostic only. Does not produce or replace art masters.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const kit = path.join(root, 'design/game-art-proposals/37-lab-extracted-kit');
const source = path.join(root, 'design/companion-connected-art/07-gemini-lab-arrival-blue.png');
const candidates = [
  ['data', fs.readFileSync(path.join(kit, 'data.png'))],
  ['energy', fs.readFileSync(path.join(kit, 'energy.png'))],
  ['essence', fs.readFileSync(path.join(kit, 'essence.png'))],
  ['crown', fs.readFileSync(path.join(kit, 'crown-reference.png'))],
  ['eye', fs.readFileSync(path.join(kit, 'eye-ring-reference.png'))],
  ['capsule', fs.readFileSync(path.join(kit, 'sample-capsule.png'))],
];
async function main() {
  for (const [name, crop] of [
    ['data07', {left: 102, top: 145, width: 90, height: 100}],
    ['energy07', {left: 102, top: 248, width: 90, height: 100}],
    ['essence07', {left: 102, top: 345, width: 90, height: 90}],
  ]) candidates.push([name, await sharp(source).extract(crop).png().toBuffer()]);
  const layers = [];
  let x = 15, y = 15;
  for (const [name, bytes] of candidates) {
    const info = await sharp(bytes).metadata();
    const png = await sharp(bytes).resize(info.width * 4, info.height * 4, {kernel: 'nearest'}).png().toBuffer();
    layers.push({input: png, left: x, top: y});
    console.log(name, info.width, info.height, 'x', x, 'y', y);
    x += 430;
    if (x > 1200) {x = 15; y += 430;}
  }
  fs.writeFileSync(path.join(__dirname, 'source-diagnostic-4x.png'), await sharp({create: {width: 1300, height: 1300, channels: 4, background: '#d7d4c5'}}).composite(layers).png().toBuffer());
}
main().catch(error=>{console.error(error);process.exitCode=1});
