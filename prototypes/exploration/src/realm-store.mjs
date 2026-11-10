// A new world takes seconds to make (generator 7's realm: the region labels, the levels at tile scale, the stairs), and the page must not freeze while it does. readyRealm(seed) makes sure the
// realm of a seed is in the generator's cache before the page asks for it:
//   - already there: nothing to do;
//   - kept from an earlier visit in the browser's IndexedDB (idb-keyval): read back, so a returning player waits once;
//   - else made in a module Web Worker (src/realm-worker.mjs), kept in IndexedDB for the next visit, and handed to the generator's cache.
// Where there is no Worker (a test's sandbox) or the worker fails, the caller's own first use makes the realm on the page's thread, as it always did.
// Only the newest few worlds are kept (KEEP): a realm is about 0.3 MB.
import { get, set, del } from 'idb-keyval';
import { REALM_REV, hasRealm7, setRealm7 } from './gen7/region.mjs';

const KEEP = 3, INDEX = 'realm7:index', keyOf = seed => `realm7:${REALM_REV}:${seed}`;

function inWorker(seed) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./realm-worker.mjs', import.meta.url), { type: 'module' });
    const end = (f, v) => { w.terminate(); f(v); };
    w.onmessage = e => (e.data && e.data.realm ? end(resolve, e.data.realm) : end(reject, new Error((e.data && e.data.error) || 'the realm was not made')));
    w.onerror = e => end(reject, new Error((e && e.message) || 'the realm worker failed'));
    w.postMessage({ seed });
  });
}

// Returns how the realm came: 'cached' (already in the generator), 'stored' (IndexedDB), 'worker' (made off the page), 'page' (left to the page: no worker). `times` collects the milliseconds of each step.
export async function readyRealm(seed, times = {}) {
  if (hasRealm7(seed)) return 'cached';
  const t0 = performance.now(), idb = typeof indexedDB !== 'undefined';
  if (idb) {
    try { const hit = await get(keyOf(seed)); if (hit) { setRealm7(seed, hit); times.stored = performance.now() - t0; return 'stored'; } } catch (e) { /* no storage: made again */ }
  }
  if (typeof Worker === 'undefined') return 'page';
  let R;
  try { R = await inWorker(seed); } catch (e) { console.warn('the realm worker did not run; the page makes the realm', e); return 'page'; }
  times.worker = performance.now() - t0;
  setRealm7(seed, R);
  if (idb) {
    try {
      await set(keyOf(seed), R);
      const seen = (await get(INDEX)) || [], next = [seed, ...seen.filter(s => s !== seed)];
      for (const old of next.slice(KEEP)) await del(keyOf(old));
      await set(INDEX, next.slice(0, KEEP));
    } catch (e) { /* the realm is kept for this visit only */ }
  }
  return 'worker';
}
