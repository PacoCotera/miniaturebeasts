// Load and check a tile set folder (set.json + its PNGs + palette.json) against the contract in src/format/set.schema.json.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Ajv from 'ajv';
import { readPng, crop, scaleNearest } from './png.mjs';
import { buildAtlas } from './indexed.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SET_SCHEMA = JSON.parse(readFileSync(path.join(here, 'format', 'set.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(SET_SCHEMA);

export const ALLOWED_SPDX = ['CC0-1.0', 'LicenseRef-MiniatureBeasts'];

// Returns [] when the set.json object satisfies the contract, else a list of messages.
export function validateSetJson(set) {
  if (validate(set)) return [];
  return validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`);
}

export function loadSet(dir) {
  const set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8'));
  const palette = JSON.parse(readFileSync(path.join(dir, set.palette), 'utf8'));
  const png = new Map();
  const get = (name) => { if (!png.has(name)) png.set(name, readPng(path.join(dir, name))); return png.get(name); };
  return { dir, set, palette, png: get };
}

// The 16 tiles of one frame of a pair at source size (corner order), or at the game size with scaled = true.
export function pairTiles(loaded, pair, frame = 0, scaled = false) {
  const t = loaded.set.sourceTile;
  const sheet = loaded.png(pair.sheets[frame]);
  const tiles = [];
  for (let i = 0; i < 16; i++) {
    let tile = crop(sheet, (i % 4) * t, (i >> 2) * t, t, t);
    if (scaled) tile = scaleNearest(tile, loaded.set.scale);
    tiles.push(tile);
  }
  return tiles;
}

// The tiles of a sheet by name: 16 corner tiles (a 4 x 4 grid), or the way-up piece (a 3 x 2 grid, 6 tiles). Scaled by the set's factor with `scaled`.
export function sheetTiles(loaded, name, scaled = false) {
  const t = loaded.set.sourceTile, sheet = loaded.png(name), cols = sheet.w / t, rows = sheet.h / t, tiles = [];
  for (let i = 0; i < cols * rows; i++) { const tile = crop(sheet, (i % cols) * t, ((i / cols) | 0) * t, t, t); tiles.push(scaled ? scaleNearest(tile, loaded.set.scale) : tile); }
  return tiles;
}

// The extra pair entries a set's pairs carry beyond their plain sheets, in the order the baked tile set lists them after the main pairs (index set.pairs.length + k):
//   { kind: 'tall', pair, s } the cliff's sheet for s = 1..3; { kind: 'variant', pair, n } a corner-tile variant (low scrub); { kind: 'wayup', pair } the way-up piece (6 tiles);
//   { kind: 'look', look, pair, n } the n-th variant of an alternate look of a pair (the reed bank), animated like the pair.
export function extraEntries(set) {
  const out = [];
  for (const p of set.pairs) {
    for (const s of Object.keys(p.tall || {}).sort()) out.push({ kind: 'tall', pair: p.id, s: +s, sheets: [p.tall[s]] });
    (p.variants || []).forEach((v, n) => out.push({ kind: 'variant', pair: p.id, n: n + 1, sheets: [v] }));
    if (p.wayup) out.push({ kind: 'wayup', pair: p.id, sheets: [p.wayup] });
  }
  for (const l of set.looks || []) for (const [pair, variants] of Object.entries(l.of)) variants.forEach((fr, n) => out.push({ kind: 'look', look: l.id, pair, n, sheets: fr }));
  return out;
}

// A pair's tiles as one indexed atlas for the blitter: slots 0..15 the corner tiles of `frame`, then the full variants, then the empty ones.
export function pairAtlas(loaded, pal, pair, frame = 0, scaled = true) {
  const full = fullVariants(loaded, pair, scaled);
  const tiles = [...pairTiles(loaded, pair, frame, scaled), ...full];
  return { atlas: buildAtlas(tiles, pal), size: tiles[0].w, nFull: full.length, nEmpty: 0 };
}

// The pair descriptors the dual grid takes. upperLook / lowerLook are hashes of the pixels of the all-upper and all-lower tiles (every
// frame), equal exactly when a terrain looks the same in two pairs.
export function dualPairs(loaded) {
  const sha = (arrs) => { const h = createHash('sha1'); for (const a of arrs) h.update(a); return h.digest('hex'); };
  const extras = extraEntries(loaded.set), at = (e) => loaded.set.pairs.length + extras.indexOf(e);
  return loaded.set.pairs.map((p) => {
    const frames = p.sheets.map((_, f) => pairTiles(loaded, p, f));
    const fulls = fullVariants(loaded, p);
    const mine = extras.filter((e) => e.pair === p.id), alts = {};   // where the bake finds this pair's other tiles: indices into the baked tile set's pairs
    for (const e of mine) {
      if (e.kind === 'tall') (alts.tall ||= {})[e.s] = at(e);
      else if (e.kind === 'variant') (alts.variants ||= []).push(at(e));
      else if (e.kind === 'wayup') alts.wayup = at(e);
      else ((alts.looks ||= {})[e.look] ||= []).push(at(e));
    }
    return {
      ...alts,
      lower: p.lower, upper: p.upper, mode: p.mode,
      fullCount: fulls.length, emptyCount: p.emptySheet ? loaded.png(p.emptySheet).w / loaded.set.sourceTile : 0,
      upperLook: sha([frames[0][15].data]), lowerLook: sha(frames.map((t) => t[0].data)),
    };
  });
}

export function fullVariants(loaded, pair, scaled = false) {
  const t = loaded.set.sourceTile;
  const strip = loaded.png(pair.fullSheet);
  const out = [];
  for (let i = 0; i < strip.w / t; i++) {
    const v = crop(strip, i * t, 0, t, t);
    out.push(scaled ? scaleNearest(v, loaded.set.scale) : v);
  }
  return out;
}
