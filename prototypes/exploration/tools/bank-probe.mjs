// rupar-banks-7-1: what the window of the cell holding a world tile does with the raised part there, banks off and on.
//   node bank-probe.mjs <seed> <gx> <gy>
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowInfo, setLandRule, bankWayups, CW, CH } from '../src/gen7/levels.mjs';

const [seed, gx, gy] = process.argv.slice(2).map(Number), X = Math.floor(gx / CW), Y = Math.floor(gy / CH);
const R = realm7(seed);
for (const banks of [0, 1]) {
  setLandRule({ banks }); const L = levelsOf(R.realm);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const i = windowInfo(L, X + dx, Y + dy);
    const raisedPk = (i.pk || []).filter(s => /R\[/.test(s));
    if (!(i.pocketStairs.length || raisedPk.length || (i.deferred || []).length || i.sites.some(s => s.bank)) ) continue;
    console.log(`banks ${banks} cell ${X + dx},${Y + dy}: pocketStairs ${JSON.stringify(i.pocketStairs)} raisedPockets ${raisedPk.join(' ')} deferred ${JSON.stringify(i.deferred || [])} bankSites ${JSON.stringify(i.sites.filter(s => s.bank))}`);
  }
  console.log(`banks ${banks} bankWayups`, JSON.stringify(bankWayups(L, X, Y)));
}
