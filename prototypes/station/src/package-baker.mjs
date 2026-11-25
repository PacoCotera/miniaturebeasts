// The Station bakes the Companion's region (baked-package-1; scope: build-desk boards/build/baked-package-scope.md): when the Companion's world is known (its save, same origin) and no current package exists for its
// region and revs, the realm's places worker (exploration/src/realm-worker.mjs, the one the Companion bakes with) makes the cells in the order of package-store.mjs bakeOrder (the start place, its reach, the ring, the rest
// nearest first) and each is written to the package as it lands. The page's thread only receives a cell, hashes it and hands it to IndexedDB: the bake is the worker's.
// Nothing here changes a place: the cell kept is the cell the worker made, from the same seed, slot and v.
// Pure parts take their world from the caller (a test gives its own worker, store and realm); `startPackage` is the page's wiring.

// What the save names: the region a package is for, and where its order starts. null: no generator 7 world in the save.
const biomeV = (sv) => (sv && sv.biomeV != null ? sv.biomeV : 1);   // the realm's kind version, as the Companion reads it (exploration/src/regions.mjs biomeVersion), so this check imports no generator
export function wantOf(sv, biomeVersion = biomeV) {
  const regions = sv && Array.isArray(sv.regions) ? sv.regions : [], R = regions.find(r => r && r.id === sv.here) || regions[0];
  if (!R || R.gen !== 7 || !regions[0] || typeof regions[0].seed !== 'number' || !Array.isArray(R.slot)) return null;
  const ex = sv.exp && Array.isArray(sv.exp.reach) && Number.isInteger(sv.exp.pos) ? sv.exp : null;
  return { seed: regions[0].seed, slot: R.slot, v: biomeVersion(sv), exp: ex ? { pos: ex.pos, reach: ex.reach } : null, tier: sv.tier === 2 ? 2 : 1 };
}

// Bakes one package. deps: { kv, kit: { ctx, tag }, makeWorker(): worker, realm(seed): Promise (the realm is in the generator when it resolves), world: { genWorld7, realm7 (the made realm), decorSites, madeBanks },
// order: package-store's functions, onProgress(header), limit (cells: a test's floor) }. Returns { header, whole }.
export async function bakePackage(want, deps) {
  const P = deps.store, { kv, kit } = deps, meta = { seed: want.seed, slot: want.slot, v: want.v, tag: kit.tag };
  if (!deps.limit) { const had = await P.findPackage(kv, meta); if (had && had.whole) return { header: had, whole: true, how: 'current' }; }
  const T = (name, f) => { const t = deps.now(), r = f(); if (deps.mark) deps.mark(name, Math.round(deps.now() - t)); return r; };   // the page's own thread work, by step (the report's "what the page does")
  { const t = deps.now(); await deps.realm(want.seed); if (deps.mark) deps.mark('realm (wait, worker)', Math.round(deps.now() - t)); }
  const W = deps.world, G = T('genWorld7', () => W.genWorld7(want.seed, want.slot)), from = want.exp ? { pos: want.exp.pos, reach: want.exp.reach } : { start: G.spawns[0], tier: want.tier };
  const order = T('bakeOrder', () => P.bakeOrder(G, from)), h = await P.openPackage(kv, meta, order, deps.now);
  const todo = deps.limit ? h.todo.filter(c => order.cells.indexOf(c) < deps.limit) : h.todo;
  if (todo.length) await new Promise((resolve, reject) => {
    const w = deps.makeWorker(); let left = todo.length, chain = Promise.resolve(), failed = 0;
    const end = () => { try { w.terminate(); } catch { /* gone */ } };
    const fin = () => chain.then(() => { end(); resolve(); }, e => { end(); reject(e); });
    w.onerror = e => { end(); reject(new Error((e && e.message) || 'the places worker failed')); };
    w.onmessage = e => {
      const m = e.data || {}; if (m.op !== 'baked') return;
      if (!m.ir) { failed++; console.warn('a place was not made for the package', m.cell, m.error); if (--left === 0) fin(); return; }
      chain = chain.then(async () => {
        const sha = await P.shaOfPlace(m.place);
        await P.putCell(h, m.cell, { ir: m.ir, place: m.place }, sha);
        await P.putRegion(h, m.sites, m.banks);
        if (deps.onProgress) deps.onProgress(h.header);
        if (deps.yieldTurn) await deps.yieldTurn();
      });
      chain.catch(() => {});
      if (--left === 0) fin();
    };
    w.postMessage({ op: 'init', ctx: kit.ctx });
    w.postMessage(T('seed message', () => ({ op: 'seed', seed: want.seed, realm: W.realm7(want.seed), sites: W.decorSites(want.seed), banks: W.madeBanks(want.seed) })));
    w.postMessage({ op: 'bake', seed: want.seed, slot: want.slot, v: want.v, cells: todo, first: false });
  });
  const whole = deps.limit ? false : await P.finishPackage(h);
  return { header: h.header, whole, how: 'baked' };
}

