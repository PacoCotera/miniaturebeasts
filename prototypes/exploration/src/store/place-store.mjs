// The places of the reach: each cell's IR and baked place (world7.mjs bakedCell), made in a worker (src/worker.mjs) beside the realm (src/store/realm-store.mjs).
// The Companion asks for them at set-out (the reach is known then); the page's layout(key) only looks one up and adapts it to the sides that are shut. A cell made is kept in memory for the world
// and in IndexedDB (the newest PLACE_KEEP) beside the realm, so a returning player waits for nothing. PLACE_REV names the generator's place output: bump it with any change to src/gen7, src/bake7.mjs
// or the tile set. Where there is no Worker (the test sandbox, a page served from the source tree) the page bakes the cell itself with the same function (world7.mjs bakedCell).
// A second worker renders a place's ground (the pixel work of places/src/ground.mjs, which the page did a frame at a time): groundAsk, groundTake. It is a second one so that a ground is not queued behind the reach.
import { get, set, del } from 'idb-keyval';
import { REALM_REV, realm7 } from '../gen7/region.mjs';
import { BAKE_STAGES } from '../waitpips.mjs';
import { decorSites, presetHollowSites, madeBanks, presetBanks } from '../gen7/place.mjs';

export const PLACE_REV = 6;   // exported for the baked package's id (package-store.mjs); the number and its rule are the same
const PLACE_KEEP = 240, PLACE_INDEX = 'place7:index';
// TAG: a hash of the files the tile set and the layers are read from (placesTag, set when the page has loaded them), so a changed tile set never meets a place baked from an older one (owner bugs #127-#129).
let TAG = '';
export function placesTag(...parts) {   // FNV-1a over the bytes of each part (Uint8Arrays), in order
  let h = 0x811c9dc5; for (const p of parts) { for (let i = 0; i < p.length; i++) h = Math.imul(h ^ p[i], 0x01000193) >>> 0; h = Math.imul(h ^ 0xff, 0x01000193) >>> 0; }
  return h.toString(16);
}
export const placesTagSet = t => { TAG = t ? String(t) : ''; };
export const storeKey = (seed, slot, v, cell) => `place7:${REALM_REV}.${PLACE_REV}${TAG ? '.' + TAG : ''}:${seed}:${slot[0]},${slot[1]}:${v}:${cell}`;
const memKey = (seed, slot, v, cell) => seed + '|' + slot[0] + ',' + slot[1] + '|' + v + '|' + cell;
const BAKED = new Map(), ASKED = new Set(), GROUNDS = new Map(), GROUND_ASKED = new Set(), WAITERS = [], STAGES = new Map();
const W = { bake: null, ground: null }, CTXS = { bake: null, ground: null };   // the workers, and the places kit each was given
let PW_ON = false, PW_SEED = null, WATCH = null;   // WATCH: the page's call when something arrived (its list of cells to warm is made again)
const wake = () => { for (let i = WAITERS.length - 1; i >= 0; i--) if (WAITERS[i].ok()) WAITERS.splice(i, 1)[0].resolve(); if (WATCH) WATCH(); };
export const placesWatch = fn => { WATCH = fn; };

// The page decides whether the workers run (off for a page served from the source tree).
export function placesOn(on) { PW_ON = !!on && typeof Worker !== 'undefined'; return PW_ON; }
export const placesWorker = () => PW_ON;
export function placesReset() { packageDrop(); BAKED.clear(); STAGES.clear(); ASKED.clear(); GROUNDS.clear(); GROUND_ASKED.clear(); PW_SEED = null; wake(); }
export const stageOf = (seed, slot, v, cell) => BAKED.has(memKey(seed, slot, v, cell)) ? BAKE_STAGES : STAGES.get(memKey(seed, slot, v, cell)) || 0;   // the real stages of a place done (waitpips.mjs placeWaitPips)
export const bakedGet = (seed, slot, v, cell) => BAKED.get(memKey(seed, slot, v, cell)) || null;

