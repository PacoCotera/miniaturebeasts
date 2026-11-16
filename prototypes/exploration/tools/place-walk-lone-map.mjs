// place-walk-3: the ground round a lone tile, with the gap marks: node place-walk-lone-map.mjs <seed> X Y tx ty   (the loneAt entry: cell X,Y, tile tx,ty in the cell)
// T thicket, G a gap tile (cut marks), # cliff, ~ water, . grass, o other ground; X the lone tile.
const { windowGaps, TV, CW, CH } = await import('../src/gen7/place.mjs');
const [seed, X, Y, tx, ty] = process.argv.slice(2).map(Number);
const win = windowGaps(seed, X, Y), { t, W, H, gaps, gx0, gy0 } = win;
const wx = X * CW + tx, wy = Y * CH + ty;
console.log(`seed ${seed} cell ${X},${Y} tile ${tx},${ty} world ${wx},${wy}`);
for (let yy = wy - 8; yy <= wy + 8; yy++) { let s = '';
  for (let xx = wx - 14; xx <= wx + 14; xx++) { const lx = xx - gx0, ly = yy - gy0; if (lx < 0 || ly < 0 || lx >= W || ly >= H) { s += ' '; continue; }
    const v = t[ly * W + lx], g = gaps[ly * W + lx] === 1;
    s += xx === wx && yy === wy ? 'X' : g ? (v === TV.GRASS ? 'G' : 'g') : v === TV.THICKET ? 'T' : v === TV.CLIFF ? '#' : v === TV.WATER || v === TV.DEEP ? '~' : v === TV.GRASS ? '.' : 'o'; }
  console.log(s); }
