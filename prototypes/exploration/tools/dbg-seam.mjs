// land-b3c: where a cell's tiles differ between its own window and a neighbour's window (world tiles), per seed
//   node dbg-seam.mjs <seed,seed,...>
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, landRule, CW, CH } from '../src/gen7/levels.mjs';
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
for (const seed of process.argv[2].split(',').map(Number)) {
  const wv = WINDOWS.find(v => v.seed === seed), L = levelsOf(realm7(seed).realm), o = landRule().window, out = [];
  for (let j = 0; j < wv.h / CH; j++) for (let i = 0; i < wv.w / CW; i++) {
    const cx = wv.X + i, cy = wv.Y + j, own = windowLevels(L, cx, cy);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1], [-1, 1]]) {
      const nb = windowLevels(L, cx + dx, cy + dy);
      for (let y = o * CH; y < (o + 1) * CH; y++) for (let x = o * CW; x < (o + 1) * CW; x++) {
        const nx = x - dx * CW, ny = y - dy * CH; if (nx < 0 || ny < 0 || nx >= nb.W || ny >= nb.H) continue;
        if (own.R[y * own.W + x] !== nb.R[ny * nb.W + nx]) out.push(`cell ${cx},${cy} vs ${cx + dx},${cy + dy} tile ${cx * CW + x - o * CW},${cy * CH + y - o * CH} own ${own.R[y * own.W + x]} nb ${nb.R[ny * nb.W + nx]}`);
      }
    }
  }
  console.log(seed, out.length ? out.join('\n  ') : 'seam 0');
}
