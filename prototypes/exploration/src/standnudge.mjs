// Where the pawn stands at a cliff top (owner bug #21, "I shouldn't be standing this far from the edge").
// The lip row of a raised land is one whole blocked tile (relief.mjs RING), so a pawn that is stopped by it stands a tile short of where the drawn lip is:
// measured on today's main, about 22 px short with the drop to the north, west or east, and about 6 px with the drop to the south (the lip's mound is drawn over the ring tile's top).
// The walk rule is untouched (the ring still blocks, so no one walks off or into a flank): the pawn is only DRAWN this many px nearer the lip, toward the blocked ring tile at its side.
export const STAND_NUDGE = 16;
const SIDES = [['up', 0, -1, 0, -1], ['left', -1, 0, -1, 0], ['right', 1, 0, 1, 0]];   // [side, dx, dy, nudge x sign, nudge y sign]; the south side needs none

// lay: a layout with tiles, steep (the blocked rock of a raised land's edge), raisedFn(x, y); steep: the same, as lay.steep[y * w + x].
// Returns the [dx, dy] draw offset in pixels at 48 px a tile for a pawn on tile (x, y).
export function standNudge(lay, x, y) {
  if (!lay || !lay.steep || !lay.raisedFn || !lay.raisedFn(x, y) || lay.steep[y * lay.w + x]) return [0, 0];
  let nx = 0, ny = 0;
  for (const [, dx, dy, sx, sy] of SIDES) {
    const X = x + dx, Y = y + dy;
    if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h) continue;
    if (lay.steep[Y * lay.w + X] && lay.raisedFn(X, Y)) { if (sx) nx = sx * STAND_NUDGE; if (sy) ny = sy * STAND_NUDGE; }   // a raised steep tile is a ring tile: the lip itself
  }
  return [nx, ny];
}
