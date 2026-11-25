// The baked package (design da117b78df, scope: build-desk boards/build/baked-package-scope.md; worldgen scheme §7): one region's baked places kept as ONE unit in the browser's IndexedDB, in its own database
// (never the place store's LRU, PLACE_KEEP never touches it). The Station makes it (station/src/package-baker.mjs); a later step has the Companion read it.
//   header   { format, id, seed, slot, v, realmRev, placeRev, tag, order: [cells in bake order], floor: n, done, whole, sha: { cell: sha256 hex }, ms: { floor, whole } }
//   a cell   { ir, place }: exactly what the Companion's layout() reads from a baked place today (world7.mjs bakedCell), the same object place-store.mjs keeps
//   region   { sites, banks }: the Hollow Tree sites and earth banks the worker sends with its cells
// Why the cell is the object and not .mbplace bytes: writePlace/readPlace (places/src/format) lose `rimSteps` (a bake output the format does not carry; measured on seed 36, cell 89: every other key is equal),
// and `ir` is no part of the format. So the record is today's object and the header's sha256 covers the .mbplace bytes of the place followed by its rimSteps bytes.
// The unit is the REGION: the cells are written in bake order as they land (a package is usable while it grows: `done` of `order`), and a package of another rev or tile set is another id, removed once the new one is whole.
import { REALM_REV } from './gen7/region.mjs';
import { PLACE_REV } from './place-store.mjs';
import { MW, MH, DIRS, cxy, cheb, passableIn, canStepIn } from './world.mjs';
import { writePlace } from '../../places/src/format/write.mjs';

export const PACKAGE_FORMAT = 1, PKG = 'pkg7:';
export const packageId = ({ seed, slot, v, tag = '' }) => `${PKG}${REALM_REV}.${PLACE_REV}${tag ? '.' + tag : ''}:${seed}:${slot[0]},${slot[1]}:${v}`;
const headKey = id => id + '#head', regionKey = id => id + '#region', cellKey = (id, c) => id + '#c' + c;
const regionPrefix = ({ seed, slot }) => `:${seed}:${slot[0]},${slot[1]}:`;   // the part of an id that names the region, whatever its revs

// The reach of a cell on foot (the page's reachCells, index.html: within `range` rings of the start, never past a shut edge or onto an island). opts as canStepIn's.
export function reachOf(G, start, range, opts = {}) {
  const s0 = cxy(start), seen = new Set([start]), q = [start];
  while (q.length) {
    const c = q.shift(), p = cxy(c);
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
      const d = y * MW + x; if (seen.has(d) || !canStepIn(G, c, dir, opts) || G.island[d] || Math.max(Math.abs(x - s0.x), Math.abs(y - s0.y)) > range) continue; seen.add(d); q.push(d);
    }
  }
  return [...seen];
}
const TIER_RANGE = { 1: 2, 2: 4 };   // the Companion's TIER (index.html): the range of a first and a second tier set-out

// The order the cells are baked in: the start place (the Companion's current place when it is out), its reach, the ring of cells next to the reach, then the rest of the region's passable cells nearest first.
// G: the region's world (world7.mjs genWorld7). from: { pos, reach } of an expedition, or { start, tier } of a world at rest (its first start, the reach counted at its tier's range).
// Returns { cells, floor, head, reach, ring, rest }: the floor is the first `floor` cells (what a walk and an edge Call can touch from the start).
export function bakeOrder(G, from) {
  const pass = c => passableIn(G, c), head = from.pos != null ? from.pos : from.start;
  const dist = c => cheb(cxy(c), cxy(head)), byNear = (a, b) => dist(a) - dist(b) || a - b;
  const reachList = (from.pos != null && Array.isArray(from.reach) ? from.reach : reachOf(G, head, TIER_RANGE[from.tier] || 2)).filter(c => c !== head && pass(c));
  const reach = [...new Set(reachList)].sort(byNear), inFloor = new Set([head, ...reach]), ring = new Set();
  for (const c of inFloor) { const p = cxy(c); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const d = y * MW + x; if (!inFloor.has(d) && pass(d)) ring.add(d); } }
  const ringL = [...ring].sort(byNear), taken = new Set([...inFloor, ...ring]), rest = [];
  for (let c = 0; c < MW * MH; c++) if (pass(c) && !taken.has(c)) rest.push(c);
  rest.sort(byNear);
  return { cells: [head, ...reach, ...ringL, ...rest], floor: 1 + reach.length + ringL.length, head, reach, ring: ringL, rest };
}

