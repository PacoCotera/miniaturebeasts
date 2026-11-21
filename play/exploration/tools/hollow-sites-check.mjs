// hollow-sites-lazy-1: the checks and the timing of the Hollow Tree sites made per region, when asked. One JSON line a seed. Engine-neutral (Node, or quickjs-ng from a bundle: slices-time.sh's way); Date.now only.
//   node hollow-sites-check.mjs [-time] [-places=file] seed ...
// Always: the start place's time to its props (cellIR of the start place, the realm already made), its IR digest, the realm's time. With the new code also: the full site list made slot by slot (reverse order, cold cache)
// against the list made at once, the landmark list made region by region against the whole. Without -time (Node): the site list and landmark list digests and, for each place of the -places file ("seed X Y" lines,
// digests ignored), the tile digest (placeDigest) and the IR digest; the digests of one run on the old code and one on the new are compared by the caller.
import { realm7 } from '../src/gen7/region.mjs';
import { cellTerrain, cellIR, decorOf, forgetPlaces } from '../src/gen7/place.mjs';
import { landmarksOf } from '../src/gen7/landmarks.mjs';
import { placeDigest } from '../src/gen7/slices.mjs';

const inQjs = typeof globalThis.scriptArgs !== 'undefined', args = (inQjs ? globalThis.scriptArgs.slice(1) : process.argv.slice(2)), now = () => Date.now();
const seeds = args.filter(a => /^\d+$/.test(a)).map(Number), timeOnly = args.includes('-time'), pf = (args.find(a => a.startsWith('-places=')) || '').slice(8);
const MW = 16, MH = 20;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 255; h = Math.imul(h, 16777619); } return h >>> 0; };
const jd = o => fnv(JSON.stringify(o));
const places = pf ? (await import('node:fs')).readFileSync(pf, 'utf8').split('\n').filter(Boolean).map(l => l.split(' ').map(Number)) : [];

for (const seed of seeds) {
  const out = { engine: inQjs ? 'qjs' : 'node', seed };
  let t = now(); const R = realm7(seed); out.realmMs = now() - t;
  const G = R.regions[2 * 5 + 2], X = 2 * MW + (G.spawns[0] % MW), Y = 2 * MH + ((G.spawns[0] / MW) | 0); out.start = [X, Y];
  t = now(); const ir = cellIR(seed, X, Y); out.startPropsMs = now() - t; out.startIR = jd(ir);   // the start place: its terrain, its props, what it holds
  out.sitesMade = decorOf(seed).madeSites ? decorOf(seed).madeSites().length : 'all';
  if (!timeOnly) {
    // the whole list at once vs. slot by slot
    forgetPlaces(seed);
    const all = decorOf(seed).hollowSites(); out.sites = all.length; out.sitesDigest = jd(all);
    if (decorOf(seed).hollowSiteOf) {
      forgetPlaces(seed);
      const D = decorOf(seed), by = []; for (let ay = 4; ay >= 0; ay--) for (let ax = 4; ax >= 0; ax--) { const h = D.hollowSiteOf(ax, ay); if (h) by.push(h); }
      by.sort((a, b) => a.slot[1] - b.slot[1] || a.slot[0] - b.slot[0]); out.sitesBySlotEqual = JSON.stringify(by) === JSON.stringify(all);
    }
    // landmarks: the whole list vs. region by region (the old code takes the sites; the new takes the decor)
    forgetPlaces(seed);
    let lm;
    if (decorOf(seed).hollowSiteOf) {
      const D = decorOf(seed), part = []; for (let ay = 4; ay >= 0; ay--) for (let ax = 4; ax >= 0; ax--) for (const p of landmarksOf(seed, D, [[ax, ay]]).list) part.push(p);
      part.sort((a, b) => a.Y - b.Y || a.X - b.X); lm = landmarksOf(seed, D).list; out.landmarksByRegionEqual = JSON.stringify(part) === JSON.stringify(lm);
    } else lm = landmarksOf(seed, decorOf(seed).hollowSites()).list;
    out.landmarks = lm.length; out.landmarksDigest = jd(lm.map(p => [p.kind, p.X, p.Y, p.name, p.slot, p.tile || null]));
    // the places
    let th = 2166136261, ih = 2166136261, n = 0;
    for (const [s, PX, PY] of places) {
      if (s !== seed) continue;
      const c = cellTerrain(seed, PX, PY), ird = jd(cellIR(seed, PX, PY));
      th = Math.imul(th ^ placeDigest(c), 16777619) >>> 0; ih = Math.imul(ih ^ ird, 16777619) >>> 0; n++;
    }
    out.places = n; out.tileDigest = th; out.irDigest = ih;
  }
  console.log(JSON.stringify(out));
}
