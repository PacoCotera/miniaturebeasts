// The Companion's identity and the keys its save is kept under (persistence). The Station's side, with the same rules, is prototypes/station/src/companions.mjs.
// The Companion is the player's identity: the save lives under this Companion's own key, mb-save-v8@<its id>. The id is made once per Companion, a stable random id
// kept under mb-companion-<slot> as { id, name, slot, at } (the play page's second Companion is slot B), and stored with the Companion's first write.
// The single shared save of earlier builds (LEGACY_KEY) moves under Companion A's key with its first write once it has loaded.
export const LEGACY_KEY = 'mb-save-v8';
export const keyOfCompanion = id => LEGACY_KEY + '@' + id;
const slotKey = slot => 'mb-companion-' + slot;

// The identity kept for a slot, or null when none is kept. Throws what the storage or the parse throws: the caller says what it does then.
export function keptCompanion(store, slot) {
  const had = JSON.parse(store.getItem(slotKey(slot)) || 'null');
  return had && /^c[0-9a-z]{12}$/.test(had.id) ? had : null;
}
export function newCompanion(slot, at) {
  let id = 'c'; for (const x of crypto.getRandomValues(new Uint8Array(12))) id += '0123456789abcdefghijklmnopqrstuvwxyz'[x % 36];
  return { id, name: 'Companion ' + slot, slot, at };
}
export function keepCompanionAs(store, who) { store.setItem(slotKey(who.slot), JSON.stringify(who)); }
