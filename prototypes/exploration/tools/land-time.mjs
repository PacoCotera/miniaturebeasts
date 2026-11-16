// Time per cell of the land rule in Node, cold: the field of a cell (qCell), then the window's passes (windowLevels), and a whole place (a 2 x 2 cell window: the cells the place maker reads).
//   node land-time.mjs [seed] [--window 2]
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, qCell, windowLevels, levelCell, setLandRule, CW, CH } from '../src/gen7/levels.mjs';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const seed = Number(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 7);
setLandRule({ window: Number(arg('window', 2)) });
const realm = realm7(seed).realm;   // the realm itself is made first: not part of the land rule's time
const L = levelsOf(realm), X = 40, Y = 40, now = () => Number(process.hrtime.bigint() / 1000n) / 1000;
let t = now(); for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) qCell(L, X + i, Y + j); const tq = now() - t;
t = now(); windowLevels(L, X, Y); const tw = now() - t;
t = now(); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) levelCell(L, X + 4 + i, Y + 4 + j); const t16 = now() - t;
console.log(JSON.stringify({ seed, window: L.rule.window, fields25cellsMs: +tq.toFixed(0), onePassWindowMs: +tw.toFixed(0), sixteenNewCellsMs: +t16.toFixed(0), perCellMs: +(t16 / 16).toFixed(0), tilesPerCellField: CW * CH }));
