// decor-mix-1: the cells of a seed where the trees differ most between two checkouts: node decor-mix-diff.mjs <treeBefore> <treeAfter> <seed> <cells to scan>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [A, B, seedArg, nArg] = process.argv.slice(2), seed = +seedArg, N = +(nArg || 400);
const load = async t => import(pathToFileURL(path.join(path.resolve(t), 'prototypes/exploration/src/gen7/place.mjs')).href);
const pa = await load(A), pb = await load(B), Da = pa.decorOf(seed), Db = pb.decorOf(seed), { CW, CH, RW, RH } = pa;
const rows = [];
for (let n = 0; n < N; n++) {
  const X = 4 + ((n * 37) % (RW - 8)), Y = 4 + ((n * 53 + (n >> 3)) % (RH - 8)), x0 = X * CW, y0 = Y * CH;
  const ta = Da.propsIn(x0, y0, x0 + CW - 1, y0 + CH - 1).filter(p => p.fam === 'trees').length, tb = Db.propsIn(x0, y0, x0 + CW - 1, y0 + CH - 1).filter(p => p.fam === 'trees').length;
  if (ta !== tb) rows.push({ X, Y, before: ta, after: tb, biome: pa.biomeAtTile(seed, x0 + CW / 2, y0 + CH / 2), wx: x0 + (CW >> 1), wy: y0 + (CH >> 1) });
}
rows.sort((p, q) => Math.abs(q.after - q.before) - Math.abs(p.after - p.before));
console.log(JSON.stringify(rows.slice(0, 8)));
