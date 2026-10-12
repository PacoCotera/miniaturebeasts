// The seeded world (src/world.mjs): generator 1 against its golden vectors (tests/world-vectors.json, captured from the page
// before the world moved out of it), the module's purity, the generator recorded in the save (`gen`, absent means 1) through
// the page itself, and the Station's save reader keeping `gen` untouched. Generator 2 (terrain levels and stairs): its
// golden vectors, its integer purity, its invariants over seeds 0–999 (places on 0–99) and canStepIn on hand-built worlds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as W from "../src/world.mjs";
import * as A from "../src/atlas.mjs";
import * as V from "../src/view.mjs";
import { seedDigest, worldDigest, placeDigest, placeKeys, placeKeys2, SEEDS, VIEW_CASES, viewArgs } from "../tools/world-vectors.mjs";

const VECTORS = JSON.parse(readFileSync(new URL("./world-vectors.json", import.meta.url), "utf8"));
const MODULE_SRC = readFileSync(new URL("../src/world.mjs", import.meta.url), "utf8");
const VIEW_SRC = readFileSync(new URL("../src/view.mjs", import.meta.url), "utf8");
const FIXTURE = () => JSON.parse(readFileSync(new URL("../../station/tests/fixtures/save-v8-care-before.json", import.meta.url), "utf8"));
const API = { hash: W.hash, L: W.L, genWorld: s => W.genWorld(s, 1), genPlace: W.genPlace, beaconCells: W.beaconCells, depotCells: W.depotCells };
const vectorOf = seed => VECTORS.gens["1"].seeds.find(s => s.seed === seed);

// The page in a sandbox, as in freeze.test.mjs: the module script with its import bound to the real module's exports.
const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
// every `import { … } from "./src/<module>.mjs"` line of the page, bound to that module's exports
const MODS = { world: W, view: V, atlas: A };
const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
const SCRIPT = MODULE.replace(IMPORT_RE, "");
// A canvas that keeps palette indices (-1 transparent): fillRect, drawImage (2, 4 and 8 arguments, nearest), image data; clips are ignored.
function fakeCanvas(look) {
  const t = { width: 0, height: 0 }; let p = null;
  const buf = () => { if (!p || p.length !== t.width * t.height) p = new Int16Array(t.width * t.height).fill(-1); return p; };
  const put = (x, y, v) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < t.width && y < t.height) buf()[y * t.width + x] = v; };
  const ctx = { fillStyle: "", imageSmoothingEnabled: false, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, setTransform() {},
    fillRect(x, y, w, h) { const v = look.hex(this.fillStyle); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, v); },
    drawImage(src, ...a) { const sp = src.px(); let [sx, sy, sw, sh] = [0, 0, src.width, src.height], dx, dy, dw, dh;
      if (a.length === 2) [dx, dy, dw, dh] = [a[0], a[1], sw, sh]; else if (a.length === 4) [dx, dy, dw, dh] = a; else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
      for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) { const v = sp[(sy + Math.floor(j * sh / dh)) * src.width + sx + Math.floor(i * sw / dw)]; if (v >= 0) put(dx + i, dy + j, v); } },
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData(id, x, y) { for (let j = 0; j < id.height; j++) for (let i = 0; i < id.width; i++) { const o = (j * id.width + i) * 4; put(x + i, y + j, id.data[o + 3] ? look.rgb(id.data[o], id.data[o + 1], id.data[o + 2]) : -1); } },
    getImageData(x, y, w, h) { const d = new Uint8ClampedArray(w * h * 4); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = buf()[(y + j) * t.width + x + i];
      if (v >= 0) { const c = look.rgbOf(v), o = (j * w + i) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; } } return { width: w, height: h, data: d }; } };
  return Object.assign(t, { getContext: () => ctx, px: buf, style: {}, toDataURL: () => "" });
}
// `search` is the page's query string; the page's elements record their listeners (els[id].on.click). opts.canvas: canvases are
// fakeCanvas, so a drawing can be read back (p.run("scr").px()). opts.script: a variant of the page script.
function page(store = {}, search, opts = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const els = {}, elStub = () => { const on = {}; return new Proxy(function () {}, { get: (t, k) => k === "addEventListener" ? (e, f) => { on[e] = f; } : k === "on" ? on : any[k], apply: () => any, set: () => true }); };
  let run = null, pal = null; const P = () => pal || (pal = { hex: new Map(run("HEX").map((h, i) => [h, i])), rgb: run("RGB"), of: new Map(run("RGB").map((c, i) => [c[0] << 16 | c[1] << 8 | c[2], i])) });
  const look = { hex: h => P().hex.get(h) ?? -2, rgbOf: v => P().rgb[v], rgb: (r, g, b) => P().of.get(r << 16 | g << 8 | b) ?? -2 };
  const document = new Proxy(any, { get: (t, k) => k === "getElementById" ? id => els[id] || (els[id] = elStub()) : k === "createElement" && opts.canvas ? tag => tag === "canvas" ? fakeCanvas(look) : any : any[k] });
  const clock = { t: 1000, timers: [] };
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document, location: search ? { search, reload() {} } : any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx);
  run = src => vm.runInContext(src, ctx); run(opts.script || SCRIPT);
  return { run, store, els, KEY: run("SAVE_KEY") };
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

