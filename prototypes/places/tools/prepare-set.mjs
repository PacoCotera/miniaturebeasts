// prepare-set: a licensed source kit + a recipe -> a tile set in the contract (place design A3.3).
//   node prepare-set.mjs <recipe.json> --tilesets <dir holding the kits, e.g. research/tilesets> [--out <dir>] [--check]
// Writes set.json, palette.json, the pair sheets (16 tiles in corner order, one sheet per animation frame), the full-tile variant strips,
// sprites.png, LICENCE.md and SOURCE.md. The output is deterministic. --check compares the pixels with what is already in the out folder.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, decodePng, encodePng, crop, paste, newImage } from '../src/png.mjs';
import { computeTables, TABLE_NAMES } from '../src/lighttables.mjs';
import { deskArt, deskLayers } from './desk-art.mjs';

export const SOURCE_ALLOW = ['ninja-adventure', 'puny-world', 'happyland-wang'];
export const PALETTE_MAX = 208;       // indices 48..255; 0..47 are the core palette
export const CORE_COLOURS = 48;
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');

// Source paths are relative to the kits folder and must start at an allowed kit. The Zelda-like set (ArMM1998) is never imported.
export function checkSourcePath(rel) {
  if (typeof rel !== 'string' || rel === '') throw new Error('source path is empty');
  const norm = path.posix.normalize(rel.replaceAll('\\', '/'));
  const parts = norm.split('/');
  if (norm.startsWith('/') || parts.includes('..')) throw new Error(`source path "${rel}" leaves the kits folder`);
  if (parts.some((p) => /zelda|armm/i.test(p))) throw new Error(`source path "${rel}" names the Zelda-like set, which is never imported`);
  if (!SOURCE_ALLOW.includes(parts[0])) throw new Error(`source path "${rel}" is outside the allow-list (${SOURCE_ALLOW.join(', ')})`);
  return norm;
}

const hex = (r, g, b) => [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const unhex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

function recolourImage(img, map) {
  if (!map) return img;
  const m = new Map(Object.entries(map).map(([a, b]) => [a, unhex(b)]));
  const out = { w: img.w, h: img.h, data: new Uint8Array(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] === 0) continue;
    const to = m.get(hex(out.data[i], out.data[i + 1], out.data[i + 2]));
    if (to) { out.data[i] = to[0]; out.data[i + 1] = to[1]; out.data[i + 2] = to[2]; }
  }
  return out;
}

function keyOut(img, key) {
  if (!key) return img;
  const [kr, kg, kb] = unhex(key);
  const out = { w: img.w, h: img.h, data: new Uint8Array(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i] === kr && out.data[i + 1] === kg && out.data[i + 2] === kb) out.data[i + 3] = 0;
  }
  return out;
}

// Corner index (place design A2): NW*8 + NE*4 + SW*2 + SE, a set bit = the upper terrain. The pieces of a 13-piece blob set show the
// LOWER terrain as the blob (water in a pond), so a piece named for the blob's position maps to the corner pattern of the upper terrain.
const DIRECT = { // [NW, NE, SW, SE] of the upper terrain -> piece
  '1110': 'TL', '1101': 'TR', '1011': 'BL', '0111': 'BR',
  '1100': 'T', '0011': 'B', '1010': 'L', '0101': 'R',
  '1000': 'inNW', '0100': 'inNE', '0010': 'inSW', '0001': 'inSE', '0000': 'C',
};
export const BLOB_PIECES = ['TL', 'T', 'TR', 'L', 'C', 'R', 'BL', 'B', 'BR', 'inSE', 'inSW', 'inNE', 'inNW'];

