// land-b3c: every realm stair has its way up? per seed 1-15: south stairs, those whose way up stands after the passes (levels.mjs findWayup), the realm's rounds and failing regions;
// and on the 15 windows' places: places with a stair, places with a way up (the realm's or a pocket stair's).
//   node land-stairs.mjs
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, findWayup, pocketWayups, CW, CH } from '../src/gen7/levels.mjs';
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
let st = 0, ok = 0; const lost = [], per = [];
for (let seed = 1; seed <= 15; seed++) {
  const R = realm7(seed), L = levelsOf(R.realm); let n = 0, g = 0;
  for (const s of L.stairs.values()) { n++; if (findWayup(L, s.X, s.Y, s.port)) g++; else lost.push(`${seed}:${s.X},${s.Y}`); }
  st += n; ok += g; per.push(`${seed}: rounds ${R.rounds}, failing regions ${R.regions.filter(r => r.fails.length).length}, stairs ${n}, with way up ${g}`);
}
console.log(per.join('\n')); console.log(JSON.stringify({ stairs: st, withWayUp: ok, lost: lost.length }), lost.join(' '));
let places = 0, withStair = 0, withWay = 0, pocketPlaces = 0;
for (const wv of WINDOWS) {
  const L = levelsOf(realm7(wv.seed).realm);
  for (let j = 0; j < wv.h / CH; j++) for (let i = 0; i < wv.w / CW; i++) {
    const X = wv.X + i, Y = wv.Y + j; places++;
    const s = L.stairs.get(X * 1000 + Y), real = s ? findWayup(L, X, Y, s.port) : null, pk = pocketWayups(L, X, Y);
    if (s) withStair++; if (real || pk.length) withWay++; if (pk.length) pocketPlaces++;
  }
}
console.log(JSON.stringify({ places, placesWithRealmStair: withStair, placesWithAWayUp: withWay, placesWithPocketStair: pocketPlaces }));
