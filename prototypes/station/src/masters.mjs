// The placed masters (prototypes/ui/assets/masters/index.json, written by ui/tools/place-masters.mjs): each signed master replaces its
// stand-in by id and size, with no code change. Fetched beside the page, decoded to pictures, checked against the index (size and SHA-256)
// and placed in the manifest before any screen registers its stand-ins. A master that does not match its index is refused loudly.
import { placeMaster } from "../../ui/assets.mjs";
import { setStandLayers } from "./layered-stand.mjs";

// The browser's decoder (no colour conversion, straight alpha) reads a master's pixels: the one named decoder here, until ui/png.mjs decodes the masters (the import guard allows it).
const decodeRGBA = (bmp) => { const cv = document.createElement("canvas"); cv.width = bmp.width; cv.height = bmp.height; const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(bmp, 0, 0); return g.getImageData(0, 0, bmp.width, bmp.height).data; };
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
// The rooms' pictures (index file rooms/room-<room>-...) load lazily: at boot every other master and the shown room's pictures, then the other rooms in the background (the room after the shown one first); ensureRoom(room) puts a room's pictures
// at the front of the queue and resolves when they are placed. Test mode (opts.all) loads everything at boot. Which room a master belongs to is read from its file path in the index.
const ROOM_FILE = /^rooms\/room-([a-z0-9]+)-/;
const realDecode = async (bytes) => {
  const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  let px = null; return { w: bmp.width, h: bmp.height, rgba: () => px || (px = decodeRGBA(bmp)) };   // the decoded master as RGBA (the browser's decoder, with no colour conversion), read when a picture asks
};
export function createMasterLoader({ fetch: fx = (...a) => fetch(...a), decode = realDecode, place = placeMaster, concurrency = 16 } = {}) {
  // at most `concurrency` masters in flight: hundreds of concurrent fetches and decodes can fail with net::ERR_INSUFFICIENT_RESOURCES (measured on Chromium 141)
  let later = [], items = [], rooms = new Map(), queue = [], active = 0, order = [], base = null;
  const roomName = (r) => (typeof r === "number" ? order[r] : r);
  const run = async (it) => {
    const e = it.e, r = await fx(new URL(e.file, base), { cache: "no-store" });
    if (!r.ok) throw new Error(`master ${it.id}: ${e.file} is missing`);
    const bytes = await r.arrayBuffer(), sha = hex(await crypto.subtle.digest("SHA-256", bytes));
    if (sha !== e.sha256) throw new Error(`master ${it.id}: ${e.file} does not match the index (sha256 ${sha.slice(0, 12)}…)`);
    const bmp = await decode(bytes);
    place({ id: it.id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, slice: e.slice ?? null, tile: e.tile ?? null, status: e.status ?? "master" }, { w: bmp.w, h: bmp.h, rgba: bmp.rgba }); it.placed = true;
  };
  const pump = () => {
    while (active < concurrency && queue.length) {
      const it = queue.shift(); active++;
      run(it).then(it.resolve, (err) => { const no = it.reject; if (isNet(err)) fresh(it); no(err); }).finally(() => { active--; pump(); });
    }
  };
  // a fetch that never answered (the page went away, the network dropped: fetch's TypeError) is not a refused picture: the item goes back to waiting, and the room's promise is dropped, so the next ensureRoom fetches it again
  const isNet = (err) => err instanceof TypeError;
  const fresh = (it) => { it.queued = false; it.done = new Promise((ok, no) => { it.resolve = ok; it.reject = no; }); it.done.catch(() => {}); if (it.room) rooms.delete(it.room); };
  const enqueue = (list) => { for (const it of list) if (!it.queued) { it.queued = true; queue.push(it); } pump(); };
  const settled = (list) => Promise.all(list.map((it) => it.done));
  const roomPromise = (name) => { if (!rooms.has(name)) rooms.set(name, settled(roomItems(name)).then(() => {})); return rooms.get(name); };
  const roomItems = (name) => items.filter((it) => it.room === name);
  const loader = {
    // fetches the index and the boot set (every master that is not a room picture, plus the pictures of opts.room), and returns (the other rooms wait for background())
    async load(url, { room = null, all = false, order: ord = [] } = {}) {
      base = url; order = ord;
      const res = await fx(new URL("index.json", base), { cache: "no-store" });
      if (!res.ok) return { placed: 0 };
      const index = await res.json(), ids = Object.keys(index.masters ?? {});
      items = ids.map((id) => {
        const e = index.masters[id], f = e.file.startsWith("rooms/") ? ROOM_FILE.exec(e.file) : null;
        if (e.file.startsWith("rooms/") && !f) throw new Error(`master ${id}: ${e.file} names no room (rooms/room-<room>-...)`);
        const it = { id, e, room: f ? f[1] : null, queued: false }; it.done = new Promise((ok, no) => { it.resolve = ok; it.reject = no; }); it.done.catch(() => {}); return it;
      });
      const names = [...new Set(items.map((it) => it.room).filter(Boolean))], shown = roomName(room);
      const rest = (shown != null && order.includes(shown) ? [...order.slice(order.indexOf(shown) + 1), ...order.slice(0, order.indexOf(shown))] : order).concat(names.filter((n) => !order.includes(n))).filter((n) => n !== shown && names.includes(n));
      const boot = all ? items : items.filter((it) => !it.room || it.room === shown);
      enqueue(boot); await settled(boot);
      later = all ? [] : rest;
      return { placed: ids.length };
    },
    // a promise that resolves when every picture of the room is placed, the room's waiting pictures moved to the front of the queue (the shown room's first); the same promise each time; a refused picture rejects it
    ensureRoom(r) {
      const name = roomName(r), mine = roomItems(name);
      if (!mine.length) return items.length ? Promise.reject(new Error(`no room ${JSON.stringify(r)} in the masters index`)) : Promise.resolve();
      const waiting = mine.filter((it) => queue.includes(it));
      if (waiting.length) queue = [...waiting, ...queue.filter((it) => !waiting.includes(it))];
      enqueue(mine); return roomPromise(name);
    },
    // the other rooms, in the background, the room after the shown one first (the page calls it once the first screen is up, so the boot set is the only thing fetched before it)
    background() {
      enqueue(later.flatMap(roomItems));
      for (const n of later) roomPromise(n).catch((e) => { if (isNet(e)) { console.warn(`room ${n}: a picture did not arrive (${e.message}); it is fetched again when the room is shown`); return; } console.error(e); if (typeof reportError === "function") reportError(e); });   // a refused picture is loud (the console and the page's error event); a fetch that never answered is not
    },
    // true when the room's pictures are all placed (or the loader holds none for it): the host draws the room at once
    roomLoaded(r) { const name = roomName(r); return !items.some((it) => it.room === name && !it.placed); },
  };
  return loader;
}
let current = null;
export async function loadMasters(base, opts = {}) { current = createMasterLoader(opts.loader); return current.load(base, opts); }
export const loadRoomsInBackground = () => current?.background();
export const ensureRoom = (room) => (current ? current.ensureRoom(room) : Promise.resolve());
export const roomLoaded = (room) => (current ? current.roomLoaded(room) : true);