// The baked package (package-store.mjs, made by the Station): the Companion reads its region's places from it and bakes nothing. State of the region it is on:
//   'none' no package: today's path (the worker bakes, IndexedDB's place list keeps)   'part' the Station is still baking it: a cell not in it is "not on the Companion yet", never asked of a worker   'whole' every cell is in
// A cell in the package is in memory (BAKED) once packageUse has read it, so placeHave and layout find it at once. While the package grows, a poll reads the cells that landed since.
const PKG = { key: '', state: 'none', kv: null, id: '', timer: 0, got: new Set(), meta: null, mod: null };
const pkgKey = (seed, slot, v) => seed + '|' + slot[0] + ',' + slot[1] + '|' + v;
export const packageState = (seed, slot, v) => PKG.key === pkgKey(seed, slot, v) ? PKG.state : 'none';
export const packageOwes = (seed, slot, v, cell) => packageState(seed, slot, v) === 'part' && !BAKED.has(memKey(seed, slot, v, cell));   // in a package still being made, not in it yet
async function packageRead() {   // the cells of the header not yet in memory, and the region's sites and banks; the state follows the header
  const P = PKG.mod, { kv, id, meta } = PKG, head = await P.readHeader(kv, id);
  if (!head || head.format !== P.PACKAGE_FORMAT) return;
  const reg = await P.readRegion(kv, id); if (reg) { if (reg.sites && reg.sites.length) presetHollowSites(meta.seed, reg.sites); if (reg.banks && reg.banks.length) presetBanks(meta.seed, reg.banks); }
  const cells = Object.keys(head.sha).map(Number).filter(c => !PKG.got.has(c));
  await Promise.all(cells.map(async c => { const rec = await P.readCell(kv, id, c); let b = null; if (rec instanceof Uint8Array) { try { b = P.cellOfBytes(await P.inflateCell(rec));   // a deflated record (baked-package-9): inflate, then the one read path
 if (b.seed !== meta.seed || b.cell !== c) b = null; } catch (e) { console.warn('a package cell could not be read', c, e); } }   // .mbplace bytes only: an object record (format 1) is never read
    if (b && b.ir && b.place) { BAKED.set(memKey(meta.seed, meta.slot, meta.v, c), b); PKG.got.add(c); ASKED.delete(memKey(meta.seed, meta.slot, meta.v, c)); } }));
  PKG.state = head.whole && head.done >= head.order.length && PKG.got.size >= head.order.length ? 'whole' : 'part';
  if (cells.length) wake();
}
// Opens the package of this region at these revs (the tag is the page's tile set hash: set placesTagSet first). Returns the state. kv: a test gives its own store.
export async function packageUse(seed, slot, v, kv = null, pollMs = 2000) {
  clearInterval(PKG.timer); PKG.timer = 0;
  try {
    const P = await import('./package-store.mjs'); kv = kv || (typeof indexedDB !== 'undefined' ? await P.idbKv() : null);
    if (!kv) return 'none';
    // the package the Companion holds (taken at a seat) is the one it plays, whatever the generator revs of this page; none held: the one of this page's revs (as before)
    const meta = { seed, slot, v, tag: TAG }, held = await P.heldOf(kv, { seed, slot }), hh = held && held.id !== P.packageId(meta) && held.realmRev === REALM_REV && held.placeRev === PLACE_REV && (held.tag || '') === TAG ? await P.readHeader(kv, held.id) : null;
    const id = hh && hh.format === P.PACKAGE_FORMAT ? held.id : P.packageId(meta), head = hh && id === held.id ? hh : await P.findPackage(kv, meta);
    if (!head) { PKG.key = ''; PKG.state = 'none'; return 'none'; }
    Object.assign(PKG, { key: pkgKey(seed, slot, v), state: 'part', kv, id, got: new Set(), meta, mod: P });
    await packageRead();
    if (PKG.state === 'part' && pollMs) { const t = PKG.timer = setInterval(() => { packageRead().then(() => { if (PKG.state === 'whole' && PKG.timer === t) { clearInterval(t); PKG.timer = 0; } }, () => {}); }, pollMs); }
    return PKG.state;
  } catch (e) { console.warn('the baked package could not be read', e); PKG.key = ''; PKG.state = 'none'; return 'none'; }
}
export function packageDrop() { clearInterval(PKG.timer); PKG.timer = 0; PKG.key = ''; PKG.state = 'none'; PKG.got = new Set(); }
export const bakedPut = (seed, slot, v, cell, b) => { BAKED.set(memKey(seed, slot, v, cell), b); };   // made on the page (no worker)