// pieces: name -> image (t x t); base: the upper terrain's full tile. Returns 16 tiles in corner order.
export function cutBlobToDual16(pieces, base, t) {
  for (const n of BLOB_PIECES) if (!pieces[n]) throw new Error(`blob piece ${n} is missing`);
  const h = t >> 1;
  const tiles = [];
  for (let n = 0; n < 16; n++) {
    const key = [n >> 3 & 1, n >> 2 & 1, n >> 1 & 1, n & 1].join('');
    const tile = newImage(t, t);
    paste(tile, base, 0, 0);
    if (n === 15) { /* the upper terrain's own tile */ }
    else if (n === 9) { paste(tile, pieces.inNW, 0, 0); paste(tile, crop(pieces.inSE, h, h, h, h), h, h); }
    else if (n === 6) { paste(tile, pieces.inNE, 0, 0); paste(tile, crop(pieces.inSW, 0, h, h, h), 0, h); }
    else paste(tile, pieces[DIRECT[key]], 0, 0);
    tiles.push(tile);
  }
  return tiles;
}

// The other re-cut: each of the tile's four corner cells contributes the quarter of its blob piece that faces the corner. A quarter
// depends only on the cell and its three neighbours inside the 2x2 (side, side, diagonal), so every tile edge is decided by its two corners
// alone and tiles meet without a seam. The cost: round shores are squared off at corners, because a piece's curve spans more than a quarter.
const QUARTER = { BR: ['R', 'B', 'inSE', 8, 8], BL: ['L', 'B', 'inSW', 0, 8], TR: ['R', 'T', 'inNE', 8, 0], TL: ['L', 'T', 'inNW', 0, 0] };
export function quarterPiece(corner, sideA, sideB, diag) { // a, b, diag: is that neighbour the upper terrain (the blob's "land")?
  const [h, v, inner] = QUARTER[corner];
  if (sideA && sideB) return corner;
  if (sideA) return h;
  if (sideB) return v;
  return diag ? inner : 'C';
}
export function cutBlobToDual16Quarters(pieces, base, t) {
  for (const n of BLOB_PIECES) if (!pieces[n]) throw new Error(`blob piece ${n} is missing`);
  const h = t >> 1;
  const tiles = [];
  for (let n = 0; n < 16; n++) {
    const tl = !!(n & 8), tr = !!(n & 4), bl = !!(n & 2), br = !!(n & 1);
    const tile = newImage(t, t);
    paste(tile, base, 0, 0);
    const quads = [
      [tl, 'BR', tr, bl, br, 0, 0], [tr, 'BL', tl, br, bl, h, 0],
      [bl, 'TR', br, tl, tr, 0, h], [br, 'TL', bl, tr, tl, h, h],
    ];
    for (const [land, q, a, b, d, px, py] of quads) {
      if (land) continue; // the upper terrain: the base shows
      const name = quarterPiece(q, a, b, d);
      const qx = q === 'BR' || q === 'TR' ? h : 0, qy = q === 'BR' || q === 'BL' ? h : 0;
      paste(tile, crop(pieces[name], qx, qy, h, h), px, py);
    }
    tiles.push(tile);
  }
  return tiles;
}

// Edge stitching. Blob art is drawn for neighbours chosen by eight cells, so re-cut as corner tiles the pieces agree on where a shore
// leaves a tile only to within a few pixels, and their grass texture runs into the border at different places: the edge-signature proof
// (seams.mjs) fails. Stitching makes the proof hold by construction: for each tile edge and each of its four corner states the boundary
// line is taken from the one tile whose shore runs straight through that edge (the half-plane tile), its two end pixels set to the plain
// colour of the terrain at that corner, and written over the boundary of every tile, frame and variant with that state. The cost is at most a
// one-pixel line at the border of a tile where its own shore drifted; a set painted for the contract needs none (`stitch` absent).
const CANON = { // [edge][state] -> the corner-index of the tile that supplies the line (state = first end * 2 + second end, a set bit = upper)
  N: { 0: 0, 3: 15, 2: 10, 1: 5 }, S: { 0: 0, 3: 15, 2: 10, 1: 5 },
  W: { 0: 0, 3: 15, 2: 12, 1: 3 }, E: { 0: 0, 3: 15, 2: 12, 1: 3 },
};
const EDGE_STATE = {
  N: (k) => (k & 8 ? 2 : 0) | (k & 4 ? 1 : 0), S: (k) => (k & 2 ? 2 : 0) | (k & 1 ? 1 : 0),
  W: (k) => (k & 8 ? 2 : 0) | (k & 2 ? 1 : 0), E: (k) => (k & 4 ? 2 : 0) | (k & 1 ? 1 : 0),
};
const EDGE_ENDS = { N: ['NW', 'NE'], S: ['SW', 'SE'], W: ['NW', 'SW'], E: ['NE', 'SE'] };
const cornerXY = (s) => ({ NW: [0, 0], NE: [s - 1, 0], SW: [0, s - 1], SE: [s - 1, s - 1] });
const edgeXY = (e, s, i) => (e === 'N' ? [i, 0] : e === 'S' ? [i, s - 1] : e === 'W' ? [0, i] : [s - 1, i]);
const getPx = (img, x, y) => Array.from(img.data.slice((y * img.w + x) * 4, (y * img.w + x) * 4 + 4));
const putPx = (img, x, y, c) => { img.data.set(c, (y * img.w + x) * 4); };

