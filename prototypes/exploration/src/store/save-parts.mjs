// A save read as data: what it holds and what of it stays. No storage and no page state here.
import { MAP_KEYS, serialize } from "../logic/regions.mjs";

// Every string `id` held anywhere in a save, at any depth (pods in the field, the cargo, the bay, the hold, a report, the Station's part).
export function idsIn(o, out = new Set()) {
  if (Array.isArray(o)) for (const v of o) idsIn(v, out);
  else if (o && typeof o === 'object') { if (typeof o.id === 'string') out.add(o.id); for (const k of Object.keys(o)) idsIn(o[k], out); }
  return out;
}

// New world, from the menu: the map is replaced and the game is not (the owner's words: "under no circumstance you should delete user game data").
// What the player has made (mibis, the Station's part, crates, the hold, the Library, bonds, the world turn) is read off the old save here, as a copy;
// what belongs to the old land (every region and its map, the expedition on it, the report, the screen the player was on) is left out. Carried mibis come home.
// An expedition on the old land ends with it: its cargo goes to the hold (nothing in it is lost), the Probe's Shield stays as it was.
const NEW_MAP_ONLY = new Set(['v', 'seed', 'regions', 'here', 'phase', 'ui', 'exp', 'report', 'walkTurn', 'biomeV', 'realmRev', 'pods', 'cr', 'gen', 'hold', ...MAP_KEYS]);
export function keepOfGame(old) {
  const o = serialize(old), keep = {};
  for (const k of Object.keys(o)) if (!NEW_MAP_ONLY.has(k)) keep[k] = o[k];
  const ex = old.exp, cargo = ex && ex.cargo && (ex.cargo.e | 0 || ex.cargo.d | 0 || ex.cargo.s | 0 || (ex.cargo.pods || []).length || (ex.cargo.samples || []).length) ? ex.cargo : null;
  const hold = cargo || old.hold; if (hold) keep.hold = hold;
  const k2 = JSON.parse(JSON.stringify(keep));
  k2.carried = []; k2.lead = null;   // the mibis with you come home
  return k2;
}
