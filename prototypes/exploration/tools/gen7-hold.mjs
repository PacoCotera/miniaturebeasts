// G4a numbers: what a generator 7 cell holds, over a sample of the land cells of seeds. node tools/gen7-hold.mjs <seed from> <seed to> <cells a seed> [out.json]
// Every land cell of the realm is a candidate; the sample is every k-th land cell in a hashed order (deterministic). Landmarks and starts are counted over the whole realm (region level, cheap).
import { writeFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { cellIR, decorOf } from '../src/gen7/place.mjs';
import { landmarksOf } from '../src/gen7/landmarks.mjs';
import { isStartCell } from '../src/gen7/hold.mjs';
import { hash, L, MW, MH } from '../src/world.mjs';
import { ATLAS } from '../src/regions.mjs';

const [s0, s1, per, out] = [Number(process.argv[2] || 7), Number(process.argv[3] || 7), Number(process.argv[4] || 100), process.argv[5]];
const res = { seeds: 0, cells: 0, bad: [], finds: 0, byKind: {}, byBiome: {}, hist: Array(12).fill(0), marks: 0, glassOffSand: 0, glass: 0, marksCells: 0, landCellsAll: 0, landmarks: 0, spacingBreaks: 0, regionsMissing: [], startNoMark: 0, starts: 0, startNoStone: 0, startNoPod: 0, startNoFind: 0, noOpen: 0, noSpawn: 0, noName: 0, noFind: 0, hearts: 0, oldClues: 0, kindsLm: {}, ms: 0, tracks: 0, reedlines: 0, moss: 0, pearls: 0, traces: 0, herdPods: 0, namesRepeat: 0 };
for (let seed = s0; seed <= s1; seed++) {
  const R = realm7(seed), lms = landmarksOf(seed, decorOf(seed).hollowSites());
  res.seeds++;
  const land = (X, Y) => { if (X < 0 || Y < 0 || X >= MW * ATLAS || Y >= MH * ATLAS) return null; const G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)]; const c = (Y % MH) * MW + (X % MW); return G.land[c] !== L.WATER && !G.island[c] ? G : null; };
  let all = 0; const cells = [];
  for (let Y = 0; Y < MH * ATLAS; Y++) for (let X = 0; X < MW * ATLAS; X++) if (land(X, Y)) { all++; cells.push([X, Y]); }
  res.landCellsAll += all; res.landmarks += lms.list.length;
  for (let i = 0; i < lms.list.length; i++) { res.kindsLm[lms.list[i].kind] = (res.kindsLm[lms.list[i].kind] || 0) + 1; for (let j = 0; j < i; j++) if (Math.max(Math.abs(lms.list[i].X - lms.list[j].X), Math.abs(lms.list[i].Y - lms.list[j].Y)) < 3) res.spacingBreaks++; }
  for (const G of R.regions) {   // each region at least one of each kind it has a cell for; names none twice
    const mine = lms.list.filter(p => p.slot[0] === G.slot[0] && p.slot[1] === G.slot[1]), names = mine.map(p => p.name);
    if (new Set(names).size !== names.length) res.namesRepeat++;
    const kinds = new Set(mine.map(p => p.kind)); res.regionsMissing.push({ seed, slot: G.slot, biome: G.biome, kinds: [...kinds].sort().join('+') });
  }
  const order = cells.map(c => ({ c, k: hash(seed, 'sample', c[0], c[1]) })).sort((a, b) => a.k - b.k).slice(0, per).map(o => o.c);
  // the starts: every start's cell is sampled too (their guarantees), and so are its 3 x 3 for the strike mark
  const starts = []; for (const G of R.regions) for (const c of G.spawns) starts.push([G.slot[0] * MW + (c % MW), G.slot[1] * MH + ((c / MW) | 0)]);
  const t0 = performance.now(); let n = 0;
  const seen = new Map();
  const irOfCell = (X, Y) => { const k = X * 1000 + Y; if (!seen.has(k)) { seen.set(k, cellIR(seed, X, Y)); n++; } return seen.get(k); };
  for (const [X, Y] of order) {
    const ir = irOfCell(X, Y), G = land(X, Y), b = G.biome;
    res.cells++;
    if (!ir.openings.length) { res.noOpen++; res.bad.push(['noOpen', seed, X, Y]); }
    if (!ir.spawns.length) res.noSpawn++;
    if (!ir.names.length) res.noName++;
    if (!ir.finds.length) { res.noFind++; res.bad.push(['noFind', seed, X, Y]); }
    if (ir.hearts.length || ir.clues.length) res.oldClues++;
    res.finds += ir.finds.length; res.hist[Math.min(11, ir.finds.length)]++;
    const bb = res.byBiome[b] || (res.byBiome[b] = { cells: 0, finds: 0, marks: 0, kinds: {} }); bb.cells++; bb.finds += ir.finds.length; bb.marks += ir.strikes.length;
    for (const f of ir.finds) { res.byKind[f.kinds[0]] = (res.byKind[f.kinds[0]] || 0) + 1; bb.kinds[f.kinds[0]] = (bb.kinds[f.kinds[0]] || 0) + 1; if (f.herd !== undefined) res.herdPods++; if (f.what === 'pearl') res.pearls++; }
    res.marks += ir.strikes.length; if (ir.strikes.length) res.marksCells++;
    for (const m of ir.strikes) { if (m.glass) { res.glass++; const t = ir.terrain[m.y * ir.w + m.x]; if (t !== 3) res.glassOffSand++; } }
    for (const s of ir.signs) { if (s.kind === 'tracks') res.tracks++; else if (s.kind === 'reedline') res.reedlines++; else res.moss++; }
    res.traces += ir.traces.length;
  }
  // starts: a strike mark within one cell, a find or herd within one cell, a stone and a pod in the start cell
  for (const [X, Y] of starts.slice(0, 40)) {
    res.starts++;
    let mark = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (land(X + dx, Y + dy)) { if (irOfCell(X + dx, Y + dy).strikes.length) mark = true; }
    if (!mark) res.startNoMark++;
    const ir = irOfCell(X, Y);
    if (!ir.finds.length) res.startNoFind++;
    if (!ir.finds.some(f => f.kinds[0] === 'stone')) res.startNoStone++;
    if (!ir.finds.some(f => f.kinds[0] === 'pod')) res.startNoPod++;
  }
  res.ms += (performance.now() - t0) / Math.max(1, n);
}
res.msPerCell = res.ms / res.seeds; delete res.ms;
res.meanFinds = res.finds / res.cells; res.marksPerCell = res.marks / res.cells; res.landmarkShare = res.landmarks / res.landCellsAll;
res.regionsMissing = res.regionsMissing.filter(r => !r.kinds.includes('reedpool') || !r.kinds.includes('split-stone')).length;
res.bad = res.bad.slice(0, 10);
console.log(JSON.stringify(res));
if (out) writeFileSync(out, JSON.stringify(res, null, 1));
