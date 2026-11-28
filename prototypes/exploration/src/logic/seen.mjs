// The seen record (STRUCTURE.md, logic layer): what he has seen of the world, one record, read the same on both sides of a place border.
// Pure: no DOM, no canvas, no timers, no clock, no storage. Every function takes the record (the page keeps it on S.seen) and what it needs as arguments.
//
//   record = { f: 1, rev: [cell -> 0|1], been: [cell -> 0|1], into: [cell -> 0|1], walked: { cell: 1 }, tile: { placeKey: rows } }
//   rev     the map shows the cell (seen from the reach view)
//   been    the map crossed or entered the cell (the old "visited")
//   into    he went into the place (the old veil record existing): "been in", its own flag; a Call from next door never sets it
//   walked  the place is explored (most of its walkable ground seen)
//   tile    one bit per world tile, rows[y] bit x: level 1 "seen" (walked or Call-lifted, from this place or from next door). A tile with no bit is
//           level 0 "unseen". A plain tile (veilable() is 0: a cliff face, ground no Call could reach) is level 2: the walking view shows it plainly, a picture of the place does not light it.
// One write path (lift*), one read (levelAt / unveiled / veilMask). A Call next door writes the same rows the walk writes.
import { DIRS, T_BLOCK } from "../world.mjs";
import { CALL_R_PLACE } from "../walk-data.mjs";

export const SEEN_F = 1;
export const newSeen = n => ({ f: SEEN_F, rev: new Array(n).fill(0), been: new Array(n).fill(0), into: new Array(n).fill(0), walked: {}, tile: {} });
export const isRecord = o => !!o && typeof o === "object" && o.f === SEEN_F;

// An old save's fields (revealed, visited, called, veil, veilPre) in, the record out. Pure; the input is not changed. Every tile he had seen stays seen, nothing else opens:
// a Call's rows kept apart in veilPre join the place's rows, and a place with a veil record counts as been in (the map's fog read it so).
export function seenFromOld(old, n) {
  const sn = newSeen(n), arr = a => Array.isArray(a) ? a : [];
  arr(old.revealed).forEach((v, c) => { if (v) sn.rev[c] = 1; });
  arr(old.visited).forEach((v, c) => { if (v) sn.been[c] = 1; });
  for (const c of Object.keys(old.called || {})) if (old.called[c]) sn.walked[c] = 1;
  for (const src of [old.veil, old.veilPre]) for (const k of Object.keys(src || {})) {
    const rows = src[k]; if (!Array.isArray(rows)) continue;
    const t = sn.tile[k] || (sn.tile[k] = new Array(rows.length).fill(0));
    for (let y = 0; y < rows.length; y++) t[y] = ((t[y] || 0) | (rows[y] || 0)) >>> 0;
    if (src === old.veil && k[0] !== "c" && !isNaN(+k)) sn.into[+k] = 1; }
  return sn;
}

// ---- the cell flags ----
export const reveal = (sn, c) => { if (sn.rev[c]) return false; sn.rev[c] = 1; return true; };
export const revealed = (sn, c) => !!sn.rev[c];
export const markBeen = (sn, c) => { sn.been[c] = 1; };
export const beenIn = (sn, c) => !!sn.been[c];
export const intoPlace = (sn, c) => !!sn.into[c];
export const walkedCell = (sn, c) => !!sn.walked[c];
export const markWalked = (sn, c) => { sn.walked[c] = 1; };
// The fog over a place on the map: 2 never been in, 1 been in and not found (explored), 0 found, not a place, or not seen. isPlace: the page's answer for a land cell that holds a place.
export const fogState = (sn, c, isPlace) => !sn.rev[c] || !isPlace || sn.walked[c] ? 0 : sn.into[c] ? 1 : 2;

