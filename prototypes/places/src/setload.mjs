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

// ---- terrain layers (set.json `layers` and `tone`; place design: terrain-layers-design) ----

const scaleIf = (loaded, tile, scaled) => (scaled ? scaleNearest(tile, loaded.set.scale) : tile);

// The opaque variants of a terrain's fill for one animation frame: a strip of n 16 px tiles, scaled by the set's factor with `scaled`.
export function fillTiles(loaded, terrainId, frame = 0, scaled = false) {
  const t = loaded.set.sourceTile, strip = loaded.png(loaded.set.layers[terrainId].fill.sheets[frame]), out = [];
  for (let i = 0; i < strip.w / t; i++) out.push(scaleIf(loaded, crop(strip, i * t, 0, t, t), scaled));
  return out;
}

// The 16 tiles (corner order NW*8+NE*4+SW*2+SE) of one frame of a terrain's over kind (a kind name or its index in `over`); the tone layer is terrain 'tone', kind 0.
export function layerTiles(loaded, terrainId, kind = 0, frame = 0, scaled = false) {
  const t = loaded.set.sourceTile;
  const sheets = terrainId === 'tone' ? loaded.set.tone.sheets : overKind(loaded.set, terrainId, kind).sheets;
  const sheet = loaded.png(sheets[frame]), tiles = [];
  for (let i = 0; i < 16; i++) tiles.push(scaleIf(loaded, crop(sheet, (i % 4) * t, (i >> 2) * t, t, t), scaled));
  return tiles;
}

// The slot-15 variants of an over kind (`full`), or [] when it has none.
export function kindFullTiles(loaded, terrainId, kind = 0, scaled = false) {
  const k = overKind(loaded.set, terrainId, kind);
  if (!k.full) return [];
  const t = loaded.set.sourceTile, strip = loaded.png(k.full), out = [];
  for (let i = 0; i < strip.w / t; i++) out.push(scaleIf(loaded, crop(strip, i * t, 0, t, t), scaled));
  return out;
}

function overKind(set, terrainId, kind) {
  const over = (set.layers[terrainId] || {}).over || [];
  const k = typeof kind === 'number' ? over[kind] : over.find((o) => o.kind === kind);
  if (!k) throw new Error(`the set has no over kind ${kind} for ${terrainId}`);
  return k;
}

// The rows of the baked tile set a layered set lists, in order (each becomes a `Pair` row of the .mbtiles; the device only blits tile ids):
//   per terrain in the set's order: its fill row, then one row per over kind; then the extras of each kind (tall sheets by s then list order, variants, way-up pieces by lower id, looks by name and variant); then the tone row.
// A row is { type: 'fill' | 'over' | 'tall' | 'variant' | 'wayup' | 'look' | 'tone', terrain, kind?, sheets: [per frame], ...key }.
export function layerRows(set) {
  const rows = [], layers = set.layers || {};
  for (const [id, l] of Object.entries(layers)) {
    if (l.fill) rows.push({ type: 'fill', terrain: id, sheets: l.fill.sheets });
    (l.over || []).forEach((k) => rows.push({ type: 'over', terrain: id, kind: k.kind, sheets: k.sheets }));
  }
  for (const [id, l] of Object.entries(layers)) {
    for (const k of l.over || []) {
      for (const s of Object.keys(k.tall || {}).sort()) k.tall[s].forEach((sh, n) => rows.push({ type: 'tall', terrain: id, kind: k.kind, s: +s, n, sheets: [sh] }));
      (k.variants || []).forEach((sh, n) => rows.push({ type: 'variant', terrain: id, kind: k.kind, n: n + 1, sheets: [sh] }));
      for (const lower of Object.keys(k.wayup || {}).sort()) rows.push({ type: 'wayup', terrain: id, kind: k.kind, lower, sheets: [k.wayup[lower]] });
      for (const name of Object.keys(k.looks || {}).sort()) k.looks[name].forEach((frames, n) => rows.push({ type: 'look', terrain: id, kind: k.kind, look: name, n, sheets: frames }));
    }
  }
  if (set.tone) rows.push({ type: 'tone', terrain: 'tone', sheets: set.tone.sheets });
  return rows;
}

// What the dual grid by terrain takes (dualgrid.terrainLayers): `layers` is a Map keyed by terrain VALUE, each
//   { z, fillCount, kinds: [{ kind, lowers: Set(values), fullCount, rows }], ground, drawAs, fillRow }
// where `rows` are indices into layerRows(set) (the baked tile set's rows): { over, tall: { s: [row] }, variants: [row], wayup: { lowerId: row }, looks: { name: [row] } }.
// `tone` is { of: value, row } or null. Every terrain, lower, ground and drawAs id is checked against terrain.json (terrains: [{ id, value, z }]).
export function layerDescriptors(loaded, terrains) {
  const set = loaded.set, byId = new Map(terrains.map((t) => [t.id, t]));
  const val = (id, where) => { if (!byId.has(id)) throw new Error(`${where}: "${id}" is not a terrain in terrain.json`); return byId.get(id).value; };
  const rows = layerRows(set), at = (pred) => rows.findIndex(pred);
  const layers = new Map();
  for (const [id, l] of Object.entries(set.layers || {})) {
    const value = val(id, 'layers');
    const kinds = (l.over || []).map((k) => {
      const mine = (type, extra = () => true) => rows.map((r, i) => [r, i]).filter(([r]) => r.terrain === id && r.kind === k.kind && r.type === type && extra(r));
      const r = { over: at((x) => x.type === 'over' && x.terrain === id && x.kind === k.kind) };
      const tall = mine('tall'); if (tall.length) { r.tall = {}; for (const [row, i] of tall) (r.tall[row.s] ||= []).push(i); }
      const variants = mine('variant'); if (variants.length) r.variants = variants.map(([, i]) => i);
      const wayup = mine('wayup'); if (wayup.length) r.wayup = Object.fromEntries(wayup.map(([row, i]) => [row.lower, i]));
      const looks = mine('look'); if (looks.length) { r.looks = {}; for (const [row, i] of looks) (r.looks[row.look] ||= []).push(i); }
      return { kind: k.kind, lowers: new Set(k.lowers.map((x) => val(x, `${id}/${k.kind} lowers`))), fullCount: k.full ? loaded.png(k.full).w / set.sourceTile : 0, rows: r };
    });
    layers.set(value, {
      z: byId.get(id).z, fillCount: l.fill ? loaded.png(l.fill.sheets[0]).w / set.sourceTile : 0, fillRow: at((x) => x.type === 'fill' && x.terrain === id), kinds,
      ground: l.ground === undefined ? undefined : val(l.ground, `${id} ground`), drawAs: l.drawAs === undefined ? undefined : val(l.drawAs, `${id} drawAs`),
    });
  }
  return { layers, tone: set.tone ? { of: val(set.tone.of, 'tone'), row: at((x) => x.type === 'tone') } : null };
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
