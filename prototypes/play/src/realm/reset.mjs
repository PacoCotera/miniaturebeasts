// The release's save reset (release 21b): what a page does with what it finds under the save key. One module for both pages (the Companion and the Station), pure: nothing here reads a page or writes a save.
// Save v10 is the first of the twenty kinds and generator 5. A save of v8 or v9 holds mibis and pods of the earlier art and species: it is copied once, byte for byte, to <key>.pre10
// (never read by play) and a new realm starts. A save above the page's own version, and bytes it cannot read, stay read-only as they were. Whichever page opens first does the reset;
// the other finds v10 and plays. `RESET_V` is the version a page writes after a reset.
export const RESET_V = 10, RESET_FROM = [8, 9];
// 'none' (an empty slot: a new realm, today's path), 'play' (a v10 save), 'reset' (a v8 or v9 save; `from` says which), 'newer' (above v10) or 'broken' (unreadable).
// A page that plays only newer generators passes `oldGens` (the Companion at generator 6 passes [5]): a save of the page's own version whose every region is of one of those is the same kind of
// reset ({ action: "reset", from: <its version>, gen: true }; its copy is <key>.gen5, see keepGen5), so a world of a frozen generator never opens. The Station passes none and plays the save.
export function resetPlan(raw, playV = RESET_V, oldGens = null) {
  if (raw == null || raw === "") return { action: "none" };
  let s; try { s = JSON.parse(raw); } catch (e) { return { action: "broken" }; }
  if (!s || typeof s !== "object" || Array.isArray(s)) return { action: "broken" };
  if (typeof s.v === "number" && s.v > playV) return { action: "newer" };
  if (s.v === playV && oldGens && Array.isArray(s.regions) && s.regions.length && s.regions.every((r) => r && oldGens.includes(r.gen))) return { action: "reset", from: s.v, gen: true };
  if (s.v === playV) return { action: "play" };
  if (RESET_FROM.includes(s.v)) return { action: "reset", from: s.v };
  return { action: "broken" };
}
// The copy a reset keeps: <key>.pre10, untouched, never read by play. An older <key>.pre9 is removed at the reset. Returns true when the copy is in place and equal to `raw`; false when it could not be
// made (the page then opens read-only and writes nothing, as it did for .pre9). A copy already there is kept: it is the oldest bytes.
// The copy a generator reset keeps: <key>.gen5, the generator 5 world's bytes, untouched, never read by play; one already there is kept (the oldest). true when the copy is in place and equal; false when it could not be made.
export function keepGen5(store, key, raw) {
  const k = key + ".gen5";
  try { if (store.getItem(k) == null) { store.setItem(k, raw); if (store.getItem(k) !== raw) return false; } return true; } catch (e) { return false; }
}
export function keepPre10(store, key, raw) {
  const k = key + ".pre10";
  try {
    if (store.getItem(k) == null) { store.setItem(k, raw); if (store.getItem(k) !== raw) return false; }
    try { store.removeItem(key + ".pre9"); } catch (e) { /* an older copy that cannot be removed stays */ }
    return true;
  } catch (e) { return false; }
}
