// The seeded world (src/world.mjs): generator 1 against its golden vectors (tests/world-vectors.json, captured from the page
// before the world moved out of it), the module's purity, the generator recorded in the save (`gen`, absent means 1) through
// the page itself, and the Station's save reader keeping `gen` untouched. Generator 2 (terrain levels and stairs): its
// golden vectors, its integer purity, its invariants over seeds 0–999 (places on 0–99) and canStepIn on hand-built worlds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as W from "../src/world.mjs";
import { seedDigest, worldDigest, placeDigest, placeKeys, placeKeys2, SEEDS } from "../tools/world-vectors.mjs";

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

test("unknown generators are refused; generator 2 is built, new worlds stay on generator 1", () => {
  assert.throws(() => W.genWorld(1, 3), RangeError);
  assert.throws(() => W.genWorld(1, 0), RangeError);
  assert.deepEqual(W.GENS, [1, 2]);
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
  for (const gen of [3, 0, "1"]) { const q = page({ "mb-save-v8": JSON.stringify(Object.assign(FIXTURE(), { gen })) }); assert.equal(q.run("load()"), "newer", `gen ${JSON.stringify(gen)} is not in GENS`); }
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

// ---- generator 2 ----
const { L, T, T_BLOCK, MW, MH, PW, PH, EDGE, TERR } = W;
const API2 = { gen: 2, hash: W.hash, L, EDGE, genWorld: s => W.genWorld(s, 2), genPlace: W.genPlace, beaconCells: W.beaconCells, depotCells: W.depotCells };
const vector2Of = seed => VECTORS.gens["2"].seeds.find(s => s.seed === seed);
const NC = MW * MH, onMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const SIDE4 = [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]];

test("golden: generator 2 matches its vectors, field by field (16 seeds)", () => {
  const seeds = VECTORS.gens["2"].seeds;
  assert.deepEqual(seeds.map(s => s.seed), SEEDS);
  for (const want of seeds) {
    const got = seedDigest(API2, want.seed);
    for (const k of Object.keys(want.world)) assert.deepEqual(got.world[k], want.world[k], `seed ${want.seed}, world, ${k}`);
    assert.deepEqual(got.places.map(p => p.key), want.places.map(p => p.key), `seed ${want.seed}, place keys`);
    want.places.forEach((wp, i) => { for (const k of Object.keys(wp)) assert.deepEqual(got.places[i][k], wp[k], `seed ${want.seed}, place ${wp.key}, ${k}`); });
    assert.deepEqual(got, want, `seed ${want.seed}`);
  }
});

test("generator 2: the key list is complete, generator 1's G gains no field, and places come back the same in reverse order", () => {
  for (const want of VECTORS.gens["2"].seeds) assert.equal(Object.keys(W.genWorld(want.seed, 2)).join(","), want.world.keys, `seed ${want.seed}`);
  assert.equal(worldDigest(API, W.genWorld(7, 1)).keys, vectorOf(7).world.keys);
  const G = W.genWorld(7, 2), keys = placeKeys2(G, L, [...G.beacons.set], [...G.depots.set], EDGE);
  assert.deepEqual(keys, vector2Of(7).places.map(p => p.key));
  const forward = keys.map(k => placeDigest(API2, W.genPlace(G, 7, k), 2));
  const fresh = W.genWorld(7, 2), backward = keys.slice().reverse().map(k => placeDigest(API2, W.genPlace(fresh, 7, k), 2)).reverse();
  assert.deepEqual(backward, forward);
  assert.deepEqual(forward, vector2Of(7).places);
  assert.equal(W.beaconCells(G, 7), G.beacons.set, "the eager beacons are the memo");
  assert.equal(W.depotCells(G, 7), G.depots.set, "the eager outposts are the memo");
});

test("generator 2 is integer only, by source", () => {
  const a = MODULE_SRC.indexOf("// ---- generator 2 (integer only) ----\n"), b = MODULE_SRC.indexOf("// ---- end generator 2 ----\n");
  assert.ok(a > 0 && b > a, "the generator 2 markers");
  const code = MODULE_SRC.slice(a, b).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const s of ["Math.hypot", "Math.round", "Math.sqrt", "Math.pow", "Math.random", ".f(", ".chance(", ".pick(", "rnd(", "fbm(", "noise2(", "finishLayout(", "genPatch(", "genCave("])
    assert.equal(code.includes(s), false, s);
  assert.doesNotMatch(code, /(^|[^\w.])\d*\.\d+/, "a float literal");
  for (const s of [0, 1, 4294967295]) for (const P of [3, 4, 5, 8]) for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const v = W.noiseQ(s, x, y, P); assert.ok(Number.isInteger(v) && v >= 0 && v <= 32767, `noiseQ ${s} ${P} ${x},${y}`); }
});

