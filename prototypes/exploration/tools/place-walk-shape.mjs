// place-walk-1: the raised/low raster round a tile, from a stitched seed: node place-walk-shape.mjs <seed> <cacheDir> <gx> <gy> [r]   (world tile; '#' raised, '.' low, 'T' thicket, '~' water, 'X' the tile)
import { readFileSync } from 'node:fs';
import { TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
const [seed, dir, gx, gy, rr] = process.argv.slice(2), WW = RW * CW, WH = RH * CH, T = new Uint8Array(readFileSync(`${dir}/stitch-${seed}.bin`)), R = +(rr || 8);
for (let y = +gy - R; y <= +gy + R; y++) { let s = ''; for (let x = +gx - R; x <= +gx + R; x++) { const v = x < 0 || y < 0 || x >= WW || y >= WH ? TV.THICKET : T[y * WW + x]; s += x === +gx && y === +gy ? 'X' : v === TV.CLIFF ? '#' : v === TV.THICKET ? 'T' : v === TV.WATER || v === TV.DEEP ? '~' : '.'; } console.log(String(y).padStart(5) + ' ' + s); }
