// usage: node list-seated.mjs <seed> -> home-region places with a keepers' kind: local x,y, kind, seated?, why
import { planOf } from '../../src/gen7/places.mjs';
import { keeperKinds } from '../../src/gen7/keepers.mjs';
import { MW, MH } from '../../src/world.mjs';
import { CENTER } from '../../src/regions.mjs';
const [ax, ay] = CENTER, seed = +process.argv[2];
for (const [k, kind] of keeperKinds(seed)) { const [X, Y] = k.split(',').map(Number); if (Math.floor(X / MW) !== ax || Math.floor(Y / MH) !== ay) continue; const p = planOf(seed, X, Y); console.log(X - ax * MW, Y - ay * MH, kind, p && p.keepers ? 'seated ' + p.keepers.piece + ' ' + p.keepers.x + ',' + p.keepers.y : 'no:' + (p && p.keepersWhy)); }
