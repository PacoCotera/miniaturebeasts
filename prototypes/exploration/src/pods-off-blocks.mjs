// A pod left in a place (S.pods: k the place, x, y its tile) that a newer baked place now blocks (a keepers' place stands on its tile: gen7/keepers.mjs) moves, once, to the nearest free tile of the same place.
// The generator never reads a save (the Station bakes one place for every save and device), so the Companion does this when the place's layout is made. Pure but for the pods it moves.
// lay: { key, w, h, tiles, reach, feats }; blocked(tile): the tile value blocks the pawn (T_BLOCK). Returns the pods moved: [{ id, from: [x, y], to: [x, y] }].
export function movePodsOffBlocks(pods, lay, blocked) {
  const { w, h } = lay, at = (x, y) => y * w + x, out = [];
  const mine = pods.filter(p => p.k === lay.key && !p.h && p.x >= 0 && p.y >= 0);
  const stuck = mine.filter(p => p.x < w && p.y < h && blocked(lay.tiles[at(p.x, p.y)]));
  for (const p of stuck) {
    const taken = (x, y) => mine.some(q => q !== p && q.x === x && q.y === y) || (lay.feats || []).some(f => f.x === x && f.y === y);
    let best = null, bd = Infinity;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (blocked(lay.tiles[at(x, y)]) || !lay.reach[at(x, y)] || taken(x, y)) continue;
      const d = (x - p.x) ** 2 + (y - p.y) ** 2; if (d < bd) { bd = d; best = [x, y]; }   // the first of the nearest in reading order
    }
    if (best) { out.push({ id: p.id, from: [p.x, p.y], to: best }); p.x = best[0]; p.y = best[1]; }
  }
  return out;
}
