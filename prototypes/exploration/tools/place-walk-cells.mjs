// place-walk-1: the cell-level reach of the place test (every walkable tile of a cell is reached from the cell's own edge), from a stitched seed (place-walk-causes.mjs's cache).
//   node place-walk-cells.mjs <seed> <cacheDir> [--show]
// Lists the cells that leave a tile unreached and whether only raised tiles ("plateau tiles enclosed by the lip": the test allows 4 a seed), with the tiles round the first of each.
import { readFileSync } from 'node:fs';
import { TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const seed = +process.argv[2], dir = process.argv[3], show = process.argv.includes('--show'), WW = RW * CW, WH = RH * CH;
const T = new Uint8Array(readFileSync(`${dir}/stitch-${seed}.bin`)), wayups = JSON.parse(readFileSync(`${dir}/wayups-${seed}.json`, 'utf8'));
const wu = new Uint8Array(WW * WH); for (const a of wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) if (x >= 0 && y >= 0 && x < WW && y < WH) wu[y * WW + x] = 1;
const at = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH ? TV.THICKET : T[y * WW + x]);
let cells = 0, raisedOnly = 0, other = 0; const out = [];
for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
  const x0 = X * CW, y0 = Y * CH, lip = (x, y) => at(x0 + x, y0 + y) === TV.CLIFF && NB4.some(([dx, dy]) => at(x0 + x + dx, y0 + y + dy) !== TV.CLIFF);
  const pass = (x, y) => { const v = at(x0 + x, y0 + y); return !(v === TV.WATER || v === TV.THICKET || v === TV.DEEP || (v === TV.CLIFF && lip(x, y) && !wu[(y0 + y) * WW + x0 + x])); };
  const seen = new Uint8Array(CW * CH), q = [];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if ((x === 0 || y === 0 || x === CW - 1 || y === CH - 1) && pass(x, y)) { seen[y * CW + x] = 1; q.push(y * CW + x); }
  for (let k = 0; k < q.length; k++) for (const [dx, dy] of NB4) { const a = (q[k] % CW) + dx, b = ((q[k] / CW) | 0) + dy; if (a < 0 || b < 0 || a >= CW || b >= CH || seen[b * CW + a] || !pass(a, b)) continue; seen[b * CW + a] = 1; q.push(b * CW + a); }
  let un = 0, onlyRaised = true, first = null; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (!seen[y * CW + x] && pass(x, y)) { un++; if (!first) first = [x, y]; if (at(x0 + x, y0 + y) !== TV.CLIFF) onlyRaised = false; }
  cells++; if (!un) continue; if (onlyRaised) raisedOnly++; else other++;
  out.push({ X, Y, un, onlyRaised, first });
  if (show && out.length <= 12) { console.log(`cell ${X},${Y}: ${un} unreached ${onlyRaised ? '(raised only)' : ''}, first at ${first}`); for (let y = Math.max(0, first[1] - 3); y <= Math.min(CH - 1, first[1] + 3); y++) { let s = ''; for (let x = Math.max(0, first[0] - 6); x <= Math.min(CW - 1, first[0] + 6); x++) { const v = at(x0 + x, y0 + y); s += !pass(x, y) ? (v === TV.CLIFF ? '#' : v === TV.THICKET ? 'T' : '~') : seen[y * CW + x] ? (v === TV.CLIFF ? 'u' : '.') : (v === TV.CLIFF ? 'U' : 'X'); } console.log('  ' + s); } }
}
console.log(JSON.stringify({ seed, cells, cellsWithUnreached: out.length, raisedOnly, other, list: out.map(o => `${o.X},${o.Y}:${o.un}${o.onlyRaised ? 'r' : ''}`).slice(0, 40) }));
