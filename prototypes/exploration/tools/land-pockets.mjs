// land-b3c: what the pocket rule did on the 15 windows' places (180): pits filled and mesas lowered, pocket stairs made, closed parts left (too large for one cell round, or walled by water), lake islets; and the jogs
//   node land-pockets.mjs
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowInfo, CW, CH } from '../src/gen7/levels.mjs';
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
let cells = 0, filled = 0, stairs = 0, deferred = 0, islets = 0, jogs = 0, missed = 0, squares = 0, left = 0; const stairList = [], deferList = [];
for (const wv of WINDOWS) {
  const L = levelsOf(realm7(wv.seed).realm);
  for (let j = 0; j < wv.h / CH; j++) for (let i = 0; i < wv.w / CW; i++) {
    const X = wv.X + i, Y = wv.Y + j, t = windowInfo(L, X, Y); cells++;
    filled += t.filled.length; stairs += t.pocketStairs.filter(s => s.x >= X * CW && s.x < (X + 1) * CW && s.y >= Y * CH && s.y < (Y + 1) * CH).length; deferred += (t.deferred || []).length; islets += (t.islets || []).length;
    jogs += t.jogs; missed += t.jogsMissed; squares += t.squaresFixed || 0; left += t.leftFixed || 0;
    for (const s of t.pocketStairs) if (s.x >= X * CW && s.x < (X + 1) * CW && s.y >= Y * CH && s.y < (Y + 1) * CH) stairList.push(`${wv.seed}:${s.x},${s.y} n${s.n}${s.raised ? 'R' : 'L'}`);
    if (t.deferred) deferList.push(`${wv.seed}:${X},${Y} ${t.deferred.join('/')}`);
  }
}
console.log(JSON.stringify({ cells, pitsFilledOrMesasLowered: filled, pocketStairs: stairs, deferredLarge: deferred, lakeIslets: islets, jogs, jogsMissed: missed, squareCornersFixed: squares, edgeTilesFlipped: left }));
console.log('pocket stairs:', stairList.join(' ')); console.log('deferred (cell: sizes):', deferList.join(' | '));
