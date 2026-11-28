// The baked package: one region's baked places kept as ONE unit in the browser's IndexedDB, in its own database
// (never the place store's LRU, PLACE_KEEP never touches it). The Station makes it (station/src/package-baker.mjs); the Companion plays from it (place-store.mjs packageUse).
//   header   { format, id, seed, slot, v, realmRev, placeRev, tag, order: [cells in bake order], floor: n, done, whole, sha: { cell: sha256 hex }, ms: { floor, whole } }
//   a cell   the .mbplace bytes DEFLATED (a zlib stream; deflateCell / inflateCell below; the header's sha is of the inflated bytes) (a Uint8Array, place format 2: the place and the bake's hold outputs, places/src/format/baked.mjs). The Station writes them; the Companion reads them through readBaked into the
//            { ir, place } object that layout() (adapt7.mjs) reads (place-store.mjs packageRead), the one read path. The header's sha256 of a cell is the bytes' own.
//   region   { sites, banks }: the Hollow Tree sites and earth banks the worker sends with its cells
// The unit is the REGION: the cells are written in bake order as they land (a package is usable while it grows: `done` of `order`), and a package of another rev or tile set is another id, removed once the new one is whole.
import { REALM_REV } from '../gen7/region.mjs';
import { PLACE_REV } from './place-store.mjs';
import { MW, MH, cxy, cheb, passableIn } from '../logic/world.mjs';
import { reachCellsIn, tierOf } from '../logic/map-rules.mjs';
import { writeBaked, readBaked } from '../../../places/src/format/baked.mjs';
import { PACKAGE_FORMAT, PKG, heldOf } from './package-dock.mjs';
export { PACKAGE_FORMAT, heldOf, idbKv, shaOfBytes } from './package-dock.mjs';   // the dock record's page side, the browser's store and the sha (no imports there, so the play shell can read it)
export const cellOfBytes = readBaked;   // the one read path: the bytes to the { ir, place } layout() reads
export const packageId = ({ seed, slot, v, tag = '' }) => `${PKG}f${PACKAGE_FORMAT}.${REALM_REV}.${PLACE_REV}${tag ? '.' + tag : ''}:${seed}:${slot[0]},${slot[1]}:${v}`;   // the format is in the id: a package of another format is another package
const headKey = id => id + '#head', regionKey = id => id + '#region', cellKey = (id, c) => id + '#c' + c;
const regionPrefix = ({ seed, slot }) => `:${seed}:${slot[0]},${slot[1]}:`;   // the part of an id that names the region, whatever its revs

// The order the cells are baked in: the start place (the Companion's current place when it is out), its reach, the ring of cells next to the reach, then the rest of the region's passable cells nearest first.
// G: the region's world (world7.mjs genWorld7). from: { pos, reach } of an expedition, or { start, tier } of a world at rest (its first start, the reach counted at its tier's range).
// Returns { cells, floor, head, reach, ring, rest }: the floor is the first `floor` cells (what a walk and an edge Call can touch from the start).
export function bakeOrder(G, from) {
  const pass = c => passableIn(G, c), head = from.pos != null ? from.pos : from.start;
  const dist = c => cheb(cxy(c), cxy(head)), byNear = (a, b) => dist(a) - dist(b) || a - b;
  const reachList = (from.pos != null && Array.isArray(from.reach) ? from.reach : reachCellsIn(G, head, tierOf(from.tier).range)).filter(c => c !== head && pass(c));
  const reach = [...new Set(reachList)].sort(byNear), inFloor = new Set([head, ...reach]), ring = new Set();
  for (const c of inFloor) { const p = cxy(c); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const d = y * MW + x; if (!inFloor.has(d) && pass(d)) ring.add(d); } }
  const ringL = [...ring].sort(byNear), taken = new Set([...inFloor, ...ring]), rest = [];
  for (let c = 0; c < MW * MH; c++) if (pass(c) && !taken.has(c)) rest.push(c);
  rest.sort(byNear);
  return { cells: [head, ...reach, ...ringL, ...rest], floor: 1 + reach.length + ringL.length, head, reach, ring: ringL, rest };
}

// A cell the worker made ({ seed, cell, ir, place }) as the bytes the package keeps (their sha256, shaOfBytes, is the bytes' own)
export const bytesOfCell = (seed, cell, ir, place) => writeBaked(ir, place, { seed, cell });

// Each cell is KEPT deflated (a zlib stream, RFC 1950: zlib on the Station, miniz's tinfl on the Companion). The sha is of the INFLATED .mbplace bytes, so it does not depend on the deflater.
// deflateCell(bytes) -> the record the package stores; inflateCell(record) -> the .mbplace bytes cellOfBytes reads.
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
export const deflateCell = (bytes) => pipe(bytes, new CompressionStream('deflate'));
export const inflateCell = (record) => pipe(record, new DecompressionStream('deflate'));

// A Map-backed store with idbKv's face, for the tests
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
  delete header.ms.whole;
  await kv.set(headKey(id), header);
  return { kv, id, header, t0: now(), now, todo: order.cells.filter(c => !(c in header.sha)) };
}
// A cell landed: written whole, then the header names it (a cell is never named before it is there).
export async function putCell(h, cell, bytes, sha) {
  await h.kv.set(cellKey(h.id, cell), bytes);
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
async function dropOthers(kv, keepId, region) {
  const mid = regionPrefix(region), held = await heldOf(kv, region);   // the package the Companion holds stays until it takes the new one at a seat
  for (const k of await kv.keys()) { if (typeof k !== 'string' || !k.startsWith(PKG) || k.startsWith(keepId + '#')) continue; const id = k.slice(0, k.indexOf('#')); if (id !== keepId && id.includes(mid) && !(held && held.id === id)) await kv.del(k); }
}
