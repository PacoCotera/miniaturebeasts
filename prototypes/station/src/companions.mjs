// The Companion is the player's identity: every save is keyed by its Companion's id, and the Station keeps the map from the player to the Companion.
//
//   the Companion's id   made once per Companion, a stable random id, kept under `mb-companion-<slot>` as { id, name, slot, at } (the sandbox's second Companion is slot B)
//   its save             the v8 save, unchanged in shape, under `mb-save-v8@<id>`; the save carries the id as its top-level `companionId` (the Companion's field)
//   the Station's map    `mb-station-companions`: { v: 1, active, known: [{ id, name, at }] } in the Station's own storage; the active id is the last Companion docked,
//                        and the Station (and the Caddy beside it) show that player's world until another Companion docks
//
// The single shared save of earlier builds (`mb-save-v8`) moves under Companion A's id at the first load of either page, byte for byte, so nothing is lost; bytes that
// are not a v8 save a Companion can load stay where they are (the Companion page shows them read-only, as before). In the sandbox both devices share one origin's
// storage, so either page may run the move; on devices the Companion moves its own save and the Station learns its id at the first dock.
//
// Not built: replacing a lost Companion (`replaceCompanion` is the seam: a new Companion takes over a known id's save and its place in the map).
export const LEGACY_KEY = "mb-save-v8", SAVE_PREFIX = "mb-save-v8@", ID_PREFIX = "mb-companion-", MAP_KEY = "mb-station-companions";
export const SLOTS = ["A", "B"];
export const saveKeyOf = (id) => SAVE_PREFIX + id;
export const slotName = (slot) => "Companion " + slot;
const ID_RE = /^c[0-9a-z]{12}$/;
export const newCompanionId = (rand = Math.random) => "c" + Array.from({ length: 12 }, () => "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(rand() * 36)]).join("");
const read = (store, key) => { try { const v = store.getItem(key); return v == null ? null : JSON.parse(v); } catch { return null; } };
// A legacy save that a Companion can load: a v8 object with its world's seed, creatures and mibis.
export const loadableV8 = (o) => !!o && typeof o === "object" && !Array.isArray(o) && o.v === 8 && typeof o.seed === "number" && Array.isArray(o.cr) && Array.isArray(o.mibis);

// The Companion's own identity in a slot: made once and kept. Slot A, made while the legacy save is still there, takes the id that save already carries, if any.
export function companionOf(store, slot = "A", { rand = Math.random, now = Date.now } = {}) {
  if (!SLOTS.includes(slot)) slot = "A";
  const key = ID_PREFIX + slot, had = read(store, key);
  if (had && ID_RE.test(had.id)) return had;
  const legacy = slot === "A" ? read(store, LEGACY_KEY) : null;
  const me = { id: legacy && ID_RE.test(legacy.companionId) ? legacy.companionId : newCompanionId(rand), name: slotName(slot), slot, at: now() };
  try { store.setItem(key, JSON.stringify(me)); } catch { /* no storage: this visit only */ }
  return me;
}
// The move, once: the single shared save goes under Companion A's key, byte for byte, and the old key is removed. Returns what it did.
export function migrateLegacy(store, opts) {
  let raw = null; try { raw = store.getItem(LEGACY_KEY); } catch { return { moved: false }; }
  if (raw == null) return { moved: false };
  let o = null; try { o = JSON.parse(raw); } catch { /* not a save: stays */ }
  if (!loadableV8(o)) return { moved: false, kept: true };   // bytes no page can load stay where they are
  const me = companionOf(store, "A", opts), key = saveKeyOf(me.id);
  try { if (store.getItem(key) != null) return { moved: false, kept: true, id: me.id }; store.setItem(key, raw); if (store.getItem(key) !== raw) return { moved: false, kept: true }; store.removeItem(LEGACY_KEY); }
  catch { return { moved: false, kept: true }; }
  return { moved: true, id: me.id, key };
}

// ---- the Station's side ----
// The map, made at the Station's first load: the Companion the old shared save belonged to (Companion A) is the active one.
export function stationMap(store, opts) {
  migrateLegacy(store, opts);
  const m = read(store, MAP_KEY);
  if (m && m.v === 1 && ID_RE.test(m.active) && Array.isArray(m.known) && m.known.some((k) => k.id === m.active)) return m;
  const a = companionOf(store, "A", opts), map = { v: 1, active: a.id, known: [{ id: a.id, name: a.name, at: a.at }] };
  writeMap(store, map); return map;
}
function writeMap(store, map) { try { store.setItem(MAP_KEY, JSON.stringify(map)); } catch { /* in memory */ } }
export const activeId = (store, opts) => stationMap(store, opts).active;
export const activeSaveKey = (store, opts) => saveKeyOf(activeId(store, opts));
// A Companion docked: it becomes the active one, and joins the known list the first time. Returns { map, switched }.
export function companionDocked(store, who, { now = Date.now } = {}) {
  const map = stationMap(store);
  if (!who || !ID_RE.test(who.id)) return { map, switched: false };
  const known = map.known.find((k) => k.id === who.id);
  if (!known) map.known.push({ id: who.id, name: typeof who.name === "string" ? who.name.slice(0, 24) : null, at: now() });
  else if (typeof who.name === "string" && who.name && known.name !== who.name) known.name = who.name.slice(0, 24);
  const switched = map.active !== who.id; map.active = who.id;
  writeMap(store, map); return { map, switched };
}
export const knownCompanion = (store, id) => stationMap(store).known.find((k) => k.id === id) ?? null;
// The seam for a lost Companion: a new Companion would take over `lostId`'s save and its place in the map. Not built yet.
export function replaceCompanion(store, lostId, newId) { throw new Error("replacing a lost Companion is not built yet (" + lostId + " → " + newId + ")"); }