// tiles: the 16 tiles of frame 0 (read for the canonical lines); members: [{ img, k }] every image to write (all frames' tiles, variants of 15 and 0).
export function stitchEdges(tiles, members) {
  const s = tiles[0].w, xy = cornerXY(s);
  const corner = (name, upper) => { const [x, y] = xy[name]; return getPx(tiles[upper ? 15 : 0], x, y); };
  const canon = {};
  for (const e of ['N', 'E', 'S', 'W']) {
    canon[e] = {};
    for (const st of [0, 1, 2, 3]) {
      const src = tiles[CANON[e][st]];
      const line = Array.from({ length: s }, (_, i) => getPx(src, ...edgeXY(e, s, i)));
      const [first, second] = EDGE_ENDS[e];
      line[0] = corner(first, !!(st & 2));
      line[s - 1] = corner(second, !!(st & 1));
      canon[e][st] = line;
    }
  }
  for (const { img, k } of members) {
    for (const e of ['N', 'E', 'S', 'W']) {
      const line = canon[e][EDGE_STATE[e](k)];
      for (let i = 0; i < s; i++) putPx(img, ...edgeXY(e, s, i), line[i]);
    }
  }
}

export function gridSheet(tiles, t) {
  const sheet = newImage(4 * t, 4 * t);
  tiles.forEach((tile, i) => paste(sheet, tile, (i % 4) * t, (i >> 2) * t));
  return sheet;
}
export function stripSheet(tiles, t) {
  const sheet = newImage(tiles.length * t, t);
  tiles.forEach((tile, i) => paste(sheet, tile, i * t, 0));
  return sheet;
}

function shelfPack(items, width) { // items: [{name, w, h}] -> positions; deterministic
  const order = [...items].sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
  let x = 0, y = 0, rowH = 0;
  const pos = {};
  for (const it of order) {
    if (it.w > width) throw new Error(`sprite ${it.name} is wider than the sheet`);
    if (x + it.w > width) { x = 0; y += rowH + 1; rowH = 0; }
    pos[it.name] = [x, y];
    x += it.w + 1; rowH = Math.max(rowH, it.h);
  }
  return { pos, height: y + rowH };
}

// compact JSON: arrays of numbers and of number arrays on one line
export function fmtJson(v, ind = '') {
  const flat = (a) => Array.isArray(a) && a.every((e) => typeof e === 'number' || typeof e === 'string' || (Array.isArray(e) && e.every((n) => typeof n === 'number')));
  if (flat(v)) return JSON.stringify(v).replaceAll('],[', '], [').replaceAll(',', ', ').replaceAll('"', '"');
  if (Array.isArray(v)) return v.length ? '[\n' + v.map((e) => ind + '  ' + fmtJson(e, ind + '  ')).join(',\n') + '\n' + ind + ']' : '[]';
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    return ks.length ? '{\n' + ks.map((k) => `${ind}  ${JSON.stringify(k)}: ${fmtJson(v[k], ind + '  ')}`).join(',\n') + '\n' + ind + '}' : '{}';
  }
  return JSON.stringify(v);
}

