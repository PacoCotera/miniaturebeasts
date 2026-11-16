// place-walk-1: the test's cell-level reach (gen7-place-props.mjs) on named cells, made fresh: node place-walk-cell-check.mjs <seed> X,Y [X,Y ...]
import { cellTerrain, TV, CW, CH } from '../src/gen7/place.mjs';
const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], seed = +process.argv[2];
for (const arg of process.argv.slice(3)) {
  const [X, Y] = arg.split(',').map(Number), c = cellTerrain(seed, X, Y), w = c.w, t = c.terrain, inner = (x, y) => t[(y + 1) * w + x + 1];
  const lip = (x, y) => inner(x, y) === TV.CLIFF && NB4.some(([dx, dy]) => t[(y + dy + 1) * w + x + dx + 1] !== TV.CLIFF);
  const wu = new Set(); for (const a of c.wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) wu.add((y - c.y0 - 1) * CW + (x - c.x0 - 1));
  const pass = (x, y) => { const v = inner(x, y); return !(v === TV.WATER || v === TV.THICKET || v === TV.DEEP || (v === TV.CLIFF && lip(x, y) && !wu.has(y * CW + x))); };
  const seen = new Uint8Array(CW * CH), q = [];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if ((x === 0 || y === 0 || x === CW - 1 || y === CH - 1) && pass(x, y)) { seen[y * CW + x] = 1; q.push(y * CW + x); }
  for (let k = 0; k < q.length; k++) for (const [dx, dy] of NB4) { const a = (q[k] % CW) + dx, b = ((q[k] / CW) | 0) + dy; if (a < 0 || b < 0 || a >= CW || b >= CH || seen[b * CW + a] || !pass(a, b)) continue; seen[b * CW + a] = 1; q.push(b * CW + a); }
  let un = 0, onlyRaised = true; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (!seen[y * CW + x] && pass(x, y)) { un++; if (inner(x, y) !== TV.CLIFF) onlyRaised = false; }
  console.log(`cell ${X},${Y}: unreached ${un}${un && onlyRaised ? ' (raised only)' : ''}`);
}
