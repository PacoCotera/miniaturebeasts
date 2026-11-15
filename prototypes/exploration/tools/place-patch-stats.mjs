// place-walk-1: the heart's patch and the find mix over a hashed sample of land cells (the same sample as gen7-places-check.mjs: N cells a seed, hashed).
//   node place-patch-stats.mjs <treeRoot> <cells a seed> <out.json> [seed ...]      (treeRoot: the checkout whose modules are read: this one or the "before")
// Per place: the heart (bed or Split Stone), its level, its footprint's grass share, whether it carries a patch, the patch's longest straight edge and its area against the footprint; the find mix.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [root, per, outFile, ...seedArgs] = process.argv.slice(2), seeds = seedArgs.length ? seedArgs.map(Number) : [7, 13, 42], N = Number(per || 64);
const M = n => import(pathToFileURL(root + '/prototypes/exploration/src/' + n).href);
const { realm7 } = await M('gen7/region.mjs'), { cellIR, cellTerrain, TV } = await M('gen7/place.mjs'), { planOf } = await M('gen7/places.mjs'), { hash, L, MW, MH } = await M('world.mjs'), { ATLAS } = await M('regions.mjs');
const res = { places: 0, hearts: 0, beds: 0, bedsRaised: 0, bedsPatched: 0, bedsGrass70: 0, splits: 0, splitsPatched: 0, patches: 0, areaIn: 0, longest: {}, areaHist: [], finds: 0, kinds: {}, ms: 0 };
for (const seed of seeds) {
  const R = realm7(seed), cells = [];
  for (let Y = 0; Y < MH * ATLAS; Y++) for (let X = 0; X < MW * ATLAS; X++) { const G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)], c = (Y % MH) * MW + (X % MW); if (G.land[c] !== L.WATER && !G.island[c]) cells.push([X, Y]); }
  const pick = cells.map(c => ({ c, k: hash(seed, 'places-check', c[0], c[1]) })).sort((a, b) => a.k - b.k).slice(0, N).map(o => o.c);
  for (const [X, Y] of pick) {
    const t0 = performance.now(), ir = cellIR(seed, X, Y), plan = planOf(seed, X, Y); res.ms += performance.now() - t0; res.places++;
    res.finds += ir.finds.length; for (const f of ir.finds) res.kinds[f.kinds[0]] = (res.kinds[f.kinds[0]] || 0) + 1;
    const heart = plan && plan.spots.find(s => s.role === 'heart'); if (!heart) continue; res.hearts++;
    const ct = cellTerrain(seed, X, Y), w = ct.w, I = (x, y) => y * w + x;
    const cx = heart.x + (heart.w >> 1), cy = heart.y + (heart.h >> 1), raised = ct.terrain[I(cx, cy)] === TV.CLIFF;
    let g = 0; for (let y = heart.y; y < heart.y + heart.h; y++) for (let x = heart.x; x < heart.x + heart.w; x++) { const t = ct.terrain[I(x, y)]; const FAM = v => v === TV.GRASS || v === TV.LITTER || v === TV.DRY || v === TV.TURF; if (FAM(t) || (t === TV.CLIFF && (!ct.top[I(x, y)] || FAM(ct.top[I(x, y)])))) g++; }
    const grass70 = g / (heart.w * heart.h) >= 0.7;
    // the patch as the page gets it: tiles of the patch's ground kind in the terrain (low) or in the top layer (raised)
    const has = new Set(); for (let i = 0; i < ir.w * ir.h; i++) if ([15, 16].includes(ir.terrain[i]) || (ir.top && [17, 18].includes(ir.top[i]))) has.add(i);
    // the patch's tiles near the heart (inside the footprint grown by 3)
    const mineOf = () => [...has].filter(i => { const x = i % ir.w, y = (i / ir.w) | 0; return x >= heart.x - 3 && x < heart.x + heart.w + 3 && y >= heart.y - 3 && y < heart.y + heart.h + 3; });
    const isSplit = heart.kind === 'split-stone-ground';
    if (isSplit) { res.splits++; if (mineOf().length) res.splitsPatched++; } else { res.beds++; if (raised) res.bedsRaised++; if (mineOf().length) res.bedsPatched++; if (grass70) res.bedsGrass70++; }
    if (!mineOf().length) {   // no patch: tally the heart's ground (the centre tile; a raised tile by its top), a bed's only
      if (!isSplit) { const nm = { 6: 'grass', 11: 'litter', 12: 'drygrass', 13: 'turf', 14: 'scree', 3: 'sand', 7: 'earth', 10: 'scrub', 5: 'path', 4: 'mud', 9: 'thicket' }, tv = ct.terrain[I(cx, cy)] === TV.CLIFF ? (ct.top[I(cx, cy)] || 6) : ct.terrain[I(cx, cy)], key = (raised ? 'raised ' : '') + (nm[tv] || 'kind' + tv); res.noPatchBy = res.noPatchBy || {}; res.noPatchBy[key] = (res.noPatchBy[key] || 0) + 1; }
      continue;
    }
    res.patches++;
    const mine = mineOf();
    const set = new Set(mine), inP = (x, y) => set.has(y * ir.w + x); let longest = 0;
    for (const [ex, ey] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const along = ex === 0 ? [1, 0] : [0, 1];
      for (const i of mine) { const x = i % ir.w, y = (i / ir.w) | 0; if (inP(x + ex, y + ey) || (inP(x - along[0], y - along[1]) && !inP(x - along[0] + ex, y - along[1] + ey))) continue;
        let n = 0; while (inP(x + along[0] * n, y + along[1] * n) && !inP(x + along[0] * n + ex, y + along[1] * n + ey)) n++; if (n > longest) longest = n; } }
    res.longest[longest] = (res.longest[longest] || 0) + 1;
    const ratio = mine.length / (heart.w * heart.h); res.areaHist.push(+ratio.toFixed(2)); if (ratio >= 0.55 && ratio <= 0.85) res.areaIn++;
  }
}
const pct = (a, d) => +(100 * a / Math.max(1, d)).toFixed(1);
const out = { places: res.places, seeds, hearts: res.hearts, beds: res.beds, bedsRaisedPct: pct(res.bedsRaised, res.beds), bedsWithPatchPct: pct(res.bedsPatched, res.beds), bedsGrass70Pct: pct(res.bedsGrass70, res.beds), splits: res.splits, splitsPatched: res.splitsPatched,
  patches: res.patches, bedsNoPatchByGround: res.noPatchBy || {},areaIn55to85Pct: pct(res.areaIn, res.patches), longestEdge: res.longest, meanFinds: +(res.finds / res.places).toFixed(3), findMix: Object.fromEntries(Object.entries(res.kinds).map(([k, v]) => [k, +(v / res.places).toFixed(3)])), msPerPlace: Math.round(res.ms / res.places) };
writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n'); console.log(JSON.stringify(out, null, 1));
