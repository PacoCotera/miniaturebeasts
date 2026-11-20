// No invisible wall at a cliff (owner bug #21, cliff-slice-1b): a cell the walk rule blocks (relief.mjs WALLS) draws something (the rim on a raised cell, or a face / cap piece);
// the low cell beside a side run and past a run's end draws nothing and walks; a face cell blocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { worldTiles, stairsInfo, CW, CH, TV } from '../src/gen7/place.mjs';
import { PART, walled, partAt, tallOf } from '../../places/src/bake/relief.mjs';
import { cliffPieces } from '../../places/src/bake/cliffrules.mjs';

const VIEWS = [[7, 34, 56], [13, 40, 44], [42, 30, 40]];   // seed, first cell of a 4 x 4 cell block
const CELLPX = 48;
test('every blocking cliff cell draws something; flank cells walk; face cells block', () => {
  const bad = []; let face = 0, flank = 0, blocked = 0;
  for (const [seed, X, Y] of VIEWS) {
    const T = worldTiles(seed), x0 = X * CW, y0 = Y * CH, w = 4 * CW, h = 4 * CH;
    const wayCell = new Set(), wayups = [];
    for (const st of stairsInfo(seed)) if (st.wayup) { const a = st.wayup; wayups.push({ x: a.x - x0, y: a.y - y0, w: a.w, h: a.h }); for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) wayCell.add(y * 8192 + x); }
    const A = { raised: (x, y) => T(x + x0, y + y0) === TV.CLIFF, low: (x, y) => T(x + x0, y + y0) !== TV.CLIFF, way: (x, y) => wayCell.has((y + y0) * 8192 + x + x0), memo: new Map(), m: 4 };
    const ir = { w, h, id: `s${seed}`, seed, origin: { x: x0, y: y0 }, wayups: [] };
    const drawn = new Set(), kinds = new Map();
    for (const d of cliffPieces(ir, A).items) { if (/^cliff-shadow/.test(d.kind)) continue; /* the cast shade is a floor mark on the walkable foot row */ const cx = Math.round(d.x / CELLPX), cy = Math.round(d.y / CELLPX); for (let k = 0; k < tallOf(d.kind); k++) { drawn.add(`${cx},${cy + k}`); kinds.set(`${cx},${cy + k}`, d.kind + "@" + cx + "," + cy); } }
    for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
      const p = partAt(A, x, y), wall = walled(A, x, y), pic = drawn.has(`${x},${y}`);
      if (wall) { blocked++; if (!A.raised(x, y) && !pic) bad.push(`${seed} blocks nothing drawn at ${x + x0},${y + y0} part ${p}`); }
      if (!A.raised(x, y) && pic && !wall && p !== PART.FOOT) bad.push(`${seed} drawn cell walks at ${x + x0},${y + y0} part ${p} by ${kinds.get(`${x},${y}`)}`);
      if (p === PART.FACE) { face++; if (!wall) bad.push(`${seed} face walks at ${x + x0},${y + y0}`); }
      if (p === PART.FLANK && !pic) { flank++; if (wall) bad.push(`${seed} undrawn flank blocks at ${x + x0},${y + y0}`); }
    }
  }
  assert.ok(face > 0 && flank > 0 && blocked > 0, `face ${face} flank ${flank} blocked ${blocked}`);
  assert.deepEqual(bad.slice(0, 20), []);
});
