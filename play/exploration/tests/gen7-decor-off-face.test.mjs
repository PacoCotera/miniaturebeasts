// No decor (flowers, tufts, flecks, clumps, props) stands on a cliff's face: the lip row, the face row under it, the flank, or the foot rows the face picture is drawn over (vertical rock grows nothing).
import test from 'node:test';
import assert from 'node:assert/strict';
import { decorOf, worldTiles, stairsInfo, CW, CH, TV } from '../src/gen7/place.mjs';
import { PART, partAt } from '../../places/src/bake/relief.mjs';

const VIEWS = [[7, 34, 56], [13, 40, 44], [42, 30, 40]];   // seed, first cell of a 4 x 4 cell block (the first two are the south-run views of the stills)
const ROCK = new Set([PART.RING, PART.FACE, PART.FLANK, PART.FOOT]);
test('no decal or prop on a cliff face, lip, flank or foot cell', () => {
  const bad = []; let decals = 0;
  for (const [seed, X, Y] of VIEWS) {
    const D = decorOf(seed), T = worldTiles(seed), x0 = X * CW, y0 = Y * CH, x1 = (X + 4) * CW - 1, y1 = (Y + 4) * CH - 1;
    const wayCell = new Set();
    for (const st of stairsInfo(seed)) if (st.wayup) { const a = st.wayup; for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) wayCell.add(y * 8192 + x); }
    const A = { raised: (x, y) => T(x, y) === TV.CLIFF, low: (x, y) => T(x, y) !== TV.CLIFF, way: (x, y) => wayCell.has(y * 8192 + x), memo: new Map() };
    const check = (what, x, y) => { const p = partAt(A, x, y); if (ROCK.has(p)) bad.push(`${seed} ${what} on part ${p} at ${x},${y}`); };
    for (const d of D.decalsIn(x0, y0, x1, y1)) { decals++; check(d.kind, d.x, d.y); }
    for (const p of D.propsIn(x0, y0, x1, y1)) { if (p.fam === 'sweeps') continue; for (const [x, y] of D.footprint(p)) check(p.kind, x, y); }
  }
  assert.ok(decals > 0);
  assert.deepEqual(bad.slice(0, 20), []);
});
