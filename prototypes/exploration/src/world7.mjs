// Generator 7 for the page: the region as the page's world, and a cell as the page's layout. The page imports this one module (the test harness binds a page's `./src/<name>.mjs` imports).
//   genWorld7(seed, slot)        the region of slot [ax, ay] of the realm of `seed` (src/gen7/region.mjs), the page's G
//   cellWorldXY(slot, cell)      the realm cell [X, Y] of a region cell
//   layout7(ctx, G, seed, slot, key)   the page's layout of a land cell: its IR, baked in the page, adapted. ctx: { ts, terrains, pairs }
import { genRegion7, realm7 } from './gen7/region.mjs';
import { cellIR, raisedAt, CW, CH } from './gen7/place.mjs';
import { MW, MH } from './world.mjs';
import { bakeCell } from './bake7.mjs';
import { adaptCell } from './adapt7.mjs';

export { realm7 };
export const genWorld7 = (seed, slot) => genRegion7(seed, slot[0], slot[1]);
export const cellWorldXY = (slot, cell) => [slot[0] * MW + (cell % MW), slot[1] * MH + ((cell / MW) | 0)];
// the IR of a cell and the baked place it makes
export function bakedCell(ctx, seed, slot, cell) {
  const [X, Y] = cellWorldXY(slot, cell), ir = cellIR(seed, X, Y);
  return { ir, place: bakeCell(ir, ctx) };
}
export function layout7(ctx, G, seed, slot, key) {
  const cell = +key, { ir, place } = bakedCell(ctx, seed, slot, cell), lay = adaptCell(place, ir, ctx.ts, ctx.terrains, { key, cell, land: G.land[cell], G, seed });
  const [X, Y] = cellWorldXY(slot, cell);
  lay.raisedFn = (x, y) => raisedAt(seed, X * CW + x, Y * CH + y);   // is this tile raised land (height lets you see further)
  return lay;
}
