// Generator 7 for the page: the region as the page's world, and a cell as the page's layout. The page imports this one module (the test harness binds a page's `./src/<name>.mjs` imports).
//   genWorld7(seed, slot)        the region of slot [ax, ay] of the realm of `seed` (src/gen7/region.mjs), the page's G
//   cellWorldXY(slot, cell)      the realm cell [X, Y] of a region cell
//   layout7(ctx, G, seed, slot, key)   the page's layout of a land cell: its IR, baked in the page, adapted. ctx: { ts, terrains, desc }
import { genRegion7, realm7 } from './gen7/region.mjs';
import { cellIR, raisedAt, CW, CH, COAST_REACH, overviewOf, hasOverview } from './gen7/place.mjs';
import { inlandOf } from './gen7/levels.mjs';
import { MW, MH } from './world.mjs';
import { bakeCell, reviveLayers } from './bake7.mjs';
export { reviveLayers };
import { adaptCell } from './adapt7.mjs';

export { realm7, CW, CH };   // CW x CH: the tiles of a cell (the overview's one byte each); the page's PW x PH is the place with its apron
// the region's overview (one byte a tile, place.mjs) when it has been made or fetched, else null: the maps then keep to the cell labels until it arrives
export const overviewReady = (seed, slot) => (hasOverview(seed, slot[0], slot[1]) ? overviewOf(seed, slot[0], slot[1]) : null);
export const genWorld7 = (seed, slot) => genRegion7(seed, slot[0], slot[1]);
export const cellWorldXY = (slot, cell) => [slot[0] * MW + (cell % MW), slot[1] * MH + ((cell / MW) | 0)];
// the IR of a cell and the baked place it makes
export function bakedCell(ctx, seed, slot, cell, v) {   // v: the realm's kind version (biomeVersion), which lists its creatures come from
  const [X, Y] = cellWorldXY(slot, cell), ir = cellIR(seed, X, Y, v);
  return { ir, place: bakeCell(ir, ctx) };
}
// baked: the cell's { ir, place } as the places worker made it (src/place-store.mjs); without it the cell is baked here. The sides that are shut are applied here, on the page, to the baked cell.
export function layout7(ctx, G, seed, slot, key, shut, v, baked = null) {   // shut(side): the side is past the Probe's range or closed, so its band is not walked (the page's crossReason)
  const cell = +key, { ir, place: stored } = baked || bakedCell(ctx, seed, slot, cell, v), place = { ...stored }, lay = adaptCell(place, ir, ctx.ts, ctx.terrains, { key, cell, land: G.land[cell], G, seed, shut });
  const [X, Y] = cellWorldXY(slot, cell);
  lay.coastWater = (x, y) => inlandOf(X * CW + x, Y * CH + y) < COAST_REACH;   // water within the coast band is the coast's: wide water, no way across
  lay.raisedFn =(x, y) => raisedAt(seed, X * CW + x, Y * CH + y);   // is this tile raised land (height lets you see further)
  return lay;
}
