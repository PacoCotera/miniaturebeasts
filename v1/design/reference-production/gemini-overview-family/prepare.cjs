// Preserve Gemini artwork: crop, aspect-preserving reduction, and opaque padding only.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const root = __dirname;
const output = path.join(root, 'exports');
const sourcePath = path.join(root, 'gemini-family-hardware-materials.png');
const background = { r: 42, g: 51, b: 56, alpha: 1 };
const kernel = 'lanczos3';
const definitions = [
  { name: 'explore', crop: { left: 95, top: 75, width: 352, height: 360 }, resized: [118, 121] },
  { name: 'research', crop: { left: 618, top: 49, width: 324, height: 424 }, resized: [104, 136] },
  { name: 'incubator', crop: { left: 112, top: 576, width: 288, height: 384 }, resized: [102, 136] },
  { name: 'habitat', crop: { left: 628, top: 592, width: 280, height: 368 }, resized: [104, 137] },
];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function label(value, size = 15) {
  return sharp({ text: {
    text: `<span foreground="#c4d4d8">${value}</span>`,
    font: `Bitstream Vera Sans ${size}`,
    fontfile: path.join(root, '../../../native/shared/fonts/Vera.ttf'),
    rgba: true,
    dpi: 72,
  } }).png().toBuffer();
}

async function measure(bytes) {
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  let alphaMin = 255;
  let alphaMax = 0;
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * info.channels;
      alphaMin = Math.min(alphaMin, data[offset + 3]);
      alphaMax = Math.max(alphaMax, data[offset + 3]);
      // Measurement only; this predicate never removes or changes source pixels.
      const contrast = Math.max(Math.abs(data[offset] - background.r),
        Math.abs(data[offset + 1] - background.g), Math.abs(data[offset + 2] - background.b));
      if (contrast <= 14) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return {
    width: info.width,
    height: info.height,
    channels: info.channels,
    alphaMin,
    alphaMax,
    contrastBounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 },
    decodedRgbaSha256: digest(data),
  };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const sourceBytes = fs.readFileSync(sourcePath);
  const sourceMetadata = await sharp(sourceBytes).metadata();
  const sourceMeasurement = await measure(sourceBytes);
  const assets = [];
  for (const definition of definitions) {
    const reduced = await sharp(sourceBytes).extract(definition.crop)
      .resize(definition.resized[0], definition.resized[1], { fit: 'inside', kernel })
      .png().toBuffer();
    const reducedMetadata = await sharp(reduced).metadata();
    const left = Math.floor((136 - reducedMetadata.width) / 2);
    const top = Math.floor((144 - reducedMetadata.height) / 2);
    const prepared = await sharp({ create: { width: 136, height: 144, channels: 4, background } })
      .composite([{ input: reduced, left, top }]).png().toBuffer();
    fs.writeFileSync(path.join(output, `${definition.name}.png`), prepared);
    assets.push({
      name: definition.name,
      file: `exports/${definition.name}.png`,
      sourceCrop: definition.crop,
      reducedSize: [reducedMetadata.width, reducedMetadata.height],
      paddingOffset: [left, top],
      drawSize: [136, 144],
      drawScale: 1,
      opticalSlotCenter: [68, 72],
      sha256: digest(prepared),
      ...await measure(prepared),
    });
  }

  const layers = [{ input: await label('Gemini destination family · native 1× · opaque backing'), left: 16, top: 12 }];
  for (const [index, asset] of assets.entries()) {
    layers.push({ input: path.join(root, asset.file), left: 16 + index * 148, top: 40 });
    layers.push({ input: await label(asset.name), left: 16 + index * 148, top: 194 });
  }
  await sharp({ create: { width: 608, height: 228, channels: 4, background } })
    .composite(layers).png().toFile(path.join(output, 'sheet-native.png'));
  await sharp(path.join(output, 'sheet-native.png'))
    .resize(1824, 684, { kernel: 'nearest' }).png().toFile(path.join(output, 'sheet-3x.png'));

  const manifest = {
    status: 'Prepared Gemini destination artwork for native integration; not a native screen capture',
    source: {
      file: 'gemini-family-original.png',
      sha256: digest(sourceBytes),
      width: sourceMetadata.width,
      height: sourceMetadata.height,
      acquisition: 'Gemini Copy image control in the existing conversation; not a screenshot',
      prompt: 'hardware-materials-prompt.txt',
      promptSha256: digest(fs.readFileSync(path.join(root, 'hardware-materials-prompt.txt'))),
      alphaMin: sourceMeasurement.alphaMin,
      alphaMax: sourceMeasurement.alphaMax,
    },
    process: 'Explicit crop, aspect-preserving Lanczos3 reduction, and centered opaque padding; no redraw, color key, flood matte or recoloring',
    resampling: kernel,
    previousVersion: { directory: 'versions/brass-v1', disposition: 'Superseded material direction, retained source/prompt/preparation/export provenance' },
    backing: {
      rgb: [42, 51, 56],
      hex: '#2a3338',
      kind: 'Opaque original artwork backing, with slight source color variation retained',
      transparencyClaim: false,
      nativeRequirement: 'Draw 1:1 on matching #2a3338 region; copy opaque pixels directly and bypass legacy corner-color sprite_matte',
    },
    boundsMeasurement: 'Bounding box of output pixels differing by more than 14 in any RGB channel from the measured backing; measurement only, not an alpha mask',
    assets,
  };
  fs.writeFileSync(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
