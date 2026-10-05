/* Static Miniature Lives proof. No gameplay, input handling or saved state. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const root = __dirname;
const outputDirectory = path.join(root, 'exports');
const palette = {
  background: '#f3eedf',
  ink: '#29372f',
  quiet: '#56665b',
  line: '#c5cab7',
  focus: '#6c785a',
  action: '#e1e5d2'
};

function escapeText(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function text(x, y, label, size, options = {}) {
  const color = options.color || palette.ink;
  const weight = options.weight || 400;
  const anchor = options.center ? 'middle' : 'start';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="DejaVu Sans" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeText(label)}</text>`;
}

function line(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${palette.line}" stroke-width="1"/>`;
}

function svg(width, height, content) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${palette.background}"/>${content.join('')}</svg>`);
}

function focusedVisit() {
  return `<rect x="28" y="536" width="394" height="44" rx="8" fill="${palette.action}" stroke="${palette.focus}" stroke-width="2"/>`
    + `<path d="M20 549v-21h21M409 528h21v21M20 567v21h21M409 588h21v-21" fill="none" stroke="${palette.focus}" stroke-width="3"/>`
    + text(225, 565, 'Spend time together', 20, {center: true, weight: 600});
}

function companionSurface() {
  return svg(450, 600, [
    text(28, 38, 'Companion', 18, {color: palette.quiet}),
    text(225, 77, 'Pip · PIP-001', 25, {center: true, weight: 600}),
    text(225, 105, 'Saved mibi', 18, {center: true, color: palette.quiet}),
    text(225, 474, 'Plain coat', 23, {center: true, weight: 600}),
    text(225, 503, 'Pale variation carried', 19, {center: true, color: palette.quiet}),
    focusedVisit()
  ]);
}

function labSurface() {
  return svg(1024, 600, [
    text(40, 51, 'Station · Known forms', 29, {weight: 600}),
    text(40, 84, 'Complete reference · adult · mild', 20, {color: palette.quiet}),
    line(40, 108, 984, 108),
    text(252, 137, 'Pip · PIP-001', 24, {center: true, weight: 600}),
    text(252, 162, 'Saved mibi', 18, {center: true, color: palette.quiet}),
    text(772, 137, 'Hypothetical mibi', 22, {center: true, weight: 600}),
    text(772, 162, 'Marked comparison reference', 18, {center: true, color: palette.quiet}),
    text(252, 516, 'Plain coat', 23, {center: true, weight: 600}),
    text(252, 546, 'Pale variation carried', 19, {center: true, color: palette.quiet}),
    text(772, 516, 'Pale markings', 23, {center: true, weight: 600}),
    text(772, 546, 'Expressed', 19, {center: true, color: palette.quiet}),
    line(40, 564, 984, 564),
    text(512, 589, 'Known inspection is free', 18, {center: true, color: palette.quiet})
  ]);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function fixedAsset(relativePath, width, height) {
  const absolutePath = path.join(root, relativePath);
  const metadata = await sharp(absolutePath).metadata();
  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(`${relativePath} must be ${width}x${height}; compose.cjs does not rescale device artwork.`);
  }
  return absolutePath;
}

async function saveSurface(name, surface, overlays, width, height) {
  const filename = name + '.png';
  const destination = path.join(outputDirectory, filename);
  await sharp(surface).composite(overlays).png().toFile(destination);
  return {name, file: filename, width, height, sha256: sha256(destination)};
}

async function comparisonBoard(companion, lab, inputs) {
  const width = 1224;
  const height = 1810;
  const board = svg(width, height, [
    text(48, 51, 'Miniature Beasts · device proof', 31, {weight: 600}),
    text(48, 83, 'Accepted Miniature Lives appearance · device pixels at 1×', 19, {color: palette.quiet}),
    text(48, 130, 'Companion · 450×600', 24, {weight: 600}),
    text(550, 130, 'HiBit pair · 280×300 at 1×', 23, {weight: 600}),
    text(690, 221, 'Pip · PIP-001', 20, {center: true, weight: 600}),
    text(1010, 221, 'Hypothetical mibi', 18, {center: true, weight: 600}),
    text(690, 246, 'Plain · pale carried', 17, {center: true, color: palette.quiet}),
    text(1010, 246, 'Pale markings · expressed', 17, {center: true, color: palette.quiet}),
    text(550, 633, 'Same pose, anatomy and lighting; only coat differs.', 18, {color: palette.quiet}),
    text(550, 669, 'Companion focuses its existing visit action.', 18, {color: palette.quiet}),
    text(550, 705, 'No saved visit result is claimed here.', 18, {color: palette.quiet}),
    text(48, 812, 'Station · 1024×600', 24, {weight: 600}),
    text(48, 1480, 'Complete knowledge permits full reference portraits.', 20, {color: palette.quiet}),
    text(48, 1514, 'Marked mibi is hypothetical; Pip keeps its saved plain coat.', 20, {color: palette.quiet}),
    text(48, 1548, 'This comparison does not submit a cross or create another mibi.', 20, {color: palette.quiet}),
    text(48, 1640, 'Artwork footprints', 25, {weight: 600}),
    text(48, 1682, 'Companion: 280×300 · Station: matched 300×310 portraits.', 20, {color: palette.quiet}),
    text(48, 1718, 'Original sources and richer views remain with the retained art inputs.', 20, {color: palette.quiet}),
    text(48, 1754, 'Static proof · no runtime, animation or physical-screen validation.', 19, {color: palette.quiet})
  ]);
  return saveSurface('device-comparison', board, [
    {input: path.join(outputDirectory, companion.file), left: 48, top: 154},
    {input: path.join(root, inputs.companionPlain), left: 550, top: 274},
    {input: path.join(root, inputs.companionMarked), left: 870, top: 274},
    {input: path.join(outputDirectory, lab.file), left: 48, top: 840}
  ], width, height);
}

async function main() {
  fs.mkdirSync(outputDirectory, {recursive: true});
  // Inspect the portable treatment before the richer pair is supplied.
  if (process.argv.includes('--companion-only')) {
    const plain = await fixedAsset('assets/hibit-plain-280x300.png', 280, 300);
    await saveSurface('companion-resident', companionSurface(), [
      {input: plain, left: 85, top: 130}
    ], 450, 600);
    console.log('Composed the Companion portable-art preview.');
    return;
  }
  // The artist supplies exact-size assets and owns their extraction/provenance.
  const inputsFile = path.join(root, 'assets', 'composition-inputs.json');
  const inputs = JSON.parse(fs.readFileSync(inputsFile, 'utf8'));
  const companionPlain = await fixedAsset(inputs.companionPlain, 280, 300);
  await fixedAsset(inputs.companionMarked, 280, 300);
  const labPlain = await fixedAsset(inputs.labPlain, 300, 310);
  const labMarked = await fixedAsset(inputs.labMarked, 300, 310);
  const companion = await saveSurface('companion-resident', companionSurface(), [
    {input: companionPlain, left: 85, top: 130}
  ], 450, 600);
  const lab = await saveSurface('lab-known-comparison', labSurface(), [
    {input: labPlain, left: 102, top: 170},
    {input: labMarked, left: 622, top: 170}
  ], 1024, 600);
  const comparison = await comparisonBoard(companion, lab, inputs);
  const assetRecords = Object.entries(inputs).map(([name, file]) => ({name, file, sha256: sha256(path.join(root, file))}));
  const manifest = {
    status: 'Miniature Beasts static device proof; Miniature Lives appearance accepted, no runtime acceptance',
    devicePixels: 'No stretching or resizing; screen images composed at 1x',
    typography: {
      requestedFamily: 'DejaVu Sans',
      observedRendering: 'Monospaced fallback appearance in the configured renderer',
      resolvedFamily: null,
      evidenceLimit: 'Exact fallback family is unverified; no desired-family rendering claim'
    },
    artInputs: assetRecords,
    exports: [companion, lab, comparison]
  };
  fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('Composed Companion, Station and native-pixel comparison board.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
