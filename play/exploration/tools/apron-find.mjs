// Finds apron mismatches (the same check as gen7-place-props.mjs) for one seed: node tools/apron-find.mjs <seed>. Prints cell, neighbour offset and the tile positions.
import { cellTerrain, RW, RH } from '../src/gen7/place.mjs';
const seed = +process.argv[2] || 42;
let total = 0;
for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
  const c = cellTerrain(seed, X, Y), { w, h, terrain: t } = c;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
    if (X + dx < 0 || X + dx >= RW || Y + dy >= RH) continue;
    const n = cellTerrain(seed, X + dx, Y + dy), bad = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const nx = c.x0 + x - n.x0, ny = c.y0 + y - n.y0; if (nx >= 0 && ny >= 0 && nx < n.w && ny < n.h && t[y * w + x] !== n.terrain[ny * n.w + nx]) bad.push([c.x0 + x, c.y0 + y, t[y * w + x], n.terrain[ny * n.w + nx]]); }
    if (bad.length) { total += bad.length; console.log(JSON.stringify({ X, Y, dx, dy, bad })); }
  }
}
console.log('total', total);
