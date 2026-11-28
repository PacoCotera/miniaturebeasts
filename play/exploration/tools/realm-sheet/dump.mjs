// The realm sheet (map-making-research-1, scheme item 7): dump one realm of the generator to JSON for measure.py, measure2.py and check.py.
//   node tools/realm-sheet/dump.mjs <seed> <out.json> [SRC prototypes/exploration dir; default: this tree]
// Reads the generator through its own modules; changes nothing.
import { writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const [seedS, OUT, SRCARG] = process.argv.slice(2);
const SRC = SRCARG || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const seed = Number(seedS);
const imp = p => import(pathToFileURL(path.join(SRC, p)).href);
const { realm7 } = await imp('src/gen7/region.mjs');
const { rawRealm, RW, RH } = await imp('src/gen7/world.mjs');
const { MW, MH } = await imp('src/logic/world.mjs');

const t0 = Date.now();
const R = realm7(seed);
const ms = Date.now() - t0;
const re = R.realm, raw = rawRealm(seed);
const A = a => Array.from(a);
const r3 = a => Array.from(a, v => Math.round(v * 1000));
// region-final arrays (land, level, ford) as the places read them, realm-wide
const NR = RW * RH, land = new Uint8Array(NR), level = new Uint8Array(NR), ford = new Uint8Array(NR), comp = new Uint8Array(NR), island = new Uint8Array(NR);
const outposts = [], starts = [], beacons = [], biome = [];
for (const G of R.regions) {
  const [ax, ay] = G.slot, wc = c => (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW);
  biome.push(G.biome);
  for (let c = 0; c < MW * MH; c++) { const w = wc(c); land[w] = G.land[c]; level[w] = G.level[c]; ford[w] = G.ford[c]; comp[w] = G.comp[c] ? 1 : 0; island[w] = G.island[c] ? 1 : 0; }
  for (const c of G.depots.set) outposts.push(wc(c));
  for (const c of G.spawns) starts.push(wc(c));
  for (const c of G.beacons.set) beacons.push(wc(c));
}
let landmarks = [], lmMs = 0;
try {
  const t1 = Date.now();
  const { decorOf } = await imp('src/gen7/place.mjs');
  const { landmarksOf } = await imp('src/gen7/landmarks.mjs');
  landmarks = landmarksOf(seed, decorOf(seed)).list.map(p => ({ kind: p.kind, c: p.Y * RW + p.X }));
  lmMs = Date.now() - t1;
} catch (e) { console.log('landmarks skipped:', e.message); }
const rd = re.roads;
const out = {
  seed, ms, RW, RH, MW, MH, rounds: R.rounds, biome,
  land: A(land), level: A(level), ford: A(ford), comp: A(comp), island: A(island),
  wkind: A(re.wkind), coast: A(re.coast),
  E: r3(re.E), worn: r3(re.worn), line: r3(re.line), e0: r3(re.e0), M: r3(re.M), T: r3(re.T),
  Z: r3(raw.Z), acc: A(raw.acc).map(v => Math.round(v)), down: A(raw.down),
  features: re.features, destinations: re.destinations, featureStats: re.featureStats,
  stairs: re.stairs,
  roads: { lists: rd.lists, kinds: rd.kinds, on: A(rd.on), ends: rd.ends, forks: rd.forks, hubs: rd.hubs, loops: rd.loops, bridges: rd.bridges, stats: rd.stats },
  outposts, starts, beacons, landmarks, lmMs,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`seed ${seed}: ${ms} ms, rounds ${R.rounds}, features ${re.features.length}, destinations ${re.destinations.length}, outposts ${outposts.length}`);
