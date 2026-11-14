// land-b3b-landrule-2: C1 (a place's level, the realm's after the e0 pass, is the majority of its tiles) and the river check, on sampled places of seeds 1-15.
//   node land-checks.mjs [--per 30] [--seeds 1,2,...]
// Per seed, `per` places: a third river places (a water cell of kind 1), a third beside a level change, the rest any land cell off the coast ring; chosen by a fixed hash, not by the result.
// C1: the share of the place's 24 x 28 tiles that are on the realm's level for the cell is over half (water cells count as low). River raised: tiles raised in a river place, and raised tiles inside the place's wet flags.
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, levelCell, CW, CH } from '../src/gen7/levels.mjs';
import { L } from '../src/world.mjs';
import { RW, RH } from '../src/gen7/world.mjs';

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const per = +opt('per', 30), SEEDS = String(opt('seeds', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15')).split(',').map(Number);
const h32 = (a, b) => { let x = (a * 374761393 + b * 668265263) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return (x ^ (x >>> 16)) >>> 0; };
let all = 0, ok = 0, riverN = 0, riverRaisedPlaces = 0, riverRaisedTiles = 0; const worst = [];
for (const seed of SEEDS) {
  const R = realm7(seed), re = R.realm, LV = levelsOf(re), cells = [];
  const inner = (x, y) => x >= 2 && y >= 2 && x < RW - 2 && y < RH - 2;
  const river = [], edge = [], any = [];
  for (let y = 2; y < RH - 2; y++) for (let x = 2; x < RW - 2; x++) {
    const c = y * RW + x; if (re.coast && re.coast[c]) continue;
    if (re.land[c] === L.WATER && re.wkind[c] === 1) { river.push(c); continue; }
    if (re.land[c] === L.WATER) continue;
    let ch = false; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (inner(x + dx, y + dy) && re.level[c] !== re.level[(y + dy) * RW + x + dx]) ch = true;
    (ch ? edge : any).push(c);
  }
  const pick = (a, n, tag) => a.map(c => [h32(c, seed * 7 + tag), c]).sort((p, q) => p[0] - q[0]).slice(0, n).map(p => p[1]);
  const share = Math.floor(per / 3);
  cells.push(...pick(river, share, 1), ...pick(edge, share, 2), ...pick(any, per - 2 * share, 3));
  for (const c of cells) {
    const X = c % RW, Y = (c / RW) | 0, t = levelCell(LV, X, Y), want = re.land[c] === L.WATER ? 0 : re.level[c]; let on = 0, up = 0;
    for (let i = 0; i < t.length; i++) { if ((t[i] >= 1 ? 1 : 0) === want) on++; if (t[i] >= 1) up++; }
    all++; if (on * 2 > t.length) ok++; else worst.push(`${seed}:${X},${Y} want ${want} on ${on}/${t.length}`);
    if (re.land[c] === L.WATER && re.wkind[c] === 1) { riverN++; if (up) riverRaisedPlaces++; riverRaisedTiles += up; }
  }
}
console.log(JSON.stringify({ places: all, c1Pct: +(100 * ok / all).toFixed(1), riverPlaces: riverN, riverPlacesWithRaisedTiles: riverRaisedPlaces, riverRaisedTiles }));
console.log('C1 misses:', worst.slice(0, 40).join(' | '));
