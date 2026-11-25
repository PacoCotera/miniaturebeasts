// usage: node first-seated.mjs <seed> [kind] -> the first keepers' place of the home region with a block: slot, cell, a block tile (inner coordinates)
import { planOf } from '../../src/gen7/places.mjs';
import { keeperKinds } from '../../src/gen7/keepers.mjs';
import { MW, MH } from '../../src/world.mjs';
import { CENTER } from '../../src/regions.mjs';
const [ax, ay] = CENTER, seed = +process.argv[2], want = process.argv[3];
for (const [k, kind] of keeperKinds(seed)) {
  const [X, Y] = k.split(',').map(Number); if (Math.floor(X / MW) !== ax || Math.floor(Y / MH) !== ay || (want && kind !== want)) continue;
  const p = planOf(seed, X, Y); if (!p || !p.keepers || !p.keepers.block.length) continue;
  const b = p.keepers.block[0];
  console.log(JSON.stringify({ seed, slot: [ax, ay], cell: (Y % MH) * MW + (X % MW), X, Y, kind, blockTileInner: [b[0] - 1, b[1] - 1], keepers: p.keepers })); break;
}
