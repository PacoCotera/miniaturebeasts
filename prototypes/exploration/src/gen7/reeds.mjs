// The reed beds (art desk art-paint-reeds, phase 3b, scatter-rule.md): where the reed sprites stand along a stretch of shore. Pure and integer: no clock, no Math.random.
// Used by the generator (exploration/src/gen7/decor.mjs, on world tiles) and by the bake for a hand-set place's ReedBank area, so there is one rule.
//   Land is grass or sand (the terrain values of art/places/terrain.json); the shore is a land tile with a shallow-water side. Positions are native sprite pixels (16 to a tile) in the frame of T.
//   Shore clumps: for every land tile of the stretch and each side that touches water, walk the edge from 0..3 px and set a clump every 8..12 px, so neighbours overlap; the base is jittered along the
//   edge by -2..+2 px and ragged by 0..4 px across it (a bed with no straight base). Four looks: shore-1 and shore-3 (plain) 37.5 % each, shore-2 and shore-4 (one cattail head) 12.5 % each, mirrored at random.
//   Water clumps: 3..5 per stretch, only on SHALLOW water tiles within two tiles of land (never on deep water), the second tile out first, one a tile, mirrored at random.
export const TV = { DEEP: 1, WATER: 2, SAND: 3, GRASS: 6 };
const SHORE_PICK = ['shore-1', 'shore-3', 'shore-2', 'shore-4'];   // 37.5, 37.5, 12.5, 12.5 %
const SIDES = [[0, -1, 'N'], [0, 1, 'S'], [-1, 0, 'W'], [1, 0, 'E']];

// T(x, y): terrain value of a tile; h(x, y, z): a hash in [0, 1) of a tile and a salt; rect { x0, y0, x1, y1 }: the stretch's tiles, inclusive.
// Returns [{ sprite: 'shore-1' | .. | 'water-2', mirror: boolean, x, y, water: boolean }] with the foot point (x, y) in native pixels.
export function reedClumps(T, h, rect) {
  const out = [], land = (x, y) => { const t = T(x, y); return t === TV.GRASS || t === TV.SAND; }, int = (v, n) => Math.min(n - 1, Math.floor(v * n));
  for (let ty = rect.y0; ty <= rect.y1; ty++) for (let tx = rect.x0; tx <= rect.x1; tx++) {
    if (!land(tx, ty)) continue;
    SIDES.forEach(([dx, dy, side], si) => {
      if (T(tx + dx, ty + dy) !== TV.WATER) return;
      const vertical = dy !== 0;
      let t = int(h(tx, ty, 1 + si), 4), k = 0;
      while (t < 16) {
        const z = 20 + si * 40 + k * 6, jit = int(h(tx, ty, z + 1), 5) - 2, rag = int(h(tx, ty, z + 2), 5), pick = h(tx, ty, z + 3), mirror = h(tx, ty, z + 4) < 0.5;
        let x, y;
        if (vertical) { x = tx * 16 + t + jit; y = ty * 16 + 14 + 3 * dy + rag; }
        else { x = tx * 16 + 8 + 3 * dx + (rag - 2) * dx; y = ty * 16 + t + 4 + jit; }
        out.push({ sprite: SHORE_PICK[pick < 0.375 ? 0 : pick < 0.75 ? 1 : pick < 0.875 ? 2 : 3], mirror, x, y, water: false });
        t += 8 + int(h(tx, ty, z + 5), 5); k++;
      }
    });
  }
  // the water clumps: shallow tiles of the stretch within two tiles of land
  const cand = [];
  for (let ty = rect.y0; ty <= rect.y1; ty++) for (let tx = rect.x0; tx <= rect.x1; tx++) {
    if (T(tx, ty) !== TV.WATER) continue;
    let d = 0;
    for (let r = 1; r <= 2 && !d; r++) for (let dy = -r; dy <= r && !d; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) === r && land(tx + dx, ty + dy)) { d = r; break; }
    if (d) cand.push({ tx, ty, rank: h(tx, ty, 300) + 0.5 * (2 - d) });
  }
  cand.sort((a, b) => a.rank - b.rank || a.ty - b.ty || a.tx - b.tx);
  const n = 3 + int(h(rect.x0, rect.y0, 301), 3);
  for (const c of cand.slice(0, n)) {
    out.push({ sprite: h(c.tx, c.ty, 302) < 0.5 ? 'water-1' : 'water-2', mirror: h(c.tx, c.ty, 303) < 0.5, x: c.tx * 16 + 8 + int(h(c.tx, c.ty, 304), 5) - 2, y: c.ty * 16 + 12 + int(h(c.tx, c.ty, 305), 5) - 2, water: true });
  }
  return out;
}
