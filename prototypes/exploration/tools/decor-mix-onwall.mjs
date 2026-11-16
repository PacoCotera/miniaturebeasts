// decor-mix-2: props standing on a wall tile (flags & 1), the cause: node decor-mix-onwall.mjs <seed> <stride> [maxCells]
import { decorOf, cellTerrain, biomeAtTile, CW, CH, RW, RH } from '../src/gen7/place.mjs';

const seed = +process.argv[2], stride = +(process.argv[3] || 5), D = decorOf(seed), t0 = Date.now();
const by = {}, shown = [];
let cells = 0, props = 0, bad = 0;
for (let n = +(process.argv[4] || 0); n < RW * RH; n += stride) {
  const X = n % RW, Y = Math.floor(n / RW), x0 = X * CW, y0 = Y * CH; cells++;
  for (const p of D.propsIn(x0, y0, x0 + CW - 1, y0 + CH - 1)) {
    if (p.fam === 'sweeps' || p.fam === 'landmark') continue; props++;
    const f = D.flags(p.x, p.y); if (!(f & 1)) continue; bad++;
    const k = p.fam + ':' + p.kind + ' lip=' + (D.isLip(p.x, p.y) ? 1 : 0); by[k] = (by[k] || 0) + 1;
    if (shown.length < 10) shown.push({ X, Y, x: p.x, y: p.y, fam: p.fam, kind: p.kind, cluster: p.cluster, flags: f, lip: D.isLip(p.x, p.y), foot: p.foot, biome: biomeAtTile(seed, p.x, p.y) });
  }
}
console.log(JSON.stringify({ seed, stride, cells, props, onWall: bad, by, shown, ms: Date.now() - t0 }));
