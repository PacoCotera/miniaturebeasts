// What a place holds: the numbers over a hashed sample of land cells of some seeds (the greybox's checks), and the same cells as origin/main holds them.
// usage: node tools/gen7-places-check.mjs <baseTreeRoot> <cells a seed> <out.json> [seed ...]     (baseTreeRoot: a checkout of origin/main, the "before")
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { realm7 } from '../src/gen7/region.mjs';
import { cellIR } from '../src/gen7/place.mjs';
import { planOf } from '../src/gen7/places.mjs';
import { hash, L, MW, MH } from '../src/world.mjs';
import { ATLAS } from '../src/regions.mjs';

const [baseRoot, per, outFile, ...seedArgs] = process.argv.slice(2), seeds = seedArgs.length ? seedArgs.map(Number) : [7, 13, 42], N = Number(per || 64);
const base = await import(pathToFileURL(baseRoot + '/prototypes/exploration/src/gen7/place.mjs').href);
const res = { cells: 0, heart: 0, seen: 0, hearts: 0, tier: {}, kinds: {}, spotBesides: 0, overhang: 0, splitGround: 0, finds: 0, baseFinds: 0, pods: 0, basePods: 0, props: 0, baseProps: 0, tall: 0, baseTall: 0, shelter: 0, noEntry: 0, baseMs: 0, kindNow: {}, kindBase: {}, ms: 0, bySeed: {}, sample: [] };
for (const seed of seeds) {
  const R = realm7(seed), cells = [];
  for (let Y = 0; Y < MH * ATLAS; Y++) for (let X = 0; X < MW * ATLAS; X++) { const G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)], c = (Y % MH) * MW + (X % MW); if (G.land[c] !== L.WATER && !G.island[c]) cells.push([X, Y]); }
  const pick = cells.map(c => ({ c, k: hash(seed, 'places-check', c[0], c[1]) })).sort((a, b) => a.k - b.k).slice(0, N).map(o => o.c);
  const mine = { cells: 0, heart: 0, finds: 0, baseFinds: 0 };
  for (const [X, Y] of pick) {
    const t0 = performance.now(), ir = cellIR(seed, X, Y), plan = planOf(seed, X, Y); res.ms += performance.now() - t0;
    const t1 = performance.now(), b = base.cellIR(seed, X, Y); res.baseMs += performance.now() - t1;
    res.cells++; mine.cells++;
    const heart = plan.spots.find(s => s.role === 'heart');
    if (!plan.entries.length) res.noEntry++;
    if (heart) { res.heart++; mine.heart++; res.hearts++; if (heart.seenFrom) res.seen++; res.tier[heart.tier] = (res.tier[heart.tier] || 0) + 1; }
    for (const s of plan.spots) res.kinds[s.kind] = (res.kinds[s.kind] || 0) + 1;
    if (heart && plan.spots.length > 1) res.spotBesides++;
    if (plan.spots.some(s => s.kind === 'overhang')) res.overhang++;
    if (plan.spots.some(s => s.kind === 'split-stone-ground')) res.splitGround++;
    res.finds += ir.finds.length; res.baseFinds += b.finds.length; mine.finds += ir.finds.length; mine.baseFinds += b.finds.length;
    res.pods += ir.finds.filter(f => f.kinds[0] === 'pod').length; res.basePods += b.finds.filter(f => f.kinds[0] === 'pod').length;
    for (const f of ir.finds) res.kindNow[f.kinds[0]] = (res.kindNow[f.kinds[0]] || 0) + 1;
    for (const f of b.finds) res.kindBase[f.kinds[0]] = (res.kindBase[f.kinds[0]] || 0) + 1;
    res.props += ir.props.length; res.baseProps += b.props.length;
    const tall = (ir2) => ir2.props.filter(p => p.fam === 'sweeps').length; res.tall += tall(ir); res.baseTall += tall(b);
    res.shelter += ir.shelter.length;
    if (res.sample.length < 12 && heart && plan.spots.length > 1) res.sample.push({ seed, X, Y });
  }
  res.bySeed[seed] = { ...mine, meanFinds: +(mine.finds / mine.cells).toFixed(2), meanBase: +(mine.baseFinds / mine.cells).toFixed(2) };
}
const n = res.cells, pct = (a, d) => +(100 * a / d).toFixed(1);
const out = { cells: n, seeds, withHeartPct: pct(res.heart, n), heartsSeenPct: pct(res.seen, res.hearts), hearts: res.hearts, tiers: res.tier, kinds: res.kinds,
  withSpotBesidesHeartPct: pct(res.spotBesides, n), withOverhangPct: pct(res.overhang, n), withSplitGround: res.splitGround, noWayIn: res.noEntry,
  meanFinds: +(res.finds / n).toFixed(3), meanFindsBefore: +(res.baseFinds / n).toFixed(3), meanPods: +(res.pods / n).toFixed(3), meanPodsBefore: +(res.basePods / n).toFixed(3),
  meanByKind: Object.fromEntries(Object.keys({ ...res.kindNow, ...res.kindBase }).map(k => [k, [+((res.kindNow[k] || 0) / n).toFixed(2), +((res.kindBase[k] || 0) / n).toFixed(2)]])),   // [now, before]
  meanProps: +(res.props / n).toFixed(1), meanPropsBefore: +(res.baseProps / n).toFixed(1), meanTallGrassSweeps: +(res.tall / n).toFixed(1), meanTallGrassBefore: +(res.baseTall / n).toFixed(1), meanShelterTiles: +(res.shelter / n).toFixed(2),
  msPerCell: Math.round(res.ms / n), msPerCellBefore: Math.round(res.baseMs / n), bySeed: res.bySeed, sample: res.sample };
writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1));
