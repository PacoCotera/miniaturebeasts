// The bake (place design A1.4): the LDtk project, terrain.json and the tile sets in; the .mbtiles, .mbplace, index.json and goldens out.
// bakeAll is pure (it reads the sources and returns every output file in memory), so --check is a byte comparison of what it returns.
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadSet, validateSetJson, dualPairs, ALLOWED_SPDX } from '../setload.mjs';
import { bakeTileSet } from '../bakeset.mjs';
import { writeTileSet, writePlace } from '../format/write.mjs';
import { decodePng, encodePng } from '../png.mjs';
import { loadProject, checkDefs, levelToIR, listSetIds } from './ldtk.mjs';
import { checkRules } from './rules.mjs';
import { mirrorIR } from './mirror.mjs';
import { buildPlace, renderPlace } from './build.mjs';

export const SCALES = [48, 24];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function paths(placesDir) {
  const repo = path.join(placesDir, '..', '..');
  return {
    placesDir, repo, project: path.join(repo, 'art', 'places', 'ldtk', 'places.ldtk'), terrain: path.join(repo, 'art', 'places', 'terrain.json'),
    sets: path.join(repo, 'art', 'places', 'sets'), schema: path.join(placesDir, 'vendor', 'ldtk-1.5.3.schema.json'),
  };
}

// Loads and checks every set (contract, licence), bakes each to its tile set object.
export function loadSets(P, terrains, ids) {
  const sets = new Map(), pairsOf = new Map(), loadedOf = new Map(), errors = [];
  for (const id of ids || listSetIds(P.sets)) {
    const loaded = loadSet(path.join(P.sets, id));
    const bad = validateSetJson(loaded.set);
    if (bad.length) { errors.push(`set ${id}: ${bad.join('; ')}`); continue; }
    if (!ALLOWED_SPDX.includes(loaded.set.licence.spdx)) { errors.push(`set ${id}: licence ${loaded.set.licence.spdx} is not allowed (${ALLOWED_SPDX.join(', ')})`); continue; }
    sets.set(id, bakeTileSet(loaded, terrains));
    pairsOf.set(id, dualPairs(loaded));
    loadedOf.set(id, loaded);
  }
  return { sets, pairsOf, loadedOf, errors };
}

// Returns { files: Map(path relative to prototypes/places -> { bytes } | { img }), errors: [string], places: [{id, ...}] }.
// only: a place id (and its mirror) to bake alone; its files are returned, the index is not.
export function bakeAll(P, { only } = {}) {
  const errors = [];
  const files = new Map();
  const terrains = JSON.parse(readFileSync(P.terrain, 'utf8')).terrains;
  const { sets, pairsOf, loadedOf, errors: setErrors } = loadSets(P, terrains);
  errors.push(...setErrors);
  const { project, levels } = loadProject(P.project, P.schema);
  errors.push(...checkDefs(project, terrains, [...loadedOf.values()]));
  const ctx = { terrains, sets, pairsOf };
  const index = { formatVersion: 1, sets: [], places: [] };

  for (const [id, ts] of sets) {
    const bytes = writeTileSet(ts);
    files.set(`baked/${id}.mbtiles`, { bytes });
    index.sets.push({ id, file: `${id}.mbtiles`, bytes: bytes.length, sha256: sha(bytes) });
  }
  for (const level of levels) {
    if (only && level.identifier !== only) continue;
    const { ir, errors: lerr } = levelToIR(level, terrains);
    if (lerr) { errors.push(...lerr.map((e) => e.message)); continue; }
    const variants = [ir, ...(ir.mirror ? [mirrorIR(ir)] : [])];
    for (const v of variants) {
      const rerr = checkRules(v, ctx);
      if (rerr.length) { errors.push(...rerr.map((e) => e.message)); continue; }
      const { place, errors: berr } = buildPlace(v, ctx);
      if (berr) { errors.push(...berr.map((e) => e.message)); continue; }
      const bytes = writePlace(place);
      files.set(`baked/${v.id}.mbplace`, { bytes });
      index.places.push({ id: v.id, file: `${v.id}.mbplace`, w: v.w, h: v.h, set: v.tileset, mirrorOf: v.mirrorOf || '', bytes: bytes.length, sha256: sha(bytes) });
      for (const size of SCALES) files.set(`golden/places/${v.id}-${size}.png`, { img: renderPlace(sets.get(v.tileset), place, size) });
    }
  }
  if (!only) files.set('baked/index.json', { bytes: Buffer.from(JSON.stringify(index, null, 2) + '\n') });
  return { files, errors, index };
}

export function writeOutputs(files, placesDir) {
  for (const [rel, f] of files) {
    const file = path.join(placesDir, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, f.bytes || encodePng(f.img));
  }
}

// Compares the in-memory outputs with the committed files: blobs byte for byte, PNGs by decoded pixels (zlib output differs between builds).
// With `complete`, a committed file the bake no longer produces is stale and fails too. Returns messages.
export function checkOutputs(files, placesDir, { complete = true } = {}) {
  const out = [];
  for (const [rel, f] of files) {
    const file = path.join(placesDir, rel);
    if (!existsSync(file)) { out.push(`${rel}: missing (run the bake and commit it)`); continue; }
    const have = readFileSync(file);
    if (f.bytes) {
      if (Buffer.compare(have, Buffer.from(f.bytes)) !== 0) {
        let at = 0;
        while (at < have.length && at < f.bytes.length && have[at] === f.bytes[at]) at++;
        out.push(`${rel}: differs from the bake (first byte difference at offset ${at}; committed ${have.length} bytes, bake ${f.bytes.length})`);
      }
    } else {
      const g = decodePng(have);
      if (g.w !== f.img.w || g.h !== f.img.h) { out.push(`${rel}: size ${g.w}x${g.h}, the bake renders ${f.img.w}x${f.img.h}`); continue; }
      for (let i = 0; i < g.data.length; i++) {
        if (g.data[i] !== f.img.data[i]) { const p = i >> 2; out.push(`${rel}: first pixel difference at x=${p % g.w}, y=${(p / g.w) | 0}`); break; }
      }
    }
  }
  if (complete) {
    for (const [dir, re] of [['baked', /\.(mbtiles|mbplace|json)$/], ['golden/places', /\.png$/]]) {
      const d = path.join(placesDir, dir);
      if (!existsSync(d)) continue;
      for (const name of readdirSync(d)) if (re.test(name) && !files.has(`${dir}/${name}`)) out.push(`${dir}/${name}: stale, the bake no longer produces it`);
    }
  }
  return out;
}
