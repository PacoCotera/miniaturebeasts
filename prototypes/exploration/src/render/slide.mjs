// A crossing between two places is a camera slide of one screen in the walking direction: the picture of the place left slides out, the new place slides in.
export const SLIDE_MS = 300;

// How far along the slide is at `now`, eased out: 0 at its start, 1 at its end.
export function slideAt(sl, now) { const p = Math.min(1, Math.max(0, (now - sl.at) / SLIDE_MS)); return 1 - (1 - p) * (1 - p); }

// The two places are one map. Each layer is a whole screen of its own place; the pawn stands one tile further on in the new one than in the old (the cell across the shared edge).
// The old layer ends (p = 1) where that puts its pawn, the new one starts (p = 0) where its pawn is one tile beyond the old pawn's: so the view scrolls by exactly what the camera of each place
// is off by, and the pawn's line of the map never shifts on the screen, whatever the sizes of the two places (a screen away along the way, a few tiles apart across it).
// sl: the slide ({ dx, dy } the way walked, pl where the pawn stood in the old picture); pl1: where it stands in the new one; ts: the tile drawn; W, Hs: the sliding layer's size.
// rides: the pawn's two spots are on the same map line (the offsets are not the plain screen slide), so the drawing carries the pawn between them.
export function slideOffsets(sl, pl1, ts, W, Hs) {
  const dx = sl.dx, dy = sl.dy, plain = { old: { x: -dx * W, y: -dy * Hs }, nw: { x: dx * W, y: dy * Hs }, rides: false }, pl0 = sl.pl;
  if (!pl0 || !pl1 || !ts) return plain;
  const nw = { x: pl0.x + dx * ts - pl1.x, y: pl0.y + dy * ts - pl1.y }, old = { x: pl1.x - dx * ts - pl0.x, y: pl1.y - dy * ts - pl0.y };
  if (Math.abs(nw.x) > 1.5 * W || Math.abs(nw.y) > 1.5 * Hs) return plain;   // a camera that is not flush with the place's edge gives a distance that is no screen: the plain slide
  return { old, nw, rides: true };
}
