// The reed beds: where the reed sprites stand along a stretch of shore. Pure and integer: no clock, no Math.random.
// Used by the generator (exploration/src/gen7/decor.mjs, on world tiles) and by the bake for a hand-set place's ReedBank area, so there is one rule. The numbers are art/places/map-rules.json `reeds`.
//   Land is grass or sand (the terrain values of art/places/terrain.json); the shore is a land tile with a shallow-water side. Positions are native sprite pixels (16 to a tile) in the frame of T.
//   Shore clumps: for every land tile of the stretch and each side that touches water, walk the edge from 0..3 px and set a clump every 8..12 px, so neighbours overlap; the base is jittered along the
//   edge by -2..+2 px and ragged by 0..4 px across it (a bed with no straight base). Four looks: shore-1 and shore-3 (plain) 37.5 % each, shore-2 and shore-4 (one cattail head) 12.5 % each, mirrored at random.
//   Water clumps: 3..5 per stretch, only on SHALLOW water tiles within two tiles of land (never on deep water), the second tile out first, one a tile, mirrored at random.
import { RULES } from './rules.mjs';
export const TV = { DEEP: 1, WATER: 2, SAND: 3, GRASS: 6 };
const SIDES = [[0, -1, 'N'], [0, 1, 'S'], [-1, 0, 'W'], [1, 0, 'E']];

// T(x, y): terrain value of a tile; h(x, y, z): a hash in [0, 1) of a tile and a salt; rect { x0, y0, x1, y1 }: the stretch's tiles, inclusive; rules: the map rules (a changed copy shows what a change does).
// Returns [{ sprite: 'shore-1' | .. | 'water-2', mirror: boolean, x, y, water: boolean }] with the foot point (x, y) in native pixels.
export function reedClumps(T, h, rect, rules = RULES) {
  const { shore: SHORE, water: WATER } = rules.reeds;
  const out = [], land = (x, y) => { const t = T(x, y); return t === TV.GRASS || t === TV.SAND; }, int = (v, n) => Math.min(n - 1, Math.floor(v * n));
  const looks = []; { let acc = 0; for (const l of SHORE.looks) { acc += l.share; looks.push([acc, l.sprite]); } }   // cumulative shares: the pick falls in the first look whose running total it is under
  const lookOf = pick => { for (const [upTo, sprite] of looks) if (pick < upTo) return sprite; return looks[looks.length - 1][1]; };
  for (let ty = rect.y0; ty <= rect.y1; ty++) for (let tx = rect.x0; tx <= rect.x1; tx++) {
    if (!land(tx, ty)) continue;
    SIDES.forEach(([dx, dy, side], si) => {
      if (T(tx + dx, ty + dy) !== TV.WATER) return;
      const vertical = dy !== 0;
      let t = int(h(tx, ty, 1 + si), SHORE.startSteps), k = 0;
      while (t < 16) {
        const z = 20 + si * 40 + k * 6, jit = int(h(tx, ty, z + 1), 2 * SHORE.jitter + 1) - SHORE.jitter, rag = int(h(tx, ty, z + 2), SHORE.rag + 1), pick = h(tx, ty, z + 3), mirror = h(tx, ty, z + 4) < 0.5;
        let x, y;
        if (vertical) { x = tx * 16 + t + jit; y = ty * 16 + 14 + 3 * dy + rag; }
        else { x = tx * 16 + 8 + 3 * dx + (rag - SHORE.rag / 2) * dx; y = ty * 16 + t + 4 + jit; }
        out.push({ sprite: lookOf(pick), mirror, x, y, water: false });
        t += SHORE.spacing.min + int(h(tx, ty, z + 5), SHORE.spacing.spread); k++;
      }
    });
  }
  // the water clumps: shallow tiles of the stretch within two tiles of land
  const cand = [], W = WATER.within;
  for (let ty = rect.y0; ty <= rect.y1; ty++) for (let tx = rect.x0; tx <= rect.x1; tx++) {
    if (T(tx, ty) !== TV.WATER) continue;
    let d = 0;
    for (let r = 1; r <= W && !d; r++) for (let dy = -r; dy <= r && !d; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) === r && land(tx + dx, ty + dy)) { d = r; break; }
    if (d) cand.push({ tx, ty, rank: h(tx, ty, 300) + 0.5 * (W - d) });
  }
  cand.sort((a, b) => a.rank - b.rank || a.ty - b.ty || a.tx - b.tx);
  const n = WATER.count.min + int(h(rect.x0, rect.y0, 301), WATER.count.max - WATER.count.min + 1);
  for (const c of cand.slice(0, n)) {
    out.push({ sprite: h(c.tx, c.ty, 302) < 0.5 ? 'water-1' : 'water-2', mirror: h(c.tx, c.ty, 303) < 0.5, x: c.tx * 16 + 8 + int(h(c.tx, c.ty, 304), 5) - 2, y: c.ty * 16 + 12 + int(h(c.tx, c.ty, 305), 5) - 2, water: true });
  }
  return out;
}
