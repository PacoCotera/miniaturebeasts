// Where the pawn stands at a cliff top (owner bug #21, "I shouldn't be standing this far from the edge").
// The lip row of a raised land is one whole blocked tile (relief.mjs RING), so a pawn that is stopped by it stands a tile short of where the drawn lip is:
// measured on today's main, about 22 px short with the drop to the north, west or east, and about 6 px with the drop to the south (the lip's mound is drawn over the ring tile's top).
// The walk rule is untouched (the ring still blocks, so no one walks off or into a flank): the pawn is only DRAWN this many px nearer the lip, toward the blocked ring tile at its side.
// cliff-stand-2 (AD, bus 38322eef26): on a diagonal edge the full nudge put his feet over the dark face. The nudge now stops where the row under his feet is still the crown's grass:
// grassAt(dx, dy) says whether the ground at that pixel, dx / dy from the unnudged foot centre (dy 0 = the foot row, 1 = the row under it), is the crown's grass (not the rim's ink or the face): index.html builds it from crownAt below.
import { CROWN } from './standlip.mjs';
export const STAND_NUDGE = 16;
const SIDES = [['up', 0, -1, 0, -1], ['left', -1, 0, -1, 0], ['right', 1, 0, 1, 0]];   // [side, dx, dy, nudge x sign, nudge y sign]; the south side needs none

// cliff-stand-3 (AD, bus 21:28): the clamp reads TILE DATA, not drawn colours. src/standlip.mjs (generated from the cliff piece files by tools/standlip-gen.mjs) holds each piece's crown as runs per pixel row;
// the place's decals say which piece is drawn where and in what order, so the grass at a place pixel is: the last-drawn piece opaque there says grass or rock; no piece opaque there: the raised ground, grass.
// A piece with no row data (below the rows kept: the face) reads as rock, so a spot the data cannot vouch for gets no nudge. No light, no screen read: day, night and storm answer alike.
const decoded = new Map();   // kind -> per row an array of [class, start, end)
const rowRuns = (kind, y) => {
  const p = CROWN[kind]; if (!p) return null;
  let rows = decoded.get(kind); if (!rows) decoded.set(kind, rows = new Array(p.rows.length));
  if (y >= p.rows.length) return 'rock';
  if (!rows[y]) { const runs = []; let x = 0; for (const [, c, n] of p.rows[y].matchAll(/([tgx])(\d+)/g)) { runs.push([c, x, x + +n]); x += +n; } rows[y] = runs; }
  return rows[y];
};
// decals: [{ kind, x0, y0, w, h }] in draw order, place pixels (x0, y0 the top-left corner as drawn). Returns 'g' (grass or open ground) or 'x' (rim ink or rock, or a piece with no data).
export function crownAt(decals, px, py) {
  for (let i = decals.length - 1; i >= 0; i--) {
    const d = decals[i], cx = px - d.x0, cy = py - d.y0;
    if (cx < 0 || cy < 0 || cx >= d.w || cy >= d.h) continue;
    const runs = rowRuns(d.kind, cy); if (runs === null) continue;   // not a crown piece (a foot overlay, a way up): it draws no crown
    if (runs === 'rock') return 'x';
    for (const [c, a, b] of runs) if (cx >= a && cx < b) { if (c === 't') break; return c; }
  }
  return 'g';
}

// lay: a layout with tiles, steep (the blocked rock of a raised land's edge), raisedFn(x, y); steep: the same, as lay.steep[y * lay.w + x].
// Returns the [dx, dy] draw offset in pixels at 48 px a tile for a pawn on tile (x, y).
export function standNudge(lay, x, y, grassAt) {
  if (!lay || !lay.steep || !lay.raisedFn || !lay.raisedFn(x, y) || lay.steep[y * lay.w + x]) return [0, 0];
  let nx = 0, ny = 0;
  for (const [, dx, dy, sx, sy] of SIDES) {
    const X = x + dx, Y = y + dy;
    if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h) continue;
    if (lay.steep[Y * lay.w + X] && lay.raisedFn(X, Y)) { if (sx) nx = sx * STAND_NUDGE; if (sy) ny = sy * STAND_NUDGE; }   // a raised steep tile is a ring tile: the lip itself
  }
  if (!grassAt || (!nx && !ny)) return [nx, ny];
  // the clamp: the largest share k / STAND_NUDGE of the nudge with the foot row and the row under it all grass over the feet's width
  for (let k = STAND_NUDGE; k >= 0; k--) {
    const cx = Math.round(nx * k / STAND_NUDGE), cy = Math.round(ny * k / STAND_NUDGE);
    if (grassAt(cx, cy) && grassAt(cx, cy + 1)) return [cx, cy];
  }
  return [0, 0];   // not even his own spot reads as the crown's grass: the data cannot vouch for it, so no nudge (never one that floats him over the face)
}
