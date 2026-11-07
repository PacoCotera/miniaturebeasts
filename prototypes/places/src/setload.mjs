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
