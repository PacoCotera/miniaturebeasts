// decor-mix-2: onWall props and shrubs in named cells: node decor-mix-onwall-cells.mjs <seed> X,Y [X,Y ...]
import { decorOf, CW, CH } from '../src/gen7/place.mjs';
const seed = +process.argv[2], D = decorOf(seed), out = [];
for (const a of process.argv.slice(3)) {
  const [X, Y] = a.split(',').map(Number), x0 = X * CW, y0 = Y * CH, ps = D.propsIn(x0, y0, x0 + CW - 1, y0 + CH - 1).filter(p => p.fam !== 'sweeps' && p.fam !== 'landmark');
  out.push({ X, Y, props: ps.length, shrubs: ps.filter(p => p.fam === 'shrubs').length, onWall: ps.filter(p => D.flags(p.x, p.y) & 1).map(p => [p.fam, p.kind, p.x, p.y]) });
}
console.log(JSON.stringify(out));
