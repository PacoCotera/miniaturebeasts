// land-time-1: a digest of the land (levelCell tiles and window info) over a set of places, to show a speed-up changes no tile.
//   node land-digest.mjs <srcdir of exploration (default: this tree)> <seed> [count=50]
// places: a fixed spread over the realm's inland cells (same list from every tree); prints one hash per place and one for all.
import { pathToFileURL } from 'node:url';
const here = new URL('..', import.meta.url).pathname;
const root = process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : here;
const seed = Number(process.argv[3] || 7), count = Number(process.argv[4] || 50);
const imp = f => import(pathToFileURL(`${root}/src/gen7/${f}`).href);
const { realm7 } = await imp('region.mjs');
const LV = await imp('levels.mjs');
const realm = realm7(seed).realm, L = LV.levelsOf(realm);
const cells = [];
for (let n = 0; n < count; n++) { const X = 6 + ((n * 37 + seed * 11) % 66), Y = 6 + ((n * 53 + seed * 7) % 86); cells.push([X, Y]); }
let all = 2166136261; const per = [];
for (const [X, Y] of cells) {
  const w = LV.windowLevels(L, X, Y); let h = 2166136261;
  for (let i = 0; i < w.R.length; i++) { h ^= w.R[i]; h = Math.imul(h, 16777619) >>> 0; }
  const inf = JSON.stringify([w.info.sites, w.info.filled, w.info.pockets, w.info.pocketStairs, w.info.jogs, w.info.jogsMissed, w.info.gapsFixed, w.info.squaresFixed, w.info.squaresLeft, w.info.leftFixed]);
  for (let i = 0; i < inf.length; i++) { h ^= inf.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  per.push(`${X},${Y}:${h}`); all = (Math.imul(all ^ h, 16777619)) >>> 0;
}
console.log(JSON.stringify({ seed, count, all, per }));
