// The places of the reach: each cell's IR and baked place (world7.mjs bakedCell), made in a worker (src/realm-worker.mjs) beside the realm (src/realm-store.mjs).
// The Companion asks for them at set-out (the reach is known then); the page's layout(key) only looks one up and adapts it to the sides that are shut. A cell made is kept in memory for the world
// and in IndexedDB (the newest PLACE_KEEP) beside the realm, so a returning player waits for nothing. PLACE_REV names the generator's place output: bump it with any change to src/gen7, src/bake7.mjs
// or the tile set. Where there is no Worker (the test sandbox, a page served from the source tree) the page bakes the cell itself with the same function (world7.mjs bakedCell).
// A second worker renders a place's ground (the pixel work of places/src/ground.mjs, which the page did a frame at a time): groundAsk, groundTake. It is a second one so that a ground is not queued behind the reach.
import { get, set, del } from 'idb-keyval';
import { REALM_REV, realm7 } from './gen7/region.mjs';
import { decorOf } from './gen7/place.mjs';

const PLACE_REV = 1, PLACE_KEEP = 240, PLACE_INDEX = 'place7:index';
const storeKey = (seed, slot, v, cell) => `place7:${REALM_REV}.${PLACE_REV}:${seed}:${slot[0]},${slot[1]}:${v}:${cell}`;
const memKey = (seed, slot, v, cell) => seed + '|' + slot[0] + ',' + slot[1] + '|' + v + '|' + cell;
const BAKED = new Map(), ASKED = new Set(), GROUNDS = new Map(), GROUND_ASKED = new Set(), WAITERS = [];
const W = { bake: null, ground: null }, CTXS = { bake: null, ground: null };   // the workers, and the places kit each was given
let PW_ON = false, PW_SEED = null, WATCH = null;   // WATCH: the page's call when something arrived (its list of cells to warm is made again)
const wake = () => { for (let i = WAITERS.length - 1; i >= 0; i--) if (WAITERS[i].ok()) WAITERS.splice(i, 1)[0].resolve(); if (WATCH) WATCH(); };
export const placesWatch = fn => { WATCH = fn; };

// The page decides whether the workers run (off for a page served from the source tree).
export function placesOn(on) { PW_ON = !!on && typeof Worker !== 'undefined'; return PW_ON; }
export const placesWorker = () => PW_ON;
export function placesReset() { BAKED.clear(); ASKED.clear(); GROUNDS.clear(); GROUND_ASKED.clear(); PW_SEED = null; wake(); }
export const bakedGet = (seed, slot, v, cell) => BAKED.get(memKey(seed, slot, v, cell)) || null;
export const bakedPut = (seed, slot, v, cell, b) => { BAKED.set(memKey(seed, slot, v, cell), b); };   // made on the page (no worker)

function worker(name, ctx) {
  let w = W[name];
  if (!w) {
    w = W[name] = new Worker(new URL('./realm-worker.mjs', import.meta.url), { type: 'module' }); CTXS[name] = null; if (name === 'bake') PW_SEED = null;
    w.onmessage = e => {
      const m = e.data || {};
      if (m.op === 'baked') {
        const mk = memKey(m.seed, m.slot, m.v, m.cell); ASKED.delete(mk);
        if (m.ir) { const b = { ir: m.ir, place: m.place }; BAKED.set(mk, b); keep(m.seed, m.slot, m.v, m.cell, b); } else console.warn('a place was not made in the worker', m.cell, m.error);
      } else if (m.op === 'land') {
        LAND_ASKED.delete(m.id); if (m.u) { LANDS.set(m.id, m.u); while (LANDS.size > 6) LANDS.delete(LANDS.keys().next().value); }   // a painting nobody came for (the walk moved on) is dropped, the oldest first
      } else if (m.op === 'ground') {
        GROUND_ASKED.delete(m.id);
        if (m.frames) GROUNDS.set(m.id, { frames: m.frames, half: m.half, size: m.size });
      }
      wake();
    };
    w.onerror = e => { console.warn('the places worker failed', e && e.message); try { w.terminate(); } catch (x) { /* gone */ } W[name] = null; PW_ON = false; ASKED.clear(); GROUND_ASKED.clear(); LAND_ASKED.clear(); wake(); };
  }
  if (CTXS[name] !== ctx) { w.postMessage({ op: 'init', ctx }); CTXS[name] = ctx; }
  return w;
}
async function keep(seed, slot, v, cell, b) {
  if (typeof indexedDB === 'undefined') return;
  try {
    const k = storeKey(seed, slot, v, cell); await set(k, b);
    const seen = (await get(PLACE_INDEX)) || [], next = [k, ...seen.filter(s => s !== k)];
    for (const old of next.slice(PLACE_KEEP)) await del(old);
    await set(PLACE_INDEX, next.slice(0, PLACE_KEEP));
  } catch (e) { /* kept for this visit only */ }
}

