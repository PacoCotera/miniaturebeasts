// place-walk-1: two windows' raised rasters round a world tile, side by side: node place-walk-seam-show.mjs <seed> <X> <Y> <dx> <dy> <gx> <gy> [r]   (cell X,Y's own window against the one of its neighbour (X + dx, Y + dy))
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, landRule, CW, CH } from '../src/gen7/levels.mjs';
const [seed, X, Y, dx, dy, gx, gy, rr] = process.argv.slice(2).map(Number), R = rr || 8, LV = levelsOf(realm7(seed).realm), o = landRule().window;
const a = windowLevels(LV, X, Y), b = windowLevels(LV, X + dx, Y + dy);
const at = (w, cx, cy, x, y) => { const lx = x - (cx - o) * CW, ly = y - (cy - o) * CH; return lx < 0 || ly < 0 || lx >= w.W || ly >= w.H ? '?' : w.R[ly * w.W + lx] ? '#' : '.'; };
for (let y = gy - R; y <= gy + R; y++) { let s = ''; for (let x = gx - R; x <= gx + R; x++) s += at(a, X, Y, x, y); s += '  '; for (let x = gx - R; x <= gx + R; x++) s += at(b, X + dx, Y + dy, x, y); s += '  '; for (let x = gx - R; x <= gx + R; x++) { const p = at(a, X, Y, x, y), q = at(b, X + dx, Y + dy, x, y); s += p === q ? ' ' : '!'; } console.log(String(y).padStart(5) + ' ' + s); }
console.log(JSON.stringify({ own: { sites: a.info.sites, pocketStairs: a.info.pocketStairs, deferred: a.info.deferred, filled: a.info.filled }, nb: { sites: b.info.sites, pocketStairs: b.info.pocketStairs, deferred: b.info.deferred, filled: b.info.filled } }));
