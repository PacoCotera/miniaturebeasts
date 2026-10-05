// Disposable composition of every retained winner; no sampling or source mutation.
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
const inputBytes = await fs.readFile(path.join(directory, 'random-run.json'));
const retained = JSON.parse(inputBytes);
if (retained.runs.length !== 8 || retained.seeds.length !== 8) {
  throw new Error('All eight retained random runs are required.');
}
for (const [index, run] of retained.runs.entries()) {
  if (run.requestedSeed !== retained.seeds[index] || run.status !== 'constructed' ||
      run.winner?.construction?.status !== 'constructed' ||
      run.winner.construction.profile.id !== 'graph-source/2') {
    throw new Error(`Run ${index + 1}: retained ordered graph-source/2 winner required.`);
  }
}

const size = 256;
const width = 1024;
const height = 690;
const camera = commonGraphSourceCamera(retained.runs.map(run => run.winner.construction));
const parts = [
  `<rect width="${width}" height="${height}" fill="#f7f5ee"/>`,
  '<text x="16" y="26" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#263237">Eight retained random outcomes · actual source constructions</text>',
  '<text x="16" y="49" font-family="Arial, sans-serif" font-size="13" fill="#586267">Body / appendage geometry and pigment fields · eyes not depicted · one shared world scale</text>',
];
const cases = [];
for (const [index, run] of retained.runs.entries()) {
  const x = (index % 4) * size;
  const y = Math.floor(index / 4) * 308 + 90;
  const source = drawGraphSource(run.winner.construction, { camera, size });
  let inner = source.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
  for (const match of [...inner.matchAll(/\bid="([^"]+)"/g)]) {
    const id = match[1];
    inner = inner.replaceAll(`id="${id}"`, `id="random-${index}-${id}"`)
      .replaceAll(`url(#${id})`, `url(#random-${index}-${id})`);
  }
  parts.push(`<text x="${x + 16}" y="${y - 12}" font-family="Arial, sans-serif" font-size="13" fill="#263237">Requested ${run.requestedSeed} → winner ${run.winningSeed}</text>`);
  parts.push(`<g transform="translate(${x} ${y})">${inner}</g>`);
  cases.push({
    requestedSeed: run.requestedSeed,
    winningSeed: run.winningSeed,
    draws: run.draws,
    rejections: run.rejections,
    constructionDigest: run.winner.construction.constructionDigest,
    emittedSvgHash: hash(Buffer.from(source)),
    regionCount: run.winner.construction.bodyExteriors[0].sourceNodeIds.length,
    appendageCount: run.winner.construction.appendages.length,
  });
}
parts.push('<text x="16" y="675" font-family="Arial, sans-serif" font-size="12" fill="#586267">All eight first successful constructions, in retained order; preceding rejections remain in random-run.json. Not finished pet art.</text>');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>All eight retained random winners at shared world scale</title>${parts.join('')}</svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
await fs.writeFile(path.join(directory, 'random-comparison.svg'), svg);
await fs.writeFile(path.join(directory, 'random-comparison.png'), png);
const manifest = {
  status: 'actual retained random winners; provisional source-construction evidence',
  input: { file: 'random-run.json', sha256: hash(inputBytes), sourceRuleVersion: retained.sourceRuleVersion },
  canvas: [width, height], sourceCellSize: size, sharedCamera: camera,
  method: 'All eight retained winners in stored order, rendered by drawGraphSource with one common camera. No draws, filtering, redraw, recolouring or source mutation.',
  depiction: 'Body and supported appendage geometry with actual pigment fields. Oculars and covering/marking detail are not depicted by this source emitter; absence in the sheet is not a trait-absence claim.',
  countMeaning: 'appendageCount is the number of constructor appendage polygons, including separate articulated segments; it is not a limb-count claim.',
  cases,
  outputHashes: { 'random-comparison.svg': hash(Buffer.from(svg)), 'random-comparison.png': hash(png) },
  limits: ['First valid constructions follow retained rejection search; these are not eight unfiltered first draws.', 'Common scale preserves relative world sizes; smaller sources and thin roots remain smaller.', 'Static XY diagnostic sources do not establish pet appeal, biomechanics, animation or unsupported body-plan coverage.'],
};
await fs.writeFile(path.join(directory, 'random-comparison-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ canvas: manifest.canvas, cases, outputHashes: manifest.outputHashes }));
