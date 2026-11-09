// Writes the Generator 7 golden vectors: node tools/gen7-vectors.mjs <out.json>. Seeds 7, 13 and 42; the home region (slot 2,2) and the realm's north-west region (slot 0,0),
// each as land, levels, edges, fords, ports and the set pieces. Run only when the generator is meant to change, and commit the file with the change.
import { writeFileSync } from 'node:fs';
import { genRegion7 } from '../src/gen7/region.mjs';

export const SEEDS = [7, 13, 42], SLOTS = [[2, 2], [0, 0]];
export const vectorOf = G => ({
  biome: G.biome, attempt: G.attempt,
  land: Array.from(G.land).join(''), levels: Array.from(G.level).join(''), edges: Array.from(G.edge).join(''),
  fords: Array.from(G.ford).join(''), island: Array.from(G.island).join(''),
  ports: G.ports.map(p => [p.e, p.off, p.kind]),
  pieces: { gate: G.gate, deep: G.deep, swim: G.swim, spawns: G.spawns, glow: G.glow, beacons: [...G.beacons.set].sort((a, b) => a - b), outposts: [...G.depots.set].sort((a, b) => a - b) },
});
export function allVectors() {
  const out = {};
  for (const seed of SEEDS) for (const [ax, ay] of SLOTS) out[seed + ':' + ax + ',' + ay] = vectorOf(genRegion7(seed, ax, ay));
  return out;
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(allVectors(), null, 1) + '\n');
