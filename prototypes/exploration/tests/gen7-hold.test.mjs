// Generator 7, chunk G4a: what a cell holds. Property checks on a hashed sample of the land cells of seeds 7, 13 and 42 and on the landmarks of the whole realm, the bake of cells that carry a
// landmark, and the golden vectors (gen7-vectors.json, key `hold`). The numbers over seeds 1-200 come from tools/gen7-hold.mjs (the report).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { cellIR, decorOf } from '../src/gen7/place.mjs';
import { landmarksOf, LM_SPACING } from '../src/gen7/landmarks.mjs';
import { LANDMARK_NAMES } from '../src/gen7/landmark-names.mjs';
import { holdVector, SEEDS, SLOTS } from '../tools/gen7-vectors.mjs';
import { bakeIR } from '../tools/gen7-render.mjs';
import { hash, L, MW, MH } from '../src/world.mjs';
import { ATLAS } from '../src/regions.mjs';

const VECTORS = JSON.parse(readFileSync(new URL('./gen7-vectors.json', import.meta.url), 'utf8'));
const FIND_KINDS = new Set(['pod', 'fruit', 'dew', 'stone', 'material']);

for (const seed of SEEDS) {
  test(`seed ${seed}: a cell holds ways in, finds, life and a name; the landmarks keep their spacing and names; strike marks lie on bare ground`, { timeout: 900000 }, () => {
    const R = realm7(seed), lms = landmarksOf(seed, decorOf(seed).hollowSites()), bad = [];
    const land = (X, Y) => { if (X < 0 || Y < 0 || X >= MW * ATLAS || Y >= MH * ATLAS) return null; const G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)], c = (Y % MH) * MW + (X % MW); return G.land[c] !== L.WATER && !G.island[c] ? G : null; };
    // landmarks: spacing, names, kinds
    for (let i = 0; i < lms.list.length; i++) for (let j = 0; j < i; j++) if (Math.max(Math.abs(lms.list[i].X - lms.list[j].X), Math.abs(lms.list[i].Y - lms.list[j].Y)) < LM_SPACING) bad.push('landmark spacing ' + i + ' ' + j);
    for (const G of R.regions) {
      const mine = lms.list.filter(p => p.slot[0] === G.slot[0] && p.slot[1] === G.slot[1]), names = mine.map(p => p.name);
      assert.equal(new Set(names).size, names.length, 'no name twice in a region');
      for (const p of mine) assert.ok(LANDMARK_NAMES[p.kind].includes(p.name), p.name + ' is on editorial\'s list for ' + p.kind);
    }
    assert.ok(lms.list.length > 100, 'landmarks: ' + lms.list.length);
    // cells: a hashed sample of the land
    const cells = []; for (let Y = 0; Y < MH * ATLAS; Y++) for (let X = 0; X < MW * ATLAS; X++) if (land(X, Y)) cells.push([X, Y]);
    const sample = cells.map(c => ({ c, k: hash(seed, 'g4a-test', c[0], c[1]) })).sort((a, b) => a.k - b.k).slice(0, 60).map(o => o.c);
    for (const p of lms.list.slice(0, 6)) sample.push([p.X, p.Y]);
    for (const [X, Y] of sample) {
      const ir = cellIR(seed, X, Y), at = `${seed}:${X},${Y}`;
      if (!ir.openings.length) bad.push(at + ' no opening');
      if (!ir.spawns.length) bad.push(at + ' no spawns');
      if (!ir.names.length || !ir.names[0]) bad.push(at + ' no name');
      if (ir.finds.length < 2 || ir.finds.length > 11) bad.push(at + ' finds ' + ir.finds.length);
      if (ir.hearts.length || ir.clues.length) bad.push(at + ' old hearts or clues');
      for (const f of ir.finds) {
        if (!FIND_KINDS.has(f.kinds[0])) bad.push(at + ' find kind ' + f.kinds[0]);
        if (f.x < 1 || f.y < 1 || f.x > 24 || f.y > 28) bad.push(at + ' find outside the cell');
      }
      if (new Set(ir.finds.map(f => f.x + ',' + f.y)).size !== ir.finds.length) bad.push(at + ' two finds on one tile');
      for (const m of ir.strikes) { if (m.glass && ![3, 14].includes(ir.terrain[m.y * ir.w + m.x])) bad.push(at + ' storm glass off sand or scree'); if (m.read !== false || !(m.age >= 0)) bad.push(at + ' strike shape'); }
      const lm = lms.at.get(X + ',' + Y); if (lm && (ir.landmarks.length !== 1 || ir.names[0] !== lm.name)) bad.push(at + ' landmark missing');
      if (!lm && ir.landmarks.length) bad.push(at + ' landmark not in the realm list');
    }
    // the starts of the first regions: a strike mark within one cell, a stone and a pod in the start cell
    for (const G of R.regions.slice(0, 6)) for (const sc of G.spawns) {
      const X = G.slot[0] * MW + (sc % MW), Y = G.slot[1] * MH + ((sc / MW) | 0);
      let marks = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (land(X + dx, Y + dy)) marks += cellIR(seed, X + dx, Y + dy).strikes.length;
      if (!marks) bad.push(`start ${X},${Y} has no strike mark within one cell`);
      const here = cellIR(seed, X, Y);
      for (const k of ['stone', 'pod']) if (!here.finds.some(f => f.kinds[0] === k)) bad.push(`start ${X},${Y} has no ${k}`);
    }
    assert.deepEqual(bad.slice(0, 20), []);
  });
}

