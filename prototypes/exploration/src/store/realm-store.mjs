// A new world takes seconds to make (generator 7's realm: the region labels, the levels at tile scale, the stairs), and the page must not freeze
// while it does. readyRealm(seed) makes sure it is in the generator's cache before the page asks for it:
//   - already there: nothing to do;
//   - kept from an earlier visit in the browser's IndexedDB (idb-keyval): read back, so a returning player waits once;
//   - else made in a module Web Worker (src/worker.mjs), kept in IndexedDB for the next visit, and handed to the generator's cache.
// Where there is no Worker (a test's sandbox) or the worker fails, the caller's own first use makes the realm on the page's thread, as it always did.
// Only the newest few worlds are kept (KEEP): a realm is about 0.3 MB.
import { get, set, del } from 'idb-keyval';
import { REALM_REV, REALM_STEPS, hasRealm7, setRealm7 } from '../gen7/region.mjs';
import { presetSector, hasSector } from '../world7.mjs';

const KEEP = 3, INDEX = 'realm7:index', keyOf = seed => `realm7:${REALM_REV}:${seed}`;

function inWorker(seed, onStep) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('../worker.mjs', import.meta.url), { type: 'module' });
    const end = (f, v) => { w.terminate(); f(v); };
    w.onmessage = e => { if (e.data && e.data.step != null) { if (onStep) onStep(e.data.step, e.data.of); return; }   // a stage of the making: passed on to the wait's pips
      return e.data && e.data.realm ? end(resolve, e.data.realm) : end(reject, new Error((e.data && e.data.error) || 'the realm was not made')); };
    w.onerror = e => end(reject, new Error((e && e.message) || 'the realm worker failed'));
    w.postMessage({ seed });
  });
}

// Returns how the realm came: 'cached' (already in the generator), 'stored' (IndexedDB), 'worker' (made off the page), 'page' (left to the page: no worker). `times` collects the milliseconds of each step.
// onStep(done, of): the real stages, for the wait's pips; a realm that is cached or read back from the browser's store jumps to full at once.
export async function readyRealm(seed, times = {}, onStep) {
  const full = () => { if (onStep) onStep(REALM_STEPS, REALM_STEPS); };
  if (hasRealm7(seed)) { full(); return 'cached'; }
  const t0 = performance.now(), idb = typeof indexedDB !== 'undefined';
  if (idb) {
    try { const hit = await get(keyOf(seed)); if (hit && hit.realm) { setRealm7(seed, hit.realm); times.stored = performance.now() - t0; full(); return 'stored'; } } catch (e) { console.warn('the kept realm could not be read: it is made again', e); }
  }
  if (typeof Worker === 'undefined') return 'page';
  let realm;
  try { realm = await inWorker(seed, onStep); } catch (e) { console.warn('the realm worker did not run; the page makes the realm', e); return 'page'; }
  times.worker = performance.now() - t0;
  setRealm7(seed, realm); full();
  if (idb) {
    try {
      await set(keyOf(seed), { realm });
      const seen = (await get(INDEX)) || [], next = [seed, ...seen.filter(s => s !== seed)];
      for (const old of next.slice(KEEP)) await del(keyOf(old));
      await set(INDEX, next.slice(0, KEEP));
    } catch (e) { console.warn('the realm was not kept in the browser: it is here for this visit only', e); }
  }
  return 'worker';
}

// A region's sector (world7.mjs sectorOfRegion: 4 x 4 blocks of ground and level a place, and the realm's lines), the land the reach view and every map are painted from. It is made from the realm alone, so no place is
// built: about a third of a second in a worker, then kept in memory (it is not stored: it is made again faster than it is read). Returns 'cached', 'worker' or 'page' (no worker: the page makes it on the spot, world7.mjs sectorNow).
// cells (the places in view): they are asked first and held as soon as they come (the promise resolves then); the rest of the region follows in the same worker, and onWhole() is called when it is held.
export async function readySector(seed, slot, realm, cells, onWhole) {
  if (hasSector(seed, slot)) return 'cached';
  if (typeof Worker === 'undefined') return 'page';
  let first = null;
  const sec = await new Promise((resolve, reject) => {
    const w = new Worker(new URL('../worker.mjs', import.meta.url), { type: 'module' });
    const end = (f, v) => { w.terminate(); f(v); }, fail = msg => { if (first) { w.terminate(); return; } end(reject, new Error(msg)); };
    w.onmessage = e => {
      const d = e.data || {};
      if (!d.sector) { fail(d.error || 'the sector was not made'); return; }
      if (d.part) { first = d.sector; presetSector(seed, slot, d.sector); resolve(d.sector); return; }
      presetSector(seed, slot, d.sector); w.terminate(); if (!first) resolve(d.sector); if (onWhole) onWhole();
    };
    w.onerror = e => fail((e && e.message) || 'the sector worker failed');
    if (cells && cells.length) w.postMessage({ op: 'sector', seed, slot, realm, cells });
    w.postMessage({ op: 'sector', seed, slot, realm });
  }).catch(e => { console.warn('the sector worker did not run; the page makes the sector', e); return null; });
  return sec ? 'worker' : 'page';
}
