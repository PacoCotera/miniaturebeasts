// The open edges (walk content B5; art desk mibi-art abb33a65b, manifest.json "howLDtkPaints"): what the bake does with the cliff, the way up, the reed bank (a list of areas the reed sprites go in) and the low scrub.
// Pure over the level IR and the set's layer descriptors (setload.layerDescriptors: `tall`, `variants`, `wayup` are indices into the baked tile set's rows).
//   cliff   painted as the raised land, like any terrain, by case: the back rim from the rim sheet, the face, its corners and ends and the sides from signed pieces (the rule maps in art/places/rules, run by cliffrules.mjs; applyOpenEdges below).
//   walking: relief.mjs names every cell's part; the ring, the face and the flank cells block (cliffInfo.blockCells); the top, the foot rows and the cells of a WayUp area walk.
//   wayup   an area over the cliff's last row on a straight face, n >= 1 cells wide, with straight face one cell either side: for the dual columns x0..x0+n the left, middle and right pieces,
//           row 1 for the face tile (corners 12) and row 0 for the tile above it (corners 15, s = 3); the piece is the one for the terrain below the face (grass or sand).
//   reeds   a ReedBank area holds reed sprites (props with no footprint, nothing blocks) laid by the desk's scatter rule: build.mjs `reedProps`, exploration/src/gen7/reeds.mjs.
//   scrub   variants share every edge line; one per dual tile by hash.
import { EMPTY, FILL_CODE, hash32, splitCode } from '../dualgrid.mjs';
import { rimOf } from './cliffrules.mjs';
import { BLOCKS, PART, landOf, partAt } from './relief.mjs';

export const ALT_CODE = 1024;   // a tile code from ALT_CODE up to FILL_CODE is ALT_CODE + 16 * (index of a row of the baked tile set) + the tile in it

// the cells of a level the cliff terrain holds, the cells under a WayUp area, and the cells that block: relief.mjs's ring, face and flank cells (the lip, the cell under every south lip cell, the leaning sides and the end
// pieces' rock rows); the top, the foot rows and the way up walk
export function cliffInfo(ir, terrains) {
  const cliff = terrains.find((t) => t.id === 'cliff'); if (!cliff) return { isCliff: () => false, wayup: new Set(), blockCells: new Set(), ringCells: new Set() };
  const { w, h } = ir, V = cliff.value, at = (x, y) => ir.terrain[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))] === V;   // outside the place reads as the nearest edge cell
  const wayup = new Set(); for (const a of ir.wayups || []) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) wayup.add(y * w + x);
  const info = { isCliff: at, wayup, blockCells: new Set(), ringCells: new Set() }, A = landOf(ir, info);   // ringCells: the lip alone, which the level rules treat as a prop-sized obstacle
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = partAt(A, x, y); if (BLOCKS.has(p)) info.blockCells.add(y * w + x); if (p === PART.RING) info.ringCells.add(y * w + x); }
  return info;
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

