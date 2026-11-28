// The start pick's cursor on a first expedition: it hops between the start places. Geometry only, no page state.
import { DIRS, cxy } from "../logic/world.mjs";

// The cell of `cells` nearest ahead of `from` in direction `dir`; a cell off to the side counts its sideways distance twice. Null when none lies that way.
export function hopToward(from, dir, cells) {
  const [dx, dy] = DIRS[dir], p = cxy(from); let best = null, bd = Infinity;
  for (const c of cells) { const q = cxy(c), vx = q.x - p.x, vy = q.y - p.y, along = vx * dx + vy * dy; if (along <= 0) continue;
    const d = along + Math.abs(vx * dy + vy * dx) * 2; if (d < bd) { bd = d; best = c; } }
  return best;
}
