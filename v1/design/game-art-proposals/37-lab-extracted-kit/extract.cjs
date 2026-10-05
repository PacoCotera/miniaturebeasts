// Reproducible reference extraction only. Never edits or redraws source artwork.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const outputDirectory = __dirname;
const sourceRelativePath = '../35-vault-composition/18-c-refined.png';
const sourcePath = path.resolve(outputDirectory, sourceRelativePath);
const crops = [
  { name: 'data', rectangle: [609, 111, 37, 48], role: 'Data inventory art' },
  { name: 'energy', rectangle: [726, 110, 43, 51], role: 'Energy inventory art' },
  { name: 'essence', rectangle: [856, 111, 47, 49], role: 'Essence inventory art' },
  { name: 'sample-capsule', rectangle: [308, 108, 54, 54], role: 'Sample reference capsule' },
  { name: 'crown-reference', rectangle: [346, 218, 105, 89], role: 'Known Crown reference illustration; not a specimen portrait' },
  { name: 'eye-ring-reference', rectangle: [362, 380, 74, 67], role: 'Known Eye-ring reference illustration; not a specimen portrait' },
  { name: 'header-top-left', rectangle: [286, 94, 31, 31], role: 'Exact blue stepped frame corner fragment' },
  { name: 'finding-top-left', rectangle: [291, 179, 31, 34], role: 'Exact blue finding frame corner fragment' },
  { name: 'start-action', rectangle: [834, 409, 136, 63], role: 'Focused action reference; START text baked into source pixels' }
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function extract() {
  const sourceBytes = fs.readFileSync(sourcePath);
  const sourceMetadata = await sharp(sourceBytes).metadata();
  if (sourceMetadata.width !== 1280 || sourceMetadata.height !== 720) {
    throw new Error('Source dimensions changed; remeasure rectangles before extraction.');
  }
  const manifest = {
    status: 'Source-preview crops; not native production sprite masters',
    source: { path: sourceRelativePath, sha256: hash(sourceBytes), width: sourceMetadata.width, height: sourceMetadata.height, actualEncoding: sourceMetadata.format },
    screenRectangle: { left: 264, top: 78, width: 752, height: 421 },
    process: 'Decode source JPEG, extract integer rectangles without resizing, encode lossless PNG. Preserve all source background pixels. No transparency, filtering, palette changes or redraw.',
    contactSheets: { native: 'contact-sheet-1x.png', enlarged: 'contact-sheet-2x.png', enlargement: 'Exact 2x nearest-neighbor duplication of 1x contact sheet' },
    assets: []
  };
  const contactOverlays = [];
  const labels = [];
  for (const [index, crop] of crops.entries()) {
    const [left, top, width, height] = crop.rectangle;
    const rectangle = { left, top, width, height };
    const png = await sharp(sourceBytes).extract(rectangle).png().toBuffer();
    const file = `${crop.name}.png`;
    fs.writeFileSync(path.join(outputDirectory, file), png);
    const sourcePixels = await sharp(sourceBytes).extract(rectangle).raw().toBuffer();
    const outputPixels = await sharp(png).raw().toBuffer();
    if (!sourcePixels.equals(outputPixels)) throw new Error(`Pixel identity failed: ${file}`);
    const priorManifestPath = path.join(outputDirectory, 'manifest.json');
    if (fs.existsSync(priorManifestPath)) {
      const previous = JSON.parse(fs.readFileSync(priorManifestPath, 'utf8'));
      const previousAsset = previous.assets.find(asset => asset.file === file);
      if (previous.source.sha256 === manifest.source.sha256 && previousAsset && previousAsset.sha256 !== hash(png)) {
        throw new Error(`Regeneration changed ${file} unexpectedly.`);
      }
    }
    manifest.assets.push({ file, role: crop.role, rectangle, sha256: hash(png), decodedPixelSha256: hash(outputPixels), pixelIdentity: 'Passed: decoded output equals decoded source rectangle', opaqueBackground: true });
    const tileX = 15 + (index % 3) * 195;
    const tileY = 15 + Math.floor(index / 3) * 140;
    contactOverlays.push({ input: png, left: tileX, top: tileY + 28 });
    labels.push(`<text x="${tileX}" y="${tileY + 13}">${crop.name} · ${width}×${height}</text>`);
  }
  const labelSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="430"><g fill="#e6edf6" font-family="sans-serif" font-size="12">${labels.join('')}</g></svg>`);
  contactOverlays.push({ input: labelSvg, left: 0, top: 0 });
  const contact = await sharp({ create: { width: 600, height: 430, channels: 3, background: '#10151c' } }).composite(contactOverlays).png().toBuffer();
  fs.writeFileSync(path.join(outputDirectory, 'contact-sheet-1x.png'), contact);
  await sharp(contact).resize(1200, 860, { kernel: 'nearest' }).png().toFile(path.join(outputDirectory, 'contact-sheet-2x.png'));
  await sharp(sourceBytes).extract(manifest.screenRectangle).png().toFile(path.join(outputDirectory, 'screen-reference.png'));
  fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Extracted ${crops.length} exact rectangles; all decoded pixel identity checks passed. Source ${manifest.source.sha256}`);
}
extract().catch(error => { console.error(error); process.exitCode = 1; });