test('a cell with a landmark and its finds, spawns and openings bakes', { timeout: 300000 }, () => {
  const lms = landmarksOf(7, decorOf(7).hollowSites());
  for (const kind of ['hollow-tree', 'split-stone', 'reedpool', 'windstep']) {
    const p = lms.list.find(q => q.kind === kind); if (!p) continue;
    const ir = cellIR(7, p.X, p.Y), place = bakeIR(ir);
    assert.equal(place.finds.length, ir.finds.length); assert.equal(place.openings.length, ir.openings.length); assert.equal(place.spawns.length, ir.spawns.length);
    assert.equal(place.landmarks.length, kind === 'hollow-tree' ? 1 : 0, kind + ': only a landmark with signed art is a baked record');
  }
});

test('kind version 3 puts Loikas in a non-home region of any land; version 2 and none keep today\'s kinds', { timeout: 600000 }, () => {
  const seed = 7, G = realm7(seed).regions[0], [ax, ay] = G.slot;
  const names = (v, X, Y) => cellIR(seed, X, Y, v).spawns.flatMap(s => s.species);
  let loika3 = 0, loika2 = 0, loikaNone = 0, same = 0;
  for (let c = 0; c < MW * MH && same < 25; c++) {
    if (G.land[c] === L.WATER || G.island[c]) continue;
    const X = ax * MW + (c % MW), Y = ay * MH + ((c / MW) | 0), n3 = names(3, X, Y), n2 = names(2, X, Y), n0 = names(undefined, X, Y);
    assert.deepEqual(n2, n0, 'version 2 is the same as no version');
    if (n3.includes('loika')) loika3++; if (n2.includes('loika')) loika2++; if (n0.includes('loika')) loikaNone++;
    assert.deepEqual(n3.filter(x => x !== 'loika'), n0.filter(x => x !== 'loika'), 'every other kind in the cell is as it was'); same++;
  }
  assert.ok(loika3 > 0, 'Loikas in the cells of a version 3 region');
  if (G.biome !== 'woods') assert.equal(loika2 + loikaNone, 0, G.biome + ' holds no Loika for version 2');
});

test('golden vectors: what the cells hold in seeds 7, 13 and 42', { timeout: 600000 }, () => {
  for (const seed of SEEDS) for (const [ax, ay] of SLOTS) {
    const key = seed + ':' + ax + ',' + ay;
    assert.deepEqual(JSON.parse(JSON.stringify(holdVector(seed, ax, ay))), VECTORS[key].hold, key);
  }
});