test("unknown generators are refused; the page plays generators 1 and 2, and new worlds take generator 2", () => {
  assert.throws(() => W.genWorld(1, 3), RangeError);
  assert.throws(() => W.genWorld(1, 0), RangeError);
  assert.deepEqual(W.GENS, [1, 2]);
  assert.equal(W.genWorld(1, 2).gen, 2);
  assert.equal(W.NEW_GEN, 2);
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

test("a new world writes gen 2, and its world and first place match generator 2's vectors", () => {
  const p = page();
  p.run("newWorld(42)");
  assert.equal(p.run("S.gen"), 2);
  assert.match(p.store[p.KEY], /"seed":42,"gen":2,/);
  const want = VECTORS.gens["2"].seeds.find(s => s.seed === 42), G = p.run("G");
  assert.deepEqual(Object.assign(worldDigest(API2, G), { beacons: [...W.beaconCells(G, 42)], depots: [...W.depotCells(G, 42)] }), want.world);
  assert.equal(want.places[0].key, String(G.spawns[0]));
  assert.deepEqual(placeDigest(API2, p.run("layout(String(G.spawns[0]))"), 2), want.places[0]);
});

test("a save from a newer generator (gen 3) is read-only: load() says 'newer', boot writes nothing, input does nothing", () => {
  const raw = JSON.stringify(Object.assign(FIXTURE(), { gen: 3 })), writes = [];
  const old = { "mb-exploration-v1": "{}", "mb-exploration-v6": "{}" };   // the saves before v7 stay too: read-only boot removes nothing
  const store = new Proxy({ "mb-save-v8": raw, ...old }, { set: (o, k, v) => { writes.push(k); o[k] = v; return true; }, deleteProperty: (o, k) => { writes.push(k); delete o[k]; return true; } });
  const p = page(store);
  assert.equal(p.store[p.KEY], raw, "the stored JSON is byte-identical after boot");
  assert.deepEqual(writes, [], "boot wrote and removed nothing");
  for (const k of Object.keys(old)) assert.equal(p.store[k], "{}", `${k} left alone`);
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
  assert.doesNotThrow(() => p.els.copyNotes.on.click(), "Copy notes is a no-op while read-only");
  assert.deepEqual(writes, [], "Copy notes wrote nothing");
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

// ---- src/view.mjs: the place camera and coordinates (C2a §3, §8.2) ----
test("view: src/view.mjs gives every literal case in world-vectors.json, and the file holds every case", () => {
  assert.deepEqual(VECTORS.view.map(c => c.name), VIEW_CASES.map(c => c.name), "the case list");
  for (const c of VECTORS.view) assert.deepEqual(V[c.fn](...viewArgs(V, c.args)), c.out, c.name);
  const at = n => VECTORS.view.find(c => c.name === n).out;
  assert.deepEqual(at("camAt at 32 (today's value)"), { x: 239, y: 492 }, "today's camera on main at 32 px");
  assert.deepEqual(at("visTiles at spawn"), { tx0: 9, ty0: 20, tx1: 19, ty1: 31 }, "11 × 12 tiles");
});
test("view: pure and integer only, by source; its only import is ./world.mjs; no export shadows a page identifier", () => {
  const code = VIEW_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const re of [/\bS\./, /document/, /window/, /localStorage/, /Math\.random/, /Date/, /performance/, /getContext/, /Math\.round/, /Math\.hypot/, /Math\.sqrt/]) assert.doesNotMatch(code, re, String(re));
  assert.doesNotMatch(code, /(^|[^\w.])\d*\.\d+/, "a float literal");
  assert.deepEqual([...code.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]), ["./world.mjs"]);
  assert.equal((code.match(/\bimport\b/g) || []).length, 1, "one import");
  const SCRIPT_DECL = new Set([...SCRIPT.matchAll(/^(?:const|let|function) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));
  for (const k of Object.keys(V)) assert.ok(!SCRIPT_DECL.has(k), k + " is also a page identifier");
});
test("the storm's dark band: at a fractional gap, 32 px keeps main's columns and 48 px takes STORM_K[48]", () => {
  assert.match(MODULE, /darkW = Math\.ceil\(\(3 - gap\) \* STORM_K\[ts\]\) \* ts;/, "drawPatch's band");
  const p = page(), K = p.run("STORM_K"), gaps = Array.from({ length: 12 }, (_, i) => i / 4), cols = ts => gaps.map(g => Math.ceil((3 - g) * K[ts]));
  assert.deepEqual(cols(32), gaps.map(g => Math.ceil((3 - g) * 2.4)), "main's formula at 32");
  assert.deepEqual(cols(32), [8, 7, 6, 6, 5, 5, 4, 3, 3, 2, 2, 1]);
  assert.deepEqual(cols(48), [5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1]);
  for (const g of [0.2, 0.45, 1.65, 2.95]) assert.ok(Number.isInteger(Math.ceil((3 - g) * K[48])) && Math.ceil((3 - g) * K[32]) > 0, "a whole number of columns at gap " + g);
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
        for (const y of [0, 1]) is(lay.terr[I(x, y)] === TERR.SIDE && (lay.tmask[I(x, y)] & 16) !== 0, tail, () => `seed ${s} cell ${c} bit 4 at ${x},${y}`);   // both tail tiles carry bit 4
      }
      for (let i = 0; i < PW * PH; i++) if (lay.terr[i] === TERR.SIDE && (lay.tmask[i] & 16)) { const x = i % PW, y = (i / PW) | 0;   // and no other tile does
        ok((x === 0 || x === PW - 1) && y <= 1 && onMap(cx + (x ? 1 : -1), cy) && G.level[cy * MW + cx + (x ? 1 : -1)] === G.level[c], () => `seed ${s} cell ${c} bit 4 only on a tail, ${x},${y}`); }
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

// ---- generator 2 in play (page harness) ----
// A new (generator 2) world on a vector seed, calm, with an expedition set out at `cell` (map in view).
function g2At(seed, cell) {
  const p = page();
  p.run(`TEST.calm = true; newWorld(${seed}); startExpedition('weather', ${cell}); S.exp.fog = null; S.exp.range = 4; FX.lockUntil = 0;`);
  assert.equal(p.run("S.gen"), 2, "a new world takes generator 2");
  return p;
}
// Every edge of a generator 2 world: a (the cell the step starts from), dir, kind, facing (the way the drop faces) and up (into the higher cell).
function edgesOf(G) {
  const out = [];
  for (let a = 0; a < NC; a++) for (const [dir, dx, dy] of SIDE4) { const x = a % MW + dx, y = ((a / MW) | 0) + dy; if (!onMap(x, y)) continue;
    const b = y * MW + x, kind = G.edge[W.edgeIndex(a, dir)]; if (kind === EDGE.OPEN) continue;
    const hiCell = G.level[a] > G.level[b] ? a : b, loCell = hiCell === a ? b : a, d = hiCell - loCell;
    out.push({ a, b, dir, kind, up: hiCell === b, facing: d === -MW ? "S" : d === MW ? "N" : d === -1 ? "E" : "W", i: W.edgeIndex(a, dir) }); }
  return out;
}
// The entry tile of §6.3's table, from the stair position alone.
function entryFor(seed, e) {
  const s = W.stairPos(seed, e.i, e.dir === "up" || e.dir === "down" ? PW : PH);
  return { S: e.up ? { x: s, y: PH - 1 } : { x: s, y: 2 }, N: e.up ? { x: s, y: 1 } : { x: s, y: PH - 1 },
    E: e.up ? { x: PW - 1, y: s } : { x: 2, y: s }, W: e.up ? { x: 0, y: s } : { x: PW - 3, y: s } }[e.facing];
}
// The first ramp of each kind of crossing on the vector seeds, with both cells playable.
const CROSSINGS = (() => { const found = {};
  for (const seed of SEEDS) { const G = W.genWorld(seed, 2);
    for (const e of edgesOf(G)) { const k = e.facing + (e.up ? " up" : " down");
      if (e.kind === EDGE.RAMP && !found[k] && G.comp[e.a] && G.comp[e.b]) found[k] = { seed, ...e }; } }
  return found; })();

test("generator 2 play: entry tiles for the 8 crossings, and an occupied entry", () => {
  assert.deepEqual(Object.keys(CROSSINGS).sort(), ["E down", "E up", "N down", "N up", "S down", "S up", "W down", "W up"]);
  for (const [k, e] of Object.entries(CROSSINGS)) {
    const p = g2At(e.seed, e.a), n = p.run("S.exp.actions");
    p.run(`act(${JSON.stringify(e.dir)})`);
    assert.equal(p.run("S.exp.pos"), e.b, `${k}: across the stair`); assert.equal(p.run("S.exp.actions"), n + 1, `${k}: one action`);
    p.run("act('confirm')");
    assert.equal(p.run("S.phase"), "patch", `${k}: down into the place`);
    assert.deepEqual(JSON.parse(p.run("JSON.stringify({ x: S.exp.patch.x, y: S.exp.patch.y })")), entryFor(e.seed, e), `${k}: the entry tile (seed ${e.seed}, cell ${e.b})`);
  }
  // the entry tile occupied: the nearest free walkable tile by squared distance, never the stair, a face or a lip
  const e = CROSSINGS["S down"], p = g2At(e.seed, e.a), want = entryFor(e.seed, e);
  p.run(`act(${JSON.stringify(e.dir)}); ensureLive(String(S.exp.pos)); S.exp.live[String(S.exp.pos)].cr.push({ id: 999, sp: 0, x: ${want.x}, y: ${want.y}, st: 'idle', t: 0, wet: 0, calm: 0, curl: 0, hide: 0, b: 0.5, face: 1, ready: false }); act('confirm');`);
  const got = JSON.parse(p.run("JSON.stringify({ x: S.exp.patch.x, y: S.exp.patch.y })")), lay = p.run("layout(String(S.exp.pos))"), t = lay.tiles[got.y * PW + got.x];
  assert.notDeepEqual(got, want);
  assert.ok(![T.STAIR, T.FACE, T.LIP].includes(t) && lay.reach[got.y * PW + got.x], "a free walkable tile");
  let best = 1e9; for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x;
    if (lay.reach[i] && !T_BLOCK[lay.tiles[i]] && lay.tiles[i] !== T.STAIR && !(x === want.x && y === want.y) && !p.run(`occupant(String(S.exp.pos), ${x}, ${y}, 'player')`)) best = Math.min(best, (x - want.x) ** 2 + (y - want.y) ** 2); }
  assert.equal((got.x - want.x) ** 2 + (got.y - want.y) ** 2, best, "the nearest");
});

test("generator 2 play: a same-level crossing enters as today (nearest tile to the side's middle)", () => {
  const seed = SEEDS[0], G = W.genWorld(seed, 2);
  let a = -1; for (let c = 0; c < NC && a < 0; c++) if (G.comp[c] && c % MW < MW - 1 && G.comp[c + 1] && G.edge[2 * c] === EDGE.OPEN && !G.island[c + 1]) a = c;
  const p = g2At(seed, a); p.run("act('right'); act('confirm')");
  const lay = p.run("layout(String(S.exp.pos))"); let best = null, bd = 1e9;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { if (!lay.reach[y * PW + x] || (p.run(`occupant(String(S.exp.pos), ${x}, ${y}, 'player')`))) continue; const d = x * x + (y - PH / 2) ** 2; if (d < bd) { bd = d; best = { x, y }; } }
  assert.deepEqual(JSON.parse(p.run("JSON.stringify({ x: S.exp.patch.x, y: S.exp.patch.y })")), best);
});

test("generator 2 play: leaving a place by a stair crosses; beside it on the shadow row the steep edge refuses", () => {
  const e = CROSSINGS["S down"], p = g2At(e.seed, e.a), s = W.stairPos(e.seed, e.i, PW);
  p.run(`act(${JSON.stringify(e.dir)}); act('confirm'); S.exp.patch.x = ${s}; S.exp.patch.y = 0; S.exp.patch.dir = 'up';`);
  const n = p.run("S.exp.actions"); p.run("FX.lockUntil = 0; act('up')");
  assert.equal(p.run("S.exp.pos"), e.a, "up the stair onto the higher cell"); assert.equal(p.run("S.exp.actions"), n + 1, "one action");
  // the lower side of a north-facing drop: the shadow row is walkable, only the stair's two tiles cross
  const f = CROSSINGS["N down"], q = g2At(f.seed, f.a), t = W.stairPos(f.seed, f.i, PW);
  q.run(`act(${JSON.stringify(f.dir)}); act('confirm')`);
  const lay = q.run("layout(String(S.exp.pos))"); let x = -1; for (let k = 0; k < PW && x < 0; k++) if (k !== t && k !== t + 1 && lay.reach[(PH - 1) * PW + k] && !q.run(`occupant(String(S.exp.pos), ${k}, ${PH - 1}, 'player')`)) x = k;
  assert.ok(x >= 0, "a walkable shadow tile beside the stair");
  q.run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${PH - 1}; FX.notes = []; FX.msg = '';`); const m = q.run("S.exp.actions"), b0 = q.run("FX.bumpAt");
  q.run("FX.lockUntil = 0; act('down')");
  assert.equal(q.run("S.exp.pos"), f.b, "still in the place's cell"); assert.equal(q.run("S.phase"), "patch"); assert.equal(q.run("S.exp.actions"), m, "no action");
  assert.ok(q.run("FX.bumpAt") > b0, "the bump"); assert.match(q.run("FX.msg"), /Steep edge · look for stairs/);
  q.run(`S.exp.patch.x = ${t + 1}; S.exp.patch.y = ${PH - 1}; FX.lockUntil = 0; act('down')`);
  assert.equal(q.run("S.exp.pos"), f.a, "the stair's tile crosses");
});

test("generator 2 play: the map refuses a steep edge (bump, message, no action) and crosses a stair (one action)", () => {
  const seed = SEEDS[0], G = W.genWorld(seed, 2), cliff = edgesOf(G).find(e => e.kind === EDGE.CLIFF && G.comp[e.a] && G.comp[e.b]);
  const p = g2At(seed, cliff.a); p.run("FX.notes = []; FX.msg = '';"); const b0 = p.run("FX.bumpAt");
  p.run(`act(${JSON.stringify(cliff.dir)})`);
  assert.equal(p.run("S.exp.pos"), cliff.a); assert.equal(p.run("S.exp.actions"), 0, "0 actions spent");
  assert.ok(p.run("FX.bumpAt") > b0); assert.match(p.run("FX.msg"), /^Steep edge · look for stairs/);
  assert.equal(p.run(`crossReason(${cliff.a}, ${JSON.stringify(cliff.dir)})`), "Steep edge · look for stairs");
  // the reach follows canStep: the same set as a walk over canStepIn inside the range square, without the island
  for (const st of [cliff.a, cliff.b]) { const seen = new Set([st]), q0 = [st], s0 = { x: st % MW, y: (st / MW) | 0 };
    while (q0.length) { const c = q0.shift(); for (const [dir, dx, dy] of SIDE4) { const x = c % MW + dx, y = ((c / MW) | 0) + dy, d = y * MW + x;
      if (!onMap(x, y) || seen.has(d) || !W.canStepIn(G, c, dir) || G.island[d] || Math.max(Math.abs(x - s0.x), Math.abs(y - s0.y)) > 2) continue; seen.add(d); q0.push(d); } }
    assert.deepEqual([...p.run(`reachCells(${st}, 2)`)].sort((x, y) => x - y), [...seen].sort((x, y) => x - y), `reach from ${st}`); }
  const r = CROSSINGS["S up"], q = g2At(r.seed, r.a); q.run(`act(${JSON.stringify(r.dir)})`);
  assert.equal(q.run("S.exp.pos"), r.b); assert.equal(q.run("S.exp.actions"), 1);
});

test("generator 2 play: Ahead names the edge, the edge word alone comes before here, plain ground names nothing", () => {
  const seed = SEEDS[0], G = W.genWorld(seed, 2), es = edgesOf(G);
  const cliff = es.find(e => e.kind === EDGE.CLIFF && G.comp[e.a]), p = g2At(seed, cliff.a);
  p.run(`S.exp.face = ${JSON.stringify(cliff.dir)}`); let ctx = p.run("mapContext()");
  assert.ok(ctx[0].includes("Ahead: steep edge"), ctx[0]); assert.equal(ctx[ctx.length - 2], "steep edge"); assert.ok(ctx.includes("Ahead: steep edge"));
  for (const k of ["S up", "S down"]) { const r = CROSSINGS[k], q = g2At(r.seed, r.a); q.run(`S.exp.face = ${JSON.stringify(r.dir)}`); ctx = q.run("mapContext()");
    const w = r.up ? "stairs up" : "stairs down"; assert.ok(ctx[0].includes("Ahead: " + w), ctx[0]); assert.equal(ctx[ctx.length - 2], w); }
  const open = es.length && (() => { for (let c = 0; c < NC; c++) if (G.comp[c] && c % MW < MW - 1 && G.comp[c + 1] && G.edge[2 * c] === EDGE.OPEN) return c; })();
  const o = g2At(seed, open); o.run("S.exp.face = 'right'; S.revealed[S.exp.pos + 1] = 1;"); ctx = o.run("mapContext()");
  assert.ok(ctx[0].includes("Ahead: " + o.run("landWord(S.exp.pos + 1)")), ctx[0]); assert.equal(ctx.length, 5, "no edge word");
});

test("generator 2 play: a save without gen is generator 1, canStep is passable everywhere it reaches; new worlds take generator 2 whatever the address says", () => {
  const fx = FIXTURE(), p = page({ "mb-save-v8": JSON.stringify(fx) });
  assert.equal(p.run("S.gen"), undefined); assert.equal(p.run("G.gen"), undefined);
  for (let c = 0; c < NC; c++) for (const [dir, dx, dy] of SIDE4) { const x = c % MW + dx, y = ((c / MW) | 0) + dy; if (!onMap(x, y)) continue;
    assert.equal(p.run(`canStep(${c}, ${JSON.stringify(dir)})`), p.run(`passable(${y * MW + x})`), `${c} ${dir}`); }
  for (const q of ["?gen=1", "?gen=2", "?gen=3", "?seed=5&gen=1"]) { const r = page({}, q); r.run("newWorld(5)"); assert.equal(r.run("S.gen"), 2, q); assert.equal(r.run("G.gen"), 2, q); }
});

test("generator 2 play: stairs and aprons take no pods, creatures or slabs; places draw every piece on the palette", () => {
  const p = g2At(CROSSINGS["S down"].seed, CROSSINGS["S down"].a);
  assert.equal(p.run("[T.STEP, T.STAIR, T.APRON].every(NOSTAND) && ![T.GRASS, T.SAND, T.FACE, T.LIP].some(NOSTAND)"), true);
  p.run(`act(${JSON.stringify(CROSSINGS["S down"].dir)}); act('confirm')`);
  const key = p.run("S.exp.patch.key"), lay = p.run("layout(S.exp.patch.key)"), live = p.run("S.exp.live[S.exp.patch.key]");
  for (const c of live.cr) assert.ok(![T.STAIR, T.APRON].includes(lay.tiles[c.y * PW + c.x]), "no creature on a stair or apron");
  for (const q of p.run("S.pods").filter(q => q.k === key && q.x >= 0)) assert.ok(![T.STAIR, T.APRON].includes(lay.tiles[q.y * PW + q.x]), "no pod on a stair or apron");
  // every terrain piece builds a 32 px tile with every pixel on the palette
  const kinds = new Set(); for (let i = 0; i < PW * PH; i++) if (lay.terr[i]) { kinds.add(lay.terr[i]);
    const pb = p.run(`tilePB(layout(S.exp.patch.key), ${i}, 0)`); assert.ok(pb.w === 32 && pb.h === 32 && pb.p.every(v => v >= 0 && v < 48), `tile ${i}`); }
  assert.ok(kinds.has(TERR.STAIR) && kinds.has(TERR.FOOT));
  // each piece is in the register, under its TERR name, as a 32 px stand-in
  const reg = p.run("CARE_ASSETS.filter(a => a.status === 'stand-in' && a.w === 32 && a.h === 32).map(a => a.id).join()");
  assert.equal(reg, Object.keys(TERR).filter(k => k !== "NONE").join());
});

test("generator 2 play: a SHADOW tile draws its own base tile (its own variant and mask), darkened at its foot", () => {
  const f = CROSSINGS["N down"], p = g2At(f.seed, f.a); p.run(`act(${JSON.stringify(f.dir)}); FX.lockUntil = 0; act('confirm')`);
  const lay = p.run("layout(S.exp.patch.key)"); let n = 0; const vs = new Set();
  for (let x = 0; x < PW; x++) { const i = (PH - 1) * PW + x; if (lay.terr[i] !== TERR.SHADOW) continue; n++;
    const k = p.run(`tileKeys(layout(S.exp.patch.key))[${i}]`), own = p.run(`(() => { const L = layout(S.exp.patch.key), t = L.terr; L.terr = null; L.tk = null; const k = tileKeys(L)[${i}]; L.terr = t; L.tk = null; return k; })()`);
    assert.equal(k.bv, own.v, `variant ${x}`); assert.equal(k.bm, own.m, `mask ${x}`); vs.add(k.bv);
    const got = p.run(`tilePB(layout(S.exp.patch.key), ${i}, 0)`), base = p.run(`buildTile(${k.t}, layout(S.exp.patch.key).base, ${own.v}, ${own.m}, 0)`);
    for (let y = 0; y < 32; y++) for (let xx = 0; xx < 32; xx++) { const b = base.p[y * 32 + xx]; assert.equal(got.p[y * 32 + xx], y >= 28 && p.run(`BAYER[${(y & 3) * 4 + (xx & 3)}]`) < 8 ? p.run(`DARK[${b}]`) : b); } }
  assert.ok(n > 0 && vs.size > 1, "a shadow row with more than one variant");
});

test("generator 2 play: the side tail draws no ink on its high-side column; a plain SIDE tile keeps it", () => {
  const p = page(); p.run("newWorld(1)");
  const ink = p.run("C.ink"), col = (pb, x) => Array.from({ length: 32 }, (_, y) => pb.p[y * 32 + x]);
  for (const [east, x] of [[1, 0], [0, 31]]) {
    for (const m of [16 | east, 16 | 4 | east]) { const pb = p.run(`buildTile(T.FACE, T.GRASS, TERR.SIDE, ${m}, 0, {})`);
      assert.ok(!col(pb, x).includes(ink), `tail mask ${m}: no ink on x ${x}`);
      if (m & 4) assert.ok(Array.from({ length: 16 }, (_, i) => pb.p[30 * 32 + (east ? i : 16 + i)]).every(v => v === p.run("C.stone")), `tail mask ${m}: the full-width foot`); }
    const plain = p.run(`buildTile(T.FACE, T.GRASS, TERR.SIDE, ${east}, 0, {})`);
    assert.ok(col(plain, x).every(v => v === ink), `plain SIDE ${east}: the high-side ink`); }
  // and on a real place: seed 1, cell 73 has a tail at (0, 0..1)
  const lay = p.run("layout('73')"), I = (x, y) => y * PW + x;
  for (const y of [0, 1]) { assert.ok(lay.tmask[I(0, y)] & 16, "a tail tile"); assert.ok(!col(p.run(`tilePB(layout('73'), ${I(0, y)}, 0)`), 0).includes(ink), `tail ${y}: no ink`); }
});

// ---- M3 final pass: the lip through TINT, generator 2's map burrow hole, the generator 1 hint ----
const fnSrc = name => { const i = PAGE.indexOf("\nfunction " + name + "("); assert.ok(i >= 0, name); return PAGE.slice(i, PAGE.indexOf("\nfunction ", i + 1)); };
const fnv = a => { let h = 2166136261; for (const v of a) { h ^= v & 0xffff; h = Math.imul(h, 16777619) >>> 0; } return h; };
// main's generator 1 map, captured from main's page with this harness (seed 7 saved without gen, no pods, creatures or signs, every cell seen, the gate and the mouth visited)
const MAIN_G1 = { mapCv: 2730365212, frame: 3568652280 };   // main 5e287081
// a save written without gen, as every save before generators: a world started, then saved with its gen dropped
const g1Save = () => { const m = page(); m.run("newWorld(7); delete S.gen; save();"); assert.ok(!("gen" in JSON.parse(m.store[m.KEY]))); return { [m.KEY]: m.store[m.KEY] }; };
// one page per generator, shared by the tests below (each sets the state it reads), so the map and fog are built once
let G1P = null, G2P = null;
const g1Page = () => G1P || (G1P = page(g1Save(), undefined, { canvas: true }));
const g2Page = () => { if (!G2P) { G2P = page({}, undefined, { canvas: true }); G2P.run("newWorld(1)"); } return G2P; };
const g1Map = () => { const p = g1Page();
  p.run("S.exp = null; S.phase = 'setup'; S.pins = []; S.opened = {}; S.pods = []; S.cr = []; S.signs = {}; S.skulls = {}; for (let c = 0; c < MW * MH; c++) { S.revealed[c] = 1; S.visited[c] = c === G.gate || c === G.mouth ? 1 : 0; } mapCv = null; scr.px().fill(-1); drawMap('view', 0);");
  return p; };

test("M3: the lip on lime ground stays lime, in the edge marks at 72, 48 and 26 and in the place lip at 32 (no cream pixel)", () => {
  const p = page(); p.run("newWorld(1)");
  const lime = p.run("C.lime"), cream = p.run("C.cream"), grass = p.run("C.grass"), ink = p.run("C.ink");
  for (const cs of [72, 48, 26]) for (const dir of ["up", "left", "right"]) {
    const pb = p.run(`edgeMarkPB(${cs}, [[${JSON.stringify(dir)}, EDGE.CLIFF, false]], () => C.lime, 0)`), lit = [...pb.p].filter(v => v >= 0);
    assert.ok(lit.length > 0 && lit.every(v => v === lime), `${cs} ${dir}: the lip keeps lime`); assert.ok(!lit.includes(cream), `${cs} ${dir}: no cream`);
    const g = p.run(`edgeMarkPB(${cs}, [[${JSON.stringify(dir)}, EDGE.CLIFF, false]], () => C.grass, 0)`);
    assert.ok([...g.p].filter(v => v >= 0).every(v => v === p.run(`TINT[C.grass]`) && v !== grass), `${cs} ${dir}: other ground still steps lighter`);
  }
  // the place lip (32 px, all four edges and every corner) on all-lime ground: lime bands, ink edges, no cream
  p.run("const __g0 = groundInto; groundInto = (pb, base, h) => { __g0(pb, base, h); pb.rect(0, 0, 32, 32, C.lime); };");
  for (const m of [0x55, 0xaa, 0xff, 0x01, 0x04]) { const pb = p.run(`buildTile(T.FACE, T.GRASS, TERR.LIP, ${m}, 0, {})`);
    assert.ok(!pb.p.includes(cream), `place lip mask ${m}: no cream`); assert.ok([...pb.p].every(v => v === lime || v === ink), `place lip mask ${m}: lime and ink only`); }
});

test("M3: generator 2's burrow hole draws on the gate cell's face each frame, through the gate's light, never baked", () => {
  const p = g2Page(); p.run("S.exp = null; S.phase = 'setup'; S.pins = []; S.opened = {};");
  const G = { gate: p.run("G.gate"), mouth: p.run("G.mouth") }, CELL = p.run("CELL"), ox = p.run("MAP_X"), oy = p.run("MAP_Y"), C = p.run("C");
  assert.equal(G.mouth, G.gate - MW);
  const px = ox + (G.gate % MW) * CELL, py = oy + ((G.gate / MW) | 0) * CELL;
  const inE = (X, Y, cx, cy, rx, ry) => ((X + .5 - cx) / rx) ** 2 + ((Y + .5 - cy) / ry) ** 2 <= 1;
  const want = (X, Y) => Y >= py + 4 ? -1 : inE(X, Y, px + 13, py + 5, 5, 13) ? C.void : inE(X, Y, px + 13, py + 4, 7, 15) ? C.bark : -1;
  const frame = setup => { p.run(`for (let c = 0; c < MW * MH; c++) { S.revealed[c] = 1; S.visited[c] = c === G.gate || c === G.mouth ? 1 : 0; } ${setup}; ensureMap(); scr.px().fill(-1); drawMap('view', 0);`); return p.run("scr").px(); };
  const W_ = p.run("SCR_W");
  const check = (f, lut, label) => { let n = 0, rows = new Set();
    for (let Y = py - CELL; Y < py + CELL; Y++) for (let X = px; X < px + CELL; X++) { const w = want(X, Y); if (w < 0) continue; n++; rows.add(Y); assert.equal(f[Y * W_ + X], lut ? lut[w] : w, `${label} (${X}, ${Y})`); }
    return { n, top: Math.min(...rows), bottom: Math.max(...rows) }; };
  const a = check(frame(""), null, "visited");
  assert.equal(a.bottom, py + 3, "its base on the face's foot row (row 3)"); assert.equal(a.top, py - 11, "rising 11 rows into the mouth cell");
  check(frame("S.visited[G.gate] = 0"), p.run("REMAP[4]"), "the gate seen, not visited: the gate's light, the mouth part too");
  // not drawn unless both cells are seen: with the mouth in fog the gate's top rows show the face, not the hole
  const f = frame("S.revealed[G.mouth] = 0");
  let holes = 0; for (let Y = py; Y < py + 4; Y++) for (let X = px; X < px + CELL; X++) if (want(X, Y) === C.void && f[Y * W_ + X] === C.void) holes++;
  assert.equal(holes, 0, "the mouth unseen: no hole");
  // never baked: the map image (which the inset reads) holds no void pixel anywhere
  assert.ok(!p.run("mapPB").p.includes(C.void), "no hole in mapPB");
  for (const f of ["drawInset", "drawWorldInset", "buildMapPB"]) assert.ok(!fnSrc(f).includes("g2hole"), f + " draws no generator 2 hole");
});

test("M3: generator 1's map and its burrow hole are unchanged, pixel for pixel against main", () => {
  const p = g1Map();
  assert.equal(p.run("G.gen"), undefined);
  assert.equal(fnv(p.run("mapCv").px()), MAIN_G1.mapCv, "the baked map, hole included");
  assert.equal(fnv(p.run("scr").px()), MAIN_G1.frame, "the drawn full map");
  assert.equal(p.run("ART.has('g2hole')"), false, "no per-frame hole on generator 1");
});

test("M3: the gen-1 hint shows on a generator 1 save between expeditions, never on generator 2 or during an expedition", () => {
  const sandIn = (p, setup) => { p.run(`${setup}; ensureMap(); scr.px().fill(-1); drawSetup(0);`); const f = p.run("scr").px(), W_ = p.run("SCR_W"), sand = p.run("C.sand"); let n = 0, x1 = 0;
    for (let y = 462; y < 482; y++) for (let x = 136; x < 442; x++) if (f[y * W_ + x] === sand) { n++; x1 = Math.max(x1, x); } return { n, x1 }; };
  const g1 = g1Page();
  assert.equal(g1.run("S.gen"), undefined);
  const hint = "Flat world · New world has stairs", w = g1.run(`textW(${JSON.stringify(hint)}, 2)`);
  assert.ok(w <= 306, "fits 306 at 2×");
  const shown = sandIn(g1, "S.exp = null; S.phase = 'setup'; FX.msg = ''");
  assert.ok(shown.n > 0 && shown.x1 < 136 + w, "the hint in sand at (136, 462)");
  // the same pixels as the text alone
  g1.run("scr.px().fill(-1); text(" + JSON.stringify(hint) + ", 136, 462, C.sand);"); const alone = g1.run("scr").px(), sand = g1.run("C.sand");
  assert.equal([...alone].filter(v => v === sand).length, shown.n, "exactly the hint's pixels");
  assert.equal(sandIn(g1, "S.gen = 1; S.exp = null; S.phase = 'setup'").n, shown.n, "gen 1 written out: still shown");
  assert.equal(sandIn(g1, "delete S.gen; S.phase = 'setup'; S.exp = { pos: 0 }").n, 0, "during an expedition: none");
  assert.equal(sandIn(g1, "S.exp = null; S.phase = 'menu'").n, 0, "another phase: none");
  const g2 = g2Page();
  assert.equal(sandIn(g2, "S.exp = null; S.phase = 'setup'").n, 0, "generator 2: none");
  assert.doesNotMatch(fnSrc("menuItems"), /Flat world/, "not a menu entry: plain text, not focusable");
});

// ---- the view's edge cues: tabs, the Call's hold on the edge, the name tag's positions, the send hint in a place ----
// Each runs at ts 32 and at ts 48 through view.mjs (RT.ts), with motion reduced (the harness's matchMedia matches).
// A place on seed 1's spawn cell, no storm, no fog, the pawn mid-place, nothing else in it unless the test puts it there.
function cuePlace(ts, opts = {}) {
  const p = page({}, undefined, { canvas: true, script: opts.script });
  p.run(`newWorld(1); startExpedition('weather', G.spawns[0]); S.exp.storm = null; S.exp.fog = null; S.exp.pt = ${opts.partner ? "{ id: 1, name: 'Dot', sp: 0, elder: false }" : "null"};
    enterPatch(); RT.ts = ${ts}; { const P = S.exp.patch; P.x = 14; P.y = 13; P.noise = 'creep'; } RT.pl = null; RT.key = null;
    S.pods = S.pods.filter(q => q.k !== S.exp.patch.key); curLive().cr = []; curLive().fr = []; curLive().strike = null; FX.msg = ''; FX.notes = []; FX.pulse = null; FX.cue = null; FX.rings = []; NOW = 5000;`);
  return p;
}
const crt = (id, x, y, st, more = "") => `curLive().cr.push(Object.assign({ id: ${id}, sp: 0, x: ${x}, y: ${y}, st: '${st}', hide: 0, calm: 0, face: 1 }, { ${more} }));`;
const frameOf = p => { p.run("scr.px().fill(-1); render(5)"); return p.run("scr").px(); };
const js = (p, e) => JSON.parse(p.run(`JSON.stringify(${e})`));   // out of the sandbox's realm
const tabsOf = p => { frameOf(p); return js(p, "edgeTabs()"); };
const at = (f, x, y) => f[y * 450 + x];

for (const ts of [32, 48]) {
  test(`cues at ${ts}: a '?' seeker more than 11 tiles away and off screen gets a tab, drawn as signed (sprout border, the bubble, the pointer)`, () => {
    const p = cuePlace(ts); p.run(crt(1, 27, 13, "seek"));
    const tabs = tabsOf(p), f = p.run("scr").px(), C = p.run("C");
    assert.equal(tabs.length, 1); const t = tabs[0];
    assert.equal(t.kind, "?"); assert.equal(t.side, "E"); assert.ok(t.d > 11);
    assert.equal(t.cx, 433, "on the on-screen box's right edge");
    assert.equal(at(f, t.cx, t.cy - 11), C.sprout, "the border"); assert.equal(at(f, t.cx - 9, t.cy), C.ink, "the ink fill (no flash with motion reduced)");
    assert.equal(at(f, t.cx - 5 + 5, t.cy - 7 + 2), C.pine, "the '?' bubble's mark");
    for (const [x, y] of [[t.cx + 11, t.cy - 2], [t.cx + 12, t.cy - 1], [t.cx + 13, t.cy]]) assert.equal(at(f, x, y), C.sprout, `pointer (${x}, ${y})`);
    assert.notEqual(at(f, t.cx + 14, t.cy), C.sprout, "three rows only");
  });

  test(`cues at ${ts}: no tab for a hidden creature, a creature beyond fog sight, or anything in a cave; '…' and fruit bubbles get none`, () => {
    const p = cuePlace(ts);
    p.run(crt(1, 27, 13, "alert", "hide: 2")); assert.equal(tabsOf(p).length, 0, "hidden");
    p.run(`curLive().cr = []; ${crt(2, 27, 13, "idle", "calm: 4, sp: 1")}`); assert.equal(tabsOf(p).length, 0, "the '…' bubble");
    p.run(`curLive().cr = []; ${crt(3, 27, 13, "alert")}`); assert.equal(tabsOf(p).length, 1, "in sight: a tab");
    p.run("{ const c0 = cxy(S.exp.pos); S.exp.fog = { x: c0.x + .5, y: c0.y + .5, r: 3, dx: 0, dy: 0, at: 0 }; }");
    assert.equal(p.run("sightR(curLay())"), 4, "in a fog bank");
    assert.equal(tabsOf(p).length, 0, "beyond fog sight: none");
    p.run(`curLive().cr = []; ${crt(4, 14, 9, "alert")}`); assert.equal(tabsOf(p).length, 0, "4 tiles away in fog: in sight, but on screen");
    p.run(`S.exp.fog = null; enterCave(); S.phase = 'patch'; RT.ts = ${ts}; curLive().cr = []; ${crt(5, 27, 1, "alert")} RT.key = null;`);
    assert.equal(p.run("curLay().cave"), true); assert.equal(tabsOf(p).length, 0, "a cave: none");
  });

  test(`cues at ${ts}: at most 4 tabs, merged within 24 px along one edge ('!' first), and none over the message box, the HUD or the bottom line`, () => {
    const p = cuePlace(ts);
    p.run(crt(1, 27, 13, "approach") + crt(2, 27, 14, "alert") + crt(3, 0, 13, "seek") + crt(4, 14, 0, "alert") + crt(5, 14, 31, "alert") + crt(6, 0, 0, "seek") + crt(7, 27, 31, "seek") + crt(8, 0, 31, "alert"));
    const tabs = tabsOf(p); assert.equal(tabs.length, 4, "four of seven");
    assert.ok(!tabs.some(t => t.id === "c1"), "the '?' at (27, 13) merged into the '!' beside it");
    assert.deepEqual(tabs.map(t => t.kind), ["!", "!", "!", "!"], "'!' before '?'");
    for (const t of tabs) for (const u of tabs) if (t !== u && t.side === u.side) assert.ok(Math.abs(t.side === "N" || t.side === "S" ? t.cx - u.cx : t.cy - u.cy) > 24);
    // the message box at the foot: a tab straight south moves up clear of it
    p.run(`curLive().cr = []; ${crt(9, 14, 31, "alert")} FX.msg = 'A long message that wraps onto a second line in the box at the foot of the view, so it is tall';`);
    const [t] = tabsOf(p), m = js(p, "msgRect()");
    assert.ok(m && m.y > 300, "the box at the foot");
    const g = { x: t.cx - 15, y: t.cy - 15, w: 30, h: 30 };
    assert.ok(!(g.x < m.x + m.w && m.x < g.x + g.w && g.y < m.y + m.h && m.y < g.y + g.h), "clear of the box, grown by 4");
    assert.equal(t.side, "S", "the pointer keeps its side");
    for (const u of tabsOf(p).concat(tabs)) { assert.ok(u.cy - 11 >= 38 && u.cy + 10 <= 557, "rows 38–557: off the HUD and the bottom line"); assert.ok(u.cx - 11 >= 6 && u.cx + 10 <= 443); }
  });

  test(`cues at ${ts}: a Call sets FX.cue and nothing in S beyond what Call set before; its find shows a cream tab until it is taken or 3 actions pass`, () => {
    const strip = SCRIPT.replace(/ const cue = \[\];[^\n]*/, "").replace(/ cue\.push\(\{ x: \w+\.x, y: \w+\.y \}\);/g, "").replace(/\n  FX\.cue = \{[^\n]*/, "");
    assert.ok(!/FX\.cue =|cue\.push/.test(strip.slice(strip.indexOf("function callPlace"), strip.indexOf("function waitSnap"))), "the variant has no cue writes");
    const pod = "S.pods.push({ k: S.exp.patch.key, x: 22, y: 13, h: 1, g: 0, sp: 0, id: 'tp' });";
    const a = cuePlace(ts), b = cuePlace(ts, { script: strip });
    for (const p of [a, b]) p.run(pod + " callPlace();");
    const sOf = p => p.run("JSON.stringify(Object.assign({}, S, { wid: 0 }))");   // the world id is drawn from the clock
    assert.equal(sOf(a), sOf(b), "S as without the cue");
    const cue = js(a, "FX.cue"), mine = t => t.id === "f22,13";
    assert.deepEqual([cue.key, cue.at, cue.until, cue.r], [a.run("S.exp.patch.key"), 5000, 3, 11]);
    assert.deepEqual(cue.finds[0], { x: 22, y: 13 }, "the pod first, at its glint's tile");
    const gb = js(a, "layout(S.exp.patch.key).feats.find(f => f.kind === 'g') || null"), glints = js(a, "FX.rings.filter(r => r.glint).map(r => ({ x: r.x, y: r.y }))");
    assert.deepEqual(cue.finds, glints.filter(g => !(gb && g.x === gb.x && g.y === gb.y)), "the same tiles it glints (the burrow aside)");
    assert.equal(b.run("FX.cue"), null);
    const tabs = tabsOf(a).filter(mine), f = a.run("scr").px(), C = a.run("C");
    assert.equal(tabs.length, 1); assert.equal(tabs[0].kind, "find");
    assert.equal(at(f, tabs[0].cx, tabs[0].cy - 11), C.cream, "cream border"); assert.equal(at(f, tabs[0].cx, tabs[0].cy), C.white, "the spark's heart");
    a.run("S.exp.actions = 2"); assert.equal(tabsOf(a).filter(mine).length, 1, "two actions on");
    a.run("S.exp.actions = 3"); assert.equal(tabsOf(a).length, 0, "three actions on: gone");
    a.run("S.exp.actions = 1; S.pods.find(q => q.id === 'tp').x = -1"); assert.equal(tabsOf(a).filter(mine).length, 0, "taken: gone");
  });

  test(`cues at ${ts}: the Call's hold draws ice dashes on the view's edge inside the reach, each with its dark shadow on the outer side`, () => {
    const p = cuePlace(ts), C = p.run("C");
    p.run("var HD = holdDashes;");
    for (const r of [6, 11]) {
      p.run(`FX.pulse = { x: 14, y: 13, at: NOW - CALL_MS - 100, r: ${r}, key: S.exp.patch.key, lifted: new Set() }; holdDashes = HD;`);
      const f = frameOf(p).slice(), maxR = (2 * r + 1) * ts >> 1, pl = js(p, "RT.plScr"), cx = pl.x, cy = pl.y;
      p.run("holdDashes = () => {};"); const bare = frameOf(p).slice(); p.run("holdDashes = HD;");
      const near = (x, y, w, h) => (2 * x + w - 2 * cx) ** 2 + (2 * y + h - 2 * cy) ** 2 <= 4 * maxR * maxR;
      const mine = new Set(); let on = 0, off = 0;
      const check = (x, y, w, h, sx, sy, sw, sh) => { if (!near(x, y, w, h)) { off++; return; } on++;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { assert.equal(at(f, x + i, y + j), C.ice, `dash (${x + i}, ${y + j})`); mine.add((y + j) * 450 + x + i); }
        for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) { assert.equal(at(f, sx + i, sy + j), C.void, `its shadow (${sx + i}, ${sy + j})`); mine.add((sy + j) * 450 + sx + i); } };
      for (let x = 4; x <= 444; x += 8) { check(x, 34, 4, 2, x, 33, 4, 1); check(x, 560, 4, 2, x, 562, 4, 1); }
      for (let y = 36; y <= 556; y += 8) { check(2, y, 2, 4, 1, y, 1, 4); check(446, y, 2, 4, 448, y, 1, 4); }
      for (let k = 0; k < f.length; k++) if (f[k] !== bare[k]) assert.ok(mine.has(k), `nothing else drawn (${k % 450}, ${Math.floor(k / 450)})`);
      for (const k of mine) { const y = Math.floor(k / 450), x = k % 450; assert.ok(y >= 32 && y <= 563 && x >= 0 && x <= 449, "inside rows 32–563"); }
      if (ts === 48 && r === 11) assert.equal(off, 0, "r 11 at 48: the whole frame");
      if (ts === 48 && r === 6) { assert.ok(!near(4, 34, 4, 2) && !near(444, 560, 4, 2), "fog reach at 48: the corners drop out"); assert.ok(near(220, 34, 4, 2) && near(2, 300, 2, 4), "and the middles stay"); }
      if (r === 11) assert.ok(on > 0);
    }
    p.run("FX.pulse.at = NOW - CALL_MS - 401"); const a = frameOf(p).slice(); p.run("holdDashes = () => {};"); assert.deepEqual(a, frameOf(p).slice(), "after the hold: none");
  });

  test(`cues at ${ts}: the name tag takes position 1 below, then right, then left, refusing creatures, the warned cell and the tabs`, () => {
    const p = cuePlace(ts, { partner: true });
    p.run("var SPOT = 'none'; const __dt = drawTag; drawTag = s => { SPOT = s; __dt(s); }; curLive().pt = { x: 14, y: 16, st: 'idle', face: 1 }; RT.pt = null; S.exp.ptTagUntil = 9;");
    const o = js(p, `sprOff(${ts})`), spot = () => { frameOf(p); return js(p, "SPOT"); };
    const cell = () => { const pl = js(p, "RT.plScr"); return { x: pl.x - (ts >> 1), y: pl.y - (ts >> 1) + 3 * ts }; };   // the partner, 3 below the pawn
    const zy1 = Math.max(ts - 1, o.y + 33) + 4, zx1 = ts - 1 + 4, h2 = ts >> 1;
    let s = spot(), c = cell(), w = s.panel.w;
    assert.deepEqual(s.ptr, { x: c.x + h2 - 1, y: c.y + zy1 + 1, w: 2, h: 5 }, "below: the pointer just outside the margin");
    assert.equal(s.panel.y - c.y, zy1 + 6, ts === 48 ? "panel top at cell row 59" : "below the ring's foot"); assert.equal(s.panel.h, 20);
    if (ts === 48) assert.deepEqual([s.ptr.y - c.y, s.ptr.y - c.y + 4], [54, 58]);
    const f = p.run("scr").px(), C = p.run("C");
    assert.equal(at(f, s.ptr.x, s.ptr.y), C.aqua); assert.equal(at(f, s.panel.x + 2, s.panel.y), C.aqua); assert.equal(at(f, s.panel.x + 3, s.panel.y + 10), C.ink);
    // a creature on the cell below: right
    p.run(crt(1, 14, 17, "idle")); s = spot(); c = cell();
    assert.equal(s.panel.x - c.x, zx1 + 6, ts === 48 ? "right: panel's left edge at col 57" : "right"); assert.deepEqual(s.ptr, { x: c.x + zx1 + 1, y: c.y + h2 - 1, w: 5, h: 2 });
    // the warned cell below and a creature to the right: left
    p.run(`curLive().cr = []; curLive().strike = { x: 14, y: 17 }; ${crt(2, 16, 16, "idle")}`); s = spot(); c = cell();
    assert.equal(s.panel.x + w - 1 - c.x, -10, "left: panel's right edge at col −10"); assert.deepEqual(s.ptr, { x: c.x - 9, y: c.y + h2 - 1, w: 5, h: 2 });
    // and creatures left too: above, from the species' highest row
    p.run(crt(3, 12, 16, "idle")); s = spot(); c = cell(); const H = o.y + p.run("tagTop(0)");
    assert.deepEqual([s.ptr.y - c.y, s.panel.y - c.y, s.panel.y + 19 - c.y], [H - 9, H - 29, H - 10], "above");
    // no tag pixel in the 4 px margin around the partner's pixels or on the ring's foot rows, in any of these
    // edge tabs refuse: a tab over position 1 sends the tag right
    p.run("curLive().cr = []; curLive().strike = null; const __et = edgeTabs; edgeTabs = () => { const s = RT.plScr; return [{ kind: '!', cx: s.x, cy: s.y + 3 * " + ts + " + " + (zy1 + 12) + " - " + h2 + ", side: 'S', id: 'x' }]; };");
    s = spot(); c = cell(); assert.equal(s.panel.x - c.x, zx1 + 6, "a tab over position 1: right");
  });

  test(`cues at ${ts}: the name tag never covers its own margin or ring rows, and slides below when 1–4 are refused, or is not drawn`, () => {
    const p = cuePlace(ts, { partner: true });
    p.run("var SPOT = 'none'; const __dt = drawTag; drawTag = s => { SPOT = s; __dt(s); }; curLive().pt = { x: 14, y: 16, st: 'idle', face: 1 }; RT.pt = null; S.exp.ptTagUntil = 9; S.exp.pt.name = 'Bramblewick';");
    const o = js(p, `sprOff(${ts})`), zy1 = Math.max(ts - 1, o.y + 33) + 4, h2 = ts >> 1;
    const cell = () => { const pl = js(p, "RT.plScr"); return { x: pl.x - (ts >> 1), y: pl.y - (ts >> 1) + 3 * ts }; };
    // refuse 1–4 with creatures right, left and above, and the warned cell under position 1's centre only
    p.run(crt(1, 15, 16, "idle") + crt(2, 13, 16, "idle") + crt(3, 14, 15, "idle"));
    frameOf(p); let s = js(p, "SPOT"), c = cell();
    assert.equal(s.panel.y - c.y, zy1 + 6, "below's rows");
    const w = p.run("textW('Bramblewick', 2) + 10"), px = c.x + h2 - (w >> 1), py = c.y + zy1 + 6;   // a tab over position 1's left end
    p.run(`edgeTabs = () => [{ kind: '!', cx: ${px - 10 + 4}, cy: ${py + 10}, side: 'S', id: 'l' }];`);
    frameOf(p); s = js(p, "SPOT"); c = cell();
    assert.ok(s, "slid clear"); { assert.equal(s.panel.y - c.y, zy1 + 6); const d = s.panel.x - (c.x + h2 - (s.panel.w >> 1)); assert.ok(d !== 0 && d % 4 === 0 && Math.abs(d) <= (s.panel.w >> 1) - 6, "slid by ±4k");
      assert.ok(s.ptr.x - s.panel.x >= 4 && s.panel.x + s.panel.w - (s.ptr.x + 2) >= 4, "the pointer 4 px inside the ends"); }
    // a tag in no position: none drawn
    p.run(`edgeTabs = () => [{ kind: '!', cx: RT.plScr.x, cy: RT.plScr.y + 3 * ${ts} + ${zy1 + 16} - ${h2}, side: 'S', id: 'a' }, { kind: '!', cx: RT.plScr.x - 40, cy: RT.plScr.y + 3 * ${ts} + ${zy1 + 16} - ${h2}, side: 'S', id: 'b' }, { kind: '!', cx: RT.plScr.x + 40, cy: RT.plScr.y + 3 * ${ts} + ${zy1 + 16} - ${h2}, side: 'S', id: 'c' }];`);
    frameOf(p); assert.equal(js(p, "SPOT"), null, "nothing clear: no tag");
    // over every placement, no pixel in the margin rows/cols outside the cell, nor on the ring's foot rows
    p.run("curLive().cr = []; curLive().strike = null; edgeTabs = () => [];");
    frameOf(p); s = js(p, "SPOT"); c = cell();
    const zone = { x: c.x - 4, y: c.y - 4, w: ts + 8, h: zy1 + 5 }, meets = r => r.x < zone.x + zone.w && zone.x < r.x + r.w && r.y < zone.y + zone.h && zone.y < r.y + r.h;
    assert.ok(!meets(s.ptr) && !meets(s.panel), "outside the clear zone");
  });
}

test("the send hint in a place names the way, never a count, at all seven sites; over the reach view it keeps the count", () => {
  const p = cuePlace(48), DIG = /\d/;
  // a place two cells from the start, no lit outpost: End expedition is far
  p.run("leavePatch(); const s = cxy(S.exp.start); S.exp.pos = S.exp.reach.find(c => { const q = cxy(c); return Math.abs(q.x - s.x) + Math.abs(q.y - s.y) === 2 && !gatedCell(c); }); enterPatch(); FX.msg = ''; FX.notes = [];");
  assert.equal(p.run("canSend()"), false);
  const name = p.run("nearestSend().name"), dir = p.run("(() => { const a = cxy(S.exp.pos), b = cxy(nearestSend().c); return dirWord(b.x - a.x, b.y - a.y, Math.hypot(b.x - a.x, b.y - a.y)); })()");
  assert.ok(["north", "south", "east", "west", "north-east", "north-west", "south-east", "south-west"].includes(dir));
  p.run("var TXT = []; const __tx = text; text = function (s) { TXT.push(s); return __tx.apply(this, arguments); };");
  const sites = () => { const o = {};
    p.run("S.ui.from = S.exp.patch ? 'patch' : 'map'; S.phase = 'menu'; S.ui.menuSel = menuItems().findIndex(i => i.id === 'send'); FX.lockUntil = 0;");
    o.menuRow = p.run("lineFor().ctx");
    p.run("act('confirm')"); o.menuRefusal = p.run("FX.msg"); p.run("FX.msg = ''; FX.notes = [];");
    p.run("S.phase = 'cargo'; TXT = []; drawCargo(0)"); o.cargoCard = p.run("TXT").find(t => t.startsWith(name + " · ")); o.cargoLine = p.run("lineFor().ctx");
    p.run("FX.lockUntil = 0; act('confirm')"); o.cargoRefusal = p.run("FX.msg"); p.run("FX.msg = ''; FX.notes = [];");
    o.headBack = p.run("headBack()");
    p.run("S.exp.cargo.pods = Array.from({ length: S.exp.hold }, () => ({ g: 0, sp: 0 })); FX.notes = []; delete (S.exp.once || {}).holdfull;");
    o.headBackHold = p.run("'Hold full · swap, or ' + headBack()");
    return o; };
  const inPlace = sites();
  const want = { menuRow: `${name} · ${dir}`, menuRefusal: `End it only at the start or a lit outpost: ${name} · ${dir}`, cargoCard: `${name} · ${dir}`, cargoLine: `End expedition: ${name} · ${dir}`,
    cargoRefusal: `End it only at the start or a lit outpost: ${name} · ${dir}`, headBack: `head back ${dir} to the ${name === "Start" ? "start" : "outpost"}` };
  for (const k of Object.keys(want)) { assert.equal(inPlace[k], want[k], k); assert.doesNotMatch(inPlace[k], DIG, k + ": no digit"); }
  assert.doesNotMatch(inPlace.headBackHold, DIG);
  // the explored message (headBack's other site) and its caves, through checkExplored
  p.run("S.exp.saidDone = 0; reachCounts = () => ({ total: 9, surveyed: 9, full: 9, gated: 1 }); FX.notes = []; checkExplored();");
  assert.equal(p.run("FX.msg"), `Everything in reach is explored · a cave needs a digger · head back ${dir} to the ${name === "Start" ? "start" : "outpost"}`);
  p.run("S.exp.saidDone = 0; reachCounts = () => ({ total: 9, surveyed: 9, full: 9, gated: 2 }); FX.notes = []; checkExplored();");
  assert.match(p.run("FX.msg"), /^Everything in reach is explored · caves need a digger · /); assert.doesNotMatch(p.run("FX.msg"), DIG);
  assert.ok(p.run("wrapText(FX.msg, 400, 2).length") <= 3, "fits the box");
  // leave with ← then ✓: over the reach view every site counts again, with the same name
  p.run("S.phase = 'patch'; FX.lockUntil = 0; openMenu(); S.ui.menuSel = 0; act('confirm');"); assert.equal(p.run("S.phase"), "map"); assert.equal(p.run("S.exp.patch"), null);
  p.run("S.exp.cargo.pods = [];");
  const n = p.run("nearestSend().n"), cnt = `${name} · about ${n} cell${n === 1 ? "" : "s"}`, onMap = sites();
  assert.equal(onMap.menuRow, cnt); assert.equal(onMap.cargoCard, cnt); assert.equal(onMap.cargoLine, "End expedition: " + cnt);
  assert.equal(onMap.menuRefusal, "End it only at the start or a lit outpost: " + cnt); assert.equal(onMap.cargoRefusal, "End it only at the start or a lit outpost: " + cnt);
  assert.equal(onMap.headBack, `head back to the ${name === "Start" ? "start" : "outpost"} (about ${n} cell${n === 1 ? "" : "s"})`);
  // and the reach band keeps the count
  p.run("S.phase = 'map'; TXT = []; render(5)"); assert.ok(p.run("TXT").some(t => t === cnt || t.startsWith(name + " · about")), "the reach band");
});
