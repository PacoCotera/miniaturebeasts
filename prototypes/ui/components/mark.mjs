// A mark: a small picture the frame's language uses (a room's mark, the sun, a key cap, the Companion's glyph and face). Each is a slot in the
// manifest at its exact size; until a signed master or stand-in fills it nothing is drawn there and the layout does not move.
import { registerSlot, isFilled } from "../assets.mjs";

export function markNode(id, assetId, rect, until) {
  const [x, y, w, h] = rect; registerSlot({ id: assetId, w, h, policy: "stationChrome", until });
  return isFilled(assetId) ? [{ id, kind: "sprite", rect: [x, y, w, h], asset: assetId }] : [];
}

// A mark that has a flat stand-in drawn from the frame's own shapes (a lamp is a filled square): the master when one is placed, the square until then.
export function markOr(id, assetId, rect, until, fallback) {
  const m = markNode(id, assetId, rect, until);
  return m.length ? m : [fallback];
}
