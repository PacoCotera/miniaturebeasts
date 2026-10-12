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
import { seedDigest, worldDigest, placeDigest, placeKeys, placeKeys2, SEEDS, VIEW_CASES, viewArgs, ATLAS_CASES, atlasCaseOut, atlasPlaces, syntheticPieces, SYNTH_TONE, NO_MACRO, PROOF_GRID, proofStates, fnv as fnvStr } from "../tools/world-vectors.mjs";

const VECTORS = JSON.parse(readFileSync(new URL("./world-vectors.json", import.meta.url), "utf8"));
const MODULE_SRC = readFileSync(new URL("../src/world.mjs", import.meta.url), "utf8");
const VIEW_SRC = readFileSync(new URL("../src/view.mjs", import.meta.url), "utf8");
const ATLAS_SRC = readFileSync(new URL("../src/atlas.mjs", import.meta.url), "utf8");
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
// fakeCanvas, so a drawing can be read back (p.run("scr").px()).
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
  run = src => vm.runInContext(src, ctx); run(SCRIPT);
  return { run, store, els, ctx, clock, KEY: run("SAVE_KEY") };
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

// ---- src/view.mjs: the place camera and coordinates ----
test("view: src/view.mjs gives every literal case in world-vectors.json, and the file holds every case", () => {
  assert.deepEqual(VECTORS.view.map(c => c.name), VIEW_CASES.map(c => c.name), "the case list");
  for (const c of VECTORS.view) assert.deepEqual(V[c.fn](...viewArgs(V, c.args)), c.out, c.name);
  const at = n => VECTORS.view.find(c => c.name === n).out;
  assert.deepEqual(at("camAt at 32 (today's value)"), { x: 239, y: 492 }, "today's camera on main at 32 px");
  assert.deepEqual(at("visTiles at spawn"), { tx0: 9, ty0: 20, tx1: 19, ty1: 31 }, "11 × 12 tiles");
});
// ---- src/atlas.mjs: the per-tile layers of a 48 px place, on the synthetic catalogue in world-vectors.json ----
const SYN = () => A.catalogue(VECTORS.atlas.catalogue, VECTORS.atlas.levelTone);
const vecPlaces = () => atlasPlaces(W).map(p => { const lay = W.genPlace(p.G, p.seed, p.key); return { ...p, lay, level: p.G.level ? p.G.level[lay.cell] : null }; });
test("atlas: the synthetic catalogue and the literal cases in world-vectors.json", () => {
  assert.deepEqual(VECTORS.atlas.catalogue, syntheticPieces(), "the stored catalogue"); assert.deepEqual(VECTORS.atlas.levelTone, SYNTH_TONE);
  assert.deepEqual(VECTORS.atlas.cases.map(c => c.name), ATLAS_CASES.map(c => c.name));
  const cat = SYN(); for (const c of VECTORS.atlas.cases) assert.deepEqual(atlasCaseOut(A, cat, c), c.out, c.name);
  const at = n => VECTORS.atlas.cases.find(c => c.name === n).out;
  assert.deepEqual(["nw", "ne", "se", "sw"].map(q => at("lipState 65 " + q)), ["outer", "edgeh", "fill", "edgev"]);
  assert.deepEqual(["nw", "ne", "se", "sw"].map(q => at("lipState 20 " + q + " zero")), ["fill", "edgev0", "outer0", "edgeh"]);
  assert.deepEqual(["nw", "ne", "se", "sw"].map(q => at("shoreState 20 " + q)), ["fill", "edgev", "outer", "edgeh"]);
  assert.deepEqual(at("decodeExact one off-palette pixel").bad, 1); assert.deepEqual(at("decodeExact alpha 128").bad, 1); assert.deepEqual(at("decodeExact all exact"), { px: [0, 1, 1, -1], bad: 0 });
});
test("atlas: every vector place's layers match their digests, both water frames", () => {
  const cat = SYN(), want = new Map(VECTORS.atlas.places.map(p => [p.gen + "/" + p.seed + "/" + p.key, p]));
  const got = vecPlaces(); assert.equal(got.length, VECTORS.atlas.places.length);
  for (const p of got) { const w = want.get(p.gen + "/" + p.seed + "/" + p.key); assert.ok(w, p.key);
    assert.equal(fnvStr(JSON.stringify(A.placeLayers(p.lay, p.seed, cat, 0, p.level))), w.fr0, p.gen + "/" + p.seed + "/" + p.key + " fr 0");
    assert.equal(fnvStr(JSON.stringify(A.placeLayers(p.lay, p.seed, cat, 1, p.level))), w.fr1, p.gen + "/" + p.seed + "/" + p.key + " fr 1"); }
});
test("atlas: the digests captured before the shore macros and the face and water tones still hold under their own conditions", () => {
  assert.deepEqual(VECTORS.atlas.noMacro, NO_MACRO);
  const cat = A.catalogue(VECTORS.atlas.catalogue.filter(q => q.kind !== NO_MACRO.without), NO_MACRO.levelTone), want = new Map(VECTORS.atlas.placesNoMacro.map(p => [p.gen + "/" + p.seed + "/" + p.key, p]));
  for (const p of vecPlaces()) { const w = want.get(p.gen + "/" + p.seed + "/" + p.key);
    assert.equal(fnvStr(JSON.stringify(A.placeLayers(p.lay, p.seed, cat, 0, p.level, NO_MACRO.rules))), w.fr0, p.key + " fr 0");
    assert.equal(fnvStr(JSON.stringify(A.placeLayers(p.lay, p.seed, cat, 1, p.level, NO_MACRO.rules))), w.fr1, p.key + " fr 1"); }
  const changed = VECTORS.atlas.places.filter((p, i) => p.fr0 !== VECTORS.atlas.placesNoMacro[i].fr0).length; assert.ok(changed > 0, "the new rules change some places");
});
test("atlas: shore macros take their four tiles, drop the water quarters and sit on the base's lawn; the other radius stands in", () => {
  const cat = SYN(); let n = 0;
  for (const p of vecPlaces()) { const r = A.placeLayers(p.lay, p.seed, cat, 1, p.level), mac = A.shoreMacros((x, y) => p.lay.tiles[y * W.PW + x], W.PW, W.PH);
    for (const m of mac) { n++; for (let j = 0; j < 4; j++) { const i = (m.y + (j >> 1)) * W.PW + m.x + (j & 1), L = r.tiles[i].layers;
      assert.ok(!L.some(l => /^t\/water(sand)?\//.test(l.id)), "no quarters"); const sl = L.find(l => /^t\/macro(sand)?\//.test(l.id));
      assert.equal(sl.id.replace("macrosand", "macro"), "t/macro/" + m.q + "-r" + m.radius + "-f2", "frame 2 at fr 1"); assert.deepEqual([sl.sx, sl.sy], [(j & 1) * 48, (j >> 1) * 48]);
      assert.ok(/^t\/(lawn|sand)\//.test(L[0].id), "the ground under it"); } } }
  assert.ok(n > 0, "macros among the vector places");
  const r60 = A.catalogue(VECTORS.atlas.catalogue.filter(q => !(q.kind === "shore-macro" && q.radius === 60)), VECTORS.atlas.levelTone);
  const p = vecPlaces().find(p => A.shoreMacros((x, y) => p.lay.tiles[y * W.PW + x], W.PW, W.PH).some(m => m.radius === 60));
  if (p) assert.ok(A.placeLayers(p.lay, p.seed, r60, 0, p.level).tiles.some(t => t.layers.some(l => /-r42-f1$/.test(l.id))), "radius 42 stands in for a missing 60");
});
test("atlas: on every vector place no tile shares a lawn variant with its four neighbours; every layer lies in the tile", () => {
  for (const p of vecPlaces()) { const v = A.lawnVariants(p.lay, p.seed, 4);
    for (let i = 0; i < W.PW * W.PH; i++) { const x = i % W.PW, y = (i / W.PW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W.PW && Y < W.PH) assert.notEqual(v[i], v[Y * W.PW + X], p.key + " " + x + "," + y); } }
    for (const t of A.placeLayers(p.lay, p.seed, SYN(), 0, p.level).tiles) for (const l of t.layers) if (l.stand == null) assert.ok(l.dx >= 0 && l.dy >= 0 && l.w > 0 && l.h > 0 && l.dx + l.w <= 48 && l.dy + l.h <= 48, p.key); }
});
test("atlas: level tone: every layer's tone follows the rule on every vector place", () => {
  const cat = SYN(), tone = L => { const t = L == null ? null : SYNTH_TONE[L]; return t === "light" || t === "dark" ? t : null; }, seen = new Set();
  for (const p of vecPlaces()) { if (p.level == null) continue; seen.add(p.level);
    A.placeLayers(p.lay, p.seed, cat, 0, p.level).tiles.forEach((t, i) => { const face = p.lay.terr && p.lay.terr[i] === W.TERR.FACE;
      for (const l of t.layers) { if (l.stand != null) continue;
        const want = /^t\/(lawn|decal\/tall|shadow)/.test(l.id) || /^t\/(water|watersand|macro|macrosand|sandshore)\//.test(l.id) || (/^t\/deep\//.test(l.id) && l.w === 24) ? tone(p.level)
          : /^t\/lip\//.test(l.id) ? tone(p.level - 1) : face && /^t\/(face|cap)\//.test(l.id) ? tone(p.level + 1) : null;
        assert.equal(l.tone, want, p.key + " " + l.id); } }); }
  assert.deepEqual([...seen].sort(), [0, 1, 2], "every level among the vectors");
  for (const p of vecPlaces().filter(p => p.level === null)) for (const t of A.placeLayers(p.lay, p.seed, cat, 0, null).tiles) for (const l of t.layers) if (l.stand == null) assert.equal(l.tone, null, "generator 1: no tone");
});
test("atlas: a blocking tile never draws as lawn; without its own pieces it takes the rock stand-in; without the stand-in the place stays at 32", () => {
  const full = SYN(), blockKinds = [W.T.FACE, W.T.LIP, W.T.ROCK, W.T.CLIFF], places = vecPlaces();
  const groundOnly = (lay, r) => r.tiles.some((t, i) => W.T_BLOCK[lay.tiles[i]] && ![W.T.WATER, W.T.DEEP, W.T.ISLE].includes(lay.tiles[i]) && t.layers.length < 2);
  for (const p of places) { const r = A.placeLayers(p.lay, p.seed, full, 0, p.level); assert.ok(r.ok && !groundOnly(p.lay, r), p.key); }
  const strip = keep => A.catalogue(VECTORS.atlas.catalogue.filter(q => keep(q)), VECTORS.atlas.levelTone);
  const lean = strip(q => !(["cap", "side", "lip"].includes(q.kind) || (q.kind === "face" && q.cells[0] > 1) || (q.kind === "prop" && q.type === "boulder")));
  const standIn = new Set(lean.face.w1.concat(lean.material.rock).map(q => q.name));
  for (const p of places) { const r = A.placeLayers(p.lay, p.seed, lean, 0, p.level); assert.ok(r.ok, p.key);
    r.tiles.forEach((t, i) => { if (blockKinds.includes(p.lay.tiles[i])) assert.ok(t.layers.some(l => standIn.has(l.id)), p.key + " tile " + i); }); }
  const none = strip(q => !(["cap", "side", "lip", "face"].includes(q.kind) || q.kind === "material" || (q.kind === "prop" && q.type === "boulder")));
  const withBlock = places.filter(p => p.lay.tiles.some(t => blockKinds.includes(t)));
  assert.ok(withBlock.length > 0); for (const p of withBlock) assert.deepEqual(A.placeLayers(p.lay, p.seed, none, 0, p.level), { ok: false }, p.key);
  const flat = places.find(p => !p.lay.tiles.some(t => blockKinds.includes(t))); if (flat) assert.ok(A.placeLayers(flat.lay, flat.seed, none, 0, flat.level).ok, "a place with no blocking terrain kind");
});
test("atlas: pure and integer only, by source; its only import is ./world.mjs; no export shadows a page identifier", () => {
  const code = ATLAS_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const re of [/\bS\./, /document/, /window/, /localStorage/, /Math\.random/, /Date/, /performance/, /getContext/, /Math\.round/, /Math\.hypot/, /Math\.sqrt/]) assert.doesNotMatch(code, re, String(re));
  assert.doesNotMatch(code, /(^|[^\w.])\d*\.\d+/, "a float literal");
  assert.deepEqual([...code.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]), ["./world.mjs"]);
  const SCRIPT_DECL = new Set([...SCRIPT.matchAll(/^(?:const|let|function) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));
  for (const k of Object.keys(A)) assert.ok(!SCRIPT_DECL.has(k), k + " is also a page identifier");
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
  const reg = p.run("CARE_ASSETS.filter(a => a.status === 'stand-in' && a.w === 32 && a.h === 32 && !a.id.startsWith('c-')).map(a => a.id).join()");
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

// ---- 48 px places: the compose step on a synthetic set (each piece a known fill), a synthetic palette with a grass ramp ----
// Indices: 48–51 a grass ramp (mat grass; dark one step down, light one up), 52 rock, 53 water. The lawn, lips and tall grass are
// grass 50; a face or cap is grass 50 over the top half of each cell row and rock below; a water quarter is grass 50 on its west half (the margin)
// and water east; a macro is transparent above its diagonal, grass 50 then water below; every other piece one core colour.
const G2_ = 50, ROCK_ = 52, WATER_ = 53;
function synthPalette(p, over) {
  const names = p.run("PALETTE.map(q => q[0])"), hex = p.run("HEX.slice(0, 48)"), t = p.run("({ dark: DARK.slice(0, 48), light: LIGHT.slice(0, 48), dark2: DARK2.slice(0, 48), fog: FOGLUT.slice(0, 48), fade: FADE.slice(0, 48) })");
  const entries = names.slice(0, 48).map((name, i) => Object.assign({ i, name, hex: hex[i], dark: t.dark[i], light: t.light[i], dark2: t.dark2[i], fog: t.fog[i], fade: t.fade[i] }, over && over[i]));
  const add = (hx, mat, dark, light) => entries.push({ i: entries.length, name: mat + "-" + entries.length, hex: hx, mat, dark, light, dark2: 0, fog: 0, fade: 0 });
  add("#203a20", "grass", 48, 49); add("#2c5a2c", "grass", 48, 50); add("#3a7a3a", "grass", 49, 51); add("#4c9c4c", "grass", 50, 51); add("#6a6a70", "rock", 52, 52); add("#1d5a88", "water", 53, 53);
  for (const e of entries) if (e.i >= 48) e.dark2 = entries[e.dark].dark;
  return { biome: "meadow", entries };
}
function synthFill(q) {
  const px = new Array(q.w * q.h);
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) { let c;
    if (q.kind === "ground" && q.set !== "lawn") c = q.set === "deep" ? WATER_ : 6;
    else if (q.kind === "ground" || q.kind === "lip" || q.kind === "decal") c = G2_;
    else if (q.kind === "face" || q.kind === "cap") c = y % 48 < 24 ? G2_ : ROCK_;
    else if (q.kind === "shore") c = x < 12 ? (q.set === "water-sand" ? 6 : G2_) : q.set === "sand" ? 6 : WATER_;
    else if (q.kind === "shadow") c = (x + y) % 2 ? -1 : 48;
    else if (q.kind === "shore-macro") c = x + y < 72 ? -1 : x + y < 96 ? (q.set === "sand-margin" ? 6 : G2_) : WATER_;
    else if (q.kind === "material") c = ROCK_;
    else c = 4 + (W.hash(q.name) % 40);
    px[y * q.w + x] = c; }
  return px;
}
function page48(seed = 7, levelTone = ["dark", "none", "light"], over) {
  const p = page({}, undefined, { canvas: true }); p.run("newWorld(" + seed + ")");
  const RGB = p.run("RGB.slice(0, 48)"), core = p.run("({ names: PALETTE.slice(0, 48).map(q => q[0]), dark: DARK.slice(0, 48), light: LIGHT.slice(0, 48), dark2: DARK2.slice(0, 48), fog: FOGLUT.slice(0, 48), fade: FADE.slice(0, 48) })");
  const table = A.paletteTable(RGB, core, synthPalette(p, over)); assert.equal(table.errors, undefined, String(table.errors));
  p.ctx.__syn = { list: VECTORS.atlas.catalogue.map(q => Object.assign({}, q, { px: synthFill(q) })), table, levelTone };
  p.run("atlasInstall(__syn.list, __syn.table, __syn.levelTone)"); assert.equal(p.run("ART48.ready"), true);
  p.level = (key, L) => p.run(`(() => { const lay = layout('${key}'); G.level[lay.cell] = ${L}; lay.l48 = null; for (const k of [...ART.keys()]) if (k.startsWith('g48|')) ART.delete(k); })()`);
  p.tile = (key, i, fr = 0) => p.run(`Array.from(tile48(layout('${key}'), ${i}, ${fr}).p)`);
  p.layers = (key, fr = 0) => p.run(`JSON.parse(JSON.stringify(layers48(layout('${key}'), ${fr})))`);
  return p;
}
const T_ = W.T, TERR_ = W.TERR, PW_ = W.PW;
const findTile = (p, key, pred) => { const lay = p.run(`(() => { const l = layout('${key}'); return { tiles: Array.from(l.tiles), terr: l.terr ? Array.from(l.terr) : null, tmask: l.tmask ? Array.from(l.tmask) : null }; })()`), L = p.layers(key);
  for (let i = 0; i < PW_ * W.PH; i++) if (pred(i, lay, L.tiles[i])) return i; return -1; };
const plainLawn = (i, lay, t) => lay.tiles[i] === T_.GRASS && (!lay.terr || !lay.terr[i]) && t.layers.length === 1;
test("48 px compose, level tone: lawn, tall grass, lips, faces and water margins take their level's tone, grass colours only", () => {
  const p = page48(), LIGHTG = p.run("LIGHT_GRASS"), DARKG = p.run("DARK_GRASS");
  assert.deepEqual([LIGHTG[G2_], DARKG[G2_], LIGHTG[ROCK_], DARKG[WATER_], LIGHTG[5]], [51, 49, ROCK_, WATER_, 5], "the grass-only tables");
  // level 2 (a lip place lifted to 2): the lawn light, a lip's lower lawn raw (tone(1) none)
  p.level("7", 2); let i = findTile(p, "7", plainLawn); assert.ok(i >= 0); assert.ok(p.tile("7", i).every(c => c === 51), "level 2: lawn LIGHT");
  i = findTile(p, "7", (i, lay, t) => lay.terr[i] === TERR_.LIP); assert.ok(i >= 0); assert.ok(p.tile("7", i).filter(c => c >= 48).every(c => c === G2_), "level 2: lip raw");
  // level 1: the lawn raw, lips DARK (tone(0)), a face's grass LIGHT (tone(2)) and its rock raw
  p.level("34", 1); i = findTile(p, "34", plainLawn); assert.ok(p.tile("34", i).every(c => c === G2_), "level 1: lawn raw");
  p.level("7", 1); i = findTile(p, "7", (i, lay, t) => lay.terr[i] === TERR_.LIP); assert.ok(p.tile("7", i).filter(c => c >= 48).every(c => c === 49), "level 1: lip DARK");
  i = findTile(p, "34", (i, lay) => lay.terr[i] === TERR_.FACE); assert.ok(i >= 0); let px = p.tile("34", i);
  assert.ok(px.slice(0, 48 * 24).every(c => c === 51) && px.slice(48 * 24).every(c => c === ROCK_), "level 1: face grass LIGHT, rock raw");
  assert.ok(px.filter(c => c === ROCK_).length > 0 && px.filter(c => c === 51).length > 0 && !px.includes(G2_), "level 1: no raw grass on a face");
  // level 0: the lawn DARK, a face's grass raw (tone(1))
  p.level("34", 0); i = findTile(p, "34", plainLawn); assert.ok(p.tile("34", i).every(c => c === 49), "level 0: lawn DARK");
  i = findTile(p, "34", (i, lay) => lay.terr[i] === TERR_.FACE); px = p.tile("34", i); assert.ok(px.filter(c => c >= 48 && c !== ROCK_).every(c => c === G2_), "level 0: face grass raw");
  // level 2 water: the margin LIGHT, the water raw; a macro's grass LIGHT where it shows, the water raw
  p.level("9", 2); i = findTile(p, "9", (i, lay, t) => lay.tiles[i] === T_.WATER && t.layers.length === 4 && t.layers.every(l => /^t\/water\//.test(l.id)));
  assert.ok(i >= 0); px = p.tile("9", i); assert.ok(px.every((c, k) => c === ((k % 48) % 24 < 12 ? 51 : WATER_)), "level 2: water margin LIGHT, water raw");
  const p1 = page48(1); p1.level("26", 2);   // a pond with a lawn bank (seed 7's ponds all meet sand)
  i = findTile(p1, "26", (i, lay, t) => t.layers.some(l => /^t\/macro\//.test(l.id))); assert.ok(i >= 0); px = p1.tile("26", i);
  assert.ok(px.every(c => c === 51 || c === WATER_), "level 2: a macro tile shows toned lawn, toned grass and raw water only");
  // sides, stairs and the rock stand-in are never toned
  for (const L of [0, 1, 2]) { p.level("34", L); const lay = p.layers("34");
    for (const [k, t] of lay.tiles.entries()) for (const l of t.layers) if (/^t\/(side|stair|landing|foot|apron|rock)/.test(l.id)) assert.equal(l.tone, null, "level " + L + " " + l.id); }
});
test("48 px compose, shore macros: a macro tile shows the slice where it is opaque and the lawn where it is clear; the frames alternate", () => {
  const p = page48(1); p.level("26", 1);
  const i = findTile(p, "26", (i, lay, t) => t.layers.some(l => /^t\/macro\//.test(l.id))); const L = p.layers("26", 0).tiles[i].layers, sl = L.find(l => /^t\/macro\//.test(l.id));
  const piece = VECTORS.atlas.catalogue.find(q => q.name === sl.id), fill = synthFill(piece), px = p.tile("26", i, 0);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const s = fill[(sl.sy + y) * 96 + sl.sx + x]; assert.equal(px[y * 48 + x], s >= 0 ? s : G2_, x + "," + y); }
  assert.match(sl.id, /-f1$/); assert.match(p.layers("26", 1).tiles[i].layers.find(l => /^t\/macro\//.test(l.id)).id, /-f2$/);
});

test("cast shadow: the rule gives the art director's proof states on the proof's grid", () => {
  const { grid, states } = VECTORS.atlas.shadowGrid; assert.deepEqual(grid, PROOF_GRID); assert.deepEqual(states, proofStates(PROOF_GRID));
  const at = (x, y) => (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length ? grid[y][x] : null), raised = (x, y) => at(x, y) === "1" || at(x, y) === "F", foot = (x, y) => at(x, y) === "F";
  let n = 0; for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[0].length; x++) { if (grid[y][x] !== ".") continue; n++;
    const st = A.castState(raised, foot, x, y); assert.equal(st === null ? "-" : st === "es" ? "B" : st, states[y][x], x + "," + y); }
  assert.ok(n > 100);
});
test("cast shadow: a lawn tile takes its state's piece over the ground, toned, the lawn showing through its clear pixels", () => {
  const p = page48(); p.level("34", 1); const lay = p.run("(() => { const l = layout('34'); return { tiles: Array.from(l.tiles), terr: Array.from(l.terr) }; })()"), L = p.layers("34");
  const seen = new Set();
  L.tiles.forEach((t, i) => { const sl = t.layers.find(l => /^t\/shadow\//.test(l.id)); if (!sl) return; seen.add(sl.id);
    assert.ok(t.layers.indexOf(sl) === 1, "right after the ground"); assert.equal(sl.tone, null, "level 1: tone none");
    const px = p.tile("34", i), ground = t.layers[0];
    if (/lawn/.test(ground.id) && t.layers.length === 2) for (let k = 0; k < 48 * 48; k++) assert.equal(px[k], ((k % 48) + ((k / 48) | 0)) % 2 ? G2_ : 48, "pixel " + k); });
  assert.ok(seen.size > 0, "shadow tiles on a place under a face");
  // receivers are lawn-ground tiles only: never terrain, water or sand
  L.tiles.forEach((t, i) => { if (t.layers.some(l => /^t\/shadow\//.test(l.id))) assert.ok(!lay.terr[i] && [T_.GRASS, T_.TALL, T_.FLOWERS, T_.ROCK, T_.TRUNK, T_.REEDS].includes(lay.tiles[i]), "a receiver"); });
});
test("generator 1's band as runs, reeds staggered, the sand shore", () => {
  const cat = SYN(), g1 = vecPlaces().filter(p => p.gen === 1);
  for (const p of g1) { const r = A.placeLayers(p.lay, p.seed, cat, 0, null);
    for (let y = 1; y < W.PH; y++) { const ids = [...Array(W.PW).keys()].map(x => { const i = y * W.PW + x; return p.lay.tiles[i] === T_.CLIFF && p.lay.tiles[i - W.PW] !== T_.CLIFF ? (r.tiles[i].layers.find(l => /^t\/(face|cap)\//.test(l.id)) || {}).id : null; });
      for (let x = 0; x + 1 < W.PW; x++) if (ids[x] && ids[x + 1] && /\/w1\//.test(ids[x]) && /\/w1\//.test(ids[x + 1])) assert.fail(p.key + " row " + y + ": two w1 side by side at " + x); } }
  let reeds = 0, drawn = 0;
  for (const p of vecPlaces()) { const r = A.placeLayers(p.lay, p.seed, cat, 0, p.level); reeds += p.lay.tiles.filter(t => t === T_.REEDS).length;
    for (const s2 of r.sprites) { drawn++; assert.equal(s2.sortY, s2.ty * 48 + 2, "a reed sorts before anything standing on its row (creatures +4, the pawn +5) or below"); const off = s2.x - (s2.tx * 48 + 24 - (VECTORS.atlas.catalogue.find(q => q.name === s2.id).w >> 1)); assert.ok(off >= -8 && off <= 8, "offset " + off); } }
  assert.ok(reeds > 20 && drawn > reeds * 0.3 && drawn < reeds * 0.7, "about half the reeds: " + drawn + " of " + reeds);
  // the sand shore: next to lawn, edge quarters; beside water only, fill (kept as plain sand); with no pieces, plain sand
  const sandy = vecPlaces().find(p => p.lay.base === T_.SAND && p.lay.tiles.some((t, i) => t === T_.SAND && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const x = i % W.PW + dx, y = ((i / W.PW) | 0) + dy; return x >= 0 && y >= 0 && x < W.PW && y < W.PH && [T_.GRASS, T_.TALL, T_.FLOWERS].includes(p.lay.tiles[y * W.PW + x]); })));
  assert.ok(sandy, "a sand place with lawn beside sand");
  const r = A.placeLayers(sandy.lay, sandy.seed, cat, 0, sandy.level), none = A.placeLayers(sandy.lay, sandy.seed, A.catalogue(VECTORS.atlas.catalogue.filter(q => !(q.kind === "shore" && q.set === "sand")), VECTORS.atlas.levelTone), 0, sandy.level);
  let edged = 0; r.tiles.forEach((t, i) => { if (sandy.lay.tiles[i] !== T_.SAND) return; const q = t.layers.filter(l => /^t\/sandshore\//.test(l.id));
    if (q.length) { edged++; assert.equal(q.length, 4); assert.ok(q.some(l => !/-fill$/.test(l.id)), "not all fill"); }
    assert.ok(!none.tiles[i].layers.some(l => /sandshore/.test(l.id)), "no pieces: plain sand"); });
  assert.ok(edged > 0, "sand tiles beside lawn take edge quarters");
  // beside water only: water counts as sand, so every quarter is fill and the tile stays plain sand
  r.tiles.forEach((t, i) => { if (sandy.lay.tiles[i] !== T_.SAND) return; const x = i % W.PW, y = (i / W.PW) | 0;
    const other = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W.PW || Y >= W.PH) return false; const n = sandy.lay.tiles[Y * W.PW + X]; return ![T_.SAND, T_.WATER, T_.STEP, T_.DEEP].includes(n) && !(n === T_.REEDS && sandy.lay.base === T_.SAND); });
    if (!other) assert.ok(!t.layers.some(l => /sandshore/.test(l.id)), "no other ground near: plain sand"); });
});

// ---- water beside sand, and the wood place's shadow ----
const flatLay = (base, edits) => { const tiles = new Array(W.PW * W.PH).fill(base); for (const [x, y, t] of edits) tiles[y * W.PW + x] = t; return { key: "hand", cell: 0, tiles, base }; };
const POND = [[5, 5], [6, 5], [5, 6], [6, 6]].map(([x, y]) => [x, y, T_.WATER]);
test("water beside sand: the sand-margin quarters on a water tile with a sand orthogonal neighbour, the sand-margin macro when a side tile is sand, not the corner", () => {
  const cat = SYN(), ids = (lay, x, y, fr = 0) => A.placeLayers(lay, 7, cat, fr, null).tiles[y * W.PW + x].layers.map(l => l.id);
  // a single water tile, sand to its east: all four quarters from the water-sand set; with no sand it keeps the lawn-margin set; STEP and DEEP follow
  for (const wt of [T_.WATER, T_.STEP, T_.DEEP]) {
    const sandy = ids(flatLay(T_.GRASS, [[5, 5, wt], [6, 5, T_.SAND]]), 5, 5).filter(id => /^t\/water/.test(id)), plain = ids(flatLay(T_.GRASS, [[5, 5, wt]]), 5, 5).filter(id => /^t\/(water|deep)/.test(id));
    assert.ok(sandy.length === 4 && sandy.every(id => /^t\/watersand\//.test(id)), "tile " + wt + " beside sand: " + sandy);
    assert.ok(plain.length >= 1 && plain.every(id => !/watersand/.test(id)), "tile " + wt + " beside lawn"); }
  assert.ok(ids(flatLay(T_.GRASS, [[5, 5, T_.WATER], [6, 6, T_.SAND]]), 5, 5).every(id => !/watersand/.test(id)), "a diagonal sand neighbour does not count");
  assert.ok(ids(flatLay(T_.SAND, [[5, 5, T_.WATER]]), 5, 5).every(id => /^t\/watersand\//.test(id) || /^t\/(lawn|sand)/.test(id)), "a sand base");
  assert.ok(ids(flatLay(T_.GRASS, [[5, 5, T_.WATER], [6, 5, T_.REEDS]]), 5, 5).every(id => !/watersand/.test(id)), "reeds on a lawn base are not sand ground");
  const noWS = A.catalogue(VECTORS.atlas.catalogue.filter(q => q.set !== "water-sand"), VECTORS.atlas.levelTone);
  assert.ok(A.placeLayers(flatLay(T_.GRASS, [[5, 5, T_.WATER], [6, 5, T_.SAND]]), 7, noWS, 0, null).tiles[5 * W.PW + 5].layers.filter(l => /^t\/water/.test(l.id)).every(l => /^t\/water\//.test(l.id)), "a missing water-sand piece falls back to water");
  // macros: sand on a side tile of the block, or only on the corner tile
  const macroId = lay => A.placeLayers(lay, 7, cat, 0, null).tiles[5 * W.PW + 5].layers.map(l => l.id).find(id => /^t\/macro/.test(id));
  assert.match(macroId(flatLay(T_.GRASS, POND)), /^t\/macro\/nw-/);
  assert.match(macroId(flatLay(T_.GRASS, POND.concat([[5, 4, T_.SAND]]))), /^t\/macrosand\/nw-/, "sand on a side tile");
  assert.match(macroId(flatLay(T_.GRASS, POND.concat([[4, 5, T_.SAND]]))), /^t\/macrosand\/nw-/, "sand on the other side");
  assert.match(macroId(flatLay(T_.GRASS, POND.concat([[4, 4, T_.SAND]]))), /^t\/macro\/nw-/, "sand on the corner tile only");
  const noMS = A.catalogue(VECTORS.atlas.catalogue.filter(q => q.set !== "sand-margin"), VECTORS.atlas.levelTone);
  assert.match(A.placeLayers(flatLay(T_.GRASS, POND.concat([[5, 4, T_.SAND]])), 7, noMS, 0, null).tiles[5 * W.PW + 5].layers.map(l => l.id).find(id => /^t\/macro/.test(id)), /^t\/macro\/nw-/, "a missing sand-margin macro falls back to the lawn-margin one");
});
test("water beside sand, level 2: a sand-margin pixel stays raw and a lawn-margin pixel is LIGHT", () => {
  const p = page48(); p.level("9", 2);
  const i = findTile(p, "9", (i, lay, t) => lay.tiles[i] === T_.WATER && t.layers.length === 4 && t.layers.every(l => /^t\/watersand\//.test(l.id)));
  assert.ok(i >= 0); const px = p.tile("9", i); assert.ok(px.every((c, k) => c === ((k % 48) % 24 < 12 ? 6 : WATER_)), "sand margin raw, water raw");
  const j = findTile(p, "9", (i, lay, t) => lay.tiles[i] === T_.WATER && t.layers.length === 4 && t.layers.every(l => /^t\/water\//.test(l.id)));
  assert.ok(j >= 0); assert.ok(p.tile("9", j).every((c, k) => c === ((k % 48) % 24 < 12 ? 51 : WATER_)), "lawn margin LIGHT");
});
test("the wood place's T.DARK lawn receives the cast shadow, darkened after it", () => {
  const cat = SYN(), lay = flatLay(T_.DARK, [[3, 5, T_.CLIFF]]), r = A.placeLayers(lay, 7, cat, 0, null), t = r.tiles[5 * W.PW + 4];
  assert.ok(t.layers.some(l => /^t\/shadow\/e$/.test(l.id)) && t.dark === 1, "e shadow on a dark lawn tile, dark applied at compose");
});

// ---- 48 px places on the page: anchor, camera, palette, edges, overrides ----
function place48(seed, cell, x, y, setup = "", over) {
  const p = page48(seed, undefined, over);
  p.run(`TEST.calm = true; startExpedition('weather', ${cell}); S.exp.fog = null; S.exp.storm = null; FX.lockUntil = 0; S.exp.pos = ${cell}; enterPatch(); S.exp.patch.x = ${x}; S.exp.patch.y = ${y};
    S.veil[S.exp.patch.key] = new Array(PH).fill(0x0fffffff); ${setup}`);
  return p;
}
const frame48 = (p, n = 3) => { for (let i = 0; i < n; i++) { p.clock && (p.clock.t += 16); p.run(`scr.px().fill(-1); render(${2000 + i * 16})`); } return Int16Array.from(p.run("scr").px()); };
test("48 px: the camera centres on the pawn and follows it; the pawn stays centred", () => {
  const p = place48(7, 176, 14, 14); frame48(p);   // seed 7, cell 176: any playable place
  assert.equal(p.run("RT.ts"), 48);
  const sp = p.run("RT.plScr"); assert.deepEqual([sp.x, sp.y], [225, 298], "the pawn's tile centre mid-view");
  const mid = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"); assert.deepEqual(mid, { x: 14 * 48 + 24 - 225, y: 14 * 48 + 24 - 266 });
  p.run("S.exp.patch.x = 16"); frame48(p, 12);   // two steps right (the tween has run its 110 ms)
  p.clock.t += 400; frame48(p);
  const c2 = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"); assert.deepEqual(c2, { x: 16 * 48 + 24 - 225, y: mid.y }, "the camera followed");
  const sp2 = p.run("RT.plScr"); assert.deepEqual([sp2.x, sp2.y], [225, 298], "the pawn stays centred");
});
test("48 px: every pixel of a place frame is an index below N, the HUD and the bottom line stay on the core 48, and no tile canvas is 32 wide", () => {
  const p = place48(7, 176, 14, 14), N = p.run("RGB.length"); assert.equal(N, 54);
  const px = frame48(p), W_ = p.run("SCR_W"), H_ = p.run("SCR_H"), vy = p.run("VIEW_Y"), vh = p.run("VIEW_H");
  assert.equal(p.run("RT.ts"), 48); let high = 0;
  for (let y = 0; y < H_; y++) for (let x = 0; x < W_; x++) { const v = px[y * W_ + x]; assert.ok(v >= 0 && v < N, "index " + v + " at " + x + "," + y); if (v >= 48) { high++; assert.ok(y >= vy && y < vy + vh, "a biome index outside the view at " + x + "," + y); } }
  assert.ok(high > 1000, "the place draws biome colours");
  assert.equal(p.run("tile48(layout(S.exp.patch.key), 0, 0).w"), 48);
});
test("48 px anchor: a creature's 32 px sprite sits bottom-aligned and centred in its cell (cell + (8, 16))", () => {
  const p = place48(7, 176, 14, 14), key = p.run("S.exp.patch.key"), lay = p.run("layout(S.exp.patch.key)");
  p.run("ensureLive(S.exp.patch.key)");
  // a creature of species 0 placed in view, idle, on a plain tile
  const tx = 16, ty = 14; p.run(`(() => { const live = S.exp.live[S.exp.patch.key]; live.cr.length = 0; live.cr.push({ id: 901, sp: 0, x: ${tx}, y: ${ty}, st: 'idle', t: 0, wet: 0, calm: 0, curl: 0, hide: 0, b: 0.5, face: 1, ready: false }); live.pt = null; })()`);
  frame48(p, 4); const a = frame48(p, 1);
  p.run("S.exp.live[S.exp.patch.key].cr[0].hide = 1"); const b = frame48(p, 1);
  const W_ = p.run("SCR_W"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), ox = tx * 48 - cam.x, oy = 32 + ty * 48 - cam.y;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { const x = i % W_, y = (i / W_) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  assert.ok(x1 >= 0, "the creature draws");
  // species 0 idle: the opaque box inside the 32 px sprite is columns 2…25 and rows 1…29, so (8, 16) on from the cell's corner
  assert.deepEqual([x0 - ox, x1 - ox, y0 - oy, y1 - oy], [10, 33, 17, 45], "the changed pixels' box in cell coordinates");
});

// ---- golden frames: FNV of the 450×600 screen ----
// The 32 px frames were captured from main's page with this harness (the cave, a place with no atlas, the reach view): the same
// hashes here prove the 48 px work left 32 px byte-identical. The 48 px frames are on the synthetic set (so they do not move with the art).
const MAIN_FRAMES = { cave: 1237067964, place32: 3198906207, map: 3385181673 };   // main 5e287081 + the overrides PR
const GOLDEN48 = { faceStair: 4173935199, gen1: 3556257434, corner: 1246740290 };
function place48g1(seed, cell, x, y) {
  const p = page48(seed);
  p.run(`layoutCache.clear(); RT.reachSet = null; RT.reachKey = null; G = genWorld(${seed}, 1); S = worldFields(${seed}, 1); const life = genLife(${seed}); S.cr = life.cr; S.pods = life.pods; indexCreatures();
    TEST.calm = true; startExpedition('weather', ${cell}); S.exp.fog = null; S.exp.storm = null; FX.lockUntil = 0; S.exp.pos = ${cell}; enterPatch(); S.exp.patch.x = ${x}; S.exp.patch.y = ${y}; S.veil[S.exp.patch.key] = new Array(PH).fill(0x0fffffff);`);
  return p;
}
test("golden frames: 32 px stays byte-identical to main (the cave, a place with no atlas, the reach view)", () => {
  const frame = (p, setup) => { p.run(setup); for (let i = 0; i < 3; i++) { p.clock.t += 16; p.run(`scr.px().fill(-1); RT.key = null; render(${p.clock.t})`); } return fnv(p.run("scr").px()); };
  const p = page({}, undefined, { canvas: true });
  assert.equal(frame(p, "TEST.calm = true; newWorld(7); startExpedition('weather', G.gate); S.exp.fog = null; S.exp.storm = null; S.exp.pos = G.gate; enterCave();"), MAIN_FRAMES.cave, "the cave"); assert.equal(p.run("RT.ts"), 32);
  assert.equal(frame(p, "TEST.calm = true; newWorld(7); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); S.exp.patch.x = 14; S.exp.patch.y = 14;"), MAIN_FRAMES.place32, "a place with no atlas"); assert.equal(p.run("RT.ts"), 32);
  assert.equal(frame(p, "S.exp.patch = null; S.phase = 'map';"), MAIN_FRAMES.map, "the reach view");
});
test("golden frames at 48: a place with a south face and a stair, a generator 1 place, the pawn in a place corner", () => {
  const e = CROSSINGS["S down"], ent = entryFor(e.seed, e);
  const got = {
    faceStair: fnv(frame48(place48(e.seed, e.b, ent.x, ent.y))),
    gen1: fnv(frame48(place48g1(7, 65, 14, 24))),
    corner: fnv(frame48(place48(7, 176, 1, 1))),
  };
  for (const [k, v] of Object.entries(got)) assert.equal(v, GOLDEN48[k], k + " " + v);
});

// ---- the edges at 48: coverage fades, the storm step, the place's own tables ----
const BAYER_ = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
test("48 px edges: the coverage fade equals its formula for every 8-neighbour mask; a lone diagonal gives a rounded patch, not a square", () => {
  const p = page48(), NB = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const want = m9 => { const far = (dx, dy) => dx === 0 && dy === 0 ? (m9 >> 8) & 1 : (m9 >> NB.findIndex(([a, b]) => a === dx && b === dy)) & 1, f = new Uint8Array(2304);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { let c = 0; for (const oy of [-24, -12, 0, 12, 24]) for (const ox of [-24, -12, 0, 12, 24]) c += far(Math.floor((x + ox) / 48), Math.floor((y + oy) / 48));
      f[y * 48 + x] = 32 * c > (2 * BAYER_[(y & 3) * 4 + (x & 3)] + 1) * 25 ? 1 : 0; } return f; };
  assert.deepEqual(Array.from(p.run("BAYER")), BAYER_);
  for (const m of [0, 2, 3, 6, 7, 14, 28, 56, 129, 256, 257, 280, 340, 420, 510, 511, 85, 170]) assert.deepEqual(Array.from(p.run("coverFar(" + m + ")")), Array.from(want(m)), "mask " + m);
  const f = p.run("coverFar(2)");   // only the NE neighbour far
  const q = []; for (let y = 0; y < 24; y++) for (let x = 24; x < 48; x++) q.push(f[y * 48 + x]);
  assert.ok(q.some(v => v === 1) && q.some(v => v === 0), "the NE quadrant is part far, part near: a rounded patch");
  let nearCorner = 0; for (let y = 0; y < 12; y++) for (let x = 36; x < 48; x++) nearCorner += f[y * 48 + x];
  assert.ok(nearCorner > 0 && nearCorner < 144, "far pixels gather at the corner, thinning out: " + nearCorner); assert.equal(f[47 * 48 + 0], 0, "the opposite corner is near");
  assert.equal(p.run("coverFar(511).every(v => v === 1)"), true); assert.equal(p.run("coverFar(0).every(v => v === 0)"), true);
});
test("48 px edges: a veiled column beside the lifted view draws each pixel on the far side exactly where the coverage formula says", () => {
  const p = place48(7, 176, 14, 14, "layout(S.exp.patch.key).svy = new Uint8Array(PW * PH).fill(1); S.veil[S.exp.patch.key] = new Array(PH).fill(0); unveilRound(S.exp.patch.key, 14, 14, 4); layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;");
  const px = frame48(p), key = p.run("S.exp.patch.key"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), W_ = p.run("SCR_W"), vy = p.run("VIEW_Y");
  const uv = (x, y) => p.run(`unveiled('${key}', ${x}, ${y})`), NB = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  let checked = 0, edge = 0;
  for (let ty = 10; ty <= 16; ty++) for (let tx = 11; tx <= 18; tx++) {   // whole tiles in view, above the message box
    let m = uv(tx, ty) ? 0 : 256; NB.forEach(([dx, dy], b) => { if (!uv(tx + dx, ty + dy)) m |= 1 << b; });
    if (!m || m === 511) continue;
    if (p.run(`(() => { const l = layout('${key}'); for (let dy = -1; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) { const t = l.tiles[(${ty} + dy) * PW + ${tx} + dx]; if (t === T.REEDS || t === T.TRUNK) return true; } return false; })()`)) continue;   // a reed or a canopy draws over it
    edge++;
    const f = p.run("coverFar(" + m + ")"), pb = p.run(`tile48(layout('${key}'), ${ty * 48 / 48 * 28 + tx}, 0)`), sx = tx * 48 - cam.x, sy = vy + ty * 48 - cam.y;
    if (p.run(`(() => { const l = layout('${key}'); return l.tiles[${ty * 28 + tx}] === T.WATER; })()`)) continue;
    let ok = true; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const c = pb.p[y * 48 + x]; if (c < 0) continue;
      const near = c, far = BAYER_[(y & 3) * 4 + (x & 3)] < 4 ? p.run("C.night") : p.run(`DARK[${c}]`), got = px[(sy + y) * W_ + sx + x];
      if (got !== (f[y * 48 + x] ? far : near)) { ok = false; } }
    assert.ok(ok, "tile " + tx + "," + ty + " mask " + m); checked++; }
  assert.ok(edge > 6 && checked === edge, "edge tiles checked: " + checked + " of " + edge);
});
test("48 px storm: the 6 px of the lit tile beside the band step by the Bayer rule, the pixel beyond them is lit, band tiles are dark", () => {
  const p = place48(7, 176, 14, 14, "S.exp.storm = { x: (176 % MW) - 3 - 1.25, dir: 1, w: 3, v: .25, t: 0 }; layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;");
  const px = frame48(p), key = p.run("S.exp.patch.key"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), W_ = p.run("SCR_W"), vy = p.run("VIEW_Y");
  const darkW = Math.ceil((3 - 1.25) * 1.5) * 48; assert.equal(darkW, 144);
  const storm = p.run("PLACE_STORM"), dark = p.run("DARK"); let tx = 0; while (tx * 48 + 24 - cam.x < darkW) tx++;   // the first lit tile
  assert.ok(tx * 48 - cam.x > 0 && tx * 48 - cam.x < 200, "the lit tile beside the band is on screen");
  let rows = 0, okRows = 0;
  for (let ty = 11; ty <= 16; ty++) { const pb = p.run(`tile48(layout('${key}'), ${ty * 28 + tx}, 0)`), sx = tx * 48 - cam.x, sy = vy + ty * 48 - cam.y; rows++; let ok = true;
    for (let y = 0; y < 48 && ok; y++) for (let x = 0; x < 48; x++) { const c = pb.p[y * 48 + x]; if (c < 0) continue; const step = x < 6 && BAYER_[(y & 3) * 4 + (x & 3)] * 7 < (6 - x) * 16;
      if (px[(sy + y) * W_ + sx + x] !== (step ? storm[c] : c)) { ok = false; break; } }
    if (ok) okRows++; }
  assert.equal(okRows, rows, okRows + " of " + rows + " rows match");
  const bt = p.run(`tile48(layout('${key}'), ${14 * 28 + tx - 1}, 0)`), bx = (tx - 1) * 48 - cam.x, by = vy + 14 * 48 - cam.y; let dk = 0, n = 0;
  for (let i = 0; i < 2304; i++) { const c = bt.p[i]; if (c < 0) continue; n++; if (px[(by + ((i / 48) | 0)) * W_ + bx + (i % 48)] === storm[c]) dk++; }
  assert.ok(dk > n * 0.97, "a band tile is fully dark: " + dk + " of " + n);
});
test("place overrides: in a 48 px place in fog a core colour takes the file's fog value; the core's own table is untouched and a core canvas never mixes with a place canvas", () => {
  const OVER = { 6: { fog: 20 } };   // the synthetic ground piece's core colour (index 6) fogs to 20 in places
  const p = place48(7, 9, 14, 14, "", OVER), lay0 = p.run("(() => { const l = layout(S.exp.patch.key); return Array.from(l.tiles); })()");
  const sand = lay0.findIndex((t, i) => t === T_.SAND && i % 28 >= 8 && i % 28 <= 20 && ((i / 28) | 0) >= 8), sx0 = sand % 28, sy0 = (sand / 28) | 0;   // a sand tile; the pawn stands 5 tiles above or below it, so it is fogged and still on screen
  p.run(`S.exp.patch.x = ${sx0}; S.exp.patch.y = ${sy0 < 16 ? sy0 + 5 : sy0 - 5}; S.exp.fog = { x: 9 % MW + .5, y: Math.floor(9 / MW) + .5, r: 2.4, dx: 0, dy: 0, at: 0 }; layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;`);
  assert.equal(p.run("PLACE_FOG[6]"), 20); assert.equal(p.run("FOGLUT[6]") === 20, false, "the core's own table is untouched"); assert.equal(p.run("REMAP_PLACE[3] === PLACE_FOG && REMAP[3] === FOGLUT"), true);
  frame48(p, 2); p.clock.t += 600; const px = frame48(p, 3), key = p.run("S.exp.patch.key"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), W_ = p.run("SCR_W"), vy = p.run("VIEW_Y"), P_ = p.run("S.exp.patch");
  assert.equal(p.run("RT.ts"), 48); let seen = 0;
  for (let ty = 0; ty < 32 && !seen; ty++) for (let tx = 0; tx < 28 && !seen; tx++) { const sx = tx * 48 - cam.x, sy = vy + ty * 48 - cam.y; if (sx < 0 || sy < vy || sx + 48 > W_ || sy + 48 > vy + 532) continue;
    if (Math.hypot(tx - P_.x, ty - P_.y) < 5) continue; const pb = p.run(`tile48(layout('${key}'), ${ty * 28 + tx}, 0)`), i = pb.p.indexOf(6); if (i < 0) continue;
    assert.equal(px[(sy + ((i / 48) | 0)) * W_ + sx + (i % 48)], 20, "tile " + tx + "," + ty + ": the place's fog value"); seen++; }
  assert.ok(seen, "a fogged tile with the overridden colour on screen");
  // the same buffer through the core set, and through the place set: two different canvases
  const sample = p.run(`(() => { const pb = tile48(layout('${key}'), 0, 0); RT.remap = REMAP; const a = pb.canvas(3); RT.remap = REMAP_PLACE; const b = pb.canvas(3); RT.remap = REMAP; return [a !== b, pb.cache.size]; })()`);
  assert.equal(sample[0], true, "a core canvas and a place canvas never mix");
});
