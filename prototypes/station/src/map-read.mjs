// What the map room reads of the Companion's part of the save (station-map-room-build-1). Read only: the Station writes none of it.
// The reach, where a start may go and the marks are the Companion's own rules (exploration/src/map-rules.mjs, one module for both pages); the land is
// made from the save's seed and slot as the Companion makes it (worldOf in exploration/index.html), so the same save gives the same land on both.
import { genWorld7 } from "../../exploration/src/gen7/world7.mjs";
import { softGround, bankEdges, passableIn } from "../../exploration/src/logic/world.mjs";
import { TIER, reachCellsIn, placeValidIn, firstPlacementOf, keptPlacesOf } from "../../exploration/src/map-rules.mjs";

// The mounted region of the save: its record, its map (the veil, the wild ones, the pins, where she was seen, the last start) and its id.
// The save keeps every region's map in its record (regions.mjs serialize): the last start crosses as the region's map.lastPos (design slip 8: yes, it reaches the Station).
// The cells the map shows: the Companion's seen record (map.seen.rev), or the field an older save kept (map.revealed).
const revealedOf = (M) => (M.seen && Array.isArray(M.seen.rev) ? M.seen.rev : M.revealed);
export function regionOf(sv) {
  const regions = sv && Array.isArray(sv.regions) ? sv.regions : [];
  const R = regions.find((r) => r && r.id === sv.here) || regions[0];
  if (!R || R.gen !== 7 || !R.map || !Array.isArray(revealedOf(R.map))) return null;
  return R;
}
const worlds = new Map();
// The land of a region, as the Companion's page makes it. Kept by seed and slot: the Station draws it again on every press.
export function landOf(R, seed) {
  const key = seed + ":" + R.slot.join(",");
  if (!worlds.has(key)) { const g = genWorld7(seed, R.slot); g.soft = softGround(g, seed); g.banks = bankEdges(g, seed); worlds.set(key, g); if (worlds.size > 4) worlds.delete(worlds.keys().next().value); }
  return worlds.get(key);
}
// The Probe's tier as fitted and the partner's crossing: the reach is drawn for whoever leads now (design slip 7). `can` is { sure, bank }, the leader's abilities.
export const tierRange = (tier) => TIER[tier === 2 ? 2 : 1].range;

// Everything the room draws, from the save. Returns null when the save has no generator 7 world (nothing to show).
//   { id, G, revealed, lastPos, first, tier, range, passable, reach(start, can), valid(cell), wild: [{ id, sp, c }], kept: [{ id, place, part }], pins }
export function mapOf(sv, can = {}) {
  const R = regionOf(sv); if (!R || typeof (sv.seed ?? (sv.regions[0] && sv.regions[0].seed)) !== "number") return null;
  const seed = sv.regions[0].seed, G = landOf(R, seed), M = R.map, tier = sv.tier === 2 ? 2 : 1, revealed = revealedOf(M);
  const passable = (c) => passableIn(G, c);
  const first = firstPlacementOf(revealed);
  const opts = { sure: !!can.sure, bank: can.bank ? "all" : undefined };
  const wild = (Array.isArray(M.cr) ? M.cr : []).filter((q) => q && q.sp === 0 && !q.cv && revealed[q.c]).map((q) => ({ id: q.id, sp: q.sp, c: q.c }));
  return {
    id: R.id, G, revealed, first, tier, range: tierRange(tier), passable,
    lastPos: Number.isInteger(M.lastPos) ? M.lastPos : null,
    reach: (start, ab = opts) => reachCellsIn(G, start, tierRange(tier), { sure: !!ab.sure, bank: ab.bank ? "all" : undefined }),
    valid: (cell, starts = null) => placeValidIn({ G, revealed, passable, starts }, cell),
    wild, pins: Array.isArray(M.pins) ? M.pins : [],
    kept: keptPlacesOf({ seenAt: sv.seenAt, keeps: sv.keeps, revealed }),
  };
}
