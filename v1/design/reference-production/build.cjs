const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const root = __dirname;
const source = path.join(root, 'src');
const output = path.join(root, 'exports');
let textRuns = [];

function text(x, y, value, size = 20, color = '#d5e0e3', bold = false) {
  textRuns.push({ x, y, value, size, color, bold });
}

async function renderedText() {
  const layers = [];
  for (const run of textRuns) {
    // Explicit font files prevent host font substitution. Coordinates use a
    // nominal baseline; all final placements are inspected in the offline proof.
    const input = await sharp({
      text: {
        text: `<span foreground="${run.color}">${run.value}</span>`,
        font: `Bitstream Vera Sans ${run.bold ? 'Bold ' : ''}${run.size}`,
        fontfile: path.join(root, '../../native/shared/fonts', run.bold ? 'VeraBd.ttf' : 'Vera.ttf'),
        rgba: true,
        dpi: 72,
      },
    }).png().toBuffer();
    layers.push({ input, left: run.x, top: run.y - run.size });
  }
  textRuns = [];
  return layers;
}

async function centeredReadout(left, centerY, lines) {
  const rendered = [];
  for (const line of lines) {
    const input = await sharp({ text: {
      text: '<span foreground="' + line.color + '">' + line.value + '</span>',
      font: 'Bitstream Vera Sans ' + (line.bold ? 'Bold ' : '') + line.size,
      fontfile: path.join(root, '../../native/shared/fonts', line.bold ? 'VeraBd.ttf' : 'Vera.ttf'),
      rgba: true,
      dpi: 72,
    } }).png().toBuffer();
    const metadata = await sharp(input).metadata();
    rendered.push({ input, height: metadata.height });
  }
  const gap = 9;
  const inkHeight = rendered.reduce((sum, line) => sum + line.height, 0) + gap * (rendered.length - 1);
  let top = Math.round(centerY - inkHeight / 2);
  return rendered.map(line => {
    const placed = { input: line.input, left, top };
    top += line.height + gap;
    return placed;
  });
}

function place(name, left, top) {
  return { input: path.join(output, `${name}.png`), left, top };
}

