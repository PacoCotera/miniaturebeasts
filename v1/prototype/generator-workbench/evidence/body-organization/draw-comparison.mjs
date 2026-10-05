// Disposable evidence composition; geometry belongs to the source constructor.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { commonGraphSourceCamera, drawGraphSource } from '../../graph-source-presentation.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const directory = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cases = [
  { id: 'a-support-contacts', label: 'A · Compact middle / six contacts' },
  { id: 'b-taper-fins', label: 'B · Front taper / six fins' },
];

for (const item of cases) {
  const constructionBytes = await fs.readFile(path.join(directory, `${item.id}.construction.json`));
  const packetBytes = await fs.readFile(path.join(directory, `${item.id}.packet.json`));
  item.construction = JSON.parse(constructionBytes);
  item.packet = JSON.parse(packetBytes);
  if (item.construction.status !== 'constructed' || item.construction.profile?.id !== 'graph-source/2') {
    throw new Error(`${item.id}: actual graph-source/2 construction required`);
  }
  if (item.packet.status !== 'resolved') throw new Error(`${item.id}: resolved source packet required`);
  if (item.construction.surfaces.some(surface => surface.palette.some(pigment => !['#269fa5', '#dfd2ae'].includes(pigment)))) {
    throw new Error(`${item.id}: source comparison requires actual lagoon/cream controls`);
  }
  item.sourceHashes = { construction: hash(constructionBytes), packet: hash(packetBytes) };
}

const camera = commonGraphSourceCamera(cases.map(item => item.construction));
const size = 256;
const svgParts = [
  '<rect width="512" height="636" fill="#f7f5ee"/>',
  '<text x="16" y="24" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#263237">Provisional body organisation · actual sources</text>',
  '<text x="16" y="48" font-family="Arial, sans-serif" font-size="11" fill="#586267">Same world scale · lagoon body / cream modules · smooth skin · eyes off</text>',
];

function placedSource(source, x, y, namespace, silhouette) {
  let inner = source.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
  if (silhouette) {
    inner = inner.replace(/fill="(#[0-9a-fA-F]{6})"/g, (match, pigment) => pigment.toLowerCase() === '#f7f5ee' ? match : 'fill="#111111"');
    inner = inner.replace(/stroke="#[0-9a-fA-F]{6}"/g, 'stroke="#111111"');
  }
  for (const match of [...inner.matchAll(/\bid="([^"]+)"/g)]) {
    const id = match[1];
    inner = inner.replaceAll(`id="${id}"`, `id="${namespace}-${id}"`).replaceAll(`url(#${id})`, `url(#${namespace}-${id})`);
  }
  return `<g transform="translate(${x} ${y})">${inner}</g>`;
}

for (const [index, item] of cases.entries()) {
  const source = drawGraphSource(item.construction, { camera, size });
  const x = index * size;
  svgParts.push(`<text x="${x + 16}" y="78" font-family="Arial, sans-serif" font-size="13" fill="#263237">${item.label}</text>`);
  svgParts.push(placedSource(source, x, 90, `${item.id}-colour`, false));
  svgParts.push(placedSource(source, x, 364, `${item.id}-silhouette`, true));
  item.emittedSvgHash = hash(Buffer.from(source));
}
svgParts.push('<text x="16" y="356" font-family="Arial, sans-serif" font-size="11" fill="#586267">Silhouettes · same solved outlines, display fill only</text>');
svgParts.push('<text x="16" y="630" font-family="Arial, sans-serif" font-size="10" fill="#586267">Source-construction experiment · not finished pet art or physical movement evidence</text>');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="636" viewBox="0 0 512 636"><title>Actual body-organization sources and matching silhouettes at shared world scale</title>${svgParts.join('')}</svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
await fs.writeFile(path.join(directory, 'comparison.svg'), svg);
await fs.writeFile(path.join(directory, 'comparison.png'), png);
const manifest = {
  status: 'actual source-construction comparison; provisional inherited content, not approved pets',
  canvas: [512, 636], sourceCellSize: size, sharedCamera: camera,
  controls: { cameraAndScale: 'identical for both cases and rows', colours: 'actual lagoon body and cream secondary module pigments from source surfaces', material: 'smooth skin, no markings or covering glyphs', oculars: 'off in the actual worked inputs', silhouette: 'same emitter and source geometry; display fill/stroke black; no source mutation' },
  cases: cases.map(item => ({ id: item.id, label: item.label, sourceFiles: [`${item.id}.packet.json`, `${item.id}.construction.json`], sourceHashes: item.sourceHashes, emittedSvgHash: item.emittedSvgHash, constructionDigest: item.construction.constructionDigest, regionCount: item.construction.bodyExteriors[0].sourceNodeIds.length, appendageCount: item.construction.appendages.length })),
  outputHashes: { 'comparison.svg': hash(Buffer.from(svg)), 'comparison.png': hash(png) },
  limits: ['No manual body redraw, independent per-case scaling or new trait selection.', 'Compact contact and taper/fin shapes must be assessed on these actual exports, not labels.', 'The source comparison does not establish radial/membrane breadth, biomechanics, animation, pixel-art mastery or pet appeal.'],
};
await fs.writeFile(path.join(directory, 'comparison-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ sharedCamera: camera, cases: manifest.cases.map(item => ({ id: item.id, regions: item.regionCount, appendages: item.appendageCount })), outputHashes: manifest.outputHashes }));
