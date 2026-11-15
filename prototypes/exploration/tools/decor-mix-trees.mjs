// decor-mix-1: the trees of one cell in two checkouts: node decor-mix-trees.mjs <treeBefore> <treeAfter> <seed> <X> <Y>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [A, B, seedArg, Xa, Ya] = process.argv.slice(2), seed = +seedArg, X = +Xa, Y = +Ya;
for (const t of [A, B]) {
  const pl = await import(pathToFileURL(path.join(path.resolve(t), 'prototypes/exploration/src/gen7/place.mjs')).href), D = pl.decorOf(seed), { CW, CH } = pl, x0 = X * CW, y0 = Y * CH;
  console.log(t, JSON.stringify(D.propsIn(x0, y0, x0 + CW - 1, y0 + CH - 1).filter(p => p.fam === 'trees').map(p => [p.x, p.y, p.kind])));
}
