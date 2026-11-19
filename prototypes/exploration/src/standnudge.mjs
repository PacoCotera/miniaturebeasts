// Where the pawn stands at a cliff top (owner bug #21, "I shouldn't be standing this far from the edge").
// The lip row of a raised land is one whole blocked tile (relief.mjs RING), so a pawn that is stopped by it stands a tile short of where the drawn lip is:
// measured on today's main, about 22 px short with the drop to the north, west or east, and about 6 px with the drop to the south (the lip's mound is drawn over the ring tile's top).
// The walk rule is untouched (the ring still blocks, so no one walks off or into a flank): the pawn is only DRAWN this many px nearer the lip, toward the blocked ring tile at its side.
// cliff-stand-2 (AD, bus 38322eef26): on a diagonal edge the full nudge put his feet over the dark face. The nudge now stops where the row under his feet is still the crown's grass:
// grassAt(dx, dy) says whether the ground the place drew at that pixel, dx / dy from the unnudged foot centre (dy 0 = the foot row, 1 = the row under it), is the crown's grass (not the rim's ink or the face).
export const STAND_NUDGE = 16;
const SIDES = [['up', 0, -1, 0, -1], ['left', -1, 0, -1, 0], ['right', 1, 0, 1, 0]];   // [side, dx, dy, nudge x sign, nudge y sign]; the south side needs none

// the grass colour of a drawn pixel: green leads blue (the face is blue-grey, the rim ink near black)
export const isGrass = (r, g, b) => g - b >= 10 && g >= r - 4;

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
  return [nx, ny];   // no share of the nudge, not even none, reads as grass (a night's colours, a prop under his feet): the probe cannot tell, so the cliff-stand-1 nudge stands
}
