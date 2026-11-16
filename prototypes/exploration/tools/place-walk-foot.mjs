// place-walk-2: why a decal stands on a foot cell: node place-walk-foot.mjs <treeRoot> <seed> <wx> <wy>
import { pathToFileURL } from 'node:url';
const [root, seed, wx, wy] = process.argv.slice(2), M = n => import(pathToFileURL(root + '/prototypes/' + n).href);
const { decorOf, worldTiles, stairsInfo, TV } = await M('exploration/src/gen7/place.mjs'), { PART, partAt } = await M('places/src/bake/relief.mjs');
const T = worldTiles(+seed), x = +wx, y = +wy, D = decorOf(+seed);
const wayCell = new Set(); for (const st of stairsInfo(+seed)) if (st.wayup) { const a = st.wayup; for (let yy = a.y; yy < a.y + a.h; yy++) for (let xx = a.x; xx < a.x + a.w; xx++) wayCell.add(yy * 8192 + xx); }
const A = { raised: (a, b) => T(a, b) === TV.CLIFF, low: (a, b) => T(a, b) !== TV.CLIFF, way: (a, b) => wayCell.has(b * 8192 + a), memo: new Map() };
console.log('test part', partAt(A, x, y), 'tile', T(x, y), 'wayup cells near', [...wayCell].filter(k => Math.abs((k % 8192) - x) < 6 && Math.abs(((k / 8192) | 0) - y) < 6).length);
console.log('decals', JSON.stringify(D.decalsIn(x - 1, y - 1, x + 1, y + 1)));
for (let yy = y - 4; yy <= y + 1; yy++) { let s = ''; for (let xx = x - 6; xx <= x + 6; xx++) s += partAt(A, xx, yy) + (T(xx, yy) === TV.CLIFF ? '#' : T(xx, yy) === TV.SCREE ? 'r' : '.') + ' '; console.log(s); }
console.log('PART', JSON.stringify(PART));