// Makes sure these cells are being made: read back from IndexedDB, else asked of the worker (nearest first, in the order given).
// kit: { ctx: the places kit as the page loaded it ({ ts, terrains, desc }) }; the seed's realm and Hollow Tree sites go to the worker from the page's generator cache.
export async function readyPlaces(seed, slot, v, cells, kit) {
  const want = cells.filter(c => !BAKED.has(memKey(seed, slot, v, c)) && !ASKED.has(memKey(seed, slot, v, c)));
  for (const c of want) ASKED.add(memKey(seed, slot, v, c));   // held while IndexedDB is read, so a second ask does not repeat it
  if (want.length && typeof indexedDB !== 'undefined') {
    await Promise.all(want.map(async c => { try { const hit = await get(storeKey(seed, slot, v, c)); if (hit && hit.ir && hit.place) { BAKED.set(memKey(seed, slot, v, c), hit); ASKED.delete(memKey(seed, slot, v, c)); } } catch (e) { /* made again */ } }));
  }
  const todo = want.filter(c => !BAKED.has(memKey(seed, slot, v, c)));
  if (todo.length && PW_ON && kit) {
    try {
      const w = worker('bake', kit.ctx);
      if (PW_SEED !== seed) { w.postMessage({ op: 'seed', seed, realm: realm7(seed), sites: decorOf(seed).hollowSites() }); PW_SEED = seed; }   // the page has both (readyRealm gave them): they are sent, not made again
      w.postMessage({ op: 'bake', seed, slot, v, cells: todo });
    } catch (e) { for (const c of todo) ASKED.delete(memKey(seed, slot, v, c)); console.warn('the places worker did not run', e); }
  } else for (const c of todo) ASKED.delete(memKey(seed, slot, v, c));
  wake();
}
// A promise that resolves once the cell is in memory, or is no longer owed (the worker is gone); the caller then asks bakedGet.
export const bakedWhen = (seed, slot, v, cell) => new Promise(resolve => {
  const k = memKey(seed, slot, v, cell), ok = () => BAKED.has(k) || !ASKED.has(k);
  if (ok()) resolve(); else WAITERS.push({ ok, resolve });
});

// A baked place's ground, rendered in the ground worker: its 48 px frames (by clock) and the whole-place picture's. groundTake hands it over once; the page's view holds it from then on.
export function groundAsk(id, place, kit) {   // kit as readyPlaces'
  if (!PW_ON || GROUNDS.has(id) || GROUND_ASKED.has(id)) return false;
  GROUND_ASKED.add(id);
  try { worker('ground', kit.ctx).postMessage({ op: 'ground', id, place }); return true; } catch (e) { GROUND_ASKED.delete(id); return false; }
}
// A painting of the map's land (src/landpaint.mjs), painted in the same worker: landAsk sends the plain inputs, landTake hands the pixels over once.
const LANDS = new Map(), LAND_ASKED = new Set();
export function landAsk(id, inp, kit) {
  if (!PW_ON || LANDS.has(id) || LAND_ASKED.has(id)) return false;
  LAND_ASKED.add(id);
  try { worker('ground', kit.ctx).postMessage({ op: 'land', id, inp }); return true; } catch (e) { LAND_ASKED.delete(id); return false; }
}
export const landPending = id => LAND_ASKED.has(id);
export function landTake(id) { const u = LANDS.get(id); if (u) LANDS.delete(id); return u || null; }
export const groundPending = id => GROUND_ASKED.has(id);
export function groundTake(id) { const g = GROUNDS.get(id); if (g) GROUNDS.delete(id); return g || null; }