// ---- the tiles ----
export const rowsOf = (sn, key, h) => sn.tile[key] || (sn.tile[key] = new Array(h).fill(0));
// The place he is in: its rows, and he is now in it (a lift from the place itself marks it; liftWhere, a Call cast from next door, does not).
const own = (sn, lay) => { sn.into[lay.cell] = 1; return rowsOf(sn, lay.key, lay.h); };
export const rowsCopy = (sn, key, h) => { const r = (sn.tile[key] || []).slice(); while (r.length < h) r.push(0); return r; };
// Tiles no Call could ever reach (more than r tiles from any walkable tile) or a cliff face are never veiled: they show plainly. 1 where a tile can be veiled.
export function veilable(lay, r = CALL_R_PLACE) {
  if (lay.vbl) return lay.vbl;
  const rr = (r + .5) ** 2, o = new Uint8Array(lay.w * lay.h);
  for (let i = 0; i < lay.w * lay.h; i++) { if (!lay.reach[i]) continue; const x0 = i % lay.w, y0 = (i / lay.w) | 0;
    for (let y = Math.max(0, y0 - r); y <= Math.min(lay.h - 1, y0 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(lay.w - 1, x0 + r); x++) if ((x - x0) ** 2 + (y - y0) ** 2 <= rr) o[y * lay.w + x] = 1; }
  if (lay.steep) for (let i = 0; i < o.length; i++) if (lay.steep[i]) o[i] = 0;
  return (lay.vbl = o);
}
const setBit = (v, y, x) => { v[y] = (v[y] | (1 << x)) >>> 0; };
const bitAt = (v, x, y) => !!v && ((v[y] >>> x) & 1) === 1;
export const tileBit = (sn, key, x, y) => bitAt(sn.tile[key], x, y);
// Seen on this tile: lifted (level 1) or plain (never veiled). A tile off the place counts as seen (edges never fade into the border).
export function unveiled(sn, lay, x, y) {
  if (bitAt(sn.tile[lay.key], x, y)) return true;
  return !veilable(lay)[y * lay.w + x];
}
// 0 unseen, 1 seen (walked or Call-lifted, from this place or from next door), 2 plain: a tile no Call can reach or a cliff face, which the walking view shows plainly though it was never lifted.
export function levelAt(sn, lay, x, y) {
  if (bitAt(sn.tile[lay.key], x, y)) return 1;
  return !veilable(lay)[y * lay.w + x] ? 2 : 0;
}
// Whether any tile of the place is seen (level 1) in the record: false for a place with nothing of it seen. The look-around's dark reads this.
export const anySeen = (sn, key) => { const v = sn.tile[key]; return !!v && v.some(r => r !== 0); };
// The same on a bare rows array (the arrival picture's guess).
export const unveiledRows = (lay, rows, x, y) => x < 0 || y < 0 || x >= lay.w || y >= lay.h || bitAt(rows, x, y) || !veilable(lay)[y * lay.w + x];

// A round range: the tiles it lifts. Returns the set of tile indexes newly lifted (the ring and its smoothing gaps).
export function liftRound(sn, lay, cx, cy, r) {
  const lw = lay.w, lh = lay.h, v = own(sn, lay), lifted = new Set();
  for (let y = Math.max(0, cy - r); y <= Math.min(lh - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(lw - 1, cx + r); x++)
    if ((x - cx) ** 2 + (y - cy) ** 2 <= (r + .5) ** 2 && !bitAt(v, x, y)) { setBit(v, y, x); lifted.add(y * lw + x); }
  // smooth gaps: a veiled tile just outside the ring (up to 3 tiles) with seen land right behind it, outward, lifts too
  const isU = (x, y) => x < 0 || y < 0 || x >= lw || y >= lh || bitAt(v, x, y);
  for (let y = Math.max(0, cy - r - 3); y <= Math.min(lh - 1, cy + r + 3); y++) for (let x = Math.max(0, cx - r - 3); x <= Math.min(lw - 1, cx + r + 3); x++) {
    const d = Math.hypot(x - cx, y - cy); if (d <= r + .5 || d > r + 3.5 || bitAt(v, x, y)) continue;
    const ux = (x - cx) / d, uy = (y - cy) / d; let behind = false;
    for (let k = 1; k <= 3 && !behind; k++) { const bx = Math.round(x + ux * k), by = Math.round(y + uy * k); if (bx >= 0 && by >= 0 && bx < lw && by < lh && isU(bx, by)) behind = true; }
    if (behind) lifted.add(y * lw + x); }
  for (const i of lifted) setBit(v, (i / lw) | 0, i % lw);
  return lifted;
}
// A square of radius r (lightning's 3x3).
export function liftSquare(sn, lay, cx, cy, r) {
  const lw = lay.w, lh = lay.h, v = own(sn, lay), x0 = Math.max(0, cx - r), x1 = Math.min(lw - 1, cx + r);
  const bits = (x1 >= 30 ? -1 : (1 << (x1 + 1)) - 1) & ~((1 << x0) - 1);
  for (let y = Math.max(0, cy - r); y <= Math.min(lh - 1, cy + r); y++) v[y] = (v[y] | bits) >>> 0;
}
// The tiles in a line between two tiles (a named Loika's tell).
export function liftLine(sn, lay, a, b) {
  const v = own(sn, lay), n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  for (let i = 0; i <= n; i++) { const x = Math.round(a.x + (b.x - a.x) * i / (n || 1)), y = Math.round(a.y + (b.y - a.y) * i / (n || 1)); if (x >= 0 && y >= 0 && x < lay.w && y < lay.h) setBit(v, y, x); }
}
// A small flood from the pawn through open ground, on any rows: it lifts the first blocking tile it meets (a shore, a trunk) but never what lies behind it.
export function liftFlood(lay, v, px, py, r) {
  const lw = lay.w, lh = lay.h, tiles = lay.tiles, seen = new Set([py * lw + px]), q = [[px, py]];
  for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; setBit(v, y, x); if (h && T_BLOCK[tiles[y * lw + x]]) continue;
    for (const [dx, dy] of Object.values(DIRS)) { const X = x + dx, Y = y + dy, k = Y * lw + X;
      if (X < 0 || Y < 0 || X >= lw || Y >= lh || seen.has(k) || (X - px) ** 2 + (Y - py) ** 2 > (r + .3) ** 2) continue; seen.add(k); q.push([X, Y]); } }
}
// Walking: the flood from the pawn, written into the place's rows.
export const walkLift = (sn, lay, px, py, r) => liftFlood(lay, own(sn, lay), px, py, r);
// A round range cast from another place: (w, h) the tiles of the place it lands in, (ox, oy) where that place's corner lies in the caster's tiles; `inRange(x, y)` in the caster's tiles.
// Writes the same rows a walk writes. Returns whether any tile lifted.
export function liftWhere(sn, key, w, h, ox, oy, inRange) {
  let any = false; const v = sn.tile[key] || new Array(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inRange(x + ox, y + oy)) { setBit(v, y, x); any = true; }
  if (any) sn.tile[key] = v;
  return any;
}
// The share of a place's walkable ground (lay.reach) that is seen, 0..1 (what "explored" counts).
export function seenShare(sn, lay) {
  const v = sn.tile[lay.key]; if (!v) return 0;
  if (lay.walkN == null) { lay.walkN = 0; for (let i = 0; i < lay.reach.length; i++) if (lay.reach[i]) lay.walkN++; }
  if (!lay.walkN) return 0;
  let n = 0; for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) if (lay.reach[y * lay.w + x] && bitAt(v, x, y)) n++;
  return n / lay.walkN;
}
// The whole place seen (the Probe's test hook).
export const liftAll = (sn, lay) => { own(sn, lay); sn.tile[lay.key] = new Array(lay.h).fill(0x0fffffff); };

// What a picture reads: one byte per tile of a place picture (w x h tiles, its corner at (ox, oy) in the place's tiles): 1 where the tile is veiled. The apron beyond the place takes the state of the nearest tile of the place, so a picture meets its neighbour with no lit ring between them.
// A picture shows only the tiles that were lifted (level 1), whichever place it is: a tile he has not seen is veiled, a plain one too.
export function veilMask(sn, lay, pw, ph, ox, oy) {
  const o = new Uint8Array(pw * ph);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const px = Math.min(lay.w - 1, Math.max(0, x + ox)), py = Math.min(lay.h - 1, Math.max(0, y + oy));
    if (levelAt(sn, lay, px, py) !== 1) o[y * pw + x] = 1; }
  return o;
}
