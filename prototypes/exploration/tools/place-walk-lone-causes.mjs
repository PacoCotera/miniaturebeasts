// place-walk-3: the lone tiles the gap carving leaves before they are widened, by cause, over a hashed sample of windows.
//   node place-walk-lone-causes.mjs <windows a seed> [seed ...]
import { windowGaps, loneCauses, RW, RH } from '../src/gen7/place.mjs';
import { hash } from '../src/logic/world.mjs';
const [per, ...seedArgs] = process.argv.slice(2), seeds = seedArgs.length ? seedArgs.map(Number) : [7, 13, 42];
for (const seed of seeds) {
  for (const k of Object.keys(loneCauses)) loneCauses[k] = 0;
  const picks = []; for (let Y = 3; Y < RH - 3; Y++) for (let X = 3; X < RW - 3; X++) picks.push([X, Y, hash(seed, 'place-walk-gaps', X, Y)]);
  picks.sort((a, b) => a[2] - b[2]);
  let gapTiles = 0; for (const [X, Y] of picks.slice(0, Number(per || 40))) { const { gaps } = windowGaps(seed, X, Y); for (const g of gaps) gapTiles += g; }
  console.log(JSON.stringify({ seed, windows: Number(per || 40), gapTiles, ...loneCauses }));
}
