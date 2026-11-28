// Rules of the wild ones that read only what they are handed: a creature, her routine, a place's tiles. No game state, no clock.
import { cheb, T_BLOCK } from "../world.mjs";
import { DAY } from "../words.mjs";
import { haunt as hauntAt, isWary as waryDoings } from "../gen7/haunts.mjs";
import { NOSTAND } from "./place-rules.mjs";

// The day's keys (S.day.hab): a habit of hers, and one note for each range a day while she sleeps curled or is simply there.
export const habKey = (c, k) => c.id + ':' + k;
export const sleepKey = (c, range) => 'sn:' + c.id + ':' + range;
export const stillKey = (c, range) => 'st:' + c.id + ':' + range;

// a wary one: another named Loika that is wary, or any other kind that is not bold
export const isWary = q => q.ind ? waryDoings(q.ind.doings) : (q.b || 0) <= .55;

// her next haunt: the haunt her routine keeps at the next part of day that differs from the one she keeps now (else any other of hers)
export function nextHaunt(ind, part) {
  const cur = hauntAt(ind.hs, ind.doings, part), i = DAY.parts.findIndex(([n]) => n === part);
  for (let j = 1; j <= DAY.parts.length; j++) { const h = hauntAt(ind.hs, ind.doings, DAY.parts[(i + j) % DAY.parts.length][0]); if (h && cur && (h.x !== cur.x || h.y !== cur.y)) return h; }
  return Object.values(ind.hs).find(h => h && cur && (h.x !== cur.x || h.y !== cur.y)) || cur;
}

// The partner's calm: X is the partner as the tick reads it ({ pt, ptAb, ptSp, ptElder, ptN }).
export function calmRadius(X) { return (X.ptElder ? 8 : 4) + (X.ptN | 0); }
export function calmedBy(c, X) { return !!X.pt && cheb(c, X.pt) <= calmRadius(X) && (X.ptAb === 'calm' || X.ptSp === c.sp); }

// Her prints. The print's tile is chosen on the ground alone (no one standing there), so the mark does not jump as the pawn or a creature moves.
export const printFree = lay => (x, y) => x >= 1 && y >= 1 && x < lay.w - 1 && y < lay.h - 1 && !!lay.reach[y * lay.w + x] && !T_BLOCK[lay.tiles[y * lay.w + x]] && !NOSTAND(lay.tiles[y * lay.w + x]) && !lay.feats.some(f => f.x === x && f.y === y);
// The tile the print is drawn on: the free tile nearest the stand (within 4) with no decor on it (no flower clump, bush or crown: a pale print among white flowers is not seen at 1x); none: the print is not drawn, the read still works.
export function printMark(lay, stand, free) {
  const ds = (lay.baked && lay.baked.place && lay.baked.place.decals) || [], on = new Set(ds.map(d => (Math.floor(d.y / 48) - 1) * lay.w + Math.floor(d.x / 48) - 1));   // a decal (flower clump, tuft, stone) stands on the tile its foot is on
  const clear = (x, y) => free(x, y) && !(lay.coverAt && lay.coverAt(x, y)) && !on.has(y * lay.w + x);
  for (let r = 0; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && clear(stand.x + dx, stand.y + dy)) return { x: stand.x + dx, y: stand.y + dy };
  return null;
}
// the way the turned sign points: from her print toward where she went, as the nearest of four headings (0 north, 1 east, 2 south, 3 west); null when it does not point
export const dewDir = p => { if (!p.to) return null; const at = p.mark || p.stand, dx = p.to.x - at.x, dy = p.to.y - at.y; return dx || dy ? { h: Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0) } : null; };