// sha256 (hex) of a baked place: its .mbplace bytes, then its rimSteps (the one part the format does not carry)
export async function shaOfPlace(place) {
  const a = writePlace(place), b = place.rimSteps ? new Uint8Array(place.rimSteps.buffer, place.rimSteps.byteOffset, place.rimSteps.byteLength) : new Uint8Array(0), all = new Uint8Array(a.length + b.length);
  all.set(a, 0); all.set(b, a.length);
  const h = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', all));
  return Array.from(h, x => x.toString(16).padStart(2, '0')).join('');
}

// The browser's store: its own IndexedDB database, so nothing of the place store's list can evict it. kv: { get, set, del, keys }; tests give a Map-backed one.
export async function idbKv() {
  const { createStore, get, set, del, keys } = await import('idb-keyval'), st = createStore('mb-packages', 'kv');
  return { get: k => get(k, st), set: (k, v) => set(k, v, st), del: k => del(k, st), keys: () => keys(st) };
}
export function memKv(map = new Map()) { return { get: async k => map.get(k), set: async (k, v) => { map.set(k, v); }, del: async k => { map.delete(k); }, keys: async () => [...map.keys()], map }; }

export async function readHeader(kv, id) { return (await kv.get(headKey(id))) || null; }
export const readCell = (kv, id, cell) => kv.get(cellKey(id, cell));
export const readRegion = (kv, id) => kv.get(regionKey(id));

// The package for this region at these revs: its header (whole or not), or null. A header of another format is not it.
export async function findPackage(kv, meta) { const h = await readHeader(kv, packageId(meta)); return h && h.format === PACKAGE_FORMAT ? h : null; }

// Starts (or goes on with) a package: a header already there for the id keeps the cells it has (a cell is the same wherever it stands in the order), and takes this order; else a new one is written.
// Returns the handle the writers take; `todo` is the cells of the order not yet in, in order.
export async function openPackage(kv, meta, order, now = () => performance.now()) {
  const id = packageId(meta), had = await readHeader(kv, id), keep = had && had.format === PACKAGE_FORMAT && Object.keys(had.sha).every(c => order.cells.includes(+c));
  const header = keep ? { ...had, order: order.cells, floor: order.floor, done: order.cells.filter(c => c in had.sha).length, whole: false }
    : { format: PACKAGE_FORMAT, id, seed: meta.seed, slot: meta.slot, v: meta.v, realmRev: REALM_REV, placeRev: PLACE_REV, tag: meta.tag || '', order: order.cells, floor: order.floor, done: 0, whole: false, sha: {}, ms: {}, at: Date.now() };
  if (!keep) for (const k of await kv.keys()) if (typeof k === 'string' && k.startsWith(id + '#c')) await kv.del(k);
  if (header.ms) delete header.ms.whole;
  await kv.set(headKey(id), header);
  return { kv, id, header, t0: now(), now, todo: order.cells.filter(c => !(c in header.sha)) };
}
// A cell landed: written whole, then the header names it (a cell is never named before it is there).
export async function putCell(h, cell, baked, sha) {
  await h.kv.set(cellKey(h.id, cell), baked);
  if (!(cell in h.header.sha)) h.header.done++;
  h.header.sha[cell] = sha;
  const ms = Math.round(h.now() - h.t0);
  if (!h.header.ms.floor && h.header.order.slice(0, h.header.floor).every(c => c in h.header.sha)) h.header.ms.floor = ms;
  await h.kv.set(headKey(h.id), h.header);
}
// The region's Hollow Tree sites and banks, as the worker sent them (a list a message: merged by slot, by region)
export async function putRegion(h, sites = [], banks = []) {
  if (!sites.length && !banks.length) return;
  const prev = (await readRegion(h.kv, h.id)) || { sites: [], banks: [] }, S = new Map(prev.sites.map(s => [s.slot[0] + ',' + s.slot[1], s])), B = new Map(prev.banks.map(b => [b.ra + ',' + b.rb, b]));
  for (const s of sites) S.set(s.slot[0] + ',' + s.slot[1], s);
  for (const b of banks) B.set(b.ra + ',' + b.rb, b);
  await h.kv.set(regionKey(h.id), { sites: [...S.values()], banks: [...B.values()] });
}
// The whole region is in: marked whole, and the packages of this region at other revs go (their cells with them)
export async function finishPackage(h) {
  h.header.whole = h.header.done >= h.header.order.length; h.header.ms.whole = Math.round(h.now() - h.t0);
  await h.kv.set(headKey(h.id), h.header);
  if (h.header.whole) await dropOthers(h.kv, h.id, h.header);
  return h.header.whole;
}
export async function dropOthers(kv, keepId, region) {
  const mid = regionPrefix(region);
  for (const k of await kv.keys()) { if (typeof k !== 'string' || !k.startsWith(PKG) || k.startsWith(keepId + '#')) continue; const id = k.slice(0, k.indexOf('#')); if (id !== keepId && id.includes(mid)) await kv.del(k); }
}
