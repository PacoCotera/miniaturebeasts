// The placed masters (prototypes/ui/assets/masters/index.json, written by ui/tools/place-masters.mjs): each signed master replaces its
// stand-in by id and size, with no code change. Fetched beside the page, decoded to pictures, checked against the index (size and SHA-256)
// and placed in the manifest before any screen registers its stand-ins. A master that does not match its index is refused loudly.
import { placeMaster, registerPending } from "../../ui/assets.mjs";
import { setJuvenileFacing, juvenileMirrored, mirrorPic } from "./facing.mjs";
import { decodePNGAsync, canvasRound } from "../../ui/png.mjs";

// The one decoder of the masters, on the page and headless alike (ui/png.mjs): inflated at load, the pixels made when a picture first asks, through the 8-bit premultiplied
// round trip the browser's canvas gave them (canvasRound), so every picture is the one the goldens were drawn with.
const decodeRGBA = async (bytes) => { const png = await decodePNGAsync(bytes); let px = null; return { w: png.width, h: png.height, rgba: () => px || (px = canvasRound(png.rgba())) }; };
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
// The rooms' pictures (index file rooms/room-<room>-...) load lazily: at boot every other master and the shown room's pictures, then the other rooms in the background (the room after the shown one first); ensureRoom(room) puts a room's pictures
// at the front of the queue and resolves when they are placed. Test mode (opts.all) loads everything at boot. Which room a master belongs to is read from its file path in the index.
// A master's URL carries the start of its sha256 (`?v=`): any change to the bytes is a new URL, so the server may keep the file forever (Cache-Control immutable, ops/sandbox/Caddyfile).
// The index the page fetches is the slim one (ui/tools/index-io.mjs): per master { group, w, h, bytes, sha, [file] }, `sha` the first 12 hex of the SHA-256 and `file` only when it is not <group>/<id>.png. provenance.json (who signed, the whole hash) is never fetched.
const SHORT = 12, shaOf = (e) => (e.sha ?? e.sha256 ?? "").slice(0, SHORT);
export const masterUrl = (base, e) => { const u = new URL(e.file, base), v = shaOf(e); if (v) u.searchParams.set("v", v); return u; };
const ROOM_FILE = /^rooms\/room-([a-z0-9]+)-/, LIGHT_IN = /-(dawn|day|dusk|night)-/;
const realDecode = decodeRGBA;
// On demand (opts.groups, from masters/groups.json, which the station journey records): the index registers every master with no pixels (registerPending), and only the boot groups' pictures and the shown room's are
// fetched before the first draw. Any other picture is fetched when a screen asks for it (ensure: the front of the queue; the loop holds the face as it is until it is placed, core.mjs syncProps); `background` then
// only warms the HTTP cache (the other screens' groups and rooms, fetched and dropped, one request at a time while nothing is wanted), so the heap holds just what the screens shown have used.
// Without groups (no groups.json) every non-room master loads at boot, as before.
export function createMasterLoader({ fetch: fx = (...a) => fetch(...a), decode = realDecode, place = placeMaster, register = registerPending, concurrency = 16, prefetchConcurrency = 2 } = {}) {
  // at most `concurrency` masters in flight: hundreds of concurrent fetches and decodes can fail with net::ERR_INSUFFICIENT_RESOURCES (measured on Chromium 141)
  let later = [], items = [], rooms = new Map(), queue = [], active = 0, order = [], base = null, groups = null, byId = new Map(), warm = [], warming = 0, roomMap = new Map(), fam = new Map(), lightFn = null, shownName = null, progress = null;
  const roomName = (r) => (typeof r === "number" ? order[r] : r);
  const run = async (it) => {
    const e = it.e, r = await fx(masterUrl(base, e));
    if (!r.ok) throw new Error(`master ${it.id}: ${e.file} is missing`);
    const bytes = await r.arrayBuffer(), sha = hex(await crypto.subtle.digest("SHA-256", bytes));
    if (sha.slice(0, SHORT) !== shaOf(e)) throw new Error(`master ${it.id}: ${e.file} does not match the index (sha256 ${sha.slice(0, 12)}…)`);
    let bmp = await decode(bytes); if (juvenileMirrored(it.id)) bmp = mirrorPic(bmp);   // the young of a flagged species faces the opposite way from its adult: drawn mirrored, the file untouched
    place({ id: it.id, w: e.w, h: e.h, file: e.file, hash: shaOf(e), slice: e.slice ?? null, tile: e.tile ?? null, status: e.status ?? "master" }, { w: bmp.w, h: bmp.h, rgba: bmp.rgba }); it.placed = true;
  };
  const pump = () => {
    while (active < concurrency && queue.length) {
      const it = queue.shift(); active++;
      run(it).then(it.resolve, (err) => { const no = it.reject; if (isNet(err)) fresh(it); no(err); }).finally(() => { active--; pump(); });
    }
  };
  // a fetch that never answered (the page went away, the network dropped: fetch's TypeError) is not a refused picture: the item goes back to waiting, and the room's promise is dropped, so the next ensureRoom fetches it again
  const isNet = (err) => err instanceof TypeError;
  const fresh = (it) => { it.queued = false; it.done = new Promise((ok, no) => { it.resolve = ok; it.reject = no; }); it.done.catch(() => {}); if (it.room) for (const k of [...rooms.keys()]) if (k.startsWith(it.room + "|")) rooms.delete(k); };
  const enqueue = (list) => { for (const it of list) if (!it.queued) { it.queued = true; queue.push(it); } pump(); };
  const settled = (list) => Promise.all(list.map((it) => it.done));
  // On demand, a room needs only the pictures of the light now on (a name with -dawn-, -day-, -dusk- or -night-): the others are warmed in the cache and fetched when the light changes (the host then holds the face until they are in, as it does for a room)
  const roomPromise = (name) => { const k = name + "|" + (lazyLight() ?? ""); if (!rooms.has(k)) rooms.set(k, settled(roomNeed(name)).then(() => {})); return rooms.get(k); };
  const roomItems = (name) => roomMap.get(name) ?? [];
  const lazyLight = () => (groups && lightFn ? lightFn() : null);
  const roomNeed = (name) => { const l = lazyLight(); return l ? roomItems(name).filter((it) => !it.light || it.light === l) : roomItems(name); };
  // a miss fetches its family with it: the pictures of the same kind, species and size (mibi-adult-S01-*-304x312), so a screen that needs one needs them in one round of requests, not one a frame
  // (a mibi's pictures are one family per coat: the tokens before the pose word, mibi-adult-S01-redder-dark-lay-spots-304x312 is coat "redder-dark"; a species has 9 coats of 9 poses at each size, and a screen shows a few)
  let poses = new Set(["lay"]);
  const famKey = (id) => {
    const t = id.split("-"), si = t.findIndex((x) => /^[SC]\d\d$/.test(x)), sp = si < 0 ? "" : t[si], size = /(\d+x\d+)$/.exec(id)?.[1] ?? "";
    let coat = ""; if (si >= 0 && t[0] === "mibi") { const v = t.slice(si + 1).filter((x) => x !== size), k = v.findIndex((x) => poses.has(x)); coat = (k < 0 ? v : v.slice(0, k)).join("-"); }
    return t.slice(0, 2).join("-") + "|" + sp + "|" + size + "|" + coat;
  };
  // cache warming: fetch and drop (a later ensure finds the file in the HTTP cache, immutable by its ?v=), a couple at a time, and only while nothing is being asked for
  const warmNext = () => {
    while (warming < prefetchConcurrency && active === 0 && queue.length === 0 && warm.length) {
      const it = warm.shift(); if (it.placed || it.queued) continue; warming++;
      fx(masterUrl(base, it.e)).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => {}).finally(() => { warming--; setTimeout(warmNext, 0); });
    }
    if (warm.length && (active > 0 || queue.length > 0) && !warmTimer) warmTimer = setTimeout(() => { warmTimer = null; warmNext(); }, 250);
  };
  let warmTimer = null;
  const loader = {
    // fetches the index and the boot set (every master that is not a room picture, plus the pictures of opts.room), and returns (the other rooms wait for background())
    // the light now on (opts.light, then setLight) picks which pictures of a room are the boot's
    setLight(fn) { lightFn = fn; },
    async load(url, { room = null, all = false, order: ord = [], groups: grp = null, boot: bootGroups = ["boot", "home"], light = null, onProgress = null } = {}) {
      progress = onProgress;
      base = url; order = ord; groups = all ? null : grp?.screens ?? null;   // test mode loads everything at boot, so a test never meets a pending master
      if (light) lightFn = () => light;
      const res = await fx(new URL("index.json", base));
      if (!res.ok) return { placed: 0 };
      const index = await res.json(), ids = Object.keys(index.masters ?? {});
      setJuvenileFacing(index.juvenileFacing ?? null);
      items = ids.map((id) => {
        const e = { ...index.masters[id] }; e.file ??= `${e.group}/${id}.png`;
        const f = e.file.startsWith("rooms/") ? ROOM_FILE.exec(e.file) : null;
        if (e.file.startsWith("rooms/") && !f) throw new Error(`master ${id}: ${e.file} names no room (rooms/room-<room>-...)`);
        const it = { id, e, room: f ? f[1] : null, light: f ? LIGHT_IN.exec(e.file)?.[1] ?? null : null, queued: false }; it.done = new Promise((ok, no) => { it.resolve = ok; it.reject = no; }); it.done.catch(() => {}); return it;
      });
      const names = [...new Set(items.map((it) => it.room).filter(Boolean))], shown = roomName(room);
      const rest = (shown != null && order.includes(shown) ? [...order.slice(order.indexOf(shown) + 1), ...order.slice(0, order.indexOf(shown))] : order).concat(names.filter((n) => !order.includes(n))).filter((n) => n !== shown && names.includes(n));
      byId = new Map(items.map((it) => [it.id, it])); roomMap = new Map(); fam = new Map();
      poses = new Set(["lay", ...ids.map((id) => /^mibi-(?:adult|juvenile)-[SC]\d\d-([a-z]+)-\d+x\d+$/.exec(id)?.[1]).filter(Boolean)].filter((w) => !["between", "redder", "yellower", "dark", "light"].includes(w)));   // the single-word variants (calm, curl, shake...) are poses; a coat is two words from the hue and the depth
      for (const it of items) { if (it.room) { if (!roomMap.has(it.room)) roomMap.set(it.room, []); roomMap.get(it.room).push(it); } const k = famKey(it.id); if (!fam.has(k)) fam.set(k, []); fam.get(k).push(it); }
      let boot;
      if (groups) {   // on demand: every master is in the manifest without pixels; the boot groups' and the shown room's are fetched now
        for (const it of items) { const e = it.e; register({ id: it.id, w: e.w, h: e.h, file: e.file, hash: shaOf(e), slice: e.slice ?? null, tile: e.tile ?? null, status: e.status ?? "master" }); }
        const want = new Set(bootGroups.flatMap((g) => groups[g] ?? []));
        boot = [...items.filter((it) => !it.room && want.has(it.id)), ...(shown != null ? roomNeed(shown) : [])];
      } else boot = all ? items : items.filter((it) => !it.room || it.room === shown);
      if (progress) { const total = boot.reduce((s, it) => s + (it.e.bytes ?? 0), 0); let done = 0; progress(0, total); for (const it of boot) it.done.then(() => { done += it.e.bytes ?? 0; progress(done, total); }, () => {}); }   // the boot set's bytes (index `bytes`): the page's load bar
      enqueue(boot); await settled(boot);
      later = all ? [] : rest; shownName = shown;
      return { placed: ids.length };
    },
    // a promise that resolves when the pictures are placed; the ones still waiting move to the front of the queue (the first named first). An id the index does not hold is ignored (a stand-in's).
    ensure(ids, { family = false } = {}) {
      let mine = ids.map((id) => byId.get(id)).filter(Boolean);
      if (family) mine = [...new Set([...mine, ...mine.filter((it) => !it.room).flatMap((it) => fam.get(famKey(it.id)) ?? []).filter((it) => !it.room)])];
      mine = mine.filter((it) => !it.placed);
      if (!mine.length) return Promise.resolve();
      const waiting = mine.filter((it) => queue.includes(it));
      if (waiting.length) queue = [...waiting, ...queue.filter((it) => !waiting.includes(it))];
      enqueue(mine); return settled(mine).then(() => {});
    },
    // the ids of a screen's group (groups.json), or []
    groupOf(screen) { return groups?.[screen] ?? []; },
    isLazy() { return !!groups; },
    // a promise that resolves when every picture of the room is placed, the room's waiting pictures moved to the front of the queue (the shown room's first); the same promise each time; a refused picture rejects it
    ensureRoom(r) {
      const name = roomName(r), mine = roomNeed(name);
      if (!roomItems(name).length) return items.length ? Promise.reject(new Error(`no room ${JSON.stringify(r)} in the masters index`)) : Promise.resolve();
      const waiting = mine.filter((it) => queue.includes(it));
      if (waiting.length) queue = [...waiting, ...queue.filter((it) => !waiting.includes(it))];
      enqueue(mine); return roomPromise(name);
    },
    // the other rooms, in the background, the room after the shown one first (the page calls it once the first screen is up, so the boot set is the only thing fetched before it)
    background() {
      if (groups) { warm = [...new Set([...Object.values(groups).flat(), ...roomItems(shownName).map((it) => it.id)])].map((id) => byId.get(id)).filter(Boolean); warmNext(); return; }   // on demand: only the cache is warmed: the screens' groups, then the shown room's other lights (the other rooms are fetched when shown: one light, about a megabyte)
      enqueue(later.flatMap(roomItems));
      for (const n of later) roomPromise(n).catch((e) => { if (isNet(e)) { console.warn(`room ${n}: a picture did not arrive (${e.message}); it is fetched again when the room is shown`); return; } console.error(e); if (typeof reportError === "function") reportError(e); });   // a refused picture is loud (the console and the page's error event); a fetch that never answered is not
    },
    // true when the room's pictures are all placed (or the loader holds none for it): the host draws the room at once
    roomLoaded(r) { return !roomNeed(roomName(r)).some((it) => !it.placed); },
  };
  return loader;
}
let current = null;
export async function loadMasters(base, opts = {}) { current = createMasterLoader(opts.loader); return current.load(base, opts); }
export const loadRoomsInBackground = () => current?.background();
export const ensureRoom = (room) => (current ? current.ensureRoom(room) : Promise.resolve());
export const roomLoaded = (room) => (current ? current.roomLoaded(room) : true);
export const ensureMasters = (ids, o) => (current ? current.ensure(ids, o) : Promise.resolve());   // the pictures placed (the front of the queue); resolves at once when the masters load whole
export const screenGroup = (screen) => (current ? current.groupOf(screen) : []);
export const mastersOnDemand = () => !!current?.isLazy();
export const setRoomLight = (fn) => current?.setLight(fn);   // the light now on, for the rooms' pictures (on demand: a room needs only that light's)

