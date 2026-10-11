// The seeded world (src/world.mjs): generator 1 against its golden vectors (tests/world-vectors.json, captured from the page
// before the world moved out of it), the module's purity, the generator recorded in the save (`gen`, absent means 1) through
// the page itself, and the Station's save reader keeping `gen` untouched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as W from "../src/world.mjs";
import { seedDigest, worldDigest, placeDigest, placeKeys } from "../tools/world-vectors.mjs";

const VECTORS = JSON.parse(readFileSync(new URL("./world-vectors.json", import.meta.url), "utf8"));
const MODULE_SRC = readFileSync(new URL("../src/world.mjs", import.meta.url), "utf8");
const FIXTURE = () => JSON.parse(readFileSync(new URL("../../station/tests/fixtures/save-v8-care-before.json", import.meta.url), "utf8"));
const API = { hash: W.hash, L: W.L, genWorld: s => W.genWorld(s, 1), genPlace: W.genPlace, beaconCells: W.beaconCells, depotCells: W.depotCells };
const vectorOf = seed => VECTORS.gens["1"].seeds.find(s => s.seed === seed);

// The page in a sandbox, as in freeze.test.mjs: the module script with its import bound to the real module's exports.
const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const IMPORT = /^import \{([^}]*)\} from "\.\/src\/world\.mjs";$/m;
const BINDINGS = MODULE.match(IMPORT)[1].split(",").map(s => s.trim().split(/\s+as\s+/));
const SCRIPT = MODULE.replace(IMPORT, "");
function page(store = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const clock = { t: 1000, timers: [] };
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
    matchMedia: () => ({ matches: true }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; for (const [from, to = from] of BINDINGS) ctx[to] = W[from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
  const run = src => vm.runInContext(src, ctx);
  return { run, store, KEY: run("SAVE_KEY") };
}
const withoutMemo = w => { const o = { ...w }; delete o.beacons; delete o.depots; return o; };

test("golden: generator 1 matches the vectors captured from the page, field by field", () => {
  const seeds = VECTORS.gens["1"].seeds;
  assert.equal(seeds.length, 16);
  for (const want of seeds) {
    const got = seedDigest(API, want.seed);
    for (const k of Object.keys(want.world)) assert.deepEqual(got.world[k], want.world[k], `seed ${want.seed}, world, ${k}`);
    assert.deepEqual(got.places.map(p => p.key), want.places.map(p => p.key), `seed ${want.seed}, place keys`);
    want.places.forEach((wp, i) => { for (const k of Object.keys(wp)) assert.deepEqual(got.places[i][k], wp[k], `seed ${want.seed}, place ${wp.key}, ${k}`); });
    assert.deepEqual(got, want, `seed ${want.seed}`);
  }
});

test("the world's key set is complete: G gains no field the vectors do not hash", () => {
  for (const want of VECTORS.gens["1"].seeds) assert.equal(worldDigest(API, W.genWorld(want.seed, 1)).keys, want.world.keys, `seed ${want.seed}`);
});

test("determinism: the same world twice, and places in reverse order on a fresh world", () => {
  assert.deepEqual(seedDigest(API, 7), seedDigest(API, 7));
  const G = W.genWorld(7, 1), keys = placeKeys(G, W.L, [...W.beaconCells(G, 7)], [...W.depotCells(G, 7)]);
  assert.deepEqual(keys, vectorOf(7).places.map(p => p.key));
  const forward = keys.map(k => placeDigest(API, W.genPlace(G, 7, k)));
  const fresh = W.genWorld(7, 1), backward = keys.slice().reverse().map(k => placeDigest(API, W.genPlace(fresh, 7, k))).reverse();
  assert.deepEqual(backward, forward);
  assert.deepEqual(forward, vectorOf(7).places);
});

test("purity, by source: no page state, DOM, storage, clock, randomness, drawing or import", () => {
  const code = MODULE_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const re of [/\bS\./, /document/, /window/, /localStorage/, /Math\.random/, /Date/, /performance/, /getContext/, /import /]) assert.doesNotMatch(code, re);
});

test("unknown generators are refused", () => {
  assert.throws(() => W.genWorld(1, 2), RangeError);
  assert.throws(() => W.genWorld(1, 0), RangeError);
  assert.deepEqual(W.GENS, [1]);
  assert.equal(W.NEW_GEN, 1);
});

test("a save without gen loads as generator 1 and is saved without gen", () => {
  const fx = FIXTURE(); assert.equal("gen" in fx, false);
  const p = page({ "mb-save-v8": JSON.stringify(fx) });
  p.store[p.KEY] = JSON.stringify(fx);
  assert.equal(p.run("load()"), true);
  assert.deepEqual(worldDigest(API, p.run("G")), worldDigest(API, W.genWorld(fx.seed, 1)));
  p.run("save()");
  assert.equal("gen" in JSON.parse(p.store[p.KEY]), false);
});

test("a new world writes gen 1, and its world and first place match the vectors", () => {
  const p = page();
  p.run("newWorld(42)");
  assert.equal(p.run("S.gen"), 1);
  assert.match(p.store[p.KEY], /"seed":42,"gen":1,/);
  const want = vectorOf(42);
  assert.deepEqual(worldDigest(API, p.run("G")), withoutMemo(want.world));
  assert.deepEqual(placeDigest(API, p.run("layout(String(G.spawns[0]))")), want.places[0]);
});

test("a save from a newer generator (gen 3) is read-only: load() says 'newer', boot writes nothing, input does nothing", () => {
  const raw = JSON.stringify(Object.assign(FIXTURE(), { gen: 3 })), writes = [];
  const store = new Proxy({ "mb-save-v8": raw }, { set: (o, k, v) => { writes.push(k); o[k] = v; return true; }, deleteProperty: (o, k) => { if (!/^mb-exploration-v[1-6]$/.test(k)) writes.push(k); delete o[k]; return true; } });   // load() still clears the saves before v7, as on every boot
  const p = page(store);
  assert.equal(p.store[p.KEY], raw, "the stored JSON is byte-identical after boot");
  assert.deepEqual(writes, [], "boot wrote nothing");
  assert.equal(p.run("RT.readOnly"), true);
  assert.equal(p.run("S"), null, "nothing was read into the page");
  assert.equal(p.run("load()"), "newer");
  p.run("var saves = 0; const save0 = save; save = function () { saves++; return save0.apply(this, arguments); };");
  for (const k of ["up", "down", "left", "right", "confirm", "back", "call"]) { p.run(`FX.lockUntil = 0; act(${JSON.stringify(k)}); press(${JSON.stringify(k)}); release(${JSON.stringify(k)})`); }
  p.run("render(1); frame(1000)");
  assert.equal(p.run("saves"), 0, "nothing called save()");
  assert.equal(p.run("S"), null, "input started no world");
  p.run("save0()");
  assert.equal(p.store[p.KEY], raw, "save() returns at once while read-only");
  assert.deepEqual(writes, [], "nothing was written");
  for (const gen of [2, 0, "1"]) { const q = page({ "mb-save-v8": JSON.stringify(Object.assign(FIXTURE(), { gen })) }); assert.equal(q.run("load()"), "newer", `gen ${JSON.stringify(gen)} is not in GENS`); }
});

test("the Station's save reader adopts the save and keeps gen as it is (absent, 1, 2)", async () => {
  const store = {};
  globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const game = await import("../../station/src/game.mjs"), state = await import("../../station/src/state.mjs");
  const noSt = o => { const c = { ...o }; delete c.st; return c; };
  for (const gen of [undefined, 1, 2]) {
    const fx = FIXTURE(); if (gen !== undefined) fx.gen = gen;
    store["mb-save-v8"] = JSON.stringify(fx);
    game.load();
    assert.equal(game.G.sv.wid, fx.wid, `gen ${gen}: adopted`);
    assert.ok(state.hasWorld(game.G.sv), `gen ${gen}: a world`);
    assert.equal(game.G.st.wid, fx.wid, `gen ${gen}: no fresh Station`);
    game.save();
    assert.deepEqual(noSt(JSON.parse(store["mb-save-v8"])), noSt(fx), `gen ${gen}: the Companion's part as written`);
  }
});
