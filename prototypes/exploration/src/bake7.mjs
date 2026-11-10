// Generator 7: a cell's IR to the baked place, in the page. The same steps as places/src/bake/build.mjs buildPlace (dual grid, open edges, ground patches, the block mask, the records), without
// that module's imports of the LDtk reader (Ajv, node:fs), which a browser cannot load; tests/gen7-bake.test.mjs holds the two equal on sample cells. The pair descriptors come from
// art/gen7/pairs.json (tools/gen7-pairs.mjs), the tile set from the baked .mbtiles. Pure: no page state.
import { dualGrid, EMPTY, FULL_BASE, EMPTY_BASE } from '../../places/src/dualgrid.mjs';
import { ALT_CODE, applyOpenEdges, cliffInfo } from '../../places/src/bake/openedges.mjs';
import { applyGroundMix } from '../../places/src/bake/groundmix.mjs';

export const FIND_KINDS = ['pod', 'fruit', 'dew', 'stone', 'material'];
const FORMAT_VERSION = 1;

const spriteFor = (ts, group, kind) => { const i = ts.sprites.findIndex(s => s.group === group && s.kind === kind); return i < 0 ? null : { index: i, sprite: ts.sprites[i] }; };
function footprintCells(ir, ts) {
  const cells = new Map();
  for (const p of ir.props) {
    const s = spriteFor(ts, 'prop', p.kind); if (!s) continue;
    const fp = s.sprite.footprint;
    for (let i = 0; i + 1 < fp.length; i += 2) { const x = p.cx + fp[i], y = p.cy + fp[i + 1]; if (x >= 0 && y >= 0 && x < ir.w && y < ir.h) cells.set(y * ir.w + x, p); }
  }
  return cells;
}
function layersToTileIds(dg, tileset) {
  return dg.layers.map(l => ({
    pair: l.pair,
    tiles: Uint16Array.from(l.tiles, c => {
      if (c === EMPTY) return 0xFFFF;
      const p = tileset.pairs[l.pair];
      if (c >= ALT_CODE) return tileset.pairs[(c - ALT_CODE) >> 4].tiles[(c - ALT_CODE) & 15];
      if (c < FULL_BASE) return p.tiles[c];
      if (c < EMPTY_BASE) return p.fullVariants[c - FULL_BASE];
      return p.emptyVariants[c - EMPTY_BASE];
    }),
  }));
}

// ctx: { terrains, ts (the baked tile set), pairs (art/gen7/pairs.json's list) }. Returns the Place object the page reads (not serialised).
export function bakeCell(ir, ctx) {
  const { terrains, ts, pairs } = ctx;
  const dg = dualGrid({ id: ir.id, w: ir.w, h: ir.h, terrain: ir.terrain, origin: ir.origin }, terrains, pairs);
  applyOpenEdges(dg, ir, terrains, pairs);
  const ground = layersToTileIds(dg, ts);
  if (ir.groundMix) applyGroundMix({ ground }, ir.groundMix, ts);
  const index = (group, kind) => spriteFor(ts, group, kind).index;
  const placed = group => p => ({ kind: index(group, p.kind), x: p.x, y: p.y, sortY: p.sortY });
  const playOf = new Map(terrains.map(t => [t.value, t.play]));
  const block = new Uint8Array((ir.w * ir.h + 7) >> 3), setBit = i => { block[i >> 3] |= 1 << (i & 7); };
  for (let i = 0; i < ir.w * ir.h; i++) { const pl = playOf.get(ir.terrain[i]); if (pl === 'block' || pl === 'deep') setBit(i); }
  for (const i of cliffInfo(ir, terrains).lipCells) setBit(i);
  for (const cell of footprintCells(ir, ts).keys()) setBit(cell);
  return {
    id: ir.id, formatVersion: FORMAT_VERSION, set: ir.tileset, w: ir.w, h: ir.h, type: ir.type, names: ir.names, mirrorOf: '',
    terrain: ir.terrain, ground, decals: ir.decals.map(placed('decal')), props: ir.props.map(placed('prop')), canopy: ir.canopy.map(placed('canopy')),
    heart: { x: 0, y: 0, kinds: [], species: [], revealLine: '', reachBy: 'none' }, clues: [],
    finds: ir.finds.map(f => ({ x: f.x, y: f.y, kinds: f.kinds.map(k => FIND_KINDS.indexOf(k)), chance: f.chance })),
    landmarks: ir.landmarks.filter(l => l.prop && spriteFor(ts, 'prop', l.prop)).map(l => ({ prop: index('prop', l.prop), x: l.x, y: l.y, label: l.label })),
    openings: ir.openings.map(o => ({ side: o.side, from: o.from, to: o.to })),
    spawns: ir.spawns.map(s => ({ x: s.x, y: s.y, w: s.w, h: s.h, species: s.species, count: s.count })),
    blockMask: block,
  };
}
