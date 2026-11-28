// Generator 7 sweep of the partner abilities' ground (partner-gates-7-1): per region of each seed, the earth banks and soft cells the rules hold,
// and how many bank edges have a real step of the land (raised ground against low walkable ground) within NEAR tiles of the cell border, by the way the step faces.
// node tools/gen7-partner-sweep.mjs [seed ...]   (default 7 13 42)
import { MW, MH, L, EDGE, softGround, bankEdges } from '../src/logic/world.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { cellTerrain, CW, CH, TV } from '../src/gen7/place.mjs';

const NEAR = 4, ATLAS = 5, NC = MW * MH;
const seeds = process.argv.slice(2).map(Number); if (!seeds.length) seeds.push(7, 13, 42);
const ok = v => v !== TV.CLIFF && v !== TV.WATER && v !== TV.DEEP && v !== TV.THICKET && v > 0;
function stepNear(seed, ax, ay, i) {   // 'south-face' (a step along a south or north side of tiles), 'side' (along an east or west side) or null
  const a = i >> 1, south = i & 1, b = south ? a + MW : a + 1;
  const X = ax * MW + (a % MW), Y = ay * MH + ((a / MW) | 0), X2 = ax * MW + (b % MW), Y2 = ay * MH + ((b / MW) | 0);
  const A = cellTerrain(seed, X, Y), B = cellTerrain(seed, X2, Y2);
  const at = (T, gx, gy) => { const x = gx - T.x0, y = gy - T.y0; return x < 0 || y < 0 || x >= T.w || y >= T.h ? -1 : T.terrain[y * T.w + x]; };
  const g = (gx, gy) => { const v = at(A, gx, gy); return v < 0 ? at(B, gx, gy) : v; };
  const raised = (gx, gy) => g(gx, gy) === TV.CLIFF;
  if (south) { const by = (Y + 1) * CH;
    for (let dy = -NEAR; dy <= NEAR; dy++) for (let x = X * CW + 2; x < X * CW + CW - 2; x++) { const y = by + dy;
      if (raised(x, y) !== raised(x, y + 1) && raised(x + 1, y) !== raised(x + 1, y + 1) && raised(x, y) === raised(x + 1, y) && raised(x, y + 1) === raised(x + 1, y + 1) && (raised(x, y) ? ok(g(x, y + 1)) : ok(g(x, y)))) return 'south-face'; }
  } else { const bx = (X + 1) * CW;
    for (let dx = -NEAR; dx <= NEAR; dx++) for (let y = Y * CH + 2; y < Y * CH + CH - 2; y++) { const x = bx + dx;
      if (raised(x, y) !== raised(x + 1, y) && raised(x, y + 1) !== raised(x + 1, y + 1) && raised(x, y) === raised(x, y + 1) && raised(x + 1, y) === raised(x + 1, y + 1) && (raised(x, y) ? ok(g(x + 1, y)) : ok(g(x, y)))) return 'side'; } }
  return null;
}
for (const seed of seeds) {
  let banks = 0, wade = 0, scree = 0, regions = 0, softRegions = 0, steps = 0, south = 0, side = 0;
  const counts = new Set();
  for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) {
    const G = genRegion7(seed, ax, ay), sg = softGround(G, seed), bk = bankEdges(G, seed);
    const nb = bk.reduce((p, q) => p + q, 0), nw = sg.wade.reduce((p, q) => p + q, 0), ns = sg.scree.reduce((p, q) => p + q, 0);
    regions++; banks += nb; wade += nw; scree += ns; if (nw + ns) softRegions++; counts.add(nb);
    for (let i = 0; i < 2 * NC; i++) if (bk[i]) { const s = stepNear(seed, ax, ay, i); if (s) { steps++; if (s === 'south-face') south++; else side++; } }
  }
  console.log(`seed ${seed}: ${regions} regions; banks ${banks} (per region: ${[...counts].join('/')}); mud cells ${wade}, scree edges ${scree}, regions with soft ground ${softRegions}/${regions}; bank edges with a tile step within ${NEAR} of the border ${steps}/${banks} (south-facing ${south}, side ${side})`);
}
