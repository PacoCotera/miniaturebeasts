// Inspection derivatives only: preserve copied originals; do not redraw or matte.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = __dirname;
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const background = '#222d35';
const specimens = [
  { name: 'nano-banana-2', crop: { left: 354, top: 69, width: 316, height: 430 } },
  { name: 'nano-banana-pro', crop: { left: 289, top: 25, width: 446, height: 510 } },
];

async function label(value, left, top, size = 18) {
  return { left, top, input: await sharp({ text: {
    text: `<span foreground="#e2eceb">${value}</span>`,
    font: `Bitstream Vera Sans ${size}`,
    fontfile: path.join(root, '../../../native/shared/fonts/Vera.ttf'),
    dpi: 72, rgba: true,
  } }).png().toBuffer() };
}

async function main() {
  const sources = [];
  for (const item of specimens) {
    const original = fs.readFileSync(path.join(root, `${item.name}-copied.png`));
    const { data, info } = await sharp(original).raw().toBuffer({ resolveWithObject: true });
    let alphaMin = 255;
    let alphaMax = 0;
    for (let offset = 3; offset < data.length; offset += 4) {
      alphaMin = Math.min(alphaMin, data[offset]);
      alphaMax = Math.max(alphaMax, data[offset]);
    }
    const preview = await sharp(original).extract(item.crop)
      .resize(136, 144, { fit: 'contain', background, kernel: 'lanczos3' }).png().toBuffer();
    fs.writeFileSync(path.join(root, `${item.name}-136x144-preview.png`), preview);
    sources.push({ name: item.name, acquisition: 'Gemini Copy image PNG; not full-size-download proof',
      width: info.width, height: info.height, alphaRange: [alphaMin, alphaMax],
      sha256: hash(original), crop: item.crop, previewSha256: hash(preview),
      previewTransform: 'rectangular crop then Lanczos3 contain into136x144; no matting or redrawing',
      status: 'generated concept; preview is resampled, not authored native pixel master' });
  }
  const layers = [
    await label('Research sprite trial — actual 136×144 usage previews', 24, 18, 23),
    await label('Previous local master', 40, 60),
    await label('Nano Banana 2', 330, 60),
    await label('Nano Banana Pro', 640, 60),
    { input: path.join(root, '../exports/research-topic.png'), left: 56, top: 91 },
    { input: path.join(root, 'nano-banana-2-136x144-preview.png'), left: 346, top: 91 },
    { input: path.join(root, 'nano-banana-pro-136x144-preview.png'), left: 656, top: 91 },
    await label('Gemini previews are cropped/resampled, opaque concepts; not native masters.', 24, 256, 16),
    await label('Approved C18 reference — original inspection crop at 1×', 24, 294, 20),
    { input: path.join(root, '../../game-art-proposals/37-lab-extracted-kit/screen-reference.png'), left: 24, top: 329 },
  ];
  await sharp({ create: { width: 960, height: 774, channels: 4, background } })
    .composite(layers).png().toFile(path.join(root, 'comparison.png'));
  fs.writeFileSync(path.join(root, 'inspection.json'), JSON.stringify({ sources }, null, 2) + '\n');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
