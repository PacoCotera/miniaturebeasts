// Generator 7: a cell's IR to the baked place, in the page. The steps it shares with places/src/bake/build.mjs buildPlace (a hand-set place, read from LDtk with Ajv and node:fs, which a browser cannot load)
// are places/src/bake/steps.mjs; this bake has no reed banks and no deep-water redraw, and a ring cell walks. The layer descriptors come from art/gen7/layers.json (tools/gen7-layers.mjs), the tile set from
// the baked .mbtiles. Pure: no page state.
import { terrainLayers, packDepth } from '../../../places/src/dualgrid.mjs';
import { applyOpenEdges, cliffInfo, rimSteps } from '../../../places/src/bake/openedges.mjs';
import { cliffDecals } from '../../../places/src/bake/southruns.mjs';
import { FIND_KINDS, spriteFor, footprintCells, layersToTileIds } from '../../../places/src/bake/steps.mjs';
import { FORMAT_VERSION } from '../../../places/src/format/write.mjs';   // the place format (2: the cell carries the bake's hold outputs, baked-package-8): the one place it is set

// art/gen7/layers.json's { layers: [[value, descriptor]], tone } as the dual grid takes it (the lowers back to Sets)
export const reviveLayers = j => ({ layers: new Map(j.layers.map(([v, l]) => [v, { ...l, kinds: l.kinds.map(k => ({ ...k, lowers: new Set(k.lowers), ...(k.mix ? { mix: { sw: new Set(k.mix.sw), se: new Set(k.mix.se) } } : {}) })) }])), tone: j.tone });

// ctx: { terrains, ts (the baked tile set), desc (reviveLayers' output) }. Returns the Place object the page reads (not serialised).
export function bakeCell(ir, ctx) {
  const { terrains, ts, desc } = ctx;
  const dg = terrainLayers({ id: ir.id, w: ir.w, h: ir.h, terrain: ir.terrain, origin: ir.origin, tone: ir.tone, top: ir.top }, terrains, desc.layers, desc.tone);
  applyOpenEdges(dg, ir, terrains, desc.layers, desc.tone, desc.litterTop);
  const ground = packDepth(layersToTileIds(dg, ts, desc), dg.w1, dg.h1).map(tiles => ({ tiles }));
  const index = (group, kind) => spriteFor(ts, group, kind).index;
  const placed = group => p => ({ kind: index(group, p.kind), x: p.x, y: p.y, sortY: p.sortY });
  const playOf = new Map(terrains.map(t => [t.value, t.play]));
  const block = new Uint8Array((ir.w * ir.h + 7) >> 3), setBit = i => { block[i >> 3] |= 1 << (i & 7); };
  for (let i = 0; i < ir.w * ir.h; i++) { const pl = playOf.get(ir.terrain[i]); if (pl === 'block' || pl === 'deep') setBit(i); }
  const cl = cliffInfo(ir, terrains);
  for (const i of cl.blockCells) if (!cl.ringCells.has(i)) setBit(i);   // relief: the face and flank cells; a ring cell is drawn as top grass and walks, only the step across its rim line is refused (rimSteps, bugs #99, #100)
  for (const cell of footprintCells(ir, ts).keys()) setBit(cell);
  return {
    id: ir.id, formatVersion: FORMAT_VERSION, set: ir.tileset, w: ir.w, h: ir.h, type: ir.type, names: ir.names, mirrorOf: '',
    terrain: ir.terrain, ground, decals: cliffDecals(ir, cl).map(d => ({ kind: index('decal', d.kind), x: d.x, y: d.y, sortY: d.y })).concat(ir.decals.map(placed('decal'))), props: ir.props.map(placed('prop')), canopy: ir.canopy.map(placed('canopy')),
    heart: { x: 0, y: 0, kinds: [], species: [], revealLine: '', reachBy: 'none' }, clues: [],
    finds: ir.finds.map(f => ({ x: f.x, y: f.y, kinds: f.kinds.map(k => FIND_KINDS.indexOf(k)), chance: f.chance })),
    landmarks: ir.landmarks.filter(l => l.prop && spriteFor(ts, 'prop', l.prop)).map(l => ({ prop: index('prop', l.prop), x: l.x, y: l.y, label: l.label })),
    openings: ir.openings.map(o => ({ side: o.side, from: o.from, to: o.to })),
    spawns: ir.spawns.map(s => ({ x: s.x, y: s.y, w: s.w, h: s.h, species: s.species, count: s.count })),
    blockMask: block, rimSteps: rimSteps(ir, terrains), top: ir.top || new Uint8Array(0),
  };
}
