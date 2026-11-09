// The x-mirrored variant of a place (place design A1.4 step 4). Done on the logic grid (terrain and entities), then the dual grid is looked
// up again: tiles are never flipped, because the art's light comes from the top left. Sprites keep their pixels; only their positions mirror.
const SIDE = { N: 'N', S: 'S', E: 'W', W: 'E' };

export function mirrorIR(ir) {
  const { w, h } = ir;
  const mx = (x) => w - 1 - x;
  const terrain = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) terrain[y * w + mx(x)] = ir.terrain[y * w + x];
  const placed = (p) => ({ ...p, x: w * 48 - p.x, cx: mx(p.cx) });
  const sorted = (list) => list.map(placed).sort((a, b) => a.sortY - b.sortY || a.x - b.x || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));
  return {
    ...ir, id: ir.id + '~x', mirrorOf: ir.id, terrain,
    props: sorted(ir.props), decals: sorted(ir.decals), canopy: sorted(ir.canopy),
    hearts: ir.hearts.map((e) => ({ ...e, x: mx(e.x) })),
    clues: ir.clues.map((c) => ({ ...c, points: c.points.map((p) => ({ x: mx(p.x), y: p.y })) })),
    finds: ir.finds.map((e) => ({ ...e, x: mx(e.x) })),
    landmarks: ir.landmarks.map((e) => ({ ...e, x: mx(e.x) })),
    openings: ir.openings.map((o) => {
      const side = SIDE[o.side], x = w - o.x - o.cw;
      return { ...o, side, x, from: side === 'N' || side === 'S' ? x : o.from, to: side === 'N' || side === 'S' ? x + o.cw - 1 : o.to };
    }),
    spawns: ir.spawns.map((s) => ({ ...s, x: w - s.x - s.w })),
    wayups: (ir.wayups || []).map((a) => ({ ...a, x: w - a.x - a.w })), reedbanks: (ir.reedbanks || []).map((a) => ({ ...a, x: w - a.x - a.w })),
  };
}