// The validation checks of generator 2, written again here.
function levelChecks(G) {
  const lv = G.level, bad = [];
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!onMap(x + dx, y + dy)) continue; const n = (y + dy) * MW + x + dx;
      if (Math.abs(lv[c] - lv[n]) > 1) bad.push(`step ${c}-${n}`); if (G.land[c] === L.WATER && lv[n]) bad.push(`ring ${n}`); }
    if (x < MW - 1 && y < MH - 1) { const a = lv[c], b = lv[c + 1], cc = lv[c + MW], d = lv[c + MW + 1]; if (a === d && b === cc && a !== b) bad.push(`saddle ${c}`); } }
  for (let Y = 0; Y <= MH; Y++) for (let X = 0; X <= MW; X++) { const r = new Set();
    for (const [x, y] of [[X - 1, Y - 1], [X, Y - 1], [X - 1, Y], [X, Y]]) if (onMap(x, y)) r.add(G.land[y * MW + x] === L.WATER ? 0 : 1 + lv[y * MW + x]);
    if (r.size > 2) bad.push(`corner ${X},${Y}`); }
  return bad;
}
function zonesOf(G) {
  const id = new Array(NC).fill(-1); let n = 0;
  for (let s = 0; s < NC; s++) { if (id[s] >= 0 || !W.passableIn(G, s) || G.island[s]) continue; const st = [s]; id[s] = n;
    while (st.length) { const c = st.pop(); for (const [, dx, dy] of SIDE4) { const x = c % MW + dx, y = ((c / MW) | 0) + dy; if (!onMap(x, y)) continue; const d = y * MW + x;
      if (id[d] < 0 && W.passableIn(G, d) && !G.island[d] && G.level[d] === G.level[c]) { id[d] = n; st.push(d); } } }
    n++; }
  return n;
}
const digestOf = G => JSON.stringify(worldDigest(API2, G)) + JSON.stringify([...G.beacons.set]) + JSON.stringify([...G.depots.set]);

test("generator 2, invariants over seeds 0–999", () => {
  const t0 = Date.now();
  for (let s = 0; s < 1000; s++) {
    const G = W.genWorld(s, 2), lv = G.level, at = `seed ${s}`;
    assert.ok(Number.isInteger(G.attempt) && G.attempt >= 0 && G.attempt <= 8, at);
    assert.equal(G.gen, 2, at);
    assert.ok(G.land instanceof Uint8Array && G.level instanceof Uint8Array && G.edge.length === 2 * NC && G.comp instanceof Uint8Array, at);
    assert.deepEqual(levelChecks(G), [], at);
    assert.ok(G.gate >= 0, at);
    assert.equal(G.spawns.length, 5, at);
    assert.ok(W.cdist(G.spawns[0], G.gate) >= 2 && W.cdist(G.spawns[0], G.gate) <= 4, at);
    const inComp = c => c >= 0 && G.comp[c] === 1;
    assert.ok(inComp(G.deep) && G.spawns.every(inComp) && G.glow.every(inComp) && (G.swim < 0 || inComp(G.swim)), at);
    assert.ok([...G.beacons.set].every(inComp) && G.depots.set.size === 6 && [...G.depots.set].every(inComp), at);
    let dry = 0, dc = 0; const per = [0, 0, 0];
    for (let c = 0; c < NC; c++) if (G.land[c] !== L.WATER && !G.island[c]) { dry++; per[lv[c]]++; if (G.comp[c]) dc++; }
    assert.ok(dc * 100 >= 70 * dry, at + " comp share");
    if (G.attempt !== 8) { assert.ok(per.every(n => n * 100 >= 10 * dry), at + " level shares"); assert.ok(G.cross.length >= 1, at + " a ramp"); }
    // the edge byte
    const cross = [];
    for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
      for (const [i, n, on] of [[2 * c, c + 1, x < MW - 1], [2 * c + 1, c + MW, y < MH - 1]]) {
        const k = G.edge[i];
        if (!on) { assert.equal(k, 0, `${at} padding ${i}`); continue; }
        assert.ok(k <= 2, at);
        if (lv[c] === lv[n]) assert.equal(k, EDGE.OPEN, `${at} edge ${i}`); else assert.ok(k === EDGE.CLIFF || k === EDGE.RAMP, `${at} edge ${i}`);
        if (k === EDGE.RAMP) { cross.push({ c, side: i & 1 ? "s" : "e", kind: "ramp" });
          assert.ok(W.passableIn(G, c) && W.passableIn(G, n) && !G.island[c] && !G.island[n], `${at} ramp ${i}`); } } }
    assert.deepEqual(G.cross, cross, at + " cross");
    if (G.attempt !== 8) assert.equal(G.cross.length, zonesOf(G) - 1, at + " ramps = zones - 1");
    assert.equal(G.edge[2 * G.mouth + 1], EDGE.CLIFF, at + " the gate's north side");
    assert.equal(G.mouth, G.gate - MW, at);
    assert.equal(lv[G.mouth], lv[G.gate] + 1, at);
    assert.equal(G.land.includes(L.CLIFF), false, at + " no cliff cell");
    if (s < 50) assert.equal(digestOf(W.genWorld(s, 2)), digestOf(G), at + " determinism");
  }
  console.log(`# generator 2: 1000 worlds checked in ${Date.now() - t0} ms`);
});

