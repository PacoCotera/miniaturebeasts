// land-reach-1: the stitched realm round a world tile, as text (# raised, . low, ~ water, T thicket, = way up, - deep, p path):  node land-reach-peek.mjs <seed> <cacheDir> <gx> <gy> [half]
import { readFileSync } from 'node:fs';
import { TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
const [seed, dir, gx, gy, hf] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +(process.argv[6] || 12)];
const WW = RW * CW, WH = RH * CH, T = new Uint8Array(readFileSync(`${dir}/stitch-${seed}.bin`)), wu = JSON.parse(readFileSync(`${dir}/wayups-${seed}.json`, 'utf8'));
const isWay = (x, y) => wu.some(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
for (let y = gy - hf; y <= gy + hf; y++) { let s = String(y).padStart(5) + ' ';
  for (let x = gx - 2 * hf; x <= gx + 2 * hf; x++) { if (x < 0 || y < 0 || x >= WW || y >= WH) { s += ' '; continue; } const v = T[y * WW + x];
    s += isWay(x, y) ? '=' : v === TV.CLIFF ? '#' : v === TV.WATER ? '~' : v === TV.DEEP ? '-' : v === TV.THICKET ? 'T' : v === TV.PATH ? 'p' : (x === gx && y === gy ? 'o' : '.'); }
  console.log(s); }
console.log(`x from ${gx - 2 * hf}`);
