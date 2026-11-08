// IR -> the Place object that format/write.mjs serialises (place design A1.4 steps 5 and 6), and the golden picture of a baked place.
import { dualGrid, DualGridError, EMPTY, FULL_BASE, EMPTY_BASE } from '../dualgrid.mjs';
import { indexedToRgba } from '../indexed.mjs';
import { renderView } from '../ground.mjs';
import { FORMAT_VERSION } from '../format/write.mjs';
import { BakeError, FIND_KINDS } from './ldtk.mjs';
import { footprintCells, spriteFor } from './rules.mjs';

export function layersToTileIds(dg, tileset) {
  return dg.layers.map((l) => ({
    pair: l.pair,
    tiles: Uint16Array.from(l.tiles, (c) => {
      if (c === EMPTY) return 0xFFFF;
      const p = tileset.pairs[l.pair];
      if (c < FULL_BASE) return p.tiles[c];
      if (c < EMPTY_BASE) return p.fullVariants[c - FULL_BASE];
      return p.emptyVariants[c - EMPTY_BASE];
    }),
  }));
}

// ctx: { terrains, sets: Map(id -> baked tile set), pairsOf: Map(id -> dual-grid pair descriptors) }. Returns { place } or { errors }.
export function buildPlace(ir, ctx) {
  const tileset = ctx.sets.get(ir.tileset);
  let dg;
  try {
    dg = dualGrid({ id: ir.id, w: ir.w, h: ir.h, terrain: ir.terrain }, ctx.terrains, ctx.pairsOf.get(ir.tileset));
  } catch (e) {
    if (!(e instanceof DualGridError)) throw e;
    const cell = e.cell && e.cell.i !== undefined ? { x: Math.min(e.cell.i, ir.w - 1), y: Math.min(e.cell.j, ir.h - 1) } : e.cell || null;
    return { errors: [new BakeError(ir.id, e.rule, e.message.replace(/^[^:]*: /, ''))].map((b) => Object.assign(b, { cell })) };
  }
  const index = (group, kind) => spriteFor(tileset, group, kind).index;
  const placed = (group) => (p) => ({ kind: index(group, p.kind), x: p.x, y: p.y, sortY: p.sortY });
  const playOf = new Map(ctx.terrains.map((t) => [t.value, t.play]));
  const block = new Uint8Array((ir.w * ir.h + 7) >> 3);
  const setBit = (i) => { block[i >> 3] |= 1 << (i & 7); };
  for (let i = 0; i < ir.w * ir.h; i++) { const pl = playOf.get(ir.terrain[i]); if (pl === 'block' || pl === 'deep') setBit(i); }
  for (const cell of footprintCells(ir, tileset).keys()) setBit(cell);
  const heart = ir.hearts[0];
  const place = {
    id: ir.id, formatVersion: FORMAT_VERSION, set: ir.tileset, w: ir.w, h: ir.h, type: ir.type, names: ir.names, mirrorOf: ir.mirrorOf || '',
    terrain: ir.terrain, ground: layersToTileIds(dg, tileset),
    decals: ir.decals.map(placed('decal')), props: ir.props.map(placed('prop')), canopy: ir.canopy.map(placed('canopy')),
    heart: { x: heart.x, y: heart.y, kinds: heart.kinds, species: heart.species, revealLine: heart.revealLine, reachBy: heart.reachBy },
    clues: ir.clues, finds: ir.finds.map((f) => ({ x: f.x, y: f.y, kinds: f.kinds.map((k) => FIND_KINDS.indexOf(k)), chance: f.chance })),
    landmarks: ir.landmarks.map((l) => ({ prop: index('prop', l.prop), x: l.x, y: l.y, label: l.label })),
    openings: ir.openings.map((o) => ({ side: o.side, from: o.from, to: o.to })),
    spawns: ir.spawns.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, species: s.species, count: s.count })),
    blockMask: block,
  };
  return { place };
}

export function paletteRgb(tileset) {
  const rgb = new Array(256).fill(null).map(() => [255, 0, 255]);
  tileset.palette.forEach((c, k) => { rgb[48 + k] = [(c >> 16) & 255, (c >> 8) & 255, c & 255]; });
  return { rgb };
}


// The place at 48 or 24 px for the bake's goldens: the renderer core's whole-place view, veil off, clock 0, no actors, no cut-out. Returns RGBA.
export function renderPlace(tileset, place, size) {
  const W = place.w * size, H = place.h * size;
  return indexedToRgba(renderView(tileset, place, size, { x: 0, y: 0, w: W, h: H }), W, H, paletteRgb(tileset));
}