// A place's expected band kind at depth 0 (and 1 for a south face) on a side, away from the corners; null if the side is open.
function bandOf(G, cell, dir) {
  const [dx, dy] = DIRS4[dir], x = cell % MW + dx, y = ((cell / MW) | 0) + dy;
  if (!onMap(x, y)) return null;
  const l = G.level[cell], n = G.level[y * MW + x];
  if (n === l) return null;
  return { hi: n > l, k: G.edge[W.edgeIndex(cell, dir)] };
}
const DIRS4 = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const tileAt = (dir, k, d) => ({ x: dir === "left" ? d : dir === "right" ? PW - 1 - d : k, y: dir === "up" ? d : dir === "down" ? PH - 1 - d : k });

test("generator 2 places, on seeds 0–99: bands, stairs, solid borders, sides and tails", () => {
  const t0 = Date.now(); let places = 0, stairsN = 0;
  const is = (a, b, m) => { if (a !== b) assert.equal(a, b, m()); }, ok = (v, m) => { if (!v) assert.ok(v, m()); };
  for (let s = 0; s < 100; s++) {
    const G = W.genWorld(s, 2), lays = new Map(), sOf = new Map();
    const cells = []; for (let c = 0; c < NC; c++) if (SIDE4.some(([dir]) => bandOf(G, c, dir))) cells.push(c);
    for (const c of cells) lays.set(c, W.genPlace(G, s, String(c)));
    for (const c of cells) {
      const lay = lays.get(c), at = `seed ${s} cell ${c}`, I = (x, y) => y * PW + x, walk = (x, y) => !T_BLOCK[lay.tiles[I(x, y)]];
      const l = G.level[c], cx = c % MW, cy = (c / MW) | 0, lvAt = (dx, dy) => onMap(cx + dx, cy + dy) ? G.level[(cy + dy) * MW + cx + dx] : l;
      places++;
      ok(lay.reach[I(lay.spawnPt.x, lay.spawnPt.y)], () => at + " spawn point in reach");
      for (const [dir] of SIDE4) {
        const b = bandOf(G, c, dir); if (!b) continue;
        const len = dir === "up" || dir === "down" ? PW : PH, i = W.edgeIndex(c, dir), ramp = b.k === EDGE.RAMP;
        const st = lay.stairs.filter(t => t.dir === dir);
        is(st.length, ramp ? 1 : 0, () => `${at} ${dir} stairs`);
        const sp = ramp ? W.stairPos(s, i, len) : -9;
        const northLow = dir === "down" && b.hi;   // the lower side of a north-facing drop: its shadow row is walkable
        for (let k = 0; k < len; k++) {
          const p0 = tileAt(dir, k, 0), onStair = ramp && (k === sp || k === sp + 1);
          // 3. solid borders
          if (!northLow) is(walk(p0.x, p0.y), onStair, () => `${at} ${dir} k ${k} walkable`);
          if (k < 2 || k > len - 3) continue;
          // 1. the side matches the band table
          const t0k = lay.terr[I(p0.x, p0.y)], t1k = lay.terr[I(tileAt(dir, k, 1).x, tileAt(dir, k, 1).y)];
          if (onStair) continue;
          if (!b.hi) is(t0k, TERR.LIP, () => `${at} ${dir} k ${k} lip`);
          else if (dir === "up") { is(t0k, TERR.FACE, () => `${at} face row 0`); is(t1k, TERR.FACE, () => `${at} face row 1`); }
          else if (dir === "down") is(t0k, TERR.SHADOW, () => `${at} shadow`);
          else { is(t0k, TERR.SIDE, () => `${at} ${dir} side`); is(lay.tmask[I(p0.x, p0.y)] & 1, dir === "left" ? 1 : 0, () => `${at} side looks`); }
        }
        if (!ramp) continue;
        // 2. the stair: position, footprint, entry
        const t = st[0]; stairsN++;
        is(t.s, sp, () => `${at} ${dir} stairPos`);
        is(t.role, b.hi ? "lo" : "hi", () => at);
        const facing = { up: b.hi ? "S" : "N", down: b.hi ? "N" : "S", left: b.hi ? "E" : "W", right: b.hi ? "W" : "E" }[dir];
        is(t.facing, facing, () => at);
        const foot = b.hi ? (facing === "N" ? [[0, TERR.FOOT]] : [[0, TERR.STAIR], [1, TERR.STAIR], [2, TERR.FOOT]])
                          : (facing === "N" ? [[0, TERR.STAIR], [1, TERR.APRON_TOP]] : [[0, TERR.LANDING]]);
        for (const [d, kind] of foot) for (const k of [sp, sp + 1]) { const p = tileAt(dir, k, d); is(lay.terr[I(p.x, p.y)], kind, () => `${at} ${dir} footprint d ${d}`);
          is(lay.tiles[I(p.x, p.y)], kind === TERR.STAIR ? T.STAIR : T.APRON, () => at); }
        const ed = b.hi ? (facing === "N" ? 0 : 2) : (facing === "N" ? 1 : 0);
        assert.deepEqual(t.entry, tileAt(dir, sp, ed), `${at} ${dir} entry`);
        ok(walk(t.entry.x, t.entry.y) && lay.reach[I(t.entry.x, t.entry.y)], () => `${at} ${dir} entry walkable and in reach`);
        if (!sOf.has(i)) sOf.set(i, t.s); else is(sOf.get(i), t.s, () => `${at} both places agree on s`);
      }
      // 4. no tile is both high side and low side
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const tk = lay.terr[I(x, y)]; if (!tk) continue;
        let hi = false, lo = false;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const X = x + ox, Y = y + oy, dx = X < 0 ? -1 : X >= PW ? 1 : 0, dy = Y < 0 ? -1 : Y >= PH ? 1 : 0;
          if (!dx && !dy) continue; const v = lvAt(dx, dy); if (v > l) hi = true; if (v < l) lo = true; }
        if (y <= 1 && lvAt(0, -1) > l) hi = true;                                          // a south face's second row
        if (y <= 1 && ((x === 0 && lvAt(-1, -1) > l) || (x === PW - 1 && lvAt(1, -1) > l))) hi = true;   // a side tail
        ok(!(hi && lo), () => `${at} tile ${x},${y} both`);
        if (tk === TERR.LIP) ok(lo && !hi, () => `${at} lip ${x},${y}`);
        if (tk === TERR.FACE || tk === TERR.SIDE || tk === TERR.SHADOW) ok(hi && !lo, () => `${at} low-side ${x},${y}`); }
    }
    // 5. side tails: a tail at (0, 0..1) exactly when the north place's SIDE at (0, PH - 1) has bit 3, and then the west place's face ends there
    for (const c of cells) {
      const lay = lays.get(c), cx = c % MW, cy = (c / MW) | 0, I = (x, y) => y * PW + x;
      for (const [x, wx] of [[0, -1], [PW - 1, 1]]) {
        // a SIDE column at (x, 0..1) whose own side cell is level with the place is a tail, not a side face
        const tail = [0, 1].every(y => lay.terr[I(x, y)] === TERR.SIDE) && onMap(cx + wx, cy) && G.level[cy * MW + cx + wx] === G.level[c];
        const north = cy > 0 ? c - MW : -1, nl = north >= 0 ? lays.get(north) || W.genPlace(G, s, String(north)) : null;
        const bit3 = !!nl && nl.terr[I(x, PH - 1)] === TERR.SIDE && (nl.tmask[I(x, PH - 1)] & 8) !== 0;
        is(tail, bit3, () => `seed ${s} cell ${c} tail at x ${x}`);
        if (tail) { const side = c + wx, wl = lays.get(side) || W.genPlace(G, s, String(side)), ex = PW - 1 - x;
          for (const y of [0, 1]) { is(wl.terr[I(ex, y)], TERR.FACE, () => `seed ${s} cell ${c} face beside the tail`);
            ok(wl.tmask[I(ex, y)] & (x === 0 ? 4 : 2), () => `seed ${s} cell ${c} the face's outer end`); }
          is(lay.tmask[I(x, 1)] & 4, 4, () => "the tail's foot"); }
      }
    }
  }
  console.log(`# generator 2: ${places} places and ${stairsN} stairs checked in ${Date.now() - t0} ms`);
});

