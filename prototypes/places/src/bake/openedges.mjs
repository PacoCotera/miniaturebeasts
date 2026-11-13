// The open edges (walk content B5; art desk mibi-art abb33a65b, manifest.json "howLDtkPaints"): what the bake does with the cliff, the way up, the reed bank (a list of areas the reed sprites go in) and the low scrub.
// Pure over the level IR and the set's layer descriptors (setload.layerDescriptors: `tall`, `variants`, `wayup` are indices into the baked tile set's rows).
//   cliff   painted as the raised land, like any terrain. Each cliff tile is picked by its corners plus the two cells under its bottom corners: s = (SW is cliff and the cell below SW is not) * 2
//           + (SE is cliff and the cell below SE is not); s = 0 the ordinary sheet, s = 1..3 the ~s sheets (a list of face variants is picked by hash). A tile of four cliff corners with s > 0 takes
//           ~s<n> tile 15 in place of the fill; with s = 0 the fill is blanked, the cliff sheets being cut open (the ground under the raised tile, the level's `top`, shows).
//   walking: the top is ground; every cliff cell with a non-cliff 4-neighbour is the lip or the face and blocks, except the cells under a WayUp area.
//   wayup   an area over the cliff's last row on a straight face, n >= 1 cells wide, with straight face one cell either side: for the dual columns x0..x0+n the left, middle and right pieces,
//           row 1 for the face tile (corners 12) and row 0 for the tile above it (corners 15, s = 3); the piece is the one for the terrain below the face (grass or sand).
//   reeds   a ReedBank area holds reed sprites (props with no footprint, nothing blocks) laid by the desk's scatter rule: build.mjs `reedProps`, exploration/src/gen7/reeds.mjs.
//   scrub   variants share every edge line; one per dual tile by hash.
import { EMPTY, FILL_CODE, hash32, splitCode } from '../dualgrid.mjs';
import { sideRuns, sideTiles, southDecals, southRuns, southTiles } from './southruns.mjs';

export const ALT_CODE = 1024;   // a tile code from ALT_CODE up to FILL_CODE is ALT_CODE + 16 * (index of a row of the baked tile set) + the tile in it

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

// Rewrites the tile codes of dg's layers in place (dg: dualgrid.terrainLayers' output). ir: the level; terrains: terrain.json's list;
// layers: Map(terrain value -> descriptor) of setload.layerDescriptors, whose kinds carry `rows` (indices into the baked tile set's rows: over, tall { s: [rows] }, variants, wayup { lowerId: row }).
// `tone` is setload.layerDescriptors' tone ({ of, row, rowRaised }): the raised ground's own tone row.
// A straight south run (southruns.mjs) has its face drawn as painted columns, so its old face and foot tiles are not placed: the raised ground runs to the lip row and the low ground under the foot shows.
// Every raised tile that is no old face keeps the cliff layer's fill, the raised meadow ground (fill-cliff.png), and takes the raised tone.
export function applyOpenEdges(dg, ir, terrains, layers, tone = null) {
  const { w, h } = ir, cliff = terrains.find((t) => t.id === 'cliff'), w1 = w + 1;
  const { isCliff } = cliffInfo(ir, terrains);
  const runs = cliff ? southRuns(ir, cliffInfo(ir, terrains)) : [], south = cliff ? southTiles(runs, w1) : { face: new Set(), foot: new Set() };
  const side = cliff ? sideTiles(sideRuns(ir, cliffInfo(ir, terrains), southDecals(runs)), w1) : new Set();   // the interior tiles of a straight side: its cells are painted decals, the old side strip is not placed
  const vh = (i, j) => (ir.origin ? hash32('', ir.origin.x + i, ir.origin.y + j) : hash32(ir.id, i, j));   // variants and looks by world position when the level has one, else by place id
  const pick = (list, i, j) => (list.length > 1 ? list[vh(i, j) % list.length] : list[0]);
  for (const layer of dg.layers) {
    if (layer.tone) continue;
    const d = layers.get(layer.terrain), withTall = d.kinds.find((k) => k.rows.tall);
    const tall = cliff && layer.terrain === cliff.value && withTall ? withTall.rows.tall : null;
    if (!tall && !d.kinds.some((k) => k.rows.variants)) continue;
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
      const c = layer.tiles[j * w1 + i]; if (c === EMPTY) continue;
      const fill = c >= FILL_CODE, s0 = fill ? null : splitCode(c), full = fill || s0.full !== undefined, corner = full ? 15 : s0.slot;
      if (tall) {
        if (south.foot.has(j * w1 + i)) { layer.tiles[j * w1 + i] = EMPTY; continue; }   // under a straight south face: its column covers the foot
        if (side.has(j * w1 + i)) { layer.tiles[j * w1 + i] = FILL_CODE; continue; }      // a straight side: the raised ground to the cell edge, the painted side cell over the low cell beside it
        if (fill && south.face.has(j * w1 + i)) continue;                               // the lip row of a straight south face: the raised ground, the column overhangs it
        // the cells under the tile's bottom corners: SW is cell (i - 1, j), SE is (i, j); the cell below is one row down
        const sw = isCliff(i - 1, j) && !isCliff(i - 1, j + 1) ? 2 : 0, se = isCliff(i, j) && !isCliff(i, j + 1) ? 1 : 0, s = (corner & 2 ? sw : 0) + (corner & 1 ? se : 0);
        if (s > 0) { layer.tiles[j * w1 + i] = ALT_CODE + 16 * pick(tall[s], i, j) + corner; continue; }
        if (fill) continue;   // a raised tile that is no face keeps the cliff's fill: the raised meadow ground
      }
      if (full) continue;
      const rows = d.kinds[s0.kind].rows;
      if (rows.variants && corner > 0 && corner < 15) {
        const n = vh(i, j) % (rows.variants.length + 1);
        if (n > 0) layer.tiles[j * w1 + i] = ALT_CODE + 16 * rows.variants[n - 1] + corner;
      }
    }
  }
  // the tone on the raised ground: a tone tile whose four cells are all cliff takes the raised tone sheet (the sunlit patch lifted as the ground is), the rest keep the grass tone
  const toneLayer = dg.layers.find((l) => l.tone);
  if (cliff && toneLayer && tone && tone.rowRaised !== undefined) {
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
      const c = toneLayer.tiles[j * w1 + i];
      if (c !== EMPTY && c < ALT_CODE && isCliff(i - 1, j - 1) && isCliff(i, j - 1) && isCliff(i - 1, j) && isCliff(i, j)) toneLayer.tiles[j * w1 + i] = ALT_CODE + 16 * tone.rowRaised + c;
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