// ---- the page's wiring ----
import { loadBuild } from '../../play/src/footer.mjs';
// The tile set the places are baked with, as the Companion loads it (exploration/index.html loadPlaces): the same files, the same hash. Fetched from the folders the bundle keeps in place (/play/places, /play/exploration/art).
async function loadKit(mods) {
  const here = location.href;
  const b = await loadBuild(new URL('../../build.json', here).href), ver = b && b.version ? String(b.version) : '';   // no stamp: the bytes are read as they are
  const vurl = u => ver ? u + '?v=' + encodeURIComponent(ver) : u, bytes = async u => { const r = await fetch(vurl(u)); if (!r.ok) throw new Error('could not load ' + u); return new Uint8Array(await r.arrayBuffer()); };
  const base = new URL('../places/', here).href, [tsB, terB, layB] = await Promise.all([bytes(base + 'baked/ninja-test.mbtiles'), bytes(base + 'baked/terrain.json'), bytes(new URL('../exploration/art/gen7/layers.json', here).href)]);
  const rd = await import('../../places/src/format/read.mjs');
  return { ctx: { ts: rd.readTileSet(tsB), terrains: JSON.parse(new TextDecoder().decode(terB)).terrains, desc: mods.world7.reviveLayers(JSON.parse(new TextDecoder().decode(layB))) }, tag: mods.places.placesTag(tsB, terB, layB) };
}
let RUNNING = null, DONE_KEY = '';
export const packageState = { phase: 'idle', done: 0, of: 0, floor: 0, whole: false, error: null, header: null, steps: {} };
// The save is known: bake its region if no current package is there. Idempotent: the same world and place are not started twice; a different one waits for the run in hand.
export function startPackage(sv, opts = {}) {
  if (typeof Worker === 'undefined' || typeof indexedDB === 'undefined' || typeof document === 'undefined' || document.querySelector('script[type="importmap"]')) return null;   // as the Companion's workers: only a bundled page
  const key = JSON.stringify([sv && sv.regions && sv.regions[0] && sv.regions[0].seed, sv && sv.here, sv && sv.exp && sv.exp.pos != null ? 1 : 0, sv && sv.biomeV]);
  if (RUNNING || key === DONE_KEY) return RUNNING;
  RUNNING = (async () => {
    try {
      const want = wantOf(sv); if (!want) { packageState.phase = 'none'; DONE_KEY = key; return null; }
      packageState.startedAt = performance.now(); const tI = packageState.startedAt;
      const [world7, realmStore, place, realm, places, store] = await Promise.all([import('../../exploration/src/world7.mjs'), import('../../exploration/src/realm-store.mjs'), import('../../exploration/src/gen7/place.mjs'), import('../../exploration/src/gen7/region.mjs'), import('../../exploration/src/place-store.mjs'), import('../../exploration/src/package-store.mjs')]);
      const tk = performance.now(), kit = await loadKit({ world7, places }), kv = await store.idbKv(), t0 = performance.now();
      packageState.steps = { imports: Math.round(tk - tI), kit: Math.round(t0 - tk) }; packageState.phase = 'baking';
      const r = await bakePackage(want, {
        store, kv, kit, now: () => performance.now(), limit: opts.limit,
        makeWorker: () => new Worker(new URL('../../exploration/src/realm-worker.mjs', import.meta.url), { type: 'module' }),
        realm: seed => realmStore.readyRealm(seed),
        world: { genWorld7: world7.genWorld7, realm7: realm.realm7, decorSites: place.decorSites, madeBanks: place.madeBanks },
        mark: (name, ms) => { packageState.steps[name] = ms; },
        yieldTurn: () => new Promise(res => setTimeout(res, 0)),   // a turn between cells: the page's frames and keys are read before the next one is written
        onProgress: h => { Object.assign(packageState, { done: h.done, of: h.order.length, floor: h.floor, header: h }); },
      });
      Object.assign(packageState, { phase: r.whole ? 'whole' : 'part', whole: r.whole, header: r.header, ms: Math.round(performance.now() - t0) });
      DONE_KEY = key; return r;
    } catch (e) { packageState.phase = 'failed'; packageState.error = String((e && e.message) || e); DONE_KEY = key; console.warn('the Station could not bake the package', e); return null; }
    finally { RUNNING = null; }
  })();
  return RUNNING;
}