function worker(name, ctx) {
  let w = W[name];
  if (!w) {
    w = W[name] = new Worker(new URL('../worker.mjs', import.meta.url), { type: 'module' }); CTXS[name] = null; if (name === 'bake') PW_SEED = null;
    w.onmessage = e => {
      const m = e.data || {};
      if (m.sites) presetHollowSites(m.seed, m.sites);   // sites the worker made for a place: now the page's too
      if (m.banks && m.banks.length) presetBanks(m.seed, m.banks);   // the Rupar's bank lists the worker made (a region's, once): now the page's too
      if (m.op === 'stage') { const k = memKey(m.seed, m.slot, m.v, m.cell); if (m.n > (STAGES.get(k) || 0)) STAGES.set(k, m.n); }   // a real stage of the place finished: the wait's pips count it (#104)
      else if (m.op === 'baked') {
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
const REACH = new Set();   // store keys of the cells asked `first` (the current reach): never the ones evicted
// The index after adding k (newest first): the reach cells stay, the PLACE_KEEP cap applies to the background list.
export function keptIndex(seen, k, reach, cap = PLACE_KEEP) {
  const next = [k, ...seen.filter(s => s !== k)], bg = next.filter(s => !reach.has(s)).slice(0, cap), bgSet = new Set(bg);
  return next.filter(s => reach.has(s) || bgSet.has(s));
}
async function keep(seed, slot, v, cell, b) {
  if (typeof indexedDB === 'undefined') return;
  try {
    const k = storeKey(seed, slot, v, cell); await set(k, b);
    const seen = (await get(PLACE_INDEX)) || [], was = new Set(seen).add(k), next = keptIndex(seen, k, REACH), now = new Set(next);
    for (const old of was) if (!now.has(old)) await del(old);
    await set(PLACE_INDEX, next);
  } catch (e) { /* kept for this visit only */ }
}

// Makes sure these cells are being made: read back from IndexedDB, else asked of the worker (nearest first, in the order given).
// kit: { ctx: the places kit as the page loaded it ({ ts, terrains, desc }) }; the seed's realm and Hollow Tree sites go to the worker from the page's generator cache.
export async function readyPlaces(seed, slot, v, cells, kit) {
  const first = !!(kit && kit.first);   // the set-out's reach: the player waits for these, so they go ahead of the background list, even a cell already asked there (the worker drops its later copy)
  if (first) for (const c of cells) REACH.add(storeKey(seed, slot, v, c));
  if (packageState(seed, slot, v) === 'part') { wake(); return; }   // the Station is still baking this region's package: a cell not in it is waited for, never made here
  const want = cells.filter(c => !BAKED.has(memKey(seed, slot, v, c)) && (first || !ASKED.has(memKey(seed, slot, v, c))));
  for (const c of want) ASKED.add(memKey(seed, slot, v, c));   // held while IndexedDB is read, so a second ask does not repeat it
  if (want.length && typeof indexedDB !== 'undefined') {
    await Promise.all(want.map(async c => { try { const hit = await get(storeKey(seed, slot, v, c)); if (hit && hit.ir && hit.place) { BAKED.set(memKey(seed, slot, v, c), hit); ASKED.delete(memKey(seed, slot, v, c)); } } catch (e) { /* made again */ } }));
  }
  const todo = want.filter(c => !BAKED.has(memKey(seed, slot, v, c)));
  if (todo.length && PW_ON && kit) {
    try {
      const w = worker('bake', kit.ctx);
      if (PW_SEED !== seed) { w.postMessage({ op: 'seed', seed, realm: realm7(seed), sites: decorSites(seed), banks: madeBanks(seed) }); PW_SEED = seed; }   // the realm is the page's; of the sites it sends the ones it has made (the worker makes the rest as its places ask, and sends them back with the bake)
      w.postMessage({ op: 'bake', seed, slot, v, cells: todo, first });
    } catch (e) { for (const c of todo) ASKED.delete(memKey(seed, slot, v, c)); console.warn('the places worker did not run', e); }
  } else for (const c of todo) ASKED.delete(memKey(seed, slot, v, c));
  wake();
}
// Background, once a seed's realm is here: the places worker builds the seed's decor (the one-time part of making any place: the land the props and the Hollow Tree sites are read from, many seconds), so the first
// set-out does not wait for it. Nothing comes back; the worker holds it.
export function warmPlaces(seed, kit) {
  if (!PW_ON || !kit) return false;
  try {
    const w = worker('bake', kit.ctx);
    if (PW_SEED !== seed) { w.postMessage({ op: 'seed', seed, realm: realm7(seed), sites: decorSites(seed), banks: madeBanks(seed) }); PW_SEED = seed; }
    w.postMessage({ op: 'warm', seed }); return true;
  } catch (e) { return false; }
}
// A background slice: the Hollow Tree sites of these regions [[ax, ay], ...], made in the places worker before the player reaches them; they come back on the page's own cache (presetHollowSites).
export function readySites(seed, slots, kit) {
  if (!PW_ON || !kit) return false;
  try {
    const w = worker('bake', kit.ctx);
    if (PW_SEED !== seed) { w.postMessage({ op: 'seed', seed, realm: realm7(seed), sites: decorSites(seed) }); PW_SEED = seed; }
    w.postMessage({ op: 'sites', seed, slots }); return true;
  } catch (e) { return false; }
}
// A background slice: the Rupar's earth banks of these regions [[ra, rb], ...], made in the places worker before the player reaches them; the lists come back on the page's own levels (presetBanks).
export function readyBanks(seed, slots, kit) {
  if (!PW_ON || !kit) return false;
  try {
    const w = worker('bake', kit.ctx);
    if (PW_SEED !== seed) { w.postMessage({ op: 'seed', seed, realm: realm7(seed), sites: decorSites(seed), banks: madeBanks(seed) }); PW_SEED = seed; }
    w.postMessage({ op: 'banks', seed, slots }); return true;
  } catch (e) { return false; }
}
// A promise that resolves once the cell is in memory, or is no longer owed (the worker is gone); the caller then asks bakedGet.
export const bakedWhen = (seed, slot, v, cell) => new Promise(resolve => {
  const k = memKey(seed, slot, v, cell), ok = () => BAKED.has(k) || (!ASKED.has(k) && !packageOwes(seed, slot, v, cell));
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
