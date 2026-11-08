// Masters on demand (station/src/masters.mjs with groups.json; ui/assets.mjs registerPending / MasterPending): only the boot groups and the shown room are fetched before the first draw, a picture a screen asks for
// before it arrives throws MasterPending and is fetched at the front, background() warms the cache without placing, and a stand-in registered under a pending id never replaces it. No browser: fetch, decode and placement injected.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createMasterLoader } from "../src/masters.mjs";
import { registerPending, registerAsset, asset, assetEntry, placeMaster, MasterPending, dropAsset } from "../../ui/assets.mjs";

const ORDER = ["roots", "reeds"];
const body = (name) => new TextEncoder().encode("png:" + name);
const sha = (name) => createHash("sha256").update(body(name)).digest("hex");
const tick = () => new Promise((r) => setImmediate(r));
const IDS = ["frame-a", "home-a", "home-b", "bench-a", "bench-b", "other-z"];
const GROUPS = { schema: "mb-masters-groups/1", screens: { boot: ["frame-a"], home: ["home-a", "home-b"], bench: ["bench-a", "bench-b"] } };
function world() {
  const masters = {}, files = {};
  const add = (id, file) => { masters[id] = { file, w: 4, h: 4, sha256: sha(file), signed: "s" }; files[file] = body(file); };
  for (const id of IDS) add("t-" + id, `shell/${id}.png`);
  for (const r of ORDER) add(`room-${r}-idle-day-4x4`, `rooms/room-${r}-idle-day-4x4.png`);
  const fetched = [], placed = [], pending = [];
  const fx = async (url) => {
    const f = url.pathname.replace(/^\/m\//, "");
    if (f === "index.json") return { ok: true, json: async () => ({ masters }) };
    fetched.push(f + (url.search || "")); await tick();
    const b = files[f]; return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
  };
  const ids = (list) => list.map((i) => "t-" + i);
  const groups = { schema: GROUPS.schema, screens: Object.fromEntries(Object.entries(GROUPS.screens).map(([k, v]) => [k, ids(v)])) };
  const loader = createMasterLoader({ fetch: fx, decode: async () => ({ w: 4, h: 4, rgba: () => null }), place: (m) => placed.push(m.id), register: (m) => pending.push(m.id), concurrency: 1 });
  return { loader, fetched, placed, pending, groups, base: new URL("http://x/m/") };
}

test("boot fetches only the boot groups' pictures and the shown room's; every master is registered without pixels", async () => {
  const w = world();
  await w.loader.load(w.base, { room: 0, order: ORDER, groups: w.groups, boot: ["boot", "home"] });
  assert.equal(w.pending.length, IDS.length + ORDER.length);
  assert.deepEqual(w.placed.sort(), ["room-roots-idle-day-4x4", "t-frame-a", "t-home-a", "t-home-b"].sort());
  assert.ok(w.fetched.every((f) => /\?v=[0-9a-f]{12}$/.test(f)), "every fetch carries its ?v=");
  await tick(); await tick();
  assert.equal(w.fetched.length, 4, "nothing else is fetched until asked for");
});

test("ensure fetches the asked pictures first; a group the loader does not know is empty", async () => {
  const w = world();
  await w.loader.load(w.base, { room: 0, order: ORDER, groups: w.groups });
  assert.deepEqual(w.loader.groupOf("bench"), ["t-bench-a", "t-bench-b"]);
  assert.deepEqual(w.loader.groupOf("nowhere"), []);
  await w.loader.ensure(["t-other-z", "t-bench-a", "not-in-index"]);
  assert.ok(w.placed.includes("t-other-z") && w.placed.includes("t-bench-a"));
  assert.ok(!w.placed.includes("t-bench-b"));
});

test("background warms the cache: it fetches the other groups and rooms and places none of them", async () => {
  const w = world();
  await w.loader.load(w.base, { room: 0, order: ORDER, groups: w.groups });
  const before = w.placed.length; w.loader.background();
  await new Promise((r) => setTimeout(r, 400));   // the warm starts once nothing is wanted (it re-checks every 250 ms)
  for (let i = 0; i < 30; i++) await tick();
  assert.equal(w.placed.length, before, "nothing is decoded or placed");
  assert.ok(w.fetched.some((f) => f.startsWith("shell/bench-a.png")), w.fetched.join());
  assert.ok(!w.fetched.some((f) => f.startsWith("rooms/room-reeds-")), "the other rooms are fetched when shown, not warmed");
  await w.loader.ensure(["t-bench-a"]); assert.ok(w.placed.includes("t-bench-a"));
});

test("without groups (or in test mode) the old boot holds: every non-room master and the shown room", async () => {
  const a = world(); await a.loader.load(a.base, { room: 0, order: ORDER });
  assert.equal(a.pending.length, 0); assert.equal(a.placed.filter((i) => i.startsWith("t-")).length, IDS.length);
  const b = world(); await b.loader.load(b.base, { room: 0, order: ORDER, groups: b.groups, all: true });
  assert.equal(b.pending.length, 0); assert.equal(b.placed.length, IDS.length + ORDER.length);
});

test("a pending master throws MasterPending, keeps its index status, and a stand-in registered later leaves it", () => {
  dropAsset("pend-1");
  registerPending({ id: "pend-1", w: 4, h: 4, file: "x/pend-1.png", hash: "h", status: "master" });
  assert.throws(() => asset("pend-1"), (e) => e instanceof MasterPending && e.id === "pend-1");
  assert.equal(assetEntry("pend-1").status, "master");
  registerAsset({ id: "pend-1", w: 4, h: 4, status: "stand-in", build: () => ({ w: 4, h: 4, rgba: () => new Uint8Array(64) }) });
  assert.throws(() => asset("pend-1"), MasterPending);
  assert.throws(() => registerAsset({ id: "pend-1", w: 8, h: 8, build: () => null }), /different sizes/);
  placeMaster({ id: "pend-1", w: 4, h: 4, file: "x/pend-1.png", hash: "h" }, { w: 4, h: 4, rgba: () => new Uint8Array(64) });
  assert.equal(asset("pend-1").w, 4);
  dropAsset("pend-1");
});
