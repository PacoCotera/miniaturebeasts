// The bake steps a browser can load, shared by the two bakes: buildPlace (a hand-set place, build.mjs, with the LDtk reader) and the Companion's bakeCell
// (exploration/src/gen7/bake7.mjs, a generated cell). No LDtk reader and no node: import here.
import { EMPTY, FILL_CODE, splitCode } from '../dualgrid.mjs';
import { ALT_CODE } from './openedges.mjs';

export const FIND_KINDS = ['pod', 'fruit', 'dew', 'stone', 'material'];   // the order the format's `kinds` index

export function spriteFor(tileset, group, kind) {
  const i = tileset.sprites.findIndex((s) => s.group === group && s.kind === kind);
  return i < 0 ? null : { index: i, sprite: tileset.sprites[i] };
}

// Cells blocked by prop footprints: Map of y * w + x to the prop. footprint is flat dx, dy pairs.
export function footprintCells(ir, tileset) {
  const cells = new Map();
  for (const p of ir.props) {
    const s = spriteFor(tileset, 'prop', p.kind);
    if (!s) continue;
    const fp = s.sprite.footprint;
    for (let i = 0; i + 1 < fp.length; i += 2) {
      const x = p.cx + fp[i], y = p.cy + fp[i + 1];
      if (x >= 0 && y >= 0 && x < ir.w && y < ir.h) cells.set(y * ir.w + x, p);
    }
  }
  return cells;
}

// dg: terrainLayers' output after applyOpenEdges; tileset: the baked tile set; desc: the layer descriptors' { layers, tone }. Returns [{ tiles: Uint16Array of tile ids }] in draw order (0xFFFF draws nothing).
export function layersToTileIds(dg, tileset, desc) {
  return dg.layers.map((l) => {
    const d = l.tone ? null : desc.layers.get(l.terrain);
    return {
      tiles: Uint16Array.from(l.tiles, (c) => {
        if (c === EMPTY) return 0xFFFF;
        if (l.tone) return c >= ALT_CODE ? tileset.pairs[(c - ALT_CODE) >> 4].tiles[(c - ALT_CODE) & 15] : tileset.pairs[desc.tone.row].tiles[c];   // the tone layer: the code is the corner mask (the raised tone is its own row)
        if (c >= FILL_CODE) return tileset.pairs[d.fillRow].fullVariants[c - FILL_CODE];             // the terrain's fill
        if (c >= ALT_CODE) return tileset.pairs[(c - ALT_CODE) >> 4].tiles[(c - ALT_CODE) & 15];   // the cliff's tall tiles, the way up or a variant
        const s = splitCode(c), row = tileset.pairs[d.kinds[s.kind].rows.over];
        return s.full !== undefined ? row.fullVariants[s.full] : row.tiles[s.slot];
      }),
    };
  });
}
