// realm-slices-build-1 (T3-T5): times the first region and the slices, one JSON line a seed. Engine-neutral (Node or quickjs-ng from a bundle: tools/slices-time.sh); Date.now only.
//   node slices-time.mjs [-n neighbours=8] [-s sectors=3] [-mode=warm|cold] seed ...
// A stage's time is its own, in the order the game meets them: realm (all rounds, coast, features, F4 trails: realm7), its blob (pack, unpack, digest), then the start place (cold: it also makes the seed's place context
// and the first window's fields), then its 8 neighbours one slice each (warm: the 20 of 25 fields already made), then a few of the start region's sectors. The start place is the first spawn of the middle region [2, 2].
import { realm7 } from '../src/gen7/region.mjs';
import { createScheduler } from '../src/gen7/slices.mjs';
import { levelsOf, levelCell } from '../src/gen7/levels.mjs';
import { packRealm, unpackRealm, realmDigest } from '../src/gen7/realm-blob.mjs';

const inQjs = typeof globalThis.scriptArgs !== 'undefined', args = (inQjs ? globalThis.scriptArgs.slice(1) : process.argv.slice(2)), now = () => Date.now();
const seeds = args.filter(a => /^\d+$/.test(a)).map(Number), MW = 16, MH = 20;
for (const seed of seeds) {
  const out = { engine: inQjs ? 'qjs' : 'node', seed }, steps = [];
  let t = now(); const R = realm7(seed, (d, of) => steps.push([d, now() - t])); out.realmMs = now() - t; out.rounds = R.rounds;
  t = now(); const dg = realmDigest(R); out.digestMs = now() - t; out.realmDigest = dg;
  t = now(); const blob = packRealm(R); out.packMs = now() - t; out.blobBytes = blob.length;
  t = now(); const back = unpackRealm(blob, { digest: dg }); out.unpackMs = now() - t;   // unpack checks the digest itself
  const G = R.regions[2 * 5 + 2], start = [2 * MW + (G.spawns[0] % MW), 2 * MH + ((G.spawns[0] / MW) | 0)];
  out.start = start;
  const s = createScheduler(seed, start, { now });
  let acc = {}, last = 0;   // the window's own stage clock (place.mjs F6_STAGE), ms a stage: of the start place, then summed over the 8 neighbours
  globalThis.F6_STAGE = label => { const n = now(); if (label === 'start') { last = n; return; } acc[label] = (acc[label] || 0) + (n - last); last = n; };
  s.front('place', start[0], start[1]);
  const first = s.step(); out.startPlaceMs = first.ms; out.startDigest = first.digest; out.startStages = acc; acc = {};
  const nb = []; for (let i = 0; i < 8; i++) { const r = s.step(); nb.push(r.ms); }
  out.neighbourMs = nb; out.neighbourMax = Math.max(...nb); out.neighbourStages8 = acc; globalThis.F6_STAGE = null;
  const sec = []; for (let i = 0; i < 3; i++) { const r = s.step(); sec.push(r.ms); }
  out.sectorMs = sec;
  out.firstRegionMs = out.realmMs + out.startPlaceMs;
  // the land rule alone (levels.mjs levelCell: the field q of the 5 x 5 window and its passes) on a cell no window has touched, then its east neighbour (20 of 25 cells of q kept): brief 2a's cache
  const L = levelsOf(R.realm), cx = start[0] + 7, cy = start[1] + 9;
  t = now(); levelCell(L, cx, cy); out.landColdMs = now() - t;
  t = now(); levelCell(L, cx + 1, cy); out.landWarmMs = now() - t;
  console.log(JSON.stringify(out));
}
