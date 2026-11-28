// land-b3c: where the shape checks fail on a seed's window (world tiles): square corners, pinches, lone faces, slivers, foot room, runs over the caps
//   node dbg-viol.mjs <seed,seed,...>
import { readFileSync } from 'node:fs';
import { rasterOf } from './land-measure.mjs';
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8')), fr = 2;
for (const seed of process.argv[2].split(',').map(Number)) {
  const wv = WINDOWS.find(v => v.seed === seed), { w, h, raised, gx0, gy0 } = rasterOf(seed, wv.X, wv.Y, wv.w, wv.h), out = [];
  const R = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : raised[y * w + x] === '1' ? 1 : 0), lip = (x, y) => R(x, y) === 1 && R(x, y + 1) === 0, at = (n, x, y) => out.push(`${n}@${gx0 + x},${gy0 + y}`);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (lip(x, y) && !lip(x - 1, y) && !lip(x + 1, y) && !(lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1))) at('lone', x, y);
    const c = R(x, y) * 8 + R(x + 1, y) * 4 + R(x, y + 1) * 2 + R(x + 1, y + 1); if (c === 6 || c === 9) at('pinch', x, y);
    if (y >= 3 && lip(x, y)) for (const dx of [-1, 1]) if (!lip(x + dx, y) && lip(x - dx, y) && !R(x + dx, y) && !R(x + dx, y - 1) && !R(x + dx, y - 2)) at('square', x, y);
    const v = R(x, y); let ok = false; for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = R(x + ox, y + oy) === v && R(x + ox + 1, y + oy) === v && R(x + ox, y + oy + 1) === v && R(x + ox + 1, y + oy + 1) === v;
    if (!ok) at('sliver', x, y);
    if (lip(x, y)) for (let k = 2; k <= fr + 1; k++) if (R(x, y + k)) { at('foot', x, y); break; }
  }
  console.log(seed, out.join(' ') || 'clean');
}
