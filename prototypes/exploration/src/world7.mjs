// Generator 7 for the page: the region as the page's world, and a cell as the page's layout. The page imports this one module (the test harness binds a page's `./src/<name>.mjs` imports).
//   genWorld7(seed, slot)        the region of slot [ax, ay] of the realm of `seed` (src/gen7/region.mjs), the page's G
//   cellWorldXY(slot, cell)      the realm cell [X, Y] of a region cell
//   layout7(ctx, G, seed, slot, key)   the page's layout of a land cell: its IR, baked in the page, adapted. ctx: { ts, terrains, desc }
import { genRegion7, realm7, REALM_REV } from './gen7/region.mjs';
import { WINDOW_STAGES, BAKE_STAGES } from './waitpips.mjs';
import { cellIR, raisedAt, CW, CH, COAST_REACH, sectorOf } from './gen7/place.mjs';
import { inlandOf } from './gen7/levels.mjs';
import { MW, MH } from './world.mjs';
import { bakeCell, reviveLayers } from './bake7.mjs';
export { reviveLayers };
import { adaptCell } from './adapt7.mjs';

export { realm7, CW, CH, REALM_REV };
// The wild Loika's haunts and routines (walk W2): an overlay read from a mounted place, never part of the land (src/gen7/haunts.mjs)
export { sitesOf as hauntSites, spotsFor as hauntSpots, hauntsOn, doingsOf, haunt as hauntAt, standAt as hauntStand, nameOf as loikaName, isWary, routineOf } from './gen7/haunts.mjs';   // CW x CH: the tiles of a cell; the page's PW x PH is the place with its apron
// The sector of a region (place.mjs sectorOf, every place of it, made from the realm alone: no place is built): per cell 4 x 4 blocks of ground class and level bit, and the realm's lines, marks,
// destinations and stairs by cell. Plain data, so the places worker can make it and send it. { cls, lv: Uint8Array(NC * 16), lines: [{ c, k, pts }], marks: [{ c, k, x, y, ax }], dest: [{ c, kind }], ramps: [{ c, dir, x, y, hiA }] };
// positions are in tiles from the region's own corner (the page's cell 0), not the realm's.
// cells (optional: the page's cell numbers): only those places are made, the ones in view first; `have` is 1 for each cell made, so the page paints only cells it holds (a sector with every cell has have === undefined)
export function sectorOfRegion(seed, slot, cells) {
  const NCELLS = MW * MH, cls = new Uint8Array(NCELLS * 16), lv = new Uint8Array(NCELLS * 16), lines = [], marks = [], dest = [], ramps = [], ox = slot[0] * MW * CW, oy = slot[1] * MH * CH, have = cells ? new Uint8Array(NCELLS) : null;
  for (let c = 0; c < NCELLS; c++) {
    if (have) { if (!cells.includes(c)) continue; have[c] = 1; }
    const [X, Y] = cellWorldXY(slot, c), s = sectorOf(seed, X, Y); cls.set(s.cls, c * 16); lv.set(s.lv, c * 16);
    for (const l of s.lines) lines.push({ c, k: l.k, pts: l.pts.map((v, i) => v - (i & 1 ? oy : ox)) });
    for (const m of s.marks) marks.push({ c, ...m, x: m.x - ox, y: m.y - oy });
    for (const d of s.dest) dest.push({ c, ...d });
    for (const r of s.ramps) ramps.push({ c, ...r, x: r.x - ox, y: r.y - oy });
  }
  return have ? { cls, lv, lines, marks, dest, ramps, have } : { cls, lv, lines, marks, dest, ramps };
}
const SECTORS = new Map();   // made here or sent by the worker, by seed and slot (the newest few)
const secKey = (seed, slot) => seed + ':' + slot[0] + ',' + slot[1];
export const presetSector = (seed, slot, sec) => { if (SECTORS.size > 6) SECTORS.clear(); SECTORS.set(secKey(seed, slot), sec); };
export const hasSector = (seed, slot) => { const s = SECTORS.get(secKey(seed, slot)); return !!s && !s.have; };   // the whole region's (a partial one, with `have`, is not it)
// the region's sector when it is here, else null (the maps then keep to the cell labels until it arrives)
export const sectorReady = (seed, slot) => SECTORS.get(secKey(seed, slot)) || null;
// made on the spot: a page without a Worker (a test's sandbox) makes it here
export const sectorNow = (seed, slot) => { let s = SECTORS.get(secKey(seed, slot)); if (!s || s.have) { s = sectorOfRegion(seed, slot); presetSector(seed, slot, s); } return s; };
export const genWorld7 = (seed, slot) => genRegion7(seed, slot[0], slot[1]);
export const cellWorldXY = (slot, cell) => [slot[0] * MW + (cell % MW), slot[1] * MH + ((cell / MW) | 0)];
// the IR of a cell and the baked place it makes
// stage(n): told as stage n of BAKE_STAGES (src/waitpips.mjs) of the place finishes: the terrain window's own stages 1..WINDOW_STAGES (the worker counts them, place.mjs F6_STAGE), then its IR (decor, holds), then its bake.
// The wait's pips count them (#104).
export function bakedCell(ctx, seed, slot, cell, v, stage = null) {   // v: the realm's kind version (biomeVersion), which lists its creatures come from
  const [X, Y] = cellWorldXY(slot, cell), ir = cellIR(seed, X, Y, v); if (stage) stage(WINDOW_STAGES + 1);
  const place = bakeCell(ir, ctx); if (stage) stage(BAKE_STAGES);
  return { ir, place };
}
// baked: the cell's { ir, place } as the places worker made it (src/place-store.mjs); without it the cell is baked here. The sides that are shut are applied here, on the page, to the baked cell.
export function layout7(ctx, G, seed, slot, key, shut, v, baked = null) {   // shut(side): the side is past the Probe's range or closed, so its band is not walked (the page's crossReason)
  const cell = +key, { ir, place: stored } = baked || bakedCell(ctx, seed, slot, cell, v), place = { ...stored }, lay = adaptCell(place, ir, ctx.ts, ctx.terrains, { key, cell, land: G.land[cell], G, seed, shut });
  const [X, Y] = cellWorldXY(slot, cell);
  lay.coastWater = (x, y) => inlandOf(X * CW + x, Y * CH + y) < COAST_REACH;   // water within the coast band is the coast's: wide water, no way across
  lay.raisedFn =(x, y) => raisedAt(seed, X * CW + x, Y * CH + y);   // is this tile raised land (height lets you see further)
  // is a cliff drawn on this tile (cliff terrain, or a cliff piece box over it)? A level change at a border with none drawn is a slope and walks (design 2026-11-18, cliff-rules 4;
  // bugs #45 #67: nothing the player cannot see may stop a step). Used on both sides of a border (index.html tileSide, crossLanding).
  const cliffV = (ctx.terrains.find(t => t.id === 'cliff') || {}).value, pl = lay.baked.place, PW = pl.w, PH = pl.h;
  const cliffBoxes = pl.decals.map(d => { const s = ctx.ts.sprites[d.kind]; return /^cliff-|^way-up|^lip|^stair/.test(s.kind) ? [d.x - s.anchor48[0], d.y - s.anchor48[1], s.w48, s.h48] : null; }).filter(Boolean);
  lay.cliffShown = (x, y) => {
    const qx = x + 1, qy = y + 1; if (qx < 0 || qy < 0 || qx >= PW || qy >= PH) return false;
    if (pl.terrain[qy * PW + qx] === cliffV) return true;
    const px = qx * 48 + 24, py = qy * 48 + 24; return cliffBoxes.some(([l, t, w, h]) => px >= l && px < l + w && py >= t && py < t + h);
  };
  return lay;
}
