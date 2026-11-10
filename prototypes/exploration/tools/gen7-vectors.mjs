// Writes the Generator 7 golden vectors: node tools/gen7-vectors.mjs <out.json>. Seeds 7, 13 and 42; the home region (slot 2,2) and the realm's north-west region (slot 0,0),
// each as land, levels, edges, fords, ports and the set pieces. Run only when the generator is meant to change, and commit the file with the change.
import { writeFileSync } from 'node:fs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { cellIR, decorOf } from '../src/gen7/place.mjs';
import { landmarksOf } from '../src/gen7/landmarks.mjs';

export const SEEDS = [7, 13, 42], SLOTS = [[2, 2], [0, 0]];
export const vectorOf = G => ({
  biome: G.biome, attempt: G.attempt,
  land: Array.from(G.land).join(''), levels: Array.from(G.level).join(''), edges: Array.from(G.edge).join(''),
  fords: Array.from(G.ford).join(''), island: Array.from(G.island).join(''),
  ports: G.ports.map(p => [p.e, p.off, p.kind]),
  pieces: { gate: G.gate, deep: G.deep, swim: G.swim, spawns: G.spawns, glow: G.glow, beacons: [...G.beacons.set].sort((a, b) => a - b), outposts: [...G.depots.set].sort((a, b) => a - b) },
});
// G4a: what the cells of a region hold, as the IR carries it - the landmarks of the region, and the whole hold of its first start, the cell beside it, the region's centre cell and its
// first landmark's cell (the fields as the page reads them: finds, spawns, openings, names, signs, traces, strikes)
const compact = ir => ({
  names: ir.names, openings: ir.openings.map(o => [o.side, o.from, o.to]),
  finds: ir.finds.map(f => [f.x, f.y, f.kinds[0], f.herd ?? '', f.what ?? '', f.hollow ?? '', f.forced ? 1 : 0]),
  spawns: ir.spawns.map(s => [s.x, s.y, s.w, s.h, s.species.join('+'), s.count]),
  landmarks: ir.landmarks.map(l => [l.kind, l.name, l.prop ?? '', l.slot, l.x, l.y]),
  signs: ir.signs.map(s => JSON.stringify(s)), traces: ir.traces.map(t => [t.kind, t.x, t.y]), strikes: ir.strikes.map(m => [m.x, m.y, m.age, m.glass ? 1 : 0]),
});
export function holdVector(seed, ax, ay) {
  const G = genRegion7(seed, ax, ay), wc = c => [ax * 16 + (c % 16), ay * 20 + ((c / 16) | 0)];
  const lms = landmarksOf(seed, decorOf(seed).hollowSites()).list.filter(p => p.slot[0] === ax && p.slot[1] === ay);
  const cells = [wc(G.spawns[0]), [wc(G.spawns[0])[0] + 1, wc(G.spawns[0])[1]], [ax * 16 + 8, ay * 20 + 10]];
  if (lms.length) cells.push([lms[0].X, lms[0].Y]);
  return { landmarks: lms.map(p => [p.kind, p.name, p.X, p.Y]), cells: Object.fromEntries(cells.map(([X, Y]) => [X + ',' + Y, compact(cellIR(seed, X, Y))])) };
}
export function allVectors() {
  const out = {};
  for (const seed of SEEDS) for (const [ax, ay] of SLOTS) out[seed + ':' + ax + ',' + ay] = { ...vectorOf(genRegion7(seed, ax, ay)), hold: holdVector(seed, ax, ay) };
  return out;
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(allVectors(), null, 1) + '\n');
