// Rules of a place that read only what they are handed: its tiles, a position, a direction. No game state, no clock.
import { MW, MH, DIRS, T, cxy } from "../world.mjs";

// Tiles nothing but the pawn and the partner stands on: stepping stones, stairs and their aprons (pods, creatures, slabs and tufts never).
export const NOSTAND = t => t === T.STEP || t === T.STAIR || t === T.APRON || t === T.WADE || t === T.SCREE || t === T.BANK;

export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
// The map cell one step from cell a toward dir, or -1 off the map.
export function stepCell(a, dir) { const p = cxy(a), [dx, dy] = DIRS[dir], X = p.x + dx, Y = p.y + dy; return X < 0 || Y < 0 || X >= MW || Y >= MH ? -1 : Y * MW + X; }
export function frontOf(P) { const [dx, dy] = DIRS[P.dir]; return { x: P.x + dx, y: P.y + dy }; }
// the facing that turns P toward t (the longer axis wins, the row on a tie), or null on its own tile
export const faceDirOf = (P, t) => { const dx = t.x - P.x, dy = t.y - P.y; return dx || dy ? (Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down')) : null; };
// the coordinate along the edge that a step in dir crosses
export const alongOf = (dir, P) => dir === 'left' || dir === 'right' ? P.y : P.x;
// outside the walk view's window round P: nothing there is seen, met or named
export const awayFrom = (o, P) => Math.abs(o.x - P.x) > 6 || Math.abs(o.y - P.y) > 7;

// A generator 7 place holds its earth banks as tile sites (lay.banks, adapt7.mjs: a way up's two columns and the four rows of lip and face under them): the bank, or null.
export function bankTile(lay, x, y) { for (const b of lay.banks || []) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b; return null; }
// The crossing a place tile belongs to (a scree or bank edge's two-by-two), or null.
export function crossingAt(lay, x, y) {
  { const b = bankTile(lay, x, y); if (b) return { bank: b, ei: b.ei }; }
  for (const q of lay.cross || []) { const d = q.dir === 'left' ? x : q.dir === 'right' ? lay.w - 1 - x : q.dir === 'up' ? y : lay.h - 1 - y, k = q.dir === 'up' || q.dir === 'down' ? x : y;
    if (d >= (q.off || 0) && d < (q.off || 0) + 2 && k >= q.s && k <= q.s + 1) return q; }   // a bank stands BANK_IN rows in from the border (world.mjs), scree on it
  return null;
}

// What the facing tile offers a fruit to be pressed on: 'stone' (a storm stone, a stone prop, a cliff face, a cave wall), 'tree' (a trunk, a fruit tree), or null.
// o is what stands on the tile f (the page's occupant). Never read from T.ROCK: the adapter stamps it on every blocking prop, bush and closed side. The mask is lay.press (1 stone, 2 tree).
export function pressOn(lay, o, f) {
  if (o.type === 'feat') return o.f.kind === 'k' ? 'stone' : o.f.kind === 'b' && o.f.tree ? 'tree' : null;
  if (o.type !== 'tile') return null;
  if (o.t === T.FACE || o.t === T.CWALL) return 'stone';
  if (o.t === T.TRUNK) return 'tree';
  const m = lay.press ? lay.press[f.y * lay.w + f.x] : 0;
  return m === 1 ? 'stone' : m === 2 ? 'tree' : null;
}

// A thing counts as left to take only if the explorer can stand on its tile or beside it: a reachable tile that is not under the range haze or a closed side's band.
export function reachableTile(lay, x, y) {
  const open = (X, Y) => X >= 0 && Y >= 0 && X < lay.w && Y < lay.h && !!lay.reach[Y * lay.w + X] && !(lay.lines && lay.lines.cells.has(Y * lay.w + X));
  return open(x, y) || open(x + 1, y) || open(x - 1, y) || open(x, y + 1) || open(x, y - 1);
}
