// Way-up sites per place, before (a bend may flank the 2 tiles) and after (a straight face tile on each side, a straight run of 4 or more), on the 15 windows; and the region checks of seeds 1-15.
//   node land-wayups.mjs
// A site (levels.mjs findWayup): two south-lip tiles side by side, 3 raised rows above both, faceRows + 1 low rows below both, a lip tile on each side (same row after; one row off allowed before).
// Counted over every tile of each place; stairs: the realm's stairs that hold a way up (stairsInfo) over the windows' places, and the rounds the realm needed (1 = every region passed first time).
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, tileLevel, inlandOf, RAISE_OFF, landRule, CW, CH } from '../src/gen7/levels.mjs';
import { stairsInfo } from '../src/gen7/place.mjs';

const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
const sites = (L, X, Y, straight) => {
  const R = (x, y) => inlandOf(x, y) >= RAISE_OFF && tileLevel(L, x, y) > 0, foot = landRule().faceRows + 2, lip = (x, y) => R(x, y) && !R(x, y + 1);
  const flank = straight ? (x, y) => lip(x, y) : (x, y) => lip(x, y) || lip(x, y - 1) || lip(x, y + 1);
  let n = 0, bends = 0;
  for (let y = Y * CH; y < (Y + 1) * CH; y++) for (let x = X * CW; x < (X + 1) * CW; x++) {
    if (!lip(x, y) || !lip(x + 1, y)) continue; let ok = true;
    for (let j = 1; j <= 3 && ok; j++) ok = R(x, y - j) && R(x + 1, y - j);
    for (let j = 1; j <= foot && ok; j++) ok = !R(x, y + j) && !R(x + 1, y + j);
    if (!ok || !flank(x - 1, y) || !flank(x + 2, y)) continue; n++;
    if (!(lip(x - 1, y) && lip(x + 2, y))) bends++;
  }
  return { n, bends };
};
let totB = 0, totA = 0, placesB = 0, placesA = 0, places = 0, bendB = 0;
const per = [];
for (const wv of WINDOWS) {
  const L = levelsOf(realm7(wv.seed).realm); let b = 0, a = 0;
  for (let j = 0; j < wv.h / CH; j++) for (let i = 0; i < wv.w / CW; i++) {
    const sb = sites(L, wv.X + i, wv.Y + j, false), sa = sites(L, wv.X + i, wv.Y + j, true); places++;
    totB += sb.n; totA += sa.n; bendB += sb.bends; b += sb.n; a += sa.n; if (sb.n) placesB++; if (sa.n) placesA++;
  }
  per.push(`${wv.seed}: ${b} -> ${a}`);
}
console.log(JSON.stringify({ places, sitesBefore: totB, sitesAfter: totA, beforeNextToABend: bendB, placesWithSiteBefore: placesB, placesWithSiteAfter: placesA }));
console.log('per window (before -> after):', per.join(' | '));
const out = [];
for (let seed = 1; seed <= 15; seed++) { const R = realm7(seed), bad = R.regions.filter(r => r.fails.length).length, st = stairsInfo(seed), south = st.filter(s => s.kind === 'south'), wu = south.filter(s => s.wayup).length; out.push(`${seed}: rounds ${R.rounds}, regions failing ${bad}, stairs ${st.length}, south ${south.length} with way up ${wu}`); }
console.log(out.join('\n'));
