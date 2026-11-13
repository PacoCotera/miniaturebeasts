// Props keep off a cliff's lip: no prop stands on a lip row or a face row, a tree's trunk keeps the plateau's first two cells clear of the lip, and the small ground props never stand on the lip row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decorOf, worldTiles, CW, CH, TV } from '../src/gen7/place.mjs';

const VIEWS = [[7, 34, 56], [13, 40, 44], [42, 30, 40]];   // seed, first cell of a 4 x 4 cell block (the first two are the south-run views of the stills)
test('no prop on a lip or face row, no tree within two cells of a lip on the plateau', () => {
  const bad = []; let cliffTrees = 0;
  for (const [seed, X, Y] of VIEWS) {
    const D = decorOf(seed), T = worldTiles(seed), x0 = X * CW, y0 = Y * CH, x1 = (X + 4) * CW - 1, y1 = (Y + 4) * CH - 1;
    const lipNear = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (D.isLip(x + dx, y + dy)) return true; return false; };
    for (const p of D.propsIn(x0, y0, x1, y1)) {
      if (p.fam === 'sweeps') continue;
      for (const [x, y] of D.footprint(p)) {
        if (D.isLip(x, y)) bad.push(`${seed} ${p.kind} on the lip ${x},${y}`);
        if (T(x, y) !== TV.CLIFF && D.isLip(x, y - 1)) bad.push(`${seed} ${p.kind} on a face row ${x},${y}`);
      }
      if (p.fam === 'trees' && T(p.x, p.y) === TV.CLIFF) { cliffTrees++; if (lipNear(p.x, p.y, 2)) bad.push(`${seed} ${p.kind} trunk within two cells of the lip ${p.x},${p.y}`); }
    }
  }
  assert.deepEqual(bad, []);
});
