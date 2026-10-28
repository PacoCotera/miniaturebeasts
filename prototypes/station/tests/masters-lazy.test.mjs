// loadMasters / ensureRoom (station/src/masters.mjs) with a fake fetch: the boot set (every master that is not a room picture, plus the shown room's), the background order (the room after the shown one first),
// a jump to the front, idempotence, test mode, and a refused hash that stays loud. No browser: the fetch, the decoder and the placement are injected; one in flight, so the order is the queue's.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createMasterLoader } from "../src/masters.mjs";

const ORDER = ["roots", "reeds", "boulders", "ferns"], KINDS = ["idle", "near", "lamp"], NONROOM = ["frame-a", "frame-b", "capsule-c"];
const body = (name) => new TextEncoder().encode("png:" + name);
const sha = (name) => createHash("sha256").update(body(name)).digest("hex");
const roomOf = (f) => /^rooms\/room-([a-z]+)-/.exec(f)?.[1] ?? null;
const tick = () => new Promise((r) => setImmediate(r));
function world({ bad = null, concurrency = 1 } = {}) {
  const masters = {}, files = {};
  const add = (id, file) => { masters[id] = { file, w: 4, h: 4, sha256: sha(bad === file ? "tampered" : file), signed: "s" }; files[file] = body(file); };
  for (const id of NONROOM) add(id, `shell/${id}.png`);
  for (const r of ORDER) for (const k of KINDS) add(`room-${r}-${k}-day-4x4`, `rooms/room-${r}-${k}-day-4x4.png`);
  const fetched = [], placed = [];
  const fx = async (url) => {
    const f = url.pathname.replace(/^\/m\//, "");
    if (f === "index.json") return { ok: true, json: async () => ({ masters }) };
    fetched.push(f); await tick();
    const b = files[f]; return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
  };
  const loader = createMasterLoader({ fetch: fx, decode: async () => ({ w: 4, h: 4, rgba: () => null }), place: (m) => placed.push(m.id), concurrency });
  return { loader, fetched, placed, base: new URL("http://x/m/") };
}
const roomsIn = (list) => [...new Set(list.map(roomOf).filter(Boolean))];

test("boot places every non-room master and only the shown room's pictures; the other rooms follow, the room after the shown one first", async () => {
  const w = world();
  await w.loader.load(w.base, { room: 2, order: ORDER });   // boulders shown
  assert.deepEqual(w.placed.filter((id) => !id.startsWith("room-")).sort(), [...NONROOM].sort());
  assert.deepEqual(roomsIn(w.fetched.slice(0, 6)), ["boulders"]);
  assert.equal(w.loader.roomLoaded("boulders"), true);
  assert.equal(w.loader.roomLoaded("ferns"), false);
  await tick(); await tick();
  assert.equal(w.fetched.length, NONROOM.length + 3, "nothing but the boot set is fetched until the background is started");
  w.loader.background();
  for (const r of ["ferns", "roots", "reeds"]) await w.loader.ensureRoom(r);
  assert.deepEqual([...roomsIn(w.fetched)].sort(), ["boulders", "ferns", "reeds", "roots"]);
  assert.equal(w.fetched.length, NONROOM.length + 12);
});

test("the background order is the room after the shown one first, wrapping round", async () => {
  // ensureRoom moves a room to the front, so the order is read off a loader nobody asks
  const q = world(); await q.loader.load(q.base, { room: 2, order: ORDER }); q.loader.background();
  while (q.placed.length < NONROOM.length + 12) await tick();
  assert.deepEqual(roomsIn(q.fetched), ["boulders", "ferns", "roots", "reeds"]);
});

test("ensureRoom puts a room at the front of the queue and resolves once it is placed; it is idempotent", async () => {
  const w = world();
  await w.loader.load(w.base, { room: 0, order: ORDER }); w.loader.background();   // roots shown; the background runs reeds, boulders, ferns
  const before = w.fetched.length, p = w.loader.ensureRoom("ferns");
  assert.equal(w.loader.ensureRoom("ferns"), p);   // the same promise
  assert.equal(w.loader.ensureRoom(3), p);         // by index too
  await p;
  const after = w.fetched.slice(before);
  const firstFerns = after.findIndex((f) => roomOf(f) === "ferns");
  assert.ok(firstFerns <= 1, "ferns jumped ahead of the waiting rooms (at most the one fetch already in flight goes first)");
  assert.equal(after.slice(firstFerns, firstFerns + 3).every((f) => roomOf(f) === "ferns"), true);
  assert.equal(w.loader.roomLoaded("ferns"), true);
  assert.equal(await w.loader.ensureRoom("ferns"), undefined);
  while (w.placed.length < NONROOM.length + 12) await tick();
  assert.equal(new Set(w.fetched).size, w.fetched.length, "no master is fetched twice");
  assert.equal(w.placed.length, new Set(w.placed).size, "no master is placed twice");
});

test("test mode (all) loads every master at boot, and no room is waiting", async () => {
  const w = world();
  const r = await w.loader.load(w.base, { room: 0, order: ORDER, all: true });
  assert.equal(r.placed, NONROOM.length + 12);
  assert.equal(w.placed.length, NONROOM.length + 12);
  assert.ok(ORDER.every((n) => w.loader.roomLoaded(n)));
});

test("sixteen at most in flight by default", async () => {
  let live = 0, peak = 0;
  const w2 = (() => { const masters = {}; for (let i = 0; i < 40; i++) masters["m" + i] = { file: `shell/m${i}.png`, w: 4, h: 4, sha256: sha("x"), signed: "s" };
    const fx = async (url) => { if (url.pathname.endsWith("index.json")) return { ok: true, json: async () => ({ masters }) }; live++; peak = Math.max(peak, live); await tick(); live--; const b = body("x"); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; };
    return createMasterLoader({ fetch: fx, decode: async () => ({ w: 4, h: 4, rgba: () => null }), place: () => {} }); })();
  await w2.load(new URL("http://x/m/"), { order: ORDER }); w2.background();
  assert.equal(peak, 16);
});

test("a refused hash is loud: in the boot room it fails the boot, in another room it rejects that room's promise", async () => {
  const boot = world({ bad: "rooms/room-roots-near-day-4x4.png" });
  await assert.rejects(boot.loader.load(boot.base, { room: 0, order: ORDER }), /room-roots-near-day-4x4.*does not match the index/);
  const shell = world({ bad: "shell/frame-a.png" });
  await assert.rejects(shell.loader.load(shell.base, { room: 0, order: ORDER }), /frame-a.*does not match the index/);
  const later = world({ bad: "rooms/room-ferns-lamp-day-4x4.png" }), seen = [], was = console.error; console.error = (e) => seen.push(e);
  try {
    await later.loader.load(later.base, { room: 0, order: ORDER }); later.loader.background();   // the boot passes: the bad picture is in a background room
    await assert.rejects(later.loader.ensureRoom("ferns"), /room-ferns-lamp-day-4x4.*does not match the index/);
    await tick(); await tick();
    assert.ok(seen.some((e) => /does not match the index/.test(String(e && e.message))), "the background failure is logged, never silent");
  } finally { console.error = was; }
  assert.equal(later.loader.roomLoaded("ferns"), false);   // a refused room is never reported loaded
});

test("a room that the index does not hold is an error, not a silent pass", async () => {
  const w = world(); await w.loader.load(w.base, { room: 0, order: ORDER });
  await assert.rejects(w.loader.ensureRoom("lava"), /no room/);
});

test("a background fetch that never answers (fetch's TypeError) is quiet, not the page's error, and the room is fetched again when it is shown", async () => {
  const masters = {}, bodies = {}, errs = [], warns = [], ce = console.error, cw = console.warn, re = globalThis.reportError;
  for (const r of ORDER) { const f = `rooms/room-${r}-idle-day-4x4.png`; masters[`room-${r}-idle-day-4x4`] = { file: f, w: 4, h: 4, sha256: sha(f), signed: "s" }; bodies[f] = body(f); }
  let dropped = false;   // the first fetch of a Reeds picture never answers, as when the page closes mid-load
  const fx = async (url) => {
    const f = url.pathname.replace(/^\/m\//, "");
    if (f === "index.json") return { ok: true, json: async () => ({ masters }) };
    await tick();
    if (f.includes("reeds") && !dropped) { dropped = true; throw new TypeError("Failed to fetch"); }
    const b = bodies[f]; return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
  };
  const l = createMasterLoader({ fetch: fx, decode: async () => ({ w: 4, h: 4, rgba: () => null }), place: () => {}, concurrency: 1 });
  console.error = (e) => errs.push(e); console.warn = (m) => warns.push(m); globalThis.reportError = (e) => errs.push(e);
  try {
    await l.load(new URL("http://x/m/"), { room: 0, order: ORDER });
    l.background();
    for (let i = 0; i < 12; i++) await tick();
    assert.equal(dropped, true);
    assert.deepEqual(errs, [], "no console error and no page error for a fetch that never answered");
    assert.equal(warns.length, 1);
    assert.equal(l.roomLoaded("reeds"), false);
    await l.ensureRoom("reeds");
    assert.equal(l.roomLoaded("reeds"), true, "shown, the room is fetched again and placed");
  } finally { console.error = ce; console.warn = cw; globalThis.reportError = re; }
});