// Returns Map(fileName -> Buffer) for the set folder.
export function prepareSet(recipe, { tilesetsRoot, repoRoot: root = repoRoot }) {
  const t = recipe.sourceTile;
  if (t * recipe.scale !== 48) throw new Error(`sourceTile ${t} x scale ${recipe.scale} is not 48`);
  const files = new Map();
  const images = new Map(); // file name -> image, every RGBA PNG written
  const cache = new Map();
  const load = (key) => {
    if (!cache.has(key)) {
      const rel = checkSourcePath(recipe.sources[key]);
      cache.set(key, readPng(path.join(tilesetsRoot, rel)));
    }
    return cache.get(key);
  };
  const cell = (key, c, r) => crop(load(key), c * t, r * t, t, t);

  // pairs
  const pairs = [];
  for (const p of recipe.pairs) {
    if (p.premade) {   // a pair the art desk drew whole (16 tiles in corner order, the full tile): its sheets are placed files in the set's own folder, taken as they are
      const dir = path.join(root, 'art', 'places', 'sets', recipe.id);
      for (const n of [...p.premade.sheets, p.premade.fullSheet]) images.set(n, readPng(path.join(dir, n)));
      pairs.push({ id: p.id, lower: p.lower, upper: p.upper, mode: p.mode, sheets: p.premade.sheets, fullSheet: p.premade.fullSheet });
      continue;
    }
    const pieces = {};
    for (const n of BLOB_PIECES) { const [c, r] = p.blob.cells[n]; pieces[n] = recolourImage(cell(p.blob.sheet, c, r), p.recolour); }
    const fullCells = p.upperFull.cells.map(([c, r]) => cell(p.upperFull.sheet, c, r));
    const cutter = { whole: cutBlobToDual16, quarters: cutBlobToDual16Quarters }[p.cut || 'whole'];
    if (!cutter) throw new Error(`pair ${p.id}: unknown cut "${p.cut}"`);
    const tiles = cutter(pieces, fullCells[0], t);
    const frames = p.lowerFrames ? p.lowerFrames.rects : [null];
    const frameTiles = frames.map((rect) => {
      const ft = tiles.map((x) => ({ w: x.w, h: x.h, data: new Uint8Array(x.data) }));
      if (rect) ft[0] = crop(load(p.lowerFrames.sheet), rect[0], rect[1], rect[2], rect[3]);
      return ft;
    });
    const variants = fullCells.map((x) => ({ w: x.w, h: x.h, data: new Uint8Array(x.data) }));
    if (p.stitch) {
      const members = [];
      frameTiles.forEach((ft) => ft.forEach((img, k) => members.push({ img, k })));
      variants.forEach((img) => members.push({ img, k: 15 }));
      stitchEdges(frameTiles[0].map((x) => ({ w: x.w, h: x.h, data: new Uint8Array(x.data) })), members);
    }
    const sheets = frameTiles.map((ft, k) => {
      const name = k === 0 ? `pair-${p.id}.png` : `pair-${p.id}@${k}.png`;
      images.set(name, gridSheet(ft, t));
      return name;
    });
    images.set(`pair-${p.id}-full.png`, stripSheet(variants, t));
    const entry = { id: p.id, lower: p.lower, upper: p.upper, mode: p.mode, sheets };
    if (p.lowerFrames) entry.frameMs = p.lowerFrames.ms;
    entry.fullSheet = `pair-${p.id}-full.png`;
    pairs.push(entry);
  }

  // the art desk's open edges and meadow decor (`desk`), read from the pinned desk commits: more pairs, the reed look, and small decals for the sprite sheet
  let desk = null, deskTerrain = null;
  if (recipe.desk) {
    desk = deskArt();
    for (const [n, im] of desk.images) images.set(n, im);
    pairs.push(...desk.pairs);
    deskTerrain = deskLayers();   // the terrain layers: fills, over sheets, the reed look and the tone layer, beside the pairs until the pair path goes
    for (const [n, im] of deskTerrain.images) images.set(n, im);
  }

  // sprites
  const items = [];
  const groups = { props: recipe.props || {}, decals: { ...(recipe.decals || {}), ...Object.fromEntries(Object.entries(desk ? desk.decals : {}).map(([n, image]) => [n, { image, rect: [0, 0, image.w, image.h], anchor: [8, 15] }])) }, canopy: recipe.canopy || {} };
  const spriteImg = {};
  for (const [g, defs] of Object.entries(groups)) {
    for (const [name, d] of Object.entries(defs)) {
      const frames = d.frames || 1;
      const [x, y, w, h] = d.rect;
      const strip = newImage(w * frames, h);
      for (let k = 0; k < frames; k++) paste(strip, d.image ? d.image : keyOut(crop(load(d.sheet), x + k * w, y, w, h), d.key), k * w, 0);
      spriteImg[`${g}/${name}`] = strip;
      items.push({ name: `${g}/${name}`, w: strip.w, h: strip.h });
    }
  }
  const packed = shelfPack(items, 256);
  const sheet = newImage(256, packed.height);
  const setSprites = { props: {}, decals: {}, canopy: {} };
  for (const [g, defs] of Object.entries(groups)) {
    for (const [name, d] of Object.entries(defs)) {
      const [px, py] = packed.pos[`${g}/${name}`];
      paste(sheet, spriteImg[`${g}/${name}`], px, py);
      const e = { rect: [px, py, d.rect[2], d.rect[3]], anchor: d.anchor };
      if (d.frames && d.frames > 1) { e.frames = d.frames; e.frameMs = d.frameMs; }
      if (g === 'props') { e.footprint = d.footprint || []; if (d.canopy) e.canopy = d.canopy; }
      setSprites[g][name] = e;
    }
  }
  images.set('sprites.png', sheet);

  // palette: exact colours of every pixel written, none with partial alpha
  const colours = new Set();
  for (const [name, img] of images) {
    for (let i = 0; i < img.data.length; i += 4) {
      const a = img.data[i + 3];
      if (a === 0) continue;
      if (a !== 255) throw new Error(`${name}: partial alpha (${a}); the contract is alpha 0 or 255`);
      colours.add(hex(img.data[i], img.data[i + 1], img.data[i + 2]));
    }
  }
  const lum = (h) => { const [r, g, b] = unhex(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
  let sorted = [...colours].sort((a, b) => lum(a) - lum(b) || (a < b ? -1 : 1));
  if (recipe.palettePin) {   // indices already promised to the art desk's light tables (the range haze is keyed to the kit's 43, then the open edges' 7): they keep their slots, new colours follow
    const pin = recipe.palettePin.map((c) => c.replace('#', ''));
    sorted = [...pin, ...sorted.filter((c) => !pin.includes(c))];
  }
  if (sorted.length > PALETTE_MAX) {
    throw new Error(`the source has ${sorted.length} colours, over the ${PALETTE_MAX} the contract allows; add the pinned pngquant step to the recipe`);
  }
  const core = JSON.parse(readFileSync(path.join(root, recipe.corePalette), 'utf8')).entries.slice(0, CORE_COLOURS).map((e) => unhex(e.hex.slice(1)));
  const tables = computeTables(core, sorted.map(unhex));
  const palette = { formatVersion: 1, firstIndex: CORE_COLOURS, count: sorted.length, colours: sorted.map((h) => '#' + h), tables: {} };
  for (const n of TABLE_NAMES) palette.tables[n] = tables[n];

  for (const [name, img] of images) files.set(name, Buffer.from(encodePng(img)));
  for (const p of recipe.pairs) if (p.premade) for (const n of [...p.premade.sheets, p.premade.fullSheet]) files.set(n, readFileSync(path.join(root, 'art', 'places', 'sets', recipe.id, n)));   // the desk's own bytes, as placed

  const set = {
    formatVersion: 1, id: recipe.id, name: recipe.name, ship: recipe.ship,
    licence: { spdx: recipe.licence.spdx, author: recipe.licence.author, source: recipe.licence.source, fetched: recipe.licence.fetched, archiveSha256: recipe.licence.archiveSha256 },
    sourceTile: t, scale: recipe.scale, half: recipe.half, palette: 'palette.json', spriteSheet: 'sprites.png',
    pairs, ...(desk ? { looks: desk.looks } : {}), ...(deskTerrain ? { layers: deskTerrain.layers, tone: deskTerrain.tone } : {}), props: setSprites.props, decals: setSprites.decals, canopy: setSprites.canopy,
  };
  if (desk) {
    for (const [n, b] of desk.files) files.set(n, b);
    for (const [n, b] of deskTerrain.files) files.set(n, b);
    files.set('DESK.json', Buffer.from(JSON.stringify({ ...desk.desk, ...deskTerrain.desk }, null, 2) + '\n'));
  }
  files.set('set.json', Buffer.from(fmtJson(set) + '\n'));
  files.set('palette.json', Buffer.from(fmtJson(palette) + '\n'));

  const licFile = checkSourcePath(recipe.licence.file);
  files.set('LICENCE.md', readFileSync(path.join(tilesetsRoot, licFile)));
  const srcMd = [
    `# ${recipe.name}: source`, '',
    `- **Source:** ${recipe.licence.source}`,
    `- **Author:** ${recipe.licence.author}`,
    `- **Fetched:** ${recipe.licence.fetched}`,
    `- **Archive sha256:** ${recipe.licence.archiveSha256}`,
    `- **Licence:** ${recipe.licence.spdx} (the legal code is \`LICENCE.md\`, copied from \`${licFile}\`)`,
    `- **Ship:** \`${recipe.ship}\`: a CC0 stand-in for tests and the public sandbox, credited in THIRD_PARTY_NOTICES.md`,
    `- **Palette:** ${sorted.length} colours of the ${PALETTE_MAX} the contract allows (measured; no pngquant step was needed)`, '',
    'Generated by `prototypes/places/tools/prepare-set.mjs` from `recipe.json`; do not edit by hand.', '',
    '## What was cut and how', '', ...recipe.notes.map((n) => `- ${n}`), '',
    '## Pairs', '', ...pairs.map((p) => `- \`${p.id}\`: ${p.upper} over ${p.lower}, ${p.mode}, ${p.sheets.length} frame${p.sheets.length > 1 ? 's' : ''}`), '',
    ...(deskTerrain ? ['## Terrain layers', '', ...Object.entries(deskTerrain.layers).map(([id, l]) => `- \`${id}\`: ` + (l.drawAs ? `drawn as ${l.drawAs}` : [l.fill ? 'fill' : null, ...(l.over || []).map((k) => `${k.kind} over ${k.lowers.join(', ')}`)].filter(Boolean).join('; '))), `- \`tone\`: of ${deskTerrain.tone.of}`, ''] : []),
    '## Source files read', '', ...Object.values(recipe.sources).map((s) => `- \`${s}\``), '',
  ].join('\n');
  files.set('SOURCE.md', Buffer.from(srcMd));
  return { files, colourCount: sorted.length };
}

function pixelsEqual(a, b) {
  const x = decodePng(a), y = decodePng(b);
  return x.w === y.w && x.h === y.h && Buffer.compare(Buffer.from(x.data), Buffer.from(y.data)) === 0;
}

function main(argv) {
  const args = argv.slice(2);
  const take = (flag) => { const i = args.indexOf(flag); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
  const tilesetsRoot = take('--tilesets');
  const outFlag = take('--out');
  const check = args.includes('--check');
  const recipePath = args.find((a) => !a.startsWith('--'));
  if (!recipePath || !tilesetsRoot) { console.error('usage: prepare-set.mjs <recipe.json> --tilesets <dir> [--out <dir>] [--check]'); process.exit(2); }
  const recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
  const out = outFlag || path.dirname(path.resolve(recipePath));
  const { files, colourCount } = prepareSet(recipe, { tilesetsRoot: path.resolve(tilesetsRoot) });
  console.log(`${recipe.id}: ${colourCount} colours (limit ${PALETTE_MAX}), ${files.size} files`);
  let bad = 0;
  mkdirSync(out, { recursive: true });
  for (const [name, buf] of files) {
    const file = path.join(out, name);
    if (check) {
      const same = existsSync(file) && (name.endsWith('.png') ? pixelsEqual(readFileSync(file), buf) : Buffer.compare(readFileSync(file), buf) === 0);
      if (!same) { console.error('differs: ' + name); bad++; }
    } else writeFileSync(file, buf);
  }
  if (bad) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv);
