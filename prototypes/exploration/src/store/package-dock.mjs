// The dock record's page side: what the Station offers at a seat and what the Companion keeps once it has taken it. No imports: the play shell is served unbundled and reads this
// file directly (package-store.mjs pulls in the generator, which it cannot).
//   summary  { id, seed, slot, v, realmRev, placeRev, tag, done, total, whole, sha }: sha is the sha256 (hex) of the header's cell list (cell:sha pairs in cell order), so equal headers, equal sha.
// The Station offers its package's summary at a seat; the Caddy's dock decides (caddy/dock.mjs decideTake); `takePackage` is the Companion's side: on the web the transfer is a no-op copy (one
// IndexedDB), so taking is writing the marker the Companion plays from (place-store packageUse); the hardware desk's flash write slots in at the same step.
// PACKAGE_FORMAT 2: a package cell is the .mbplace bytes (place format 2). Format 1 (the object record { ir, place }) is another id, never read as bytes: it is rebaked at the Station and taken at the next seat.
export const PACKAGE_FORMAT = 2, PKG = 'pkg7:';

// The browser's store, for the Station, the Companion and the play shell alike: its own IndexedDB database ('mb-packages', store 'kv'), so nothing of the place store's list can evict it. { get, set, del, keys }; tests give a Map-backed one.
export async function idbKv() {
  const db = await new Promise((ok, no) => { const q = indexedDB.open('mb-packages'); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
  const run = (mode, f) => new Promise((ok, no) => { const tx = db.transaction('kv', mode), r = f(tx.objectStore('kv')); tx.oncomplete = () => ok(r.result); tx.onerror = tx.onabort = () => no(tx.error); });
  return { get: k => run('readonly', s => s.get(k)), set: (k, v) => run('readwrite', s => s.put(v, k)), del: k => run('readwrite', s => s.delete(k)), keys: () => run('readonly', s => s.getAllKeys()) };
}
export async function shaOfBytes(bytes) {   // sha256, hex
  const h = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  return Array.from(h, x => x.toString(16).padStart(2, '0')).join('');
}

const heldKey = ({ seed, slot }) => 'held#' + seed + ':' + slot[0] + ',' + slot[1];
export const heldOf = (kv, region) => kv.get(heldKey(region)).then(h => h || null);
async function packageSummary(header) {
  const cells = Object.keys(header.sha).map(Number).sort((a, b) => a - b), sha = await shaOfBytes(new TextEncoder().encode(cells.map(c => c + ':' + header.sha[c]).join('\n')));
  return { id: header.id, seed: header.seed, slot: header.slot, v: header.v, realmRev: header.realmRev, placeRev: header.placeRev, tag: header.tag || '', done: header.done, total: header.order.length, whole: !!header.whole, sha };
}
// The Station's newest package (by the time its header was made) of the seating Companion's save region (seed + slot + v) as a summary, or null when it has none (another world's or region's package is never offered).
export async function offerOf(kv, region) {
  let best = null;
  if (!region || !Array.isArray(region.slot)) return null;
  for (const k of await kv.keys()) { if (typeof k !== 'string' || !k.startsWith(PKG) || !k.endsWith('#head')) continue; const h = await kv.get(k); if (h && h.format === PACKAGE_FORMAT && h.seed === region.seed && h.v === region.v && Array.isArray(h.slot) && h.slot[0] === region.slot[0] && h.slot[1] === region.slot[1] && (!best || (h.at || 0) > (best.at || 0))) best = h; }
  return best ? packageSummary(best) : null;
}
export const takePackage = (kv, summary) => kv.set(heldKey(summary), summary);
