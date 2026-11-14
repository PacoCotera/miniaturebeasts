// Load and check a tile set folder (set.json + its PNGs + palette.json) against the contract in src/format/set.schema.json.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { readPng, crop, scaleNearest } from './png.mjs';

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

// A still tool may set artHooks.swap (a Map of "<set id>/<file>" or "<file>" -> a file path to read instead) and artHooks.seen (a Map it fills with slot -> { file, swapped } for every sheet read).
// Nothing is set by default, so the bake reads the shipped files exactly as before.
export const artHooks = { swap: null, seen: null };

export function loadSet(dir) {
  const set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8'));
  const palette = JSON.parse(readFileSync(path.join(dir, set.palette), 'utf8'));
  const png = new Map();
  const get = (name) => {
    if (!png.has(name)) {
      const slot = path.basename(dir) + '/' + name, swap = artHooks.swap && (artHooks.swap.get(slot) || artHooks.swap.get(name)), file = swap || path.join(dir, name);
      if (artHooks.seen) artHooks.seen.set(slot, { file, swapped: !!swap, shipped: path.join(dir, name) });
      png.set(name, readPng(file));
    }
    return png.get(name);
  };
  return { dir, set, palette, png: get };
}

// The tiles of a sheet by name: 16 corner tiles (a 4 x 4 grid), or the way-up piece (a 3 x 2 grid, 6 tiles). Scaled by the set's factor with `scaled`.
export function sheetTiles(loaded, name, scaled = false) {
  const t = loaded.set.sourceTile, sheet = loaded.png(name), cols = sheet.w / t, rows = sheet.h / t, tiles = [];
  for (let i = 0; i < cols * rows; i++) { const tile = crop(sheet, (i % cols) * t, ((i / cols) | 0) * t, t, t); tiles.push(scaled ? scaleNearest(tile, loaded.set.scale) : tile); }
  return tiles;
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
//   per terrain in the set's order: its fill row, then one row per over kind; then the extras of each kind (tall sheets by s then list order, variants, way-up pieces by lower id); then the tone row.
// A row is { type: 'fill' | 'over' | 'tall' | 'variant' | 'wayup' | 'tone', terrain, kind?, sheets: [per frame], ...key }.
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
      if (k.back) rows.push({ type: 'back', terrain: id, kind: k.kind, slots: k.back, sheets: Object.values(k.back) });
    }
  }
  if (set.tone) rows.push({ type: 'tone', terrain: 'tone', sheets: set.tone.sheets });
  if (set.tone && set.tone.raised) rows.push({ type: 'toneraised', terrain: 'tone', sheets: [set.tone.raised] });   // the tone on the raised ground, a sheet of its own
  return rows;
}

// What the dual grid by terrain takes (dualgrid.terrainLayers): `layers` is a Map keyed by terrain VALUE, each
//   { z, fillCount, kinds: [{ kind, lowers: Set(values), fullCount, rows }], ground, drawAs, fillRow }
// where `rows` are indices into layerRows(set) (the baked tile set's rows): { over, tall: { s: [row] }, variants: [row], wayup: { lowerId: row } }.
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
      const back = mine('back'); if (back.length) r.back = { row: back[0][1], slots: Object.keys(back[0][0].slots).map(Number) };
      const wayup = mine('wayup'); if (wayup.length) r.wayup = Object.fromEntries(wayup.map(([row, i]) => [row.lower, i]));
      return { kind: k.kind, lowers: new Set(k.lowers.map((x) => val(x, `${id}/${k.kind} lowers`))), fullCount: k.full ? loaded.png(k.full).w / set.sourceTile : 0, rows: r };
    });
    layers.set(value, {
      z: byId.get(id).z, fillCount: l.fill ? loaded.png(l.fill.sheets[0]).w / set.sourceTile : 0, fillRow: at((x) => x.type === 'fill' && x.terrain === id), kinds,
      ground: l.ground === undefined ? undefined : val(l.ground, `${id} ground`), drawAs: l.drawAs === undefined ? undefined : val(l.drawAs, `${id} drawAs`),
    });
  }
  return { layers, tone: set.tone ? { of: val(set.tone.of, 'tone'), also: (set.tone.also || []).map((x) => val(x, 'tone also')), row: at((x) => x.type === 'tone'), ...(set.tone.raised ? { rowRaised: at((x) => x.type === 'toneraised') } : {}) } : null };
}
