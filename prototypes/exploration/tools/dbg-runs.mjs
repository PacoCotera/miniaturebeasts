// Prints the raster round every straight run longer than a limit (a debugging aid).  node dbg-runs.mjs <seed> [limit]
import { readFileSync } from 'node:fs';
import { rasterOf } from './land-measure.mjs';
import { levelsOf } from '../src/gen7/levels.mjs';
import { realm7 } from '../src/gen7/region.mjs';
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
const seed = +process.argv[2], lim = +(process.argv[3] || 14), wv = WINDOWS.find(w => w.seed === seed), { w, h } = wv, r = rasterOf(seed, wv.X, wv.Y, w, h), bits = r.raised;
void levelsOf; void realm7;
const R = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : bits[y * w + x] === '1' ? 1 : 0);
for (const [name, get, along] of [['west-facing side (low to the west)', (x, y) => R(x, y) && !R(x - 1, y), false], ['east-facing side', (x, y) => R(x, y) && !R(x + 1, y), false], ['south', (x, y) => R(x, y) && !R(x, y + 1), true], ['rim', (x, y) => R(x, y) && !R(x, y - 1), true]]) {
  const lines = along ? h : w, len = along ? w : h;
  for (let l = 1; l < lines - 1; l++) { let n = 0, from = 0; for (let k = 0; k <= len; k++) { if (k < len && get(along ? k : l, along ? l : k)) { if (!n) from = k; n++; } else { if (n > lim && from > 0 && k < len) { const cx = along ? from + (n >> 1) : l, cy = along ? l : from + (n >> 1); console.log(name, 'run', n, 'world', wv.X * 24 + cx, wv.Y * 28 + cy, 'cell', wv.X + Math.floor(cx / 24), wv.Y + Math.floor(cy / 28));
        for (let y = cy - 18; y <= cy + 18; y++) { let s = ''; for (let x = cx - 30; x <= cx + 30; x++) s += R(x, y) ? '#' : '.'; console.log(s); } } n = 0; } } }
}
