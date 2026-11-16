// place-walk-1: the live terrain round a world tile: node place-walk-live.mjs <seed> <gx> <gy> [r]   ('#' raised, '.' ground, 'T' thicket, '~' water, 'X' the tile, 'g' grass the gap cut would make is not told apart: compare with place-walk-shape.mjs)
import { worldTiles, TV } from '../src/gen7/place.mjs';
const [seed, gx, gy, rr] = process.argv.slice(2), R = +(rr || 8), T = worldTiles(+seed);
for (let y = +gy - R; y <= +gy + R; y++) { let s = ''; for (let x = +gx - R; x <= +gx + R; x++) { const v = T(x, y); s += x === +gx && y === +gy ? 'X' : v === TV.CLIFF ? '#' : v === TV.THICKET ? 'T' : v === TV.WATER || v === TV.DEEP ? '~' : '.'; } console.log(String(y).padStart(5) + ' ' + s); }
