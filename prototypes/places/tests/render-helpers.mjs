// Shared by the renderer tests: the committed fixture place and tile set read back from baked/, and a full palette (core colours for the
// light tables' targets, then the set's own) to turn indexed buffers into pictures.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPlace, readTileSet } from '../src/format/read.mjs';
import { indexedToRgba } from '../src/indexed.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const places = path.join(here, '..');
export const repo = path.join(places, '..', '..');

export const ts = readTileSet(readFileSync(path.join(places, 'baked', 'ninja-test.mbtiles')));
export const place = readPlace(readFileSync(path.join(places, 'baked', 'Test_AllCases.mbplace')));
export const placeX = readPlace(readFileSync(path.join(places, 'baked', 'Test_AllCases~x.mbplace')));

// The layered set has ONE water frame until the art desk paints the ripple frames (@1..@3, owed [art]), so nothing in the set animates. The clock tests need an animated tile: here, in memory only
// (never in baked/), each tile of the water fill gets three more frames, the atlas slots of the deep, sand and mud fills, at 250 ms. Frame 0 is the real water, so every picture at clock 0 is the real
// one; the water-frame-2 golden shows the fixture's frame, not art. Drop this when the desk's frames are in the set.
{
  const fillOf = (v) => ts.pairs.find((p) => p.lower === v && p.upper === v && p.mode === 'opaque');
  const water = fillOf(2), others = [1, 3, 4].map((v) => ts.tiles[fillOf(v).fullVariants[0]].frames[0]);
  for (const id of water.fullVariants) { ts.tiles[id].frames = [ts.tiles[id].frames[0], ...others]; ts.tiles[id].frameMs = 250; }
}

const core = JSON.parse(readFileSync(path.join(repo, 'art', 'companion-48', 'terrain', 'meadow', 'meadow-palette.json'), 'utf8')).entries.slice(0, 48);
export const NIGHT = core.find((e) => e.name === 'night').i;
export const pal = { rgb: new Array(256).fill(null).map(() => [255, 0, 255]) };
core.forEach((e) => { pal.rgb[e.i] = [parseInt(e.hex.slice(1, 3), 16), parseInt(e.hex.slice(3, 5), 16), parseInt(e.hex.slice(5, 7), 16)]; });
ts.palette.forEach((c, k) => { pal.rgb[48 + k] = [(c >> 16) & 255, (c >> 8) & 255, c & 255]; });

export const toImage = (buf, w, h) => indexedToRgba(buf, w, h, pal);
export const goldenFile = (name) => path.join(places, 'golden', 'render', name);

export const kindIndex = (group, kind) => ts.sprites.findIndex((s) => s.group === group && s.kind === kind);

// a cell mask (Uint8Array w*h) from a predicate
export function cells(pl, f) { const a = new Uint8Array(pl.w * pl.h); for (let y = 0; y < pl.h; y++) for (let x = 0; x < pl.w; x++) a[y * pl.w + x] = f(x, y) ? 1 : 0; return a; }
