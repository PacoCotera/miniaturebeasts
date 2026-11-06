// The release's save reset (release 21b): what a page does with what it finds under the save key. One module for both pages (the Companion and the Station), pure: nothing here reads a page or writes a save.
// Save v10 is the first of the twenty kinds and generator 5. A save of v8 or v9 holds mibis and pods of the earlier art and species: it is copied once, byte for byte, to <key>.pre10
// (never read by play) and a new realm starts. A save above the page's own version, and bytes it cannot read, stay read-only as they were. Whichever page opens first does the reset;
// the other finds v10 and plays. `RESET_V` is the version a page writes after a reset.
export const RESET_V = 10, RESET_FROM = [8, 9];
// 'none' (an empty slot: a new realm, today's path), 'play' (a v10 save), 'reset' (a v8 or v9 save; `from` says which), 'newer' (above v10) or 'broken' (unreadable).
export function resetPlan(raw, playV = RESET_V) {
  if (raw == null || raw === "") return { action: "none" };
  let s; try { s = JSON.parse(raw); } catch (e) { return { action: "broken" }; }
  if (!s || typeof s !== "object" || Array.isArray(s)) return { action: "broken" };
  if (typeof s.v === "number" && s.v > playV) return { action: "newer" };
  if (s.v === playV) return { action: "play" };
  if (RESET_FROM.includes(s.v)) return { action: "reset", from: s.v };
  return { action: "broken" };
}
// The copy a reset keeps: <key>.pre10, untouched, never read by play. An older <key>.pre9 is removed at the reset. Returns true when the copy is in place and equal to `raw`; false when it could not be
// made (the page then opens read-only and writes nothing, as it did for .pre9). A copy already there is kept: it is the oldest bytes.
export function keepPre10(store, key, raw) {
  const k = key + ".pre10";
  try {
    if (store.getItem(k) == null) { store.setItem(k, raw); if (store.getItem(k) !== raw) return false; }
    try { store.removeItem(key + ".pre9"); } catch (e) { /* an older copy that cannot be removed stays */ }
    return true;
  } catch (e) { return false; }
}