// Rewrites the tile codes of dg's layers in place (dg: dualgrid.terrainLayers' output). ir: the level; terrains: terrain.json's list;
// layers: Map(terrain value -> descriptor) of setload.layerDescriptors, whose kinds carry `rows` (indices into the baked tile set's rows: over, tall { s: [rows] }, variants, wayup { lowerId: row }).
// `tone` is setload.layerDescriptors' tone ({ of, row, rowRaised }): the raised ground's own tone row.
// The cliff by "rim and face" (the rule maps, cliffrules.mjs): the south faces, the corner cells, the face ends and every side are painted pieces (decals), so the cliff layer draws only the raised ground and the back rim: a tile of a rim case
// (3, 1, 2, 7, 11) keeps the old rim sheet's tile (no face variants: the face is not drawn from it), a tile of four raised cells is the raised ground, a side tile (5, 10) is the raised ground to the cell edge (the side cell
// covers the low cell beside it), and every other edge tile (the south lip, the run ends, the inner corners) draws nothing: the pieces draw them.
// Every raised tile that is no old rim keeps the cliff layer's fill, the raised meadow ground (fill-cliff.png), and takes the raised tone.
export function applyOpenEdges(dg, ir, terrains, layers, tone = null) {
  const { w, h } = ir, cliff = terrains.find((t) => t.id === 'cliff'), w1 = w + 1;
  const cinfo = cliffInfo(ir, terrains), { isCliff } = cinfo, rim = cliff ? rimOf(ir, landOf(ir, cinfo), isCliff) : null;
  const vh = (i, j) => (ir.origin ? hash32('', ir.origin.x + i, ir.origin.y + j) : hash32(ir.id, i, j));   // variants and looks by world position when the level has one, else by place id
  for (const layer of dg.layers) {
    if (layer.tone) continue;
    const d = layers.get(layer.terrain), isCliffLayer = cliff && layer.terrain === cliff.value;
    if (!isCliffLayer && !d.kinds.some((k) => k.rows.variants)) continue;
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
      const c = layer.tiles[j * w1 + i]; if (c === EMPTY) continue;
      const fill = c >= FILL_CODE, s0 = fill ? null : splitCode(c), full = fill || s0.full !== undefined, corner = full ? 15 : s0.slot;
      if (isCliffLayer) {
        if (fill) continue;   // four raised cells: the raised meadow ground
        const r = rim[j * w1 + i];   // the rule map cliff-7-rim: the tile of a rim case (back rim, its corners) stays 0; a side keeps the fill (2) unless the fill pieces cover its cells; every other edge tile is drawn by the pieces (1)
        if (r === 1) { layer.tiles[j * w1 + i] = EMPTY; continue; }
        if (r === 2) { layer.tiles[j * w1 + i] = FILL_CODE; continue; }
      }
      if (full) continue;
      const rows = d.kinds[s0.kind].rows;
      if (rows.variants && corner > 0 && corner < 15) {
        const n = vh(i, j) % (rows.variants.length + 1);
        if (n > 0) layer.tiles[j * w1 + i] = ALT_CODE + 16 * rows.variants[n - 1] + corner;
      }
    }
  }
  // the raised top is plain raised fill: no tone patch on a tile whose four cells are all cliff, until a painted tone exists (map-cut-1b; the sheet stays in the set, nothing draws it)
  const toneLayer = dg.layers.find((l) => l.tone);
  if (cliff && toneLayer) {
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
      const c = toneLayer.tiles[j * w1 + i];
      if (c !== EMPTY && isCliff(i - 1, j - 1) && isCliff(i, j - 1) && isCliff(i - 1, j) && isCliff(i, j)) toneLayer.tiles[j * w1 + i] = EMPTY;
    }
  }
  // the way up: the kit's piece for the terrain below the face replaces the cliff's own tiles on the tile above the face (row 0) and on the face (row 1)
  if (cliff && ir.wayups && ir.wayups.length) {
    const layer = dg.layers.find((l) => l.terrain === cliff.value), d = layer && layers.get(cliff.value), withUp = d && d.kinds.find((k) => k.rows.wayup);
    if (withUp) {
      const idOfValue = new Map(terrains.map((t) => [t.value, t.id]));
      for (const a of ir.wayups) for (let c = 0; c <= a.w; c++) {
        const col = c === 0 ? 0 : c === a.w ? 2 : 1, i = a.x + c;
        const below = ir.terrain[Math.min(h - 1, a.y + 1) * w + Math.max(0, Math.min(w - 1, Math.max(a.x, Math.min(i, a.x + a.w - 1))))];   // the cell under the face, in the area's columns
        const row = withUp.rows.wayup[idOfValue.get(below)] ?? withUp.rows.wayup.grass;
        layer.tiles[a.y * w1 + i] = ALT_CODE + 16 * row + col;           // the tile above the face (row 0)
        layer.tiles[(a.y + 1) * w1 + i] = ALT_CODE + 16 * row + 3 + col;  // the face (row 1)
      }
    }
  }
}
