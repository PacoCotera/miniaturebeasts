// The open edges (walk content B5; art desk mibi-art abb33a65b, manifest.json "howLDtkPaints"): what the bake does with the cliff, the way up, the reed bank and the low scrub.
// Pure over the level IR and the set's pair descriptors (setload.dualPairs: `tall`, `variants`, `wayup`, `looks` are indices into the baked tile set's pairs).
//   cliff   painted as the raised land, like any terrain. Each cliff tile is picked by its corners plus the two cells under its bottom corners: s = (SW is cliff and the cell below SW is not) * 2
//           + (SE is cliff and the cell below SE is not); s = 0 the ordinary sheet, s = 1..3 the ~s sheets. A tile of four cliff corners with s > 0 takes ~s<n> tile 15 (not a full variant).
//   walking: the top is ground; every cliff cell with a non-cliff 4-neighbour is the lip or the face and blocks, except the cells under a WayUp area.
//   wayup   an area over the cliff's last row on a straight face, n >= 1 cells wide, with straight face one cell either side: for the dual columns x0..x0+n the left, middle and right pieces,
//           row 1 for the face tile (corners 12) and row 0 for the tile above it (corners 15, s = 3).
//   reeds   an alternate look of the shore pairs inside a ReedBank area (three variants by hash); nothing blocks.
//   scrub   four variants share every edge line; one per dual tile by hash.
import { EMPTY, FULL_BASE, hash32 } from '../dualgrid.mjs';

export const ALT_CODE = 1024;   // a tile code >= ALT_CODE is ALT_CODE + 16 * (index of a pair of the baked tile set) + the tile in it

const idOf = (terrains, id) => terrains.find((t) => t.id === id).value;

// the cells of a level the cliff terrain holds, and the cells under a WayUp area
export function cliffInfo(ir, terrains) {
  const cliff = terrains.find((t) => t.id === 'cliff'); if (!cliff) return { isCliff: () => false, wayup: new Set(), lipCells: new Set() };
  const { w, h } = ir, V = cliff.value, at = (x, y) => ir.terrain[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))] === V;   // outside the place reads as the nearest edge cell
  const wayup = new Set(); for (const a of ir.wayups || []) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) wayup.add(y * w + x);
  const lipCells = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y) || ir.terrain[y * w + x] !== V) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < w && Y < h && ir.terrain[Y * w + X] !== V; });
    if (edge && !wayup.has(y * w + x)) lipCells.add(y * w + x);
  }
  return { isCliff: at, wayup, lipCells };
}

// A cell with the dense thicket all round it (the 3 x 3 block), or null: the donor of the closed looks (walk content B8), found in the level itself; terrains: terrain.json's list.
// `place` is a level IR or a baked place (both carry w, h and a terrain grid).
export function thicketDonor(place, terrains) {
  const thick = (terrains.find((t) => t.id === 'thicket') || {}).value, w = place.w, h = place.h;
  if (!thick) return null;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let all = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (place.terrain[(y + dy) * w + x + dx] !== thick) all = false;
    if (all) return { x, y };
  }
  return null;
}

// 1-row gullies: a column of cliff, one low row, cliff again (the face cannot be drawn there)
export function gullies(ir, terrains) {
  const { isCliff } = cliffInfo(ir, terrains), out = [];
  for (let y = 0; y + 2 < ir.h; y++) for (let x = 0; x < ir.w; x++) if (isCliff(x, y) && !isCliff(x, y + 1) && isCliff(x, y + 2)) out.push({ x, y: y + 1 });
  return out;
}

// Rewrites the tile codes of dg's layers in place. ir: the level; terrains: terrain.json's list; pairs: the set's pair descriptors in the set's order.
export function applyOpenEdges(dg, ir, terrains, pairs) {
  const { w, h } = ir, cliff = terrains.find((t) => t.id === 'cliff'), w1 = w + 1;
  const { isCliff, wayup } = cliffInfo(ir, terrains);
  const vh = (i, j) => (ir.origin ? hash32('', ir.origin.x + i, ir.origin.y + j) : hash32(ir.id, i, j));   // variants and looks by world position when the level has one, else by place id
  const inArea = (list, i, j) => (list || []).some((a) => i >= a.x && i <= a.x + a.w && j >= a.y && j <= a.y + a.h);
  for (const layer of dg.layers) {
    const p = pairs[layer.pair];
    const tall = cliff && p.upper === 'cliff' && p.tall, variants = p.variants, looks = p.looks && p.looks.reeds;
    if (!tall && !variants && !looks && !p.wayup) continue;
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
      const c = layer.tiles[j * w1 + i]; if (c === EMPTY) continue;
      const corner = c >= FULL_BASE ? 15 : c;
      if (tall) {
        // the cells under the tile's bottom corners: SW is cell (i - 1, j), SE is (i, j); the cell below is one row down
        const sw = isCliff(i - 1, j) && !isCliff(i - 1, j + 1) ? 2 : 0, se = isCliff(i, j) && !isCliff(i, j + 1) ? 1 : 0, s = (corner & 2 ? sw : 0) + (corner & 1 ? se : 0);
        if (s > 0) { layer.tiles[j * w1 + i] = ALT_CODE + 16 * p.tall[s] + corner; continue; }
      }
      if (variants && corner > 0 && corner < 15 && c < FULL_BASE) {
        const n = vh(i, j) % (variants.length + 1);
        if (n > 0) layer.tiles[j * w1 + i] = ALT_CODE + 16 * variants[n - 1] + corner;
      }
      if (looks && corner > 0 && corner < 15 && c < FULL_BASE && inArea(ir.reedbanks, i, j)) layer.tiles[j * w1 + i] = ALT_CODE + 16 * looks[vh(i, j) % looks.length] + corner;
    }
    if (p.wayup != null && ir.wayups) {
      for (const a of ir.wayups) for (let c = 0; c <= a.w; c++) {
        const col = c === 0 ? 0 : c === a.w ? 2 : 1, i = a.x + c;
        layer.tiles[a.y * w1 + i] = ALT_CODE + 16 * p.wayup + col;           // the tile above the face (row 0)
        layer.tiles[(a.y + 1) * w1 + i] = ALT_CODE + 16 * p.wayup + 3 + col;  // the face (row 1)
      }
    }
  }
}