// The layered stands' cut-outs (ui/assets/stands/index.json; layered-stand.mjs): fetched, checked against the index (SHA-256) and decoded with the same decoder, then handed to the logic's stand registry.
// They are never masters of the manifest and never sent to the face: the host composes each stand from them and the face is given the picture by id.
export async function loadStandLayers(base) {
  const res = await fetch(new URL("index.json", base), { cache: "no-store" });
  if (!res.ok) return { layers: 0 };
  const index = await res.json(), names = Object.keys(index.files ?? {}), pics = new Map();
  await Promise.all(names.map(async (name) => {
    const e = index.files[name], r = await fetch(new URL(e.file, base), { cache: "no-store" });
    if (!r.ok) throw new Error(`stand layer ${name}: ${e.file} is missing`);
    const bytes = await r.arrayBuffer(), sha = hex(await crypto.subtle.digest("SHA-256", bytes));
    if (sha !== e.sha256) throw new Error(`stand layer ${name}: ${e.file} does not match the index (sha256 ${sha.slice(0, 12)}…)`);
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    if (bmp.width !== e.w || bmp.height !== e.h) throw new Error(`stand layer ${name}: the file is ${bmp.width}×${bmp.height}, the index says ${e.w}×${e.h}`);
    const px = decodeRGBA(bmp); pics.set(name, { w: bmp.width, h: bmp.height, rgba: () => px });
  }));
  setStandLayers(index, (f) => pics.get(f));
  return { layers: names.length };
}
