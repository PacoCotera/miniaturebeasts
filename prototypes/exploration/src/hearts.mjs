// The walk to a point of a place: the one piece of the old hearts that places/src/adapter.mjs (the generator 6 and dev-switch adapter) still imports. Everything else of the hearts
// (their kinds, tells, springs, clues and words) is gone with generator 6; this file goes when that adapter does. Pure: no page state, no drawing.
import { T_BLOCK, DIRS, DECOR } from "./world.mjs";

const I = (w, x, y) => y * w + x;   // a tile's index in a place w tiles wide
// walking distance from the entry through the reachable ground, with the way back (par)
function walkField(lay) {
  const { w, h } = lay, solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = T_BLOCK[lay.tiles[i]] ? 1 : 0;
  for (const f of lay.feats) if (!DECOR.includes(f.kind)) solid[I(w, f.x, f.y)] = 1;
  const dist = new Int16Array(w * h).fill(-1), par = new Int32Array(w * h).fill(-1), q = [I(w, lay.spawnPt.x, lay.spawnPt.y)];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of Object.values(DIRS)) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= lay.h) continue; const j = I(w, X, Y);
      if (dist[j] < 0 && lay.reach[j] && !solid[j]) { dist[j] = dist[i] + 1; par[j] = i; q.push(j); } } }
  return { solid, dist, par };
}
// the nearest walkable tile to a tile that may itself be solid (a stone)
function walkNear(F, lay, x, y) { let best = -1; for (const [dx, dy] of [[0, 0], ...Object.values(DIRS)]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h) continue; const j = I(lay.w, X, Y); if (F.dist[j] >= 0 && (best < 0 || F.dist[j] < F.dist[best])) best = j; } return best; }
// The path from the entry to a walkable tile beside (x, y), and clue points (every third tile) on its last stretch.
export function heartPath(lay, x, y) {
  const F = walkField(lay), w = walkNear(F, lay, x, y), path = [];
  if (w < 0) return { path, clues: [] };
  for (let i = w; i >= 0; i = F.par[i]) path.push({ x: i % lay.w, y: (i / lay.w) | 0 }); path.reverse();
  const clues = []; for (let k = path.length - 3; k > 0 && clues.length < 4; k -= 3) clues.push(path[k]);
  return { path, clues: clues.reverse() };
}
