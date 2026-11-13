// Generator 7: a cell's IR to the baked place, in the page. The same steps as places/src/bake/build.mjs buildPlace (the dual grid by terrain layers, open edges, depth-packed ground, the block mask,
// the records), without that module's imports of the LDtk reader (Ajv, node:fs), which a browser cannot load; tests/gen7-bake.test.mjs holds the two equal on sample cells. The layer descriptors
// come from art/gen7/layers.json (tools/gen7-layers.mjs), the tile set from the baked .mbtiles. Pure: no page state.
import { terrainLayers, packDepth, EMPTY, FILL_CODE, splitCode } from '../../places/src/dualgrid.mjs';
import { ALT_CODE, applyOpenEdges, cliffInfo } from '../../places/src/bake/openedges.mjs';
import { southDecals, southRuns } from '../../places/src/bake/southruns.mjs';

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
// the tile ids of the dual grid's layers (build.mjs layersToTileIds)
function layersToTileIds(dg, ts, desc) {
  return dg.layers.map(l => {
    const d = l.tone ? null : desc.layers.get(l.terrain);
    return {
      tiles: Uint16Array.from(l.tiles, c => {
        if (c === EMPTY) return 0xFFFF;
        if (l.tone) return c >= ALT_CODE ? ts.pairs[(c - ALT_CODE) >> 4].tiles[(c - ALT_CODE) & 15] : ts.pairs[desc.tone.row].tiles[c];
        if (c >= FILL_CODE) return ts.pairs[d.fillRow].fullVariants[c - FILL_CODE];
        if (c >= ALT_CODE) return ts.pairs[(c - ALT_CODE) >> 4].tiles[(c - ALT_CODE) & 15];
        const s = splitCode(c), row = ts.pairs[d.kinds[s.kind].rows.over];
        return s.full !== undefined ? row.fullVariants[s.full] : row.tiles[s.slot];
      }),
    };
  });
}
// art/gen7/layers.json's { layers: [[value, descriptor]], tone } as the dual grid takes it (the lowers back to Sets)
export const reviveLayers = j => ({ layers: new Map(j.layers.map(([v, l]) => [v, { ...l, kinds: l.kinds.map(k => ({ ...k, lowers: new Set(k.lowers) })) }])), tone: j.tone });

// ctx: { terrains, ts (the baked tile set), desc (reviveLayers' output) }. Returns the Place object the page reads (not serialised).
export function bakeCell(ir, ctx) {
  const { terrains, ts, desc } = ctx;
  const dg = terrainLayers({ id: ir.id, w: ir.w, h: ir.h, terrain: ir.terrain, origin: ir.origin, tone: ir.tone, top: ir.top }, terrains, desc.layers, desc.tone);
  applyOpenEdges(dg, ir, terrains, desc.layers, desc.tone);
  const ground = packDepth(layersToTileIds(dg, ts, desc), dg.w1, dg.h1).map(tiles => ({ tiles }));
  const index = (group, kind) => spriteFor(ts, group, kind).index;
  const placed = group => p => ({ kind: index(group, p.kind), x: p.x, y: p.y, sortY: p.sortY });
  const playOf = new Map(terrains.map(t => [t.value, t.play]));
  const block = new Uint8Array((ir.w * ir.h + 7) >> 3), setBit = i => { block[i >> 3] |= 1 << (i & 7); };
  for (let i = 0; i < ir.w * ir.h; i++) { const pl = playOf.get(ir.terrain[i]); if (pl === 'block' || pl === 'deep') setBit(i); }
  for (const i of cliffInfo(ir, terrains).lipCells) setBit(i);
  for (const cell of footprintCells(ir, ts).keys()) setBit(cell);
  return {
    id: ir.id, formatVersion: FORMAT_VERSION, set: ir.tileset, w: ir.w, h: ir.h, type: ir.type, names: ir.names, mirrorOf: '',
    terrain: ir.terrain, ground, decals: southDecals(southRuns(ir, cliffInfo(ir, terrains))).map(d => ({ kind: index('decal', d.kind), x: d.x, y: d.y, sortY: d.y })).concat(ir.decals.map(placed('decal'))), props: ir.props.map(placed('prop')), canopy: ir.canopy.map(placed('canopy')),
    heart: { x: 0, y: 0, kinds: [], species: [], revealLine: '', reachBy: 'none' }, clues: [],
    finds: ir.finds.map(f => ({ x: f.x, y: f.y, kinds: f.kinds.map(k => FIND_KINDS.indexOf(k)), chance: f.chance })),
    landmarks: ir.landmarks.filter(l => l.prop && spriteFor(ts, 'prop', l.prop)).map(l => ({ prop: index('prop', l.prop), x: l.x, y: l.y, label: l.label })),
    openings: ir.openings.map(o => ({ side: o.side, from: o.from, to: o.to })),
    spawns: ir.spawns.map(s => ({ x: s.x, y: s.y, w: s.w, h: s.h, species: s.species, count: s.count })),
    blockMask: block, top: ir.top || new Uint8Array(0),
  };
}
