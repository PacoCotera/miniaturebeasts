// owner #141 round 2 (rule 47a): water's edge is a shoreline, never a place's border. Where a place meets a wide-water cell the shore wanders across the seam, the same from both sides.
// On his save (seed 64, cell 44,50) and 20 seeds: no bank of the sea runs straight for more than 3 tiles along a seam (so no square corner either), the line leaves the seam, both sides of the seam agree tile for tile.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cellTerrain, contextOf, worldTiles, TV, CW, CH, RW } from '../src/gen7/place.mjs';
import { isSea } from '../src/gen7/shore7.mjs';

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const BAND = 9;   // tiles each side of the seam that are read

// the first seam of region (2,2) (cells 33..46, 41..58) between a wide-water cell and a land cell, horizontal neighbours when `horiz` else vertical neighbours: [wide cell, land cell]
function seamOf(seed, horiz) {
  const S = contextOf(seed);
  for (let cy = 41; cy < 59; cy++) for (let cx = 33; cx < 47; cx++) {
    if (!S.wideAt(cx, cy)) continue;
    const o = horiz ? [cx + 1, cy] : [cx, cy + 1], p = horiz ? [cx - 1, cy] : [cx, cy - 1];
    if (!S.waterAt(o[0], o[1])) return [[cx, cy], o];
    if (!S.waterAt(p[0], p[1])) return [[cx, cy], p];
  }
  return null;
}
const isWater = v => v === TV.WATER || v === TV.DEEP;

// the longest straight bank of the sea along the seam between cells a and b (neighbours), in tiles, and how many different bank lines were met. A bank is where water meets what is not water and one of the two
// tiles is the line's sea (shore7.mjs), so a stream or a pond of the land is no bank of it.
function banks(seed, a, b) {
  const S = contextOf(seed), T = worldTiles(seed), horiz = a[1] === b[1], line = horiz ? Math.max(a[0], b[0]) * CW : Math.max(a[1], b[1]) * CH;
  const along0 = horiz ? a[1] * CH : a[0] * CW, n = horiz ? CH : CW;
  const gt = (u, v) => horiz ? [line + u, along0 + v] : [along0 + v, line + u];   // u across the seam, v along it
  const at = (u, v) => T(...gt(u, v)), sea = (u, v) => isSea(seed, S.shoreCells, ...gt(u, v));
  let worst = 0; const lines = new Set();
  for (let u = -BAND; u < BAND; u++) for (const east of [true, false]) {
    let run = 0;
    for (let v = 0; v < n; v++) {
      const here = (east ? isWater(at(u, v)) && !isWater(at(u + 1, v)) : !isWater(at(u, v)) && isWater(at(u + 1, v))) && (sea(u, v) || sea(u + 1, v));
      if (here) { run++; lines.add(u); worst = Math.max(worst, run); } else run = 0;
    }
  }
  return { worst, lines: lines.size };
}

test('his place (seed 64, cell 44,50): the shore beside the water on the west wanders, no bank over 3 tiles straight', () => {
  const r = banks(64, [43, 50], [44, 50]);
  assert.ok(r.worst <= 3, 'longest straight bank ' + r.worst);
  assert.ok(r.lines >= 3, 'bank lines met ' + r.lines);
});

test('20 seeds: no straight bank over 3 tiles along a seam of wide water, and the line leaves the seam', () => {
  let n = 0;
  for (const seed of SEEDS) for (const horiz of [false, true]) {
    const s = seamOf(seed, horiz); if (!s) continue;
    const r = banks(seed, s[0], s[1]);
    assert.ok(r.worst <= 3, `seed ${seed} seam ${s[0]}|${s[1]}: longest straight bank ${r.worst}`);
    assert.ok(r.lines >= 3, `seed ${seed} seam ${s[0]}|${s[1]}: bank lines met ${r.lines}`);
    n++;
  }
  assert.ok(n >= 20, 'seams read ' + n);
});

// owner #141 (his 'water is not a box' spot, round 6): water that reaches a seam continues to the water it runs into; no bank, sand, grass or ford is drawn between a stream and the wide water it meets.
test('seed 7: the stream from the 28|29 seam runs to the lake in 29,14 (every tile water), and the 29,13 pond stays closed', () => {
  const T = worldTiles(7), seam = 29 * CW, y = 14 * CH + 14;
  assert.ok(isWater(T(seam - 1, y)), 'the stream stands at the seam');
  for (let x = seam - 1; x <= seam + 10; x++) assert.ok(isWater(T(x, y)), `tile ${x},${y} is ${T(x, y)}, not water`);
  const x0 = 29 * CW, y0 = 13 * CH, seen = new Set(), key = (x, y) => y * 100000 + x, q = [[x0 + CW / 2, y0 + CH / 2]];
  assert.ok(isWater(T(...q[0])), 'the pond has water at its centre');
  seen.add(key(...q[0]));
  for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; assert.ok(x >= x0 && x < x0 + CW && y >= y0 && y < y0 + CH, `the pond reaches ${x},${y}, outside its cell`);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [x + dx, y + dy]; if (seen.has(key(...n)) || !isWater(T(...n))) continue; seen.add(key(...n)); q.push(n); } }
});

test('both sides of a seam agree tile for tile (his seam and 20 seeds)', () => {
  const pairs = [[64, [43, 50], [44, 50]]];
  for (const seed of SEEDS) { const s = seamOf(seed, true) || seamOf(seed, false); if (s) pairs.push([seed, s[0], s[1]]); }
  for (const [seed, p, q] of pairs) {
    const [a, b] = (p[0] < q[0] || p[1] < q[1]) ? [p, q] : [q, p], A = cellTerrain(seed, a[0], a[1]), B = cellTerrain(seed, b[0], b[1]), w = A.w, h = A.h, horiz = a[1] === b[1];
    for (let k = 1; k < (horiz ? h : w) - 1; k++) {
      if (horiz) { assert.equal(A.terrain[k * w + w - 1], B.terrain[k * w + 1], `seed ${seed}: row ${k}, a's apron against b's first column`); assert.equal(B.terrain[k * w], A.terrain[k * w + w - 2], `seed ${seed}: row ${k}, b's apron against a's last column`); }
      else { assert.equal(A.terrain[(h - 1) * w + k], B.terrain[w + k], `seed ${seed}: column ${k}, a's apron against b's first row`); assert.equal(B.terrain[k], A.terrain[(h - 2) * w + k], `seed ${seed}: column ${k}, b's apron against a's last row`); }
    }
  }
});
