// Editable authored sources -> native PNGs and offline inspection proofs.
// Run with the existing Node/Sharp runtime. C arrays are a separate export step.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const directory = __dirname;
const productRoot = path.resolve(directory, '../..');
const output = path.join(directory, 'exports');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = filename => path.relative(productRoot, filename).replaceAll('\\', '/');
const palette = {
  graphite: '#1e282f', field: '#202b32', shadow: '#0b1821',
  blue: '#2389c6', blueHighlight: '#67cef5', ink: '#d5e0e3',
  secondary: '#a5b6bd', focus: '#f1cd79', saved: '#a3cda8',
};

const references = {
  c18: 'design/game-art-proposals/35-vault-composition/18-c-refined.png',
  probe03: 'design/companion-connected-art/03-gemini-probe-corrected.png',
  cargo04: 'design/companion-connected-art/04-gemini-cargo.png',
  arrival07: 'design/companion-connected-art/07-gemini-lab-arrival-blue.png',
  materials: 'design/lab-controls/combined-family-materials.png',
  pipSource: 'design/v1-pip/gemini-source-capture.png',
  probeScene: 'design/core-v1-art/source/gemini-probe-scene-original.png',
  researchVignettes: 'design/core-v1-art/source/gemini-research-vignettes-original.png',
};
const manifest = {
  status: 'Nine retained material masks passed focused art-direction critique; other candidates and actual native compositions await review',
  method: 'Retained material RGB with hand-authored alpha; exact Pip originals; separately documented nearest-resampled Gemini setting; authored interface/mono candidates. No color-key, flood matte, retained-material redraw/resampling or baked text.',
  palette,
  references: Object.entries(references).map(([id, filename]) => ({
    id, path: filename, sha256: hash(fs.readFileSync(path.join(productRoot, filename))),
  })),
  typography: {
    regular: 'native/shared/fonts/Vera.ttf', bold: 'native/shared/fonts/VeraBd.ttf',
    heading: 26, subject: 22, body: 18, compact: 16,
    rule: 'Live text; fixed hierarchy, wrap/reflow rather than arbitrary shrinking. Full IDs remain available in Details.',
  },
  assets: [],
};
const images = new Map();

