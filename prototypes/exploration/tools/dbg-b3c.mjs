// land-b3c: per cell of a window, what the land rule did (sites, jogs, missed caps, pockets filled / stairs, closed pockets left)
globalThis.B3C_DBG = 1;
//   node dbg-b3c.mjs <seed> [X Y w h in cells]
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowInfo, CW, CH } from '../src/gen7/levels.mjs';
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
const seed = +process.argv[2], wv = WINDOWS.find(v => v.seed === seed), L = levelsOf(realm7(seed).realm);
for (let j = 0; j < wv.h / CH; j++) for (let i = 0; i < wv.w / CW; i++) {
  const X = wv.X + i, Y = wv.Y + j, t = windowInfo(L, X, Y);
  console.log(`${X},${Y}`, JSON.stringify({ sites: t.sites.length, filled: t.filled, left: t.pk, ps: t.pocketStairs, why: t.why }));
}
