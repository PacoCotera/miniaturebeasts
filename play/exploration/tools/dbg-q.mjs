// the field q (Q16/655, so 100 = the detail's whole reach) along rows through a wall.  node dbg-q.mjs <seed> <gx> <gy>
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, qCell, tileLevel, CW, CH } from '../src/gen7/levels.mjs';
const [seed, gx0, gy0] = process.argv.slice(2).map(Number), re = realm7(seed).realm, L = levelsOf(re);
for (const dy of [-12, 0, 12]) {
  const gy = gy0 + dy; let q = '', r = '';
  for (let gx = gx0 - 16; gx <= gx0 + 16; gx++) { const X = Math.floor(gx / CW), Y = Math.floor(gy / CH), v = qCell(L, X, Y)[(gy - Y * CH) * CW + gx - X * CW]; q += String(Math.round(v / 655)).padStart(5); r += tileLevel(L, gx, gy) ? '#' : '.'; }
  console.log('gy', gy, r); console.log(q);
}
const X = Math.floor(gx0 / CW), Y = Math.floor(gy0 / CH);
for (let j = -1; j <= 1; j++) { let s = ''; for (let i = -1; i <= 1; i++) { const c = (Y + j) * 80 + X + i; s += `[${X + i},${Y + j}] E ${re.E[c].toFixed(2)} e0 ${re.e0[c].toFixed(2)} lv ${re.level[c]} land ${re.land[c]}   `; } console.log(s); }
