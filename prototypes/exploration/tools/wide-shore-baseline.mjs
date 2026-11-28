// owner #141: the baseline of places with no wide-water neighbour. node wide-shore-baseline.mjs <place module> [write]
// Picks, per seed 1..20, up to 2 cells of region (2,2) that have no wide-water map cell (a water cell that is no ford) among their four neighbours, and prints their terrain hash.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const mod = await import(process.argv[2] || '../src/gen7/place.mjs');
const { cellTerrain, contextOf } = mod;
const { RW } = await import('../src/gen7/world.mjs');
const { L } = await import('../src/logic/world.mjs');
export const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const out = {};
for (const seed of SEEDS) {
  const S = contextOf(seed), ford = new Uint8Array(S.landC.length);   // the main copy has no fordC: read the ford flag from the regions
  for (const G of S.R.regions) for (let c = 0; c < G.land.length; c++) ford[(G.slot[1] * 20 + ((c / 16) | 0)) * RW + G.slot[0] * 16 + (c % 16)] = G.ford[c] ? 1 : 0;
  const wide = (x, y) => x >= 0 && y >= 0 && x < RW && y < S.landC.length / RW && S.landC[y * RW + x] === L.WATER && !ford[y * RW + x];
  const picks = [];
  for (let cy = 4; cy < 16 && picks.length < 2; cy++) for (let cx = 4; cx < 12 && picks.length < 2; cx++) {
    const X = 2 * 16 + cx, Y = 2 * 20 + cy;
    if (S.landC[Y * RW + X] === L.WATER) continue;
    let near = false; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (wide(X + dx, Y + dy)) near = true;   // none in the 5 x 5 cells round it (the apron reads the cells next door)
    if (near) continue;
    picks.push([X, Y]);
  }
  out[seed] = picks.map(([X, Y]) => [X, Y, createHash('sha1').update(cellTerrain(seed, X, Y).terrain).digest('hex')]);
}
if (process.argv[3] === 'write') writeFileSync(new URL('../tests/fixtures/wide-shore-baseline.json', import.meta.url), JSON.stringify(out));
else console.log(JSON.stringify(out).slice(0, 300));
