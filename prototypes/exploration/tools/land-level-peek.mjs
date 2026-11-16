// land-reach-1: the land's levels round a world tile as text (# raised, . low, = a realm or pocket way up, ~ water held low), from the cells' own windows:  node land-level-peek.mjs <seed> <gx> <gy> [half]
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, tileLevel, findWayup, pocketWayups, wetCell, CW, CH } from '../src/gen7/levels.mjs';
const [seed, gx, gy, hf] = [+process.argv[2], +process.argv[3], +process.argv[4], +(process.argv[5] || 12)];
const L = levelsOf(realm7(seed).realm), wus = [];
for (const s of L.stairs.values()) { const w = findWayup(L, s.X, s.Y, s.port); if (w) wus.push(w); }
for (let Y = Math.floor((gy - hf) / CH); Y <= Math.floor((gy + hf) / CH); Y++) for (let X = Math.floor((gx - 2 * hf) / CW); X <= Math.floor((gx + 2 * hf) / CW); X++) wus.push(...pocketWayups(L, X, Y));
const wet = (x, y) => { const cx = Math.floor(x / CW), cy = Math.floor(y / CH); return wetCell(L, cx, cy)[(y - cy * CH) * CW + x - cx * CW]; };
for (let y = gy - hf; y <= gy + hf; y++) { let s = String(y).padStart(5) + ' ';
  for (let x = gx - 2 * hf; x <= gx + 2 * hf; x++) s += wus.some(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h) ? '=' : tileLevel(L, x, y) > 0 ? '#' : wet(x, y) ? '~' : x === gx && y === gy ? 'o' : '.';
  console.log(s); }
console.log(`x from ${gx - 2 * hf}`);
