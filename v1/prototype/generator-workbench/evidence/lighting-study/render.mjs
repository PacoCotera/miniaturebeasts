// Source-native depiction study. Base geometry and pigment owners are never edited.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const directory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(directory, '../semantic-candidate-pet/upright-source.svg');
const packetPath = path.resolve(directory, '../candidate-workbench-flow/first.replay.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceBytes = await fs.readFile(sourcePath);
const source = sourceBytes.toString('utf8');
const packetBytes = await fs.readFile(packetPath);
const packet = JSON.parse(packetBytes);
const centres = packet.result.graph.nodes.filter(node => node.role === 'volume').map(node => node.position[0]);
const bodyClip = source.match(/<clipPath id="([^"]*body-exterior)"/)[1];
const bodyTransform = source.match(/<g transform="(translate\(45[^\"]*scale\([^\"]*)"/)[1];
const originalInnerStart = source.indexOf('<g transform="translate(512 64) rotate(90)">');
if (originalInnerStart < 0 || centres.length !== 5 || !source.includes('<g data-covering=')) throw new Error('Unexpected retained reference');
const scale = 181.538462;
const step = 1 / (scale * .4);
const toneLevels = [.08, .16, .24];
function toneFor(value) {
  const magnitude = Math.abs(value);
  if (magnitude < .12) return null;
  return { fill: value > 0 ? '#ffffff' : '#000000', opacity: toneLevels[magnitude < .35 ? 0 : magnitude < .65 ? 1 : 2] };
}
function field(mode, x, y) {
  if (mode === 'local') {
    const centre = centres.reduce((nearest, candidate) => Math.abs(x - candidate) < Math.abs(x - nearest) ? candidate : nearest, centres[0]);
    const light = Math.exp(-(((x - centre + .035) / .18) ** 2) - (((y - .10) / .22) ** 2));
    const shade = .87 * Math.exp(-(((x - centre - .075) / .25) ** 2) - (((y + .21) / .115) ** 2));
    return light - shade;
  }
  const faceWeight = .18 + .82 * Math.exp(-(((x - .025) / .85) ** 2));
  const light = Math.exp(-(((y - .10) / .22) ** 2)) * faceWeight;
  const shade = .87 * Math.exp(-(((y + .21) / .115) ** 2)) * faceWeight;
  return light - shade;
}
function opticalGroups(mode) {
  const cells = [];
  for (let row = 0; row < 52; row++) {
    const y = -.36 + row * step;
    for (let column = 0; column < 194; column++) {
      const x = -.17 + column * step;
      const tone = toneFor(field(mode, x + step / 2, y + step / 2));
      if (tone) cells.push(`<rect x="${x.toFixed(6)}" y="${y.toFixed(6)}" width="${step.toFixed(6)}" height="${step.toFixed(6)}" fill="${tone.fill}" fill-opacity="${tone.opacity}"/>`);
    }
  }
  return `<g data-optical-study="${mode}" transform="${bodyTransform}" clip-path="url(#${bodyClip})">${cells.join('')}</g>`;
}
function panel(mode, namespace) {
  // Insert optical body light before the unchanged ocular group. Fins/eyes stay exact.
  let result = source.replace('<g data-covering=', `${opticalGroups(mode)}<g data-covering=`);
  const ids = [...result.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  for (const id of ids) {
    result = result.replaceAll(`id="${id}"`, `id="${namespace}-${id}"`).replaceAll(`url(#${id})`, `url(#${namespace}-${id})`);
  }
  return result.replace(/^<svg\b[^>]*>/, `<svg x="25.6" y="32" width="204.8" height="256" viewBox="0 0 512 640">`);
}
const a = panel('local', 'local');
const b = panel('whole', 'whole');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="312" viewBox="0 0 512 312"><title>Source-native controlled light and edge study, identical geometry and pigment masks</title><rect width="512" height="312" fill="#f7f5ee"/><g><text x="16" y="21" font-family="Arial, sans-serif" font-size="13" fill="#263237">A · Five local light centres</text>${a}</g><g transform="translate(256 0)"><text x="16" y="21" font-family="Arial, sans-serif" font-size="13" fill="#263237">B · Continuous face-led light</text>${b}</g><text x="16" y="305" font-family="Arial, sans-serif" font-size="10" fill="#586267">Source-native study · same geometry, masks and optical tones · not an edited Gemini image</text></svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
await fs.writeFile(path.join(directory, 'comparison.svg'), svg);
await fs.writeFile(path.join(directory, 'comparison.png'), png);
const manifest = {
  status: 'source-native controlled depiction study; not provider paintover or pet-master approval',
  source: { path: '../semantic-candidate-pet/upright-source.svg', sha256: sha256(sourceBytes), packetPath: '../candidate-workbench-flow/first.replay.json', packetSha256: sha256(packetBytes) },
  controls: { viewportPixels: [204.8, 256], geometry: 'same retained paths, body/fin roots, oculars, camera, proportions and tessellation', pigments: 'same five repeated russet/golden-yellow local body fields and cream/slate fin fields; base fills retained', material: 'bare smooth skin, no texture or glints added', contour: 'same source contour technique and paths', background: '#f7f5ee', opticalToneSet: { light: '#ffffff', shadow: '#000000', opacityLevels: toneLevels }, maximumOpacity: .24, panelA: 'five source-centred local optical fields', panelB: 'one continuous lateral optical field, strongest near source face and quieter toward rear' },
  limitations: ['The treatment bundle redistributes light and resulting optical edge emphasis; it does not isolate one physical lighting parameter.', 'Source-native SVG finish differs from the retained provider raster, which is unchanged.', 'No new anatomy, palette, expression, animation or game-art acceptance.'],
  outputs: { 'comparison.svg': sha256(Buffer.from(svg)), 'comparison.png': sha256(png) },
};
await fs.writeFile(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ sourceSha256: manifest.source.sha256, outputs: manifest.outputs }));