test("canStepIn on hand-built worlds", () => {
  const G1 = W.genWorld(1, 1);
  for (let a = 0; a < NC; a++) for (const [dir, dx, dy] of SIDE4) { const x = a % MW + dx, y = ((a / MW) | 0) + dy;
    assert.equal(W.canStepIn(G1, a, dir), onMap(x, y) && W.passableIn(G1, y * MW + x), `generator 1, ${a} ${dir}`); }
  const mk = () => ({ land: new Uint8Array(NC), ford: new Uint8Array(NC), island: new Uint8Array(NC), level: new Uint8Array(NC), edge: new Uint8Array(2 * NC) });
  const a = 5 * MW + 5, G = mk();
  assert.equal(W.canStepIn(G, a, "right"), true); assert.equal(W.canStepIn(G, a + 1, "left"), true);
  G.edge[2 * a] = EDGE.CLIFF; assert.equal(W.canStepIn(G, a, "right"), false); assert.equal(W.canStepIn(G, a + 1, "left"), false);
  G.edge[2 * a] = EDGE.RAMP; assert.equal(W.canStepIn(G, a, "right"), true); assert.equal(W.canStepIn(G, a + 1, "left"), true);
  G.edge[2 * a + 1] = EDGE.CLIFF; assert.equal(W.canStepIn(G, a, "down"), false); assert.equal(W.canStepIn(G, a + MW, "up"), false);
  G.edge[2 * a + 1] = 3; assert.equal(W.canStepIn(G, a, "down"), false, "an unknown kind blocks"); assert.equal(W.canStepIn(G, a + MW, "up"), false);
  for (let x = 0; x < MW; x++) { assert.equal(W.canStepIn(G, x, "up"), false); assert.equal(W.canStepIn(G, (MH - 1) * MW + x, "down"), false); }
  for (let y = 0; y < MH; y++) { assert.equal(W.canStepIn(G, y * MW, "left"), false); assert.equal(W.canStepIn(G, y * MW + MW - 1, "right"), false); }
  const b = 9 * MW + 9; G.land[b + 1] = L.WATER; assert.equal(W.canStepIn(G, b, "right"), false, "into water"); G.ford[b + 1] = 1; assert.equal(W.canStepIn(G, b, "right"), true, "into a ford");
  // symmetry on every edge of seed 7 between two passable cells (canStepIn reads the target cell only, so water to land is one-way)
  const G7 = W.genWorld(7, 2), pass = c => W.passableIn(G7, c); let both = 0;
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    if (x < MW - 1 && pass(c) && pass(c + 1)) { both++; assert.equal(W.canStepIn(G7, c, "right"), W.canStepIn(G7, c + 1, "left"), `symmetry ${c} right`); }
    if (y < MH - 1 && pass(c) && pass(c + MW)) { both++; assert.equal(W.canStepIn(G7, c, "down"), W.canStepIn(G7, c + MW, "up"), `symmetry ${c} down`); } }
  assert.ok(both > 400);
  assert.deepEqual([W.edgeIndex(a, "right"), W.edgeIndex(a, "left"), W.edgeIndex(a, "down"), W.edgeIndex(a, "up")], [2 * a, 2 * (a - 1), 2 * a + 1, 2 * (a - MW) + 1]);
  assert.equal(W.edgeKindIn(G1, a, "right"), EDGE.OPEN, "generator 1: every edge is open");
});
