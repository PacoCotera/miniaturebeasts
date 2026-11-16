// Generator 7 soft ground in the layouts the page walks (tuliko-soft-7-1): for the soft cells of each region of the given seeds, the layout with and without the soft tiles.
//   1. what the page reaches on foot (lay.reach, lay.compId) is the same: the soft tiles replaced tiles that blocked already;
//   2. with a Tuliko (mud and scree open) the mud joins the west way in to the east way in, and a scree crossing's inner tile is walked to from a way in of the cell.
// node tools/gen7-soft-check.mjs [seed ...]   (default 7 13 42)
import { PLACES } from '../tests/page-harness.mjs';
import { MW, MH, T_BLOCK, T, softGround } from '../src/world.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { bakedCell, layout7 } from '../src/world7.mjs';

const seeds = process.argv.slice(2).map(Number); if (!seeds.length) seeds.push(7, 13, 42);
const ctx = PLACES.ctx;
for (const seed of seeds) {
  const edgeSides = new Map();
  let cells = 0, sameReach = 0, mudCells = 0, mudJoined = 0, crossings = 0, crossOk = 0, extraReach = 0;
  for (let ay = 0; ay < 5; ay++) for (let ax = 0; ax < 5; ax++) {
    const G = genRegion7(seed, ax, ay); G.soft = softGround(G, seed); const slot = [ax, ay];
    for (let c = 0; c < MW * MH; c++) {
      const hasWade = G.soft.wade[c] === 1; let hasScree = false;
      for (const d of [1, -1, MW, -MW]) { const n = c + d; if (n < 0 || n >= MW * MH) continue; const i = d === 1 ? c * 2 : d === -1 ? n * 2 : d === MW ? c * 2 + 1 : n * 2 + 1; if (G.soft.scree[i]) hasScree = true; }
      if (!hasWade && !hasScree) continue;
      const b = bakedCell(ctx, seed, slot, c), on = layout7(ctx, G, seed, slot, String(c), undefined, undefined, b), off = layout7(ctx, G, seed, slot, String(c), undefined, undefined, { ir: { ...b.ir, soft: null }, place: b.place });
      cells++; if (on.reach.every((v, i) => v === off.reach[i]) && on.compId.every((v, i) => v === off.compId[i])) sameReach++;
      // with a Tuliko: soft tiles walk
      const w = on.w, h = on.h, ok = i => !T_BLOCK[on.tiles[i]] || on.tiles[i] === T.WADE || on.tiles[i] === T.SCREE;
      const flood = starts => { const seen = new Uint8Array(w * h), q = []; for (const s of starts) if (ok(s) && !seen[s]) { seen[s] = 1; q.push(s); }
        for (let k = 0; k < q.length; k++) { const i = q[k], x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (!seen[j] && ok(j)) { seen[j] = 1; q.push(j); } } } return seen; };
      const side = s => on.openings.filter(o => o.side === s).flatMap(o => { const r = []; for (let k = o.from - 1; k <= o.to - 1; k++) r.push(s === 'W' ? k * w : s === 'E' ? k * w + w - 1 : s === 'N' ? k : (h - 1) * w + k); return r; });
      if (on.tiles.includes(T.WADE)) { mudCells++; const f = flood(side('W')); if (side('E').some(i => f[i])) mudJoined++; }
      const starts = on.openings.flatMap(o => side(o.side));
      for (const q of on.cross || []) { crossings++; const kk = ax + ',' + ay + ',' + q.ei; edgeSides.set(kk, (edgeSides.get(kk) || 0) + 1); const f = flood(starts); if (f[q.entry.y * w + q.entry.x]) crossOk++; }
      if (on.cross && on.cross.length) { const f0 = new Uint8Array(w * h); on.reach.forEach((v, i) => { f0[i] = v; }); if (on.cross.some(q => !f0[q.entry.y * w + q.entry.x])) extraReach++; }
    }
  }
  console.log(`seed ${seed}: soft cells ${cells}; reach on foot unchanged ${sameReach}/${cells}; mud cells ${mudCells}, west way in joins the east with mud open ${mudJoined}; scree crossings ${crossings}, inner tile walked to from a way in ${crossOk}; crossings whose inner tile is off the foot reach ${extraReach}; scree edges with a crossing in both cells ${[...edgeSides.values()].filter(n => n === 2).length}, in one cell only ${[...edgeSides.values()].filter(n => n === 1).length}`);
}
