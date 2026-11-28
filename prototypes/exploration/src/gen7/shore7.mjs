// Water is not a box (owner #141: "water bodies are not squared neither align perfectly with our places borders"; rule 47a): the shore of a wide-water cell is a line that wanders across the seam.
// One pure function of the world tile, the realm's wide-water cells and the seed, so the place, its neighbour, the held view, the peek and the map all lay the same line: water reaches into the land
// cells in bays, land reaches into the water cell in points. No page state; the caller says which cells are wide water (a map cell of water that is no ford).
//
// The line: along every seam (the line between a wide-water cell and a land cell) the shore stands an integer number of tiles off the seam, o(along) in -SHORE_A..SHORE_A (positive: the water reaches into the land).
// o is laid in stretches of exactly 3 tiles (the ground passes keep nothing narrower: no bay, notch or strip under 3 wide) and differs from the stretch before it by 1 to 3, so no bank runs straight for more than 3 tiles by construction. Round a corner the line follows the tile's distance
// to the wide cell, so the corners are round and never square.
import { hash } from '../logic/world.mjs';
import { CW, CH, RW, RH } from './world.mjs';

export const SHORE_A = 8;          // tiles the line may stand off the cell seam, each way
export const SHORE_SAND = 3;       // the widest strip of sand beside the water, in tiles (2 or 3 by the seed's noise)
export const SHORE_SHALLOW = 5;    // tiles of shallows along the line: the place, the peek and the map all lay this width (once, here)
export const SHORE_BEACH = 3;      // tiles of beach on the land side of the line

const mix = (a, b, s) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + s, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
const SALT = new Map();
const saltOf = seed => { let s = SALT.get(seed); if (s === undefined) { if (SALT.size > 8) SALT.clear(); s = hash(seed, 'shore7') | 0; SALT.set(seed, s); TABLES.delete(s); } return s; };
const TABLES = new Map();   // salt -> Map(axis * 100000 + line -> Int8Array of the offsets along the seam)

// the offsets along one seam line: `n` tiles, stretches of 3, each a step of 1 to 3 from the one before (reflected inside the range)
function table(salt, axis, line, n) {
  let by = TABLES.get(salt); if (!by) { if (TABLES.size > 8) TABLES.clear(); TABLES.set(salt, by = new Map()); }
  const key = axis * 100000 + line; let tb = by.get(key); if (tb) return tb;
  tb = new Int8Array(n); const s = salt + axis * 7919 + line * 104729;
  let o = Math.floor(mix(1, 2, s) * (2 * SHORE_A + 1)) - SHORE_A;
  for (let pos = 0, k = 0; pos < n; k++) {
    const len = 3, r = mix(k, 13, s), mag = r < 0.5 ? 1 : r < 0.85 ? 2 : 3, sg = mix(k, 17, s) < Math.max(0.1, Math.min(0.9, 0.5 + o * 0.045)) ? -1 : 1;   // a step back toward the seam is likelier the further off it stands, so the line wanders about the seam and never hugs one bound
    let o2 = o + sg * mag; if (o2 > SHORE_A || o2 < -SHORE_A) o2 = o - sg * mag;
    o = o2;
    for (let j = 0; j < len && pos < n; j++) tb[pos++] = o;
  }
  by.set(key, tb); return tb;
}
const WTW = RW * CW, WTH = RH * CH;

// The shore's signed value at a tile: positive is sea, zero and below is land; its size is the distance to the line, in tiles. `cells` = { wide(cx, cy), water(cx, cy) } over the map's cells (the caller clamps cells
// beyond the map): wide is a water cell that is no ford, water is any water cell. null where the line cannot reach (the tile is a ford's, or more than SHORE_A + 1 from the seam on land), Infinity deep inside the water.
// In a wide cell the sea is what every land cell beside it leaves: its own seam's line holds the water back, each by its own wandering, so two seams make a corner of two staircases and never a square one.
// On land the sea is what any wide cell beside it reaches in with: the bays of every seam.
export function shoreValue(seed, cells, gx, gy) {
  const { wide, water } = cells, cx = Math.floor(gx / CW), cy = Math.floor(gy / CH), px = gx + 0.5, py = gy + 0.5, salt = saltOf(seed);
  const isWide = wide(cx, cy);
  if (!isWide && water(cx, cy)) return null;   // a ford cell keeps its shallows
  let v = isWide ? Infinity : -Infinity, any = false;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    if (!i && !j) continue;
    const nx = cx + i, ny = cy + j;
    if (isWide ? water(nx, ny) : !wide(nx, ny)) continue;   // a wide cell is held back by land cells only; land is reached by wide cells only
    const x0 = nx * CW, y0 = ny * CH, dx = Math.max(x0 - px, 0, px - (x0 + CW)), dy = Math.max(y0 - py, 0, py - (y0 + CH)), d = Math.hypot(dx, dy);
    if (d >= SHORE_A + 1) { if (isWide) { /* beyond the line's reach: this seam holds nothing back */ } continue; }
    const vertical = dx >= dy, line = vertical ? (px < x0 ? x0 : x0 + CW) : (py < y0 ? y0 : y0 + CH), n = vertical ? WTH : WTW, a = Math.max(0, Math.min(n - 1, vertical ? gy : gx));
    const o = table(salt, vertical ? 0 : 1, line, n)[a];
    any = true;
    if (isWide) { const u = d + o; if (u < v) v = u; } else { const u = o - d; if (u > v) v = u; }
  }
  if (isWide) return any ? v : Infinity;
  return any ? v : null;
}
export const isSea = (seed, cells, gx, gy) => { const v = shoreValue(seed, cells, gx, gy); return v !== null && v > 0; };
// the sand strip's width at a tile (2 or 3), in runs of a few tiles
export const sandWidth = (seed, gx, gy) => (mix(Math.floor(gx / 3), Math.floor(gy / 3), saltOf(seed) + 307) < 0.5 ? SHORE_SAND : 2);