async function saveComposition(filename, width, height, background, layers) {
  await sharp({ create: { width, height, channels: 4, background } })
    .composite(layers).png().toFile(path.join(output, filename));
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const assets = [];
  const files = fs.readdirSync(source).filter(file => file.endsWith('.svg')).sort();
  for (const file of files) {
    const name = path.basename(file, '.svg');
    const master = fs.readFileSync(path.join(source, file));
    const result = await sharp(master).png().toFile(path.join(output, `${name}.png`));
    const exportedPng = fs.readFileSync(path.join(output, `${name}.png`));
    const metadata = await sharp(exportedPng).metadata();
    const { data: pixels, info } = await sharp(exportedPng).raw().toBuffer({ resolveWithObject: true });
    let left = info.width;
    let top = info.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (pixels[(y * info.width + x) * info.channels + 3] < 128) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    assets.push({
      name,
      source: `src/${name}.svg`,
      export: `exports/${name}.png`,
      width: result.width,
      height: result.height,
      drawScale: 1,
      alpha: metadata.hasAlpha,
      occupiedBoundsAtHalfAlpha: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 },
      sha256: crypto.createHash('sha256').update(master).digest('hex'),
      exportSha256: crypto.createHash('sha256').update(exportedPng).digest('hex'),
    });
  }

  const fixtureSource = fs.readFileSync(path.join(root, 'fixtures.json'));
  const fixtures = JSON.parse(fixtureSource);
  const label = value => ({ value, size: 18, color: '#a9c2cc' });
  const stateValue = value => ({ value, size: 22, color: '#e2eceb' });
  const detail = value => ({ value, size: 16, color: '#b1c9d1' });

  for (const fixture of fixtures.states) {
    if (fixture.expeditionActive || fixture.incubationActive) {
      throw new Error('This bounded proof supports only the documented inactive expedition/incubation fixtures.');
    }
    // Both states consume the same exports, placements and measured text hierarchy.
    const layers = [
      place('header', 24, 24), place('navigation-frame', 24, 140),
      place('overview-frame', 248, 140), place('nav-focus', 36, 176),
      ...[0, 1, 2, 3].map(index => place('nav-quiet', 36, 244 + index * 68)),
      place('data', 404, 40), place('energy', 602, 40), place('essence', 800, 40),
      place('explore-topic', 272, 213), place('research-topic', 642, 207),
      place('incubator-topic', 272, 377), place('habitat-topic', 642, 377),
    ];
    const dividers = '<svg xmlns="http://www.w3.org/2000/svg" width="752" height="416"><path d="M24 65 H728 M380 92 V346 M24 220 H728" fill="none" stroke="#2e5265" stroke-width="1"/><path d="M24 65 H112 M672 65 H728" stroke="#397ca1"/></svg>';
    layers.splice(3, 0, { input: Buffer.from(dividers), left: 248, top: 140 });
    text(48, 72, 'BEECHO LAB', 22, '#bfced2', true);
    text(49, 100, 'LAB STOCK', 16, '#95aeb9');
    for (const [name, resource, x] of [['Data', 'data', 470], ['Energy', 'energy', 668], ['Essence', 'essence', 866]]) {
      const raw = fixture.rawStock[resource];
      const divisor = fixtures.stockDisplay.rawUnitsPerWholeUnit;
      text(x, 61, name, 18, '#b7c8cf');
      text(x, 87, String(Math.floor(raw / divisor)), 26, '#e5ebeb', true);
      text(x, 104, 'Next unit ' + (raw % divisor) + '%', 14, '#acbec7');
    }
    ['Overview', 'Explore', 'Research', 'Incubator', 'Habitat'].forEach((name, index) => {
      text(60, 214 + index * 68, name, 20, index === 0 ? '#f6e4ad' : '#c3d1d6');
    });
    text(272, 189, 'Overview - Lab', 28, '#e3e9e9', true);
    layers.push(...await centeredReadout(422, 283, [label('Explore'), stateValue('No expedition'), detail('Bring a sample home')]));
    layers.push(...await centeredReadout(790, 283, [label('Research'), stateValue(fixture.samples + ' samples'), detail(fixture.findings + ' findings')]));
    layers.push(...await centeredReadout(422, 447, [label('Incubator'), stateValue('No incubation')]));
    const habitat = [label('Habitat'), stateValue(fixture.revealedResidents + ' revealed')];
    if (fixture.resident) {
      habitat.push(detail('resident · ' + fixture.resident.visits + ' visit'));
      habitat.push({ value: fixture.resident.id, size: 14, color: '#91aebd' });
    } else {
      habitat.push(detail('residents'));
    }
    layers.push(...await centeredReadout(790, 447, habitat));
    text(28, 584, 'Up/down: preview workspaces', 17, '#b0c1c9');
    layers.push(...await renderedText());
    await saveComposition(fixture.export, 1024, 600, '#172129', layers);
  }

  const sheetWidth = 1024;
  const sheetHeight = 1080;
  const sheetLayers = [
    place('header', 24, 28),
    place('data', 24, 157), place('energy', 100, 157), place('essence', 176, 157),
    place('explore-topic', 280, 140), place('research-topic', 440, 140),
    place('incubator-topic', 600, 140), place('habitat-topic', 760, 140),
    place('navigation-frame', 24, 300), place('overview-frame', 248, 300),
    place('nav-quiet', 24, 738), place('nav-focus', 232, 738),
    place('sample-capsule', 446, 888),
    place('information-wide', 24, 888), place('information-narrow', 560, 888),
  ];
  text(24, 20, 'CURRENT NATIVE MASTERS · 1×', 15);
  text(24, 147, 'Header resource family', 14);
  text(24, 727, 'Quiet navigation', 14);
  text(232, 727, 'Console focus', 14);
  text(24, 873, 'Retained prior variants · not used in this composition', 15);
  sheetLayers.push(...await renderedText());
  await saveComposition('sheet-native.png', sheetWidth, sheetHeight, '#151d24', sheetLayers);
  await sharp(path.join(output, 'sheet-native.png'))
    .resize(sheetWidth * 3, sheetHeight * 3, { kernel: 'nearest' })
    .png().toFile(path.join(output, 'sheet-3x.png'));

  const manifest = {
    status: 'Offline art proof; not runtime integration or owner approval',
    reference: '../game-art-proposals/37-lab-extracted-kit/screen-reference.png',
    referenceSize: [752, 421],
    font: 'Explicit bundled Bitstream Vera Sans/Vera Bold font files; C18 type identity unresolved',
    paletteRoles: {
      surface: '#222d35', frame: '#2385c8', focus: '#f5d77f',
      data: '#2568a6', energy: '#f7bc42', essence: '#a4e566',
    },
    composition: { outerInset: 24, gutter: 16, header: [976, 100], navigation: [208, 416], workField: [752, 416], workFieldTextInset: 24, topicFootprint: [136, 144], resourceFootprint: [56, 68], statusAreasReadOnly: true },
    fixtures: { source: 'fixtures.json', sha256: crypto.createHash('sha256').update(fixtureSource).digest('hex'), exports: fixtures.states.map(state => state.export) },
    assets,
  };
  fs.writeFileSync(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