function svgDocument(width, height, body, definitions = '') {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><defs>${definitions}</defs>${body}</svg>`);
}

async function exportAsset(name, png, source, sourceId, note) {
  const filename = path.join(output, `${name}.png`);
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  fs.writeFileSync(filename, png);
  images.set(name, png);
  manifest.assets.push({
    name, file: relative(filename), width: info.width, height: info.height,
    drawWidth: info.width, drawHeight: info.height, channels: 4,
    source: relative(source), sourceId, sourceSha256: hash(fs.readFileSync(source)),
    pngSha256: hash(png), rgbaSha256: hash(data), note,
  });
}

async function exportSymbol(sourceName, symbolId, name, width, height, reference, note) {
  const source = path.join(directory, 'source', sourceName);
  const content = fs.readFileSync(source, 'utf8');
  const definitions = content.match(/<defs>([\s\S]*?)<\/defs>/)[1];
  if (!definitions.includes(`id="${symbolId}"`)) throw new Error(`Missing authored symbol ${symbolId}`);
  const svg = svgDocument(width, height, `<use href="#${symbolId}" width="${width}" height="${height}"/>`, definitions);
  const png = await sharp(svg).png().toBuffer();
  await exportAsset(name, png, source, reference, note);
}

async function exportRetained(name, sourcePath, rectangle, maskId, reference, note) {
  const source = path.join(productRoot, sourcePath);
  let decoder = sharp(source);
  if (rectangle) decoder = decoder.extract(rectangle);
  const {data: original, info} = await decoder.ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const maskSource = path.join(directory, 'source/retained-material-masks.svg');
  const maskText = fs.readFileSync(maskSource, 'utf8');
  const definitions = maskText.match(/<defs>([\s\S]*?)<\/defs>/)[1];
  const maskSvg = svgDocument(info.width, info.height, `<use href="#${maskId}" width="${info.width}" height="${info.height}"/>`, definitions);
  const {data: mask} = await sharp(maskSvg).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const rgba = Buffer.from(original);
  let visible = 0;
  const bounds = {left: info.width, top: info.height, right: 0, bottom: 0};
  // Write only alpha. Do not ask a compositing library to premultiply immutable RGB.
  for (let pixel = 0; pixel < info.width * info.height; pixel++) {
    const offset = pixel * 4;
    rgba[offset + 3] = Math.round(original[offset + 3] * mask[offset + 3] / 255);
    if (!rgba[offset + 3]) continue;
    for (let channel = 0; channel < 3; channel++) {
      if (rgba[offset + channel] !== original[offset + channel]) throw new Error(`RGB changed for ${name}`);
    }
    visible++;
    const x = pixel % info.width, y = Math.floor(pixel / info.width);
    bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
    bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
  }
  const png = await sharp(rgba, {raw: {width: info.width, height: info.height, channels: 4}}).png().toBuffer();
  const decoded = await sharp(png).ensureAlpha().raw().toBuffer();
  let mismatches = 0;
  for (let offset = 0; offset < decoded.length; offset += 4) {
    if (!decoded[offset + 3]) continue;
    for (let channel = 0; channel < 3; channel++) if (decoded[offset + channel] !== original[offset + channel]) mismatches++;
  }
  if (mismatches) throw new Error(`Encoded RGB mismatch for ${name}: ${mismatches}`);
  await exportAsset(name, png, source, reference, note);
  Object.assign(manifest.assets[manifest.assets.length - 1], {
    rectangle, mask: relative(maskSource), maskId, maskSha256: hash(fs.readFileSync(maskSource)),
    foregroundRgbMismatches: mismatches, nontransparentPixels: visible, visibleBounds: bounds,
    centerAnchor: [Math.round((bounds.left + bounds.right) / 2), Math.round((bounds.top + bounds.bottom) / 2)],
    sourceLimit: reference === 'c18' ? 'C18 captured JPEG source; retained compression is not removed or represented as original native pixel art.' : 'Retained Gemini raster; selection editable, internal painted RGB immutable.',
  });
}

async function label(value, size = 18, color = palette.ink, bold = false) {
  return sharp({ text: {
    text: `<span foreground="${color}">${value}</span>`,
    font: `Bitstream Vera Sans ${bold ? 'Bold ' : ''}${size}`,
    fontfile: path.join(productRoot, 'native/shared/fonts', bold ? 'VeraBd.ttf' : 'Vera.ttf'),
    rgba: true, dpi: 72,
  } }).png().toBuffer();
}

async function textLayer(value, left, top, size = 18, color = palette.ink, bold = false) {
  return { input: await label(value, size, color, bold), left, top };
}

function assetLayer(name, left, top) {
  if (!images.has(name)) throw new Error(`Unknown exported asset ${name}`);
  return { input: images.get(name), left, top };
}

async function frame(width, height, focused = false) {
  const quiet = `<path fill="${palette.field}" d="M8 8H${width - 8}V${height - 8}H8Z"/>
    <path fill="${palette.shadow}" d="M12 3H${width - 12}V6H12Z M3 12H6V${height - 12}H3Z M12 ${height - 6}H${width - 12}V${height - 3}H12Z M${width - 6} 12H${width - 3}V${height - 12}H${width - 6}Z"/>
    <path fill="${palette.blue}" d="M12 6H${width - 12}V8H12Z M6 12H8V${height - 12}H6Z M12 ${height - 8}H${width - 12}V${height - 6}H12Z M${width - 8} 12H${width - 6}V${height - 12}H${width - 8}Z"/>`;
  const content = fs.readFileSync(path.join(directory, 'source/interface.svg'), 'utf8');
  const definitions = content.match(/<defs>([\s\S]*?)<\/defs>/)[1];
  const corners = [
    '<use href="#frame-corner" width="20" height="20"/>',
    `<use href="#frame-corner" width="20" height="20" transform="translate(${width} 0) scale(-1 1)"/>`,
    `<use href="#frame-corner" width="20" height="20" transform="translate(0 ${height}) scale(1 -1)"/>`,
    `<use href="#frame-corner" width="20" height="20" transform="translate(${width} ${height}) scale(-1 -1)"/>`,
  ].join('');
  const focus = focused ? `<path fill="${palette.focus}" d="M14 14H31V17H17V31H14Z M${width - 31} 14H${width - 14}V31H${width - 17}V17H${width - 31}Z M14 ${height - 31}H17V${height - 17}H31V${height - 14}H14Z M${width - 17} ${height - 31}H${width - 14}V${height - 14}H${width - 31}V${height - 17}H${width - 17}Z"/>` : '';
  return sharp(svgDocument(width, height, quiet + corners + focus, definitions)).png().toBuffer();
}

async function createSources() {
  fs.mkdirSync(output, { recursive: true });
  const kit = 'design/game-art-proposals/37-lab-extracted-kit';
  for (const name of ['data', 'energy', 'essence']) {
    await exportRetained(`${name}-compact`, `${kit}/${name}.png`, null, `${name}-compact-mask`, 'c18', 'Exact retained1× material pixels with authored silhouette alpha; no degraded compact redraw.');
  }
  const primarySource = references.arrival07;
  for (const [name, rectangle] of [
    ['data', {left: 102, top: 145, width: 90, height: 100}],
    ['energy', {left: 102, top: 248, width: 90, height: 100}],
    ['essence', {left: 102, top: 345, width: 90, height: 90}],
  ]) await exportRetained(`${name}-primary`, primarySource, rectangle, `${name}-primary-mask`, 'arrival07', 'Exact larger07 material pixels for Cargo/reception; native footprint, no resampling.');
  for (const name of ['crown-reference', 'eye-ring-reference']) {
    await exportRetained(name, `${kit}/${name}.png`, null, `${name}-mask`, 'c18', 'Known reference/topic artwork only; retained fine material drawing and topology.');
  }
  await exportRetained('sample-neutral', `${kit}/sample-capsule.png`, null, 'sample-neutral-mask', 'c18', 'Neutral sample glass/cap preserved; no hidden creature or genomic pixel map.');
  for (const name of ['markings-reference', 'movement-reference']) {
    await exportSymbol('reference-features.svg', name, name, 112, 112, 'c18/pipSource', 'Reference topic only; the adjacent live finding establishes sample knowledge.');
  }
  await exportSymbol('process.svg', 'incubation-process', 'incubation-process', 112, 128, 'materials', 'Process shell only; reveals no phenotype.');
  for (const name of ['data-mono', 'energy-mono', 'essence-mono', 'residents-mono', 'samples-mono', 'incubating-mono', 'habitat-mono', 'link-mono']) {
    await exportSymbol('dock-symbols.svg', name, name, 32, 40, 'materials', 'Authored monochrome contour/negative space; category metaphor, not individual identity.');
  }
  for (const name of ['frame-corner', 'focus-corner', 'saved', 'unavailable', 'error', 'waiting']) {
    const size = name === 'frame-corner' ? 20 : name === 'focus-corner' ? 14 : 24;
    await exportSymbol('interface.svg', name, name, size, size, 'c18/arrival07', 'Quiet structure, input focus and outcome remain separate from object knowledge.');
  }
  const sceneSource = path.join(directory, 'source/gemini-probe-scene-original.png');
  const scene = await sharp(sceneSource).resize(400, 224, {fit: 'fill', kernel: 'nearest'}).png().toBuffer();
  await exportAsset('probe-place', scene, sceneSource, 'probeScene',
    'Fictional setting. Noninteger nearest400x224 derivative of preserved Gemini1024x572 delivered original; not original native pixels or independent editable drawing layers.');
  manifest.assets[manifest.assets.length - 1].production = {
    originalWidth: 1024, originalHeight: 572, derivativeWidth: 400, derivativeHeight: 224,
    kernel: 'nearest', fit: 'fill', conversation: 'https://gemini.google.com/app/ebc52519d5f5f3fb',
    retrieval: 'Gemini Copy image to clipboard PNG; full-size download event did not resolve',
    prompt: 'design/core-v1-art/source/gemini-probe-scene-prompt.txt',
    meaning: 'Authored fictional setting; no location/weather/telemetry/creature/encounter assertion',
  };
  for (const name of ['pip-carried', 'pip-marked']) {
    const source = path.join(productRoot, 'design/v1-pip', `${name}.png`);
    // Preserve exact approved pixels, including the retained opaque backing.
    await exportAsset(name, fs.readFileSync(source), source, 'pipSource', 'Exact retained Gemini PNG; opaque backing is intentional, no matte or resizing.');
  }
  const visitSource = path.join(directory, 'source/visit-response.svg');
  const overlay = await sharp(visitSource).png().toBuffer();
  await exportAsset('visit-response', overlay, visitSource, 'pipSource', 'Small still input/result acknowledgement outside body; original anatomy/markings remain unchanged.');
  await exportAsset('quiet-frame', await frame(320, 160), path.join(directory, 'source/interface.svg'), 'c18/arrival07', 'Inspection fixture for authored corner/edge grammar; runtime composes corners and edges.');
  await exportAsset('focus-frame', await frame(320, 64, true), path.join(directory, 'source/interface.svg'), 'c18/arrival07', 'Quiet action with restrained warm corners; label remains live.');
}

async function createResearchSources() {
  const cropSource = path.join(directory, 'source/research-vignette-crops.json');
  const recipe = JSON.parse(fs.readFileSync(cropSource, 'utf8'));
  const source = path.join(productRoot, recipe.source);
  if (hash(fs.readFileSync(source)) !== recipe.sourceSha256)
    throw new Error('Research original differs from the recorded source');
  const names = recipe.assets.map(asset => asset.name);
  manifest.assets = manifest.assets.filter(asset => !names.includes(asset.name));
  manifest.references = manifest.references.filter(reference => reference.id !== 'researchVignettes');
  manifest.references.push({id: 'researchVignettes', path: recipe.source, sha256: recipe.sourceSha256});
  for (const asset of recipe.assets) {
    if (asset.rectangle.width / 2 !== asset.width || asset.rectangle.height / 2 !== asset.height)
      throw new Error(`Research aspect/half-scale mismatch: ${asset.name}`);
    const png = await sharp(source).extract(asset.rectangle)
      .resize(asset.width, asset.height, {kernel: 'nearest'}).png().toBuffer();
    await exportAsset(asset.name, png, source, 'researchVignettes', asset.meaning);
    Object.assign(manifest.assets[manifest.assets.length - 1], {
      rectangle: asset.rectangle,
      production: {kernel: 'nearest', scaleNumerator: 1, scaleDenominator: 2,
        originalWidth: 1024, originalHeight: 572,
        recipe: relative(cropSource), recipeSha256: hash(fs.readFileSync(cropSource)),
        alpha: recipe.alpha, status: 'Contextual source suitable; final derivative/native composition awaiting actual review'},
    });
  }
}

async function researchContactSheet() {
  const names = ['research-inheritance', 'research-movement', 'research-effort'];
  const layers = [await textLayer('Research context · actual1× derivatives · nearest half scale', 24, 18, 18, palette.ink, true)];
  for (let index = 0; index < names.length; ++index) {
    const image = images.get(names[index]);
    const info = await sharp(image).metadata();
    const left = 24 + index * 240;
    layers.push(await textLayer(names[index].replace('research-', ''), left, 58, 18));
    layers.push({input: image, left: left + Math.floor((196 - info.width) / 2), top: 91});
    layers.push(await textLayer(`${info.width}×${info.height} · opaque source field`, left, 302, 14, palette.secondary));
  }
  fs.writeFileSync(path.join(directory, 'research-contact-1x.png'),
    await sharp({create: {width: 760, height: 350, channels: 4, background: palette.graphite}}).composite(layers).png().toBuffer());
}

async function contactSheet() {
  const layers = [];
  layers.push(await textLayer('Core V1 master family · actual native 1× footprints', 24, 18, 22, palette.ink, true));
  let x = 24;
  for (const name of ['data', 'energy', 'essence']) {
    layers.push(assetLayer(`${name}-primary`, x, 60));
    layers.push(await textLayer(name, x, 150, 16));
    layers.push(assetLayer(`${name}-compact`, x + 105, 81));
    x += 184;
  }
  layers.push(await textLayer('07 primary90×90–100 / C18 compact37–47×48–51 · exact source pixels', 24, 181, 16, palette.secondary));
  x = 24;
  for (const name of ['crown-reference', 'eye-ring-reference', 'markings-reference', 'movement-reference']) {
    layers.push(assetLayer(name, x, 225));
    layers.push(await textLayer(name.replace('-reference', ''), x, 347, 16));
    x += 145;
  }
  layers.push(assetLayer('sample-neutral', 630, 243));
  layers.push(assetLayer('incubation-process', 738, 225));
  layers.push(await textLayer('neutral', 630, 347, 16));
  layers.push(await textLayer('process', 750, 363, 16));
  x = 24;
  for (const name of ['data-mono', 'energy-mono', 'essence-mono', 'residents-mono', 'samples-mono', 'incubating-mono', 'habitat-mono', 'link-mono']) {
    layers.push({ input: await sharp({ create: { width: 72, height: 64, channels: 4, background: '#ffffff' } }).composite([{ input: images.get(name), left: 20, top: 12 }]).png().toBuffer(), left: x, top: 407 });
    layers.push(await textLayer(name.replace('-mono', ''), x, 482, 14));
    x += 108;
  }
  layers.push(assetLayer('probe-place', 24, 541));
  layers.push(await textLayer('400×224 · resampled Gemini setting', 24, 780, 16));
  layers.push(assetLayer('pip-carried', 465, 533));
  layers.push(assetLayer('pip-marked', 753, 533));
  layers.push(await textLayer('Exact originals261×289 · no redraw/matte', 465, 839, 16));
  layers.push(assetLayer('focus-frame', 24, 884));
  layers.push(await textLayer('Focus is a separate layer', 55, 905, 18));
  x = 395;
  for (const name of ['saved', 'waiting', 'unavailable', 'error']) {
    layers.push(assetLayer(name, x, 897));
    layers.push(await textLayer(name, x - 6, 932, 14));
    x += 114;
  }
  fs.writeFileSync(path.join(directory, 'contact-sheet-1x.png'), await sharp({ create: { width: 1040, height: 980, channels: 4, background: palette.graphite } }).composite(layers).png().toBuffer());
}

async function referenceComparison() {
  const layers = [await textLayer('Retained reference pixels                 Alpha-selected compact /07 primary1×', 24, 18, 20, palette.ink, true)];
  const kit = path.join(productRoot, 'design/game-art-proposals/37-lab-extracted-kit');
  let y = 72;
  for (const name of ['data', 'energy', 'essence', 'crown-reference', 'eye-ring-reference', 'sample-capsule']) {
    const authored = name === 'sample-capsule' ? 'sample-neutral' : ['data', 'energy', 'essence'].includes(name) ? `${name}-compact` : name;
    layers.push({ input: fs.readFileSync(path.join(kit, `${name}.png`)), left: 40, top: y });
    layers.push(assetLayer(authored, 350, y));
    if (['data', 'energy', 'essence'].includes(name)) layers.push(assetLayer(`${name}-primary`, 450, y));
    layers.push(await textLayer(name, 145, y + 15, 16, palette.secondary));
    y += 135;
  }
  layers.push(await textLayer('Source RGB immutable; hand-authored alpha/masks editable. Native candidates, not clean original pixel art.', 24, 895, 16, palette.secondary));
  fs.writeFileSync(path.join(directory, 'reference-comparison.png'), await sharp({ create: { width: 1040, height: 940, channels: 4, background: palette.graphite } }).composite(layers).png().toBuffer());
}

async function alphaProof() {
  const names = ['data-compact', 'energy-compact', 'essence-compact', 'data-primary', 'energy-primary', 'essence-primary', 'crown-reference', 'eye-ring-reference', 'sample-neutral'];
  const layers = [await textLayer('Alpha review · graphite / pale field · all source RGB preserved', 24, 18, 22, palette.ink, true)];
  for (let index = 0; index < names.length; index++) {
    const name = names[index];
    const image = images.get(name);
    const info = await sharp(image).metadata();
    const column = index % 3, row = Math.floor(index / 3);
    const left = 24 + column * 430, top = 62 + row * 520;
    layers.push(await textLayer(name, left, top, 18, palette.ink));
    for (const [background, inset] of [[palette.graphite, 0], ['#dedbd0', 145]]) {
      const tile = await sharp({create: {width: 130, height: 125, channels: 4, background}}).composite([{input: image, left: 15, top: 12}]).png().toBuffer();
      layers.push({input: tile, left: left + inset, top: top + 30});
    }
    const enlarged = await sharp(image).resize(info.width * 3, info.height * 3, {kernel: 'nearest'}).png().toBuffer();
    const diagnostic = await sharp({create: {width: 340, height: 320, channels: 4, background: '#dedbd0'}}).composite([{input: enlarged, left: 10, top: 8}]).png().toBuffer();
    layers.push({input: diagnostic, left, top: top + 170});
  }
  fs.writeFileSync(path.join(directory, 'alpha-proof.png'), await sharp({create: {width: 1320, height: 1640, channels: 4, background: palette.graphite}}).composite(layers).png().toBuffer());
}

async function main() {
  if (process.argv.includes('--research-only')) {
    Object.assign(manifest, JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8')));
    await createResearchSources();
    await researchContactSheet();
    fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log('Exported only three research context derivatives and their1× proof; existing materials/Pip untouched.');
    return;
  }
  await createSources();
  await createResearchSources();
  await contactSheet();
  await researchContactSheet();
  await referenceComparison();
  await alphaProof();
  for (const [role, filename] of Object.entries(manifest.typography).filter(([, value]) => typeof value === 'string' && value.endsWith('.ttf'))) {
    manifest.typography[`${role}Sha256`] = hash(fs.readFileSync(path.join(productRoot, filename)));
  }
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Exported ${manifest.assets.length} native candidates and three inspection sheets. C arrays not generated.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
