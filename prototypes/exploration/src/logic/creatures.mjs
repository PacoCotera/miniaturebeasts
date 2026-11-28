// Creatures: the rules that read only what they are handed. X is the action's view of the place: its layout (lay), its live list (live)
// and the explorer's tile (P).
import { T, man } from './world.mjs';

// The nearest hole within maxD steps that no creature is hiding in, or null.
export function nearestHole(X, c, maxD) {
  let best = null, bd = maxD + 1;
  for (const f of X.lay.feats) if (f.kind === 'n' && !X.live.cr.some(o => o.hide && o.x === f.x && o.y === f.y)) { const d = man(c, f); if (d < bd) { bd = d; best = f; } }
  return best;
}

// An eater closes in on fruit quickly from across the view, then slows near it: about 4 quiet actions.
export function seekPace(c, f) { const d = man(c, f); return d > 6 ? 3 : d > 3 ? 2 : 1; }

// Where something happened, in words: a landmark if one is close, else a direction from the explorer.
export function whereWord(X, x, y) {
  const { lay, P } = X, near = (fx, fy, r) => Math.abs(fx - x) <= r && Math.abs(fy - y) <= r;
  for (const f of lay.feats) if (f.kind === 'o' && y >= f.y + 1 && y <= f.y + 3 && x >= f.x - 1 && x <= f.x + 3) return 'near the overhang';
  for (let i = 0; i < lay.w * lay.h; i++) if (lay.tiles[i] === T.TRUNK && near(i % lay.w, (i / lay.w) | 0, 1)) return 'under a tree';
  for (const f of lay.feats) { if (f.kind === 'b' && near(f.x, f.y, 2)) return 'by a bush'; if (f.kind === 'n' && near(f.x, f.y, 2)) return 'by a hole'; if (f.kind === 'e' && near(f.x, f.y, 2)) return 'by a nest'; }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const t = lay.tiles[(y + dy) * lay.w + x + dx]; if (y + dy >= 0 && y + dy < lay.h && x + dx >= 0 && x + dx < lay.w && (t === T.WATER || t === T.DEEP)) return 'by the water'; }
  const dx = x - P.x, dy = y - P.y, ns = dy < -2 ? 'north' : dy > 2 ? 'south' : '', ew = dx > 2 ? 'east' : dx < -2 ? 'west' : '';
  return 'to the ' + (ns && ew ? ns + '-' + ew : ns || ew || 'side');
}
