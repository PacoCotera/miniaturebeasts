// The seeded world (src/world.mjs): generator 1 against its golden vectors (tests/world-vectors.json, captured from the page
// before the world moved out of it), the module's purity, the generator recorded in the save (`gen`, absent means 1) through
// the page itself, and the Station's save reader keeping `gen` untouched. Generator 2 (terrain levels and stairs): its
// golden vectors, its integer purity, its invariants over seeds 0–999 (places on 0–99) and canStepIn on hand-built worlds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { blank } from "../../face/tools/blank.mjs";
import * as W from "../src/world.mjs";
import * as A from "../src/atlas.mjs";
import * as V from "../src/view.mjs";
import { seedDigest, worldDigest, placeDigest, placeKeys, placeKeys2, SEEDS, VIEW_CASES, viewArgs, viewOut, ATLAS_CASES, atlasCaseOut, atlasPlaces, syntheticPieces, SYNTH_TONE, NO_MACRO, PROOF_GRID, proofStates, fnv as fnvStr } from "../tools/world-vectors.mjs";

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
  const code = blank(MODULE_SRC);
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
  for (const k of ["up", "down", "left", "right", "back", "call"]) { p.run(`FX.lockUntil = 0; act(${JSON.stringify(k)}); press(${JSON.stringify(k)}); release(${JSON.stringify(k)})`); }
  // Confirm is the device's way out (two presses start a new world and keep this save): freeze.test.mjs
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
  for (const c of VECTORS.view) assert.deepEqual(viewOut(V, c), c.out, c.name);
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
  assert.equal(cat.decal.grass.length, 3, "the grass decals are catalogued, not left in other"); assert.ok(!cat.other.some(q => q.kind === "decal"));
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
test("atlas: a stepping-stone tile takes a ford stone by hash at its offset when the set has them, and the labelled stand-in when it has none", () => {
  const ford = n => ({ name: "meadow/prop/ford-" + n, kind: "prop", type: "ford", w: 20, h: 14, offset: [14, 34] }), pieces = [1, 2, 3].map(ford);
  const cat = A.catalogue(VECTORS.atlas.catalogue.concat(pieces), VECTORS.atlas.levelTone), none = SYN();
  assert.equal(cat.prop.ford.length, 3); assert.equal(none.prop.ford.length, 0); assert.equal(cat.other.length, none.other.length, "the ford pieces are not left in other");
  let steps = 0; const used = new Set();
  for (const p of vecPlaces()) { const a = A.placeLayers(p.lay, p.seed, cat, 0, p.level), b = A.placeLayers(p.lay, p.seed, none, 0, p.level);
    for (let i = 0; i < W.PW * W.PH; i++) if (p.lay.tiles[i] === W.T.STEP) { steps++;
      const f = a.tiles[i].layers.find(l => /\/ford-/.test(l.id)); assert.ok(f, p.key + " " + i + ": a ford stone");
      assert.deepEqual([f.dx, f.dy, f.w, f.h, f.sx, f.sy], [14, 34, 20, 14, 0, 0], "at the piece's offset, whole"); used.add(f.id);
      assert.ok(!a.tiles[i].layers.some(l => l.stand === "step"), "no stand-in beside it"); assert.ok(b.tiles[i].layers.some(l => l.stand === "step"), "the stand-in without the set");
      assert.deepEqual(a.tiles[i].layers.filter(l => l.stand == null && !/ford-/.test(l.id)), b.tiles[i].layers.filter(l => l.stand == null), "the water quarters are the same"); } }
  assert.ok(steps > 0, "a vector place has a stepping stone");
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
        const want = /^t\/(lawn|decal\/tall|decal\/grass|shadow)/.test(l.id) || /^t\/(water|watersand|macro|macrosand|sandshore)\//.test(l.id) || (/^t\/deep\//.test(l.id) && l.w === 24) ? tone(p.level)
          : /^t\/lip\//.test(l.id) ? tone(p.level - 1) : face && /^t\/(face|cap)\//.test(l.id) ? tone(p.level + 1) : null;
        assert.equal(l.tone, want, p.key + " " + l.id); } }); }
  assert.deepEqual([...seen].sort(), [0, 1, 2], "every level among the vectors");
  for (const p of vecPlaces().filter(p => p.level === null)) for (const t of A.placeLayers(p.lay, p.seed, cat, 0, null).tiles) for (const l of t.layers) if (l.stand == null) assert.equal(l.tone, null, "generator 1: no tone");
});
test("grass decals: at most one per 2×2 block, on plain lawn only, never the west or north block's piece, about a fifth of the lawn", () => {
  const cat = SYN(), isDecal = l => /^t\/decal\/grass\//.test(l.id); let lawn = 0, dec = 0, withLevels = new Set();
  for (const p of vecPlaces()) { const r = A.placeLayers(p.lay, p.seed, cat, 0, p.level), blocks = new Map(), N = W.PW * W.PH;
    r.tiles.forEach((t, i) => { const x = i % W.PW, y = (i / W.PW) | 0, d = t.layers.filter(isDecal); if (p.lay.tiles[i] === W.T.GRASS && !(p.lay.terr && p.lay.terr[i])) lawn++;
      if (!d.length) return; if (p.lay.tiles[i] === W.T.GRASS) dec++; assert.equal(d.length, 1, "one decal a tile"); withLevels.add(p.level);
      const k = (x >> 1) + "," + (y >> 1); assert.ok(!blocks.has(k), p.key + " block " + k + " has two"); blocks.set(k, d[0].id);
      assert.ok([W.T.GRASS, W.T.DARK].includes(p.lay.tiles[i]) && !(p.lay.terr && p.lay.terr[i]), p.key + " plain lawn only");
      assert.ok(!t.layers.some(l => /^t\/(shadow|water|sand|macro)/.test(l.id)), "no shadow, water or sand under it");
      assert.ok(!(p.lay.feats || []).some(f => f.y * W.PW + f.x === i), "no feature on it");
      const l = d[0]; assert.ok(l.dx >= 0 && l.dy >= 0 && l.dx + l.w <= 48 && l.dy + l.h <= 48 && l.sx === 0 && l.sy === 0, "unclipped inside the tile"); });
    for (const [k, id] of blocks) { const [bx, by] = k.split(",").map(Number); assert.notEqual(id, blocks.get((bx - 1) + "," + by), p.key + " west " + k); assert.notEqual(id, blocks.get(bx + "," + (by - 1)), p.key + " north " + k); }
    const plain = A.placeLayers(p.lay, p.seed, cat, 0, p.level, Object.assign({}, A.PLACE_RULES, { grassDecals: false }));
    plain.tiles.forEach((t, i) => assert.deepEqual(t.layers, r.tiles[i].layers.filter(l => !isDecal(l)), "the rule off leaves every other layer as it was")); }
  assert.ok(dec / lawn >= .15 && dec / lawn <= .25, "decals on " + dec + " of " + lawn + " T.GRASS tiles");
  assert.deepEqual([...withLevels].filter(v => v !== null).sort(), [0, 1, 2], "every level among the places");
  const none = A.catalogue(VECTORS.atlas.catalogue.filter(q => q.set !== "grass"), VECTORS.atlas.levelTone), p0 = vecPlaces()[0];
  assert.ok(!A.placeLayers(p0.lay, p0.seed, none, 0, p0.level).tiles.some(t => t.layers.some(isDecal)), "no pieces, no decals");
});
test("grass decals at 48: a level-2 place draws them LIGHT where grass and raw where not; a level-0 place DARK", () => {
  const p = page48(); p.level("34", 2);
  const has = (i, lay, t) => t.layers.some(l => /^t\/decal\/grass\//.test(l.id)); let i = findTile(p, "34", has); assert.ok(i >= 0, "a decal tile");
  const d = p.layers("34").tiles[i].layers.find(l => /^t\/decal\/grass\//.test(l.id)), px = p.tile("34", i), piece = VECTORS.atlas.catalogue.find(q => q.name === d.id);
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) assert.equal(px[(d.dy + y) * 48 + d.dx + x], x < piece.w / 2 ? 51 : ROCK_, "level 2 decal pixel " + x + "," + y);
  p.level("34", 0); i = findTile(p, "34", has); const d0 = p.layers("34").tiles[i].layers.find(l => /^t\/decal\/grass\//.test(l.id)), px0 = p.tile("34", i);
  assert.equal(px0[d0.dy * 48 + d0.dx], 49, "level 0: DARK"); assert.equal(px0[(d0.dy + d0.h - 1) * 48 + d0.dx + d0.w - 1], ROCK_, "level 0: rock stays raw");
});
test("side wall shadow: the cast piece continues across a SIDE tile's open strip and its east neighbour takes the rest; the strip follows the side piece's width", () => {
  const sideE = (i, lay) => lay.terr && lay.terr[i] === W.TERR.SIDE && (lay.tmask[i] & 1) && !(lay.tmask[i] & 16), cat = SYN(); let n = 0, recv = 0;
  for (const p of vecPlaces()) { if (!p.lay.terr) continue; const r = A.placeLayers(p.lay, p.seed, cat, 0, p.level), off = A.placeLayers(p.lay, p.seed, cat, 0, p.level, Object.assign({}, A.PLACE_RULES, { sideShadow: false }));
    r.tiles.forEach((t, i) => { const x = i % W.PW;
      if (sideE(i, p.lay)) { n++; const sl = t.layers.filter(l => l.id === "t/shadow/e"); assert.equal(sl.length, 1, p.key + " one slice"); assert.deepEqual([sl[0].sx, sl[0].sy, sl[0].w, sl[0].h, sl[0].dx, sl[0].dy], [0, 0, 12, 48, 36, 0]);
        assert.ok(t.layers.indexOf(sl[0]) === 1 && /^t\/side\//.test(t.layers[2].id), "after the ground, before the side piece"); assert.equal(sl[0].tone, ["light", "dark"].includes(SYNTH_TONE[p.level]) ? SYNTH_TONE[p.level] : null, "the lawn's tone"); }
      else assert.deepEqual(t.layers.filter(l => l.id === "t/shadow/e").length, off.tiles[i].layers.filter(l => l.id === "t/shadow/e").length);
      if (x > 0 && sideE(i - 1, p.lay) && t.layers.some(l => /^t\/shadow\//.test(l.id))) { const sh = t.layers.find(l => /^t\/shadow\//.test(l.id));
        if (sh.id === "t/shadow/e") { recv++; assert.deepEqual([sh.sx, sh.w, sh.dx], [12, 36, 0], p.key + " the rest of the piece"); } else assert.deepEqual([sh.sx, sh.w], [0, 48], "es and c keep the whole piece"); } }); }
  assert.ok(n > 5 && recv > 0, "side walls among the vector places: " + n + ", receivers " + recv);
  const wide = A.catalogue(VECTORS.atlas.catalogue.map(q => (q.kind === "side" && q.side === "e" ? Object.assign({}, q, { w: 40 }) : q)), VECTORS.atlas.levelTone), p = vecPlaces().find(p => p.lay.terr && p.lay.terr.some((k, i) => sideE(i, p.lay)));
  const t = A.placeLayers(p.lay, p.seed, wide, 0, p.level).tiles.find((t, i) => sideE(i, p.lay)); assert.equal(t.layers.find(l => l.id === "t/shadow/e").w, 8, "a 40 px side leaves 8");
  const none = A.catalogue(VECTORS.atlas.catalogue.filter(q => q.kind !== "shadow"), VECTORS.atlas.levelTone); assert.ok(!A.placeLayers(p.lay, p.seed, none, 0, p.level).tiles.some(t => t.layers.some(l => /shadow/.test(l.id))), "no shadow piece, no slice");
});
test("side wall shadow at 48: the open strip and the receiver's first 36 columns are the cast piece, toned, the lawn showing through its clear pixels", () => {
  const p = page48(); let found = null;
  for (const { key } of atlasPlaces(W).filter(q => q.gen === 2 && q.seed === 7)) { const lay = p.run(`(() => { const l = layout('${key}'); return { base: l.base, tiles: Array.from(l.tiles), terr: l.terr ? Array.from(l.terr) : null, tmask: l.tmask ? Array.from(l.tmask) : null }; })()`);
    const i = lay.terr && lay.base === T_.GRASS ? lay.terr.findIndex((k, i) => k === TERR_.SIDE && (lay.tmask[i] & 1) && !(lay.tmask[i] & 16) && lay.terr[i + 1] === 0 && lay.tiles[i + 1] === T_.GRASS && lay.tiles[i + 1 - PW_] !== T_.FACE) : -1; if (i >= 0) { found = [key, i]; break; } }
  assert.ok(found, "a side-e tile with a lawn tile east of it"); const [key, i] = found;
  for (const L of [1, 2]) { p.level(key, L); const lawn = L === 2 ? 51 : G2_, shade = L === 2 ? 49 : 48, a = p.tile(key, i), b = p.tile(key, i + 1), y0 = (i / PW_ | 0);
    for (let y = 0; y < 48; y++) { for (let x = 36; x < 48; x++) assert.equal(a[y * 48 + x], (x + y) % 2 ? lawn : shade, "side tile " + x + "," + y);
      for (let x = 0; x < 36; x++) assert.equal(b[y * 48 + x], ((x + 12) + y) % 2 ? lawn : shade, "receiver " + x + "," + y);
      for (let x = 36; x < 48; x++) assert.equal(b[y * 48 + x], lawn, "receiver beyond the piece " + x + "," + y); } }
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
  const code = blank(ATLAS_SRC);
  for (const re of [/\bS\./, /document/, /window/, /localStorage/, /Math\.random/, /Date/, /performance/, /getContext/, /Math\.round/, /Math\.hypot/, /Math\.sqrt/]) assert.doesNotMatch(code, re, String(re));
  assert.doesNotMatch(code, /(^|[^\w.])\d*\.\d+/, "a float literal");
  assert.deepEqual([...code.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]), ["./world.mjs"]);
  const SCRIPT_DECL = new Set([...SCRIPT.matchAll(/^(?:const|let|function) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));
  for (const k of Object.keys(A)) assert.ok(!SCRIPT_DECL.has(k), k + " is also a page identifier");
});
test("view: pure and integer only, by source; its only import is ./world.mjs; no export shadows a page identifier", () => {
  const code = blank(VIEW_SRC);
  for (const re of [/\bS\./, /document/, /window/, /localStorage/, /Math\.random/, /Date/, /performance/, /getContext/, /Math\.round/, /Math\.hypot/, /Math\.sqrt/]) assert.doesNotMatch(code, re, String(re));
  assert.doesNotMatch(code, /(^|[^\w.])\d*\.\d+/, "a float literal");
  assert.deepEqual([...code.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]), ["./world.mjs"]);
  assert.equal((code.match(/\bimport\b/g) || []).length, 1, "one import");
  const SCRIPT_DECL = new Set([...SCRIPT.matchAll(/^(?:const|let|function) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));
  for (const k of Object.keys(V)) assert.ok(!SCRIPT_DECL.has(k), k + " is also a page identifier");
});
test("the storm's dark band: at a fractional gap, 32 px keeps main's columns and 48 px takes STORM_K[48]", () => {
  assert.match(MODULE, /darkW = \(ts === 48 \? stormCols48\(Math\.round\(\(3 - gap\) \* 20\)\) : Math\.ceil\(\(3 - gap\) \* STORM_K\[ts\]\)\) \* ts;/, "drawPatch's band");
  const p = page(), K = p.run("STORM_K"), gaps = Array.from({ length: 12 }, (_, i) => i / 4), cols = ts => gaps.map(g => Math.ceil((3 - g) * K[ts]));
  assert.equal(K[32], 2.4); assert.equal(K[48], 1.4, "the ratio 7/5");
  assert.deepEqual(cols(32), gaps.map(g => Math.ceil((3 - g) * 2.4)), "main's formula at 32");
  assert.deepEqual(cols(32), [8, 7, 6, 6, 5, 5, 4, 3, 3, 2, 2, 1]);
  assert.deepEqual(cols(48), [5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1]);
  assert.deepEqual(gaps.map(g => V.stormCols48(Math.round((3 - g) * 20))), cols(48), "the integer form ceil(7n/100) agrees with the float ratio at every quarter step");
  assert.deepEqual(gaps.slice().reverse().map(g => V.stormCols48(Math.round((3 - g) * 20))), [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5], "from gap 2.75 down to 0");
  assert.deepEqual(Array.from({ length: 41 }, (_, i) => V.stormCols48(i)).map((c, n) => c === Math.ceil(n * 7 / 100)), Array(41).fill(true));
  for (const g of [0.2, 0.45, 1.65, 2.95]) assert.ok(Number.isInteger(Math.ceil((3 - g) * K[48])) && Math.ceil((3 - g) * K[32]) > 0, "a whole number of columns at gap " + g);
});
test("generator 2 is integer only, by source", () => {
  const a = MODULE_SRC.indexOf("// ---- generator 2 (integer only) ----\n"), b = MODULE_SRC.indexOf("// ---- end generator 2 ----\n");
  assert.ok(a > 0 && b > a, "the generator 2 markers");
  const code = blank(MODULE_SRC.slice(a, b));
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
    else if (q.kind === "decal" && q.set === "grass") c = x < q.w / 2 ? G2_ : ROCK_;   // a mixed piece: grass on its west half, rock on its east
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
    if (/lawn/.test(ground.id) && t.layers.length === 2) for (let k = 0; k < 48 * 48; k++) { if ((k % 48) < sl.w) assert.equal(px[k], ((k % 48) + sl.sx + ((k / 48) | 0)) % 2 ? G2_ : 48, "pixel " + k); else assert.equal(px[k], G2_, "beyond a side wall's slice " + k); } });
  assert.ok(seen.size > 0, "shadow tiles on a place under a face");
  // receivers are lawn-ground tiles only: never terrain (but a side wall's open strip, which takes its slice), water or sand
  L.tiles.forEach((t, i) => { if (t.layers.some(l => /^t\/shadow\//.test(l.id))) assert.ok(lay.terr[i] === TERR_.SIDE || (!lay.terr[i] && [T_.GRASS, T_.TALL, T_.FLOWERS, T_.ROCK, T_.TRUNK, T_.REEDS].includes(lay.tiles[i])), "a receiver"); });
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
  // the catalogue keeps the margins apart: set water and the lawn macros, set water-sand and the sand-margin macros, never mixed
  for (const q of ["nw", "ne", "se", "sw"]) { for (const st of ["fill", "edgeh", "edgev", "outer", "inner"]) { assert.ok(cat.water[q][st].length === 2 && cat.water[q][st].every(p => p.set === "water"), q + st); assert.ok(cat.waterSand[q][st].length === 2 && cat.waterSand[q][st].every(p => p.set === "water-sand"), q + st + " sand"); }
    for (const r of [42, 60]) { assert.ok(cat.waterMacro[q][r].length === 2 && cat.waterMacro[q][r].every(p => p.set == null), q + r); assert.ok(cat.waterMacroSand[q][r].length === 2 && cat.waterMacroSand[q][r].every(p => p.set === "sand-margin"), q + r + " sand"); } }
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
  // species 0 idle: the opaque box inside its 32 px sprite (the signed token's own), so (8, 16) on from the cell's corner
  const art = p.run("creatureArt(0, 'idle', 0)"); assert.deepEqual([art.w, art.h], [32, 32]);
  let c0 = 99, c1 = -1, r0 = 99, r1 = -1; for (let i = 0; i < art.p.length; i++) if (art.p[i] >= 0) { const x = i % art.w, y = (i / art.w) | 0; c0 = Math.min(c0, x); c1 = Math.max(c1, x); r0 = Math.min(r0, y); r1 = Math.max(r1, y); }
  assert.deepEqual([x0 - ox, x1 - ox, y0 - oy, y1 - oy], [8 + c0, 8 + c1, 16 + r0, 16 + r1], "the changed pixels' box in cell coordinates");
});

// ---- golden frames: FNV of the 450×600 screen ----
// The 32 px frames were captured from main's page with this harness (the cave, a place with no atlas, the reach view): the same
// hashes here prove the 48 px work left 32 px byte-identical. The 48 px frames are on the synthetic set (so they do not move with the art).
const MAIN_FRAMES = { cave: 1205165258, place32: 1284530620, map: 3135324483 };   // main 92b58bf8 (unchanged by the later main commits), captured from its own page with this harness
const GOLDEN48 = { faceStair: 2997770219, gen1: 414766699, corner: 1650250194 };   // re-captured on the merge: the top bar, the bottom line, the signed creature art and no brackets when facing nothing are main's
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

test("the warned-tile card in a 48 px place shows the cell's sprite box (columns 8–39, rows 16–47): the 48 px tile, the stone at the card's origin, the place's tables left as found", () => {
  const p = place48(7, 176, 14, 14); frame48(p); assert.equal(p.run("RT.ts"), 48);
  const key = p.run("S.exp.patch.key");
  const st = p.run(`(() => { const lay = layout(${JSON.stringify(key)}), P = S.exp.patch; let f = lay.feats.find(q => q.kind === 'k'); if (!f) { f = { kind: 'k', id: 'zz', x: P.x + 1, y: P.y, ch: 0 }; lay.feats.push(f); } return { x: f.x, y: f.y }; })()`);
  p.run("unveiled = () => true; globalThis.__t48 = 0; globalThis.__tp = 0; globalThis.__b = []; { const t0 = tile48; tile48 = function () { __t48++; return t0.apply(this, arguments); }; const t1 = tilePB; tilePB = function () { __tp++; return t1.apply(this, arguments); };"
    + " const s0 = stoneArt; stoneArt = function () { globalThis.__stone = s0.apply(this, arguments); return __stone; }; const d0 = g.drawImage; g.drawImage = function (c, x, y) { __b.push([x, y]); return d0.apply(this, arguments); }; } RT.remap = REMAP;");
  p.run(`PIC.warn(100, 200, { key: ${JSON.stringify(key)}, x: ${st.x}, y: ${st.y} })`);
  assert.equal(p.run("__t48 + ',' + __tp"), "1,0", "the 48 px tile, not the 32 px one");
  assert.equal(p.run("JSON.stringify(__b.slice(0, 2))"), "[[92,184],[100,200]]", "the tile is drawn 8 left and 16 up of the slot, the stone at the slot's origin: the sprite box is the slot");
  const art = p.run("__stone"); let low = -1; for (let i = 0; i < art.p.length; i++) if (art.p[i] >= 0) low = Math.max(low, (i / art.w) | 0);
  assert.ok(low >= 0 && low + 16 <= 47, "the stone's lowest row (sprite row " + low + ", cell row " + (low + 16) + ", card y + " + (8 + low) + ") is inside the sprite box, not cut off");
  assert.equal(p.run("RT.remap === REMAP"), true, "the tables are left as they were");
  assert.equal(p.run("placeLightFn(S.exp.patch, layout(S.exp.patch.key)).ts"), 48);
});

// ---- the edges at 48: coverage fades, the storm step, the place's own tables ----
const BAYER_ = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// The eighth rule from its definition, independent of src/view.mjs: brute force over a 12 px grid with the exact disc (a far eighth within 8 cells keeps a cell out of the core,
// a core cell within 8 opens it), cut-only, and the quarter look for a near tile the opening empties. `far(x, y)` is the tile far bit (off the place: not far).
const NB8_ = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
function refGrid(far, w = 28, h = 32, noFallback = false) {
  const tf = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tf[y * w + x] = far(x, y) ? 1 : 0;
  const EW = 4 * w, EH = 4 * h, E0 = (x, y) => tf[(y >> 2) * w + (x >> 2)], within = (x, y, f) => { for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { if (dx * dx + dy * dy > 64) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < EW && Y < EH && f(X, Y)) return true; } return false; };
  const core = new Uint8Array(EW * EH), out = new Uint8Array(EW * EH);
  for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) core[y * EW + x] = !E0(x, y) && !within(x, y, (X, Y) => E0(X, Y) === 1) ? 1 : 0;
  for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) out[y * EW + x] = E0(x, y) || !within(x, y, (X, Y) => core[Y * EW + X] === 1) ? 1 : 0;
  const emptied = [];
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) { if (tf[ty * w + tx]) continue; let all = true; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (!out[(4 * ty + j) * EW + 4 * tx + i]) all = false;
    if (!all) continue; emptied.push([tx, ty]); if (noFallback) continue;
    const f = (x, y) => x >= 0 && y >= 0 && x < w && y < h && tf[y * w + x] === 1, guard = f(tx, ty - 1) && f(tx + 1, ty) && f(tx, ty + 1) && f(tx - 1, ty);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) out[(4 * ty + j) * EW + 4 * tx + i] = !guard && f(tx + (i >> 1 ? 1 : -1), ty) && f(tx, ty + (j >> 1 ? 1 : -1)) ? 1 : 0; }
  out.emptied = emptied; return out; }
// Whether each pixel of tile (tx, ty) takes the far side, by the 5 × 5 samples (±6 px, 3 px apart) over the eighth grid G of refGrid.
function wantFar(G, tx, ty) {
  const e = (ex, ey) => ex >= 0 && ey >= 0 && ex < 112 && ey < 128 ? G[ey * 112 + ex] : 0, out = new Uint8Array(2304);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { let c = 0;
    for (const oy of [-6, -3, 0, 3, 6]) for (const ox of [-6, -3, 0, 3, 6]) c += e(4 * tx + Math.floor((x + ox) / 12), 4 * ty + Math.floor((y + oy) / 12));
    out[y * 48 + x] = 32 * c > (2 * BAYER_[(y & 3) * 4 + (x & 3)] + 1) * 25 ? 1 : 0; }
  return out; }
const noPuffs = p => p.run("puffArt = () => new PB(1, 1)");   // the fog's drifting texture is drawn over the fogged area
test("48 px edges: an eighth's dither (all 512 masks) equals its definition; a straight boundary, a rounded corner, whole near and far eighths", () => {
  const want = m => { const far = (dx, dy) => dx === 0 && dy === 0 ? (m >> 8) & 1 : (m >> NB8_.findIndex(([a, b]) => a === dx && b === dy)) & 1, f = new Uint8Array(144);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { let c = 0; for (const oy of [-6, -3, 0, 3, 6]) for (const ox of [-6, -3, 0, 3, 6]) c += far(Math.floor((x + ox) / 12), Math.floor((y + oy) / 12));
      f[y * 12 + x] = 32 * c > (2 * BAYER_[(y & 3) * 4 + (x & 3)] + 1) * 25 ? 1 : 0; } return f; };
  assert.deepEqual(V.BAYER4, BAYER_);
  for (let m = 0; m < 512; m++) assert.deepEqual(Array.from(V.coverE(m)), Array.from(want(m)), "mask " + m);
  assert.equal(V.coverE(7), V.coverE(7), "the table is built once");
  assert.ok(V.coverE(0).every(v => v === 0) && V.coverE(511).every(v => v === 1));
  const w = V.coverE(0xe0);   // the west column of eighths far, the eighth itself near: from 6 px in, every pixel is near
  for (let y = 0; y < 12; y++) for (let x = 6; x < 12; x++) assert.equal(w[y * 12 + x], 0, "inside the near eighth at " + x + "," + y);
  assert.ok(w.some(v => v === 1) && w.some((v, i) => (i % 12) < 6 && v === 0), "the dither lies across the boundary, one eighth wide");
  const c = V.coverE(0x002);   // only the NE eighth far: a rounded patch gathering at the corner
  let corner = 0; for (let y = 0; y < 3; y++) for (let x = 9; x < 12; x++) corner += c[y * 12 + x]; assert.ok(corner > 0 && corner < 9, "far pixels gather at the corner: " + corner); assert.equal(c[11 * 12], 0);
});
test("48 px edges: the eighth grid equals its definition on random shapes and the sight discs; it is cut-only; a thin region falls back to the quarter look; a disc loses at most 8 of a tile's 16 eighths", () => {
  let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
  const shapes = [], blob = (n, k) => { const cx = Array.from({ length: k }, () => [rnd() * 28, rnd() * 32, 1.5 + rnd() * 4]); return (x, y) => !cx.some(([a, b, r]) => (x - a) ** 2 + (y - b) ** 2 <= r * r); };
  for (let n = 0; n < 6; n++) shapes.push(blob(n, 2 + n));
  shapes.push((x, y) => Math.hypot(x - 14, y - 16) > 4.5, (x, y) => Math.hypot(x - 14, y - 16) > 6.5, (x, y) => Math.hypot(x - 1, y - 1) > 6.5, (x, y) => x < 12 || x > 12, (x, y) => x < 12 || x > 16, (x, y) => !(x === 12 && y === 10));
  for (const far of shapes) {
    const tf = new Uint8Array(896); for (let y = 0; y < 32; y++) for (let x = 0; x < 28; x++) tf[y * 28 + x] = far(x, y) ? 1 : 0;
    const got = V.eighthGrid(tf, 28, 32), want = refGrid(far);
    assert.deepEqual(Array.from(got), Array.from(want));
    for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 28; tx++) if (tf[ty * 28 + tx]) for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) assert.equal(got[(4 * ty + j) * 112 + 4 * tx + i], 1, "a hidden tile's eighths are all far"); }
  const count = (far, tx, ty, grid) => { let n = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) n += grid[(4 * ty + j) * 112 + 4 * tx + i]; return n; };
  for (const [sight, cx, cy] of [[4, 14, 16], [6, 14, 16], [4, 1, 1], [6, 1, 1]]) { const far = (x, y) => 4 * ((x - cx) ** 2 + (y - cy) ** 2) > (2 * sight + 1) ** 2, g = refGrid(far); let centre = 0;
    for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 28; tx++) if (!far(tx, ty)) { assert.ok(count(far, tx, ty, g) <= 8, "sight " + sight + ": tile " + tx + "," + ty + " loses at most 8 eighths"); if (g[(4 * ty + 1) * 112 + 4 * tx + 1] || g[(4 * ty + 2) * 112 + 4 * tx + 2]) centre++; }
    assert.equal(g.emptied.length, 0, "no tile of the disc is emptied"); }
  const col = n => (x, y) => !(x >= 12 && x < 12 + n), one = refGrid(col(1), 28, 32, true), five = refGrid(col(5), 28, 32, true);
  assert.ok(one.emptied.length === 32 && five.emptied.length === 0, "a corridor 1 wide is emptied by the opening, 5 wide keeps every tile: " + one.emptied.length + ", " + five.emptied.length);
  const fb = V.eighthGrid(Uint8Array.from({ length: 896 }, (_, k) => col(1)(k % 28, (k / 28) | 0) ? 1 : 0), 28, 32);   // the fallback: a 1-wide corridor takes quarterFar's look (here: all near)
  for (let ty = 0; ty < 32; ty++) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) assert.equal(fb[(4 * ty + j) * 112 + 48 + i], 0, "a corridor tile draws near by its quarters");
});
test("48 px edges: a quarter of a tile is far where its tile is far, or where both sides meeting at its corner are far unless the tile is boxed in (a lone tile stays whole)", () => {
  for (let m8 = 0; m8 < 256; m8++) for (const own of [0, 1]) { const q = V.quarterFar(own, m8), bit = b => (m8 >> b) & 1, boxed = bit(0) && bit(2) && bit(4) && bit(6);
    const want = own ? 15 : boxed ? 0 : (bit(0) & bit(6)) | ((bit(0) & bit(2)) << 1) | ((bit(4) & bit(6)) << 2) | ((bit(4) & bit(2)) << 3);
    assert.equal(q, want, "own " + own + " m8 " + m8); }
});
test("48 px edges: a veiled column beside the lifted view draws each pixel on the far side exactly where the eighth rule says; a lone unveiled tile falls back to its quarters and draws whole", () => {
  const p = place48(7, 176, 14, 14, "layout(S.exp.patch.key).svy = new Uint8Array(PW * PH).fill(1); S.veil[S.exp.patch.key] = new Array(PH).fill(0); unveilRound(S.exp.patch.key, 14, 14, 4); layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;");
  const px = frame48(p), key = p.run("S.exp.patch.key"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), W_ = p.run("SCR_W"), vy = p.run("VIEW_Y");
  const uv = (x, y) => p.run(`unveiled('${key}', ${x}, ${y})`), far = (x, y) => x >= 0 && y >= 0 && x < 28 && y < 32 && !uv(x, y), G = refGrid(far);
  let checked = 0, edge = 0;
  for (let ty = 10; ty <= 16; ty++) for (let tx = 10; tx <= 18; tx++) {   // whole tiles in view, above the message box
    const f = wantFar(G, tx, ty), mixed = f.some(v => v) && f.some(v => !v);
    if (Math.max(Math.abs(tx - 14), Math.abs(ty - 14)) <= 1) continue;   // the pawn and what it faces
    if (p.run(`(() => { const l = layout('${key}'); for (let dy = -1; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) { const t = l.tiles[(${ty} + dy) * PW + ${tx} + dx]; if (t === T.REEDS || t === T.TRUNK) return true; } return false; })()`)) continue;   // a reed or a canopy draws over it
    if (p.run(`layout('${key}').tiles[${ty * 28 + tx}] === T.WATER`)) continue;
    const pb = p.run(`tile48(layout('${key}'), ${ty * 28 + tx}, 0)`), sx = tx * 48 - cam.x, sy = vy + ty * 48 - cam.y;
    if (mixed) edge++;
    let ok = true; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const c = pb.p[y * 48 + x]; if (c < 0) continue;
      const farC = BAYER_[(y & 3) * 4 + (x & 3)] < 4 ? p.run("C.night") : p.run(`DARK[${c}]`), got = px[(sy + y) * W_ + sx + x];
      if (got !== (f[y * 48 + x] ? farC : c)) ok = false; }
    assert.ok(ok, "tile " + tx + "," + ty); checked++; }
  assert.ok(edge >= 4 && checked >= edge, "edge tiles checked: " + edge + " of " + checked);
  // a lone unveiled tile among veiled ones stays whole (the guard)
  const lone = place48(7, 176, 14, 14, "layout(S.exp.patch.key).svy = new Uint8Array(PW * PH).fill(1); S.veil[S.exp.patch.key] = new Array(PH).fill(0); S.veil[S.exp.patch.key][12] = 1 << 16; layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;");
  const lpx = frame48(lone), lkey = lone.run("S.exp.patch.key"), lcam = lone.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)");
  assert.equal(lone.run(`unveiled('${lkey}', 16, 12)`), true); assert.equal(lone.run(`unveiled('${lkey}', 15, 12) || unveiled('${lkey}', 17, 12) || unveiled('${lkey}', 16, 11) || unveiled('${lkey}', 16, 13)`), false);
  const lpb = lone.run(`tile48(layout('${lkey}'), ${12 * 28 + 16}, 0)`), lx = 16 * 48 - lcam.x, ly = vy + 12 * 48 - lcam.y; let whole = 0, n = 0;
  let centre = 0; for (let i = 0; i < 2304; i++) { const c = lpb.p[i]; if (c < 0) continue; n++; const same = lpx[(ly + ((i / 48) | 0)) * W_ + lx + (i % 48)] === c; if (same) whole++; const x = i % 48, y = (i / 48) | 0; if (x >= 12 && x < 36 && y >= 12 && y < 36 && !same) centre++; }
  assert.equal(centre, 0, "the lone unveiled tile keeps its centre clear (the fallback to the quarter look); only the 6 px of dither at its sides are veiled"); assert.ok(whole > n * 0.6, "and most of it: " + whole + " of " + n);
});
test("48 px fog: every pixel of every fog-edge tile in view equals the eighth rule over the sight disc; a tile out of sight has no clear pixel more than 6 px in", () => {
  const p = place48(7, 176, 14, 14, "S.exp.fog = { x: 176 % MW + .5, y: Math.floor(176 / MW) + .5, r: 2.4, dx: 0, dy: 0, at: 0 }; layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].tf.length = 0; S.exp.live[S.exp.patch.key].fr.length = 0; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;");
  noPuffs(p); frame48(p, 2); p.clock.t += 600; const px = frame48(p, 3), key = p.run("S.exp.patch.key"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), W_ = p.run("SCR_W"), vy = p.run("VIEW_Y");
  assert.equal(p.run("RT.ts"), 48); assert.equal(p.run("sightR(layout(S.exp.patch.key))"), 4);
  const fog = p.run("PLACE_FOG"), inS = (x, y) => Math.hypot(x - 14, y - 14) <= 4.5, far = (x, y) => x >= 0 && y >= 0 && x < 28 && y < 32 && !inS(x, y), G = refGrid(far);
  let edge = 0, pixels = 0;
  for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 28; tx++) { const sx = tx * 48 - cam.x, sy = vy + ty * 48 - cam.y; if (sx < 0 || sx + 48 > W_ || sy < vy || sy + 48 > 480) continue;   // above the message box
   
    if (Math.max(Math.abs(tx - 14), Math.abs(ty - 14)) <= 1) continue;   // the pawn and what it faces
    const f = wantFar(G, tx, ty); if (f.some(v => v) && f.some(v => !v)) edge++;
    if (p.run(`(() => { const l = layout('${key}'); for (let dy = -1; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) { const t = l.tiles[(${ty} + dy) * PW + ${tx} + dx]; if (t === T.REEDS || t === T.TRUNK) return true; } return false; })()`)) continue;
    const pb = p.run(`tile48(layout('${key}'), ${ty * 28 + tx}, 0)`);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const c = pb.p[y * 48 + x]; if (c < 0) continue;
      assert.equal(px[(sy + y) * W_ + sx + x], f[y * 48 + x] ? fog[c] : c, "tile " + tx + "," + ty + " pixel " + x + "," + y); pixels++; }
    // clear ground never lies more than 6 px into a tile the rule hides (the dither's reach)
    if (!inS(tx, ty)) for (let y = 6; y < 42; y++) for (let x = 6; x < 42; x++) assert.equal(f[y * 48 + x], 1, "a hidden tile's centre is fogged: " + tx + "," + ty); }
  assert.ok(edge > 12 && pixels > 20000, "fog-edge tiles " + edge + ", pixels " + pixels);
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
test("48 px storm on grass: a grass colour takes dark2 in the band, under the overcast and in the 6 px step; another colour keeps dark", () => {
  const setup = "layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;";
  const band = place48(7, 176, 14, 14, "S.exp.storm = { x: (176 % MW) - 3 - 1.25, dir: 1, w: 3, v: .25, t: 0 }; " + setup), over = place48(7, 176, 14, 14, "S.exp.storm = { x: (176 % MW) - 1, dir: 1, w: 3, v: .25, t: 0 }; " + setup);
  const ps = band.run("PLACE_STORM"), dk = band.run("DARK"), dk2 = band.run("DARK2");
  for (const c of [48, 49, 50, 51]) assert.equal(ps[c], dk2[c], "grass " + c + " takes dark2"); for (const c of [50, 51]) assert.notEqual(ps[c], dk[c], "and that differs from dark for " + c);
  for (const c of [6, 8, 52, 53]) assert.equal(ps[c], dk[c], "colour " + c + " keeps dark");
  const check = (p, tx, ty, want, what) => { const px = frame48(p), key = p.run("S.exp.patch.key"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), W_ = p.run("SCR_W"), vy = p.run("VIEW_Y");
    const pb = p.run(`tile48(layout('${key}'), ${ty * 28 + tx}, 0)`), sx = tx * 48 - cam.x, sy = vy + ty * 48 - cam.y; let grass = 0, n = 0;
    for (let i = 0; i < 2304; i++) { const c = pb.p[i]; if (c < 0) continue; const got = px[(sy + ((i / 48) | 0)) * W_ + sx + (i % 48)], w = want(c, i % 48, (i / 48) | 0); if (w === undefined) continue; n++; if (c >= 50 && c <= 51) grass++; assert.equal(got, w, what + " pixel " + i); }
    assert.ok(grass > 100 && n > 1000, what + ": grass pixels " + grass + " of " + n); };
  check(band, 12, 12, c => ps[c], "a band tile (the pawn's column minus two)");
  check(over, 14, 12, c => ps[c], "under the overcast");
  check(band, 13, 12, (c, x, y) => V.stormStep(x, x, y) ? ps[c] : c, "the lit tile beside the band (its 6 px step takes the storm table)");
  assert.equal(band.run("PLACE_STORM[50] === DARK2[50] && REMAP_PLACE[1] === PLACE_STORM && REMAP[1] === DARK"), true, "the band, the step and the overcast share one table; 32 px reads the core dark");
});
test("48 px fog edge: in the storm's band the clear side takes the band's dark (PLACE_STORM), as 32 px does, and outside the band it is lit", () => {
  const p = place48(7, 176, 14, 14, "S.exp.fog = { x: 176 % MW + .5, y: Math.floor(176 / MW) + .5, r: 2.4, dx: 0, dy: 0, at: 0 }; S.exp.storm = { x: (176 % MW) - 3 - 1.25, dir: 1, w: 3, v: .25, t: 0 }; layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;");
  frame48(p, 2); p.clock.t += 600; const px = frame48(p, 3), key = p.run("S.exp.patch.key"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), W_ = p.run("SCR_W"), vy = p.run("VIEW_Y");
  assert.equal(p.run("RT.ts"), 48); assert.equal(p.run("sightR(layout(S.exp.patch.key))"), 4);
  const storm = p.run("PLACE_STORM"), darkW = Math.ceil((3 - 1.25) * 1.5) * 48; assert.equal(darkW, 144);
  const inS = (x, y) => Math.hypot(x - 14, y - 14) <= 4.5, far = (x, y) => x >= 0 && y >= 0 && x < 28 && y < 32 && !inS(x, y), G = refGrid(far), seen = { band: 0, lit: 0 };
  for (let ty = 11; ty <= 17; ty++) for (let tx = 8; tx <= 20; tx++) {
    if (!inS(tx, ty)) continue; const f = wantFar(G, tx, ty); if (!f.some(v => v)) continue;
    const pb = p.run(`tile48(layout('${key}'), ${ty * 28 + tx}, 0)`), sx = tx * 48 - cam.x, sy = vy + ty * 48 - cam.y, band = tx * 48 + 24 - cam.x < darkW;
    if (sx < 0 || sx + 48 > W_) continue;
    const lay = p.run(`(() => { const l = layout('${key}'); for (let dy = -1; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) { const t = l.tiles[(${ty} + dy) * PW + ${tx} + dx]; if (t === T.REEDS || t === T.TRUNK) return false; } return true; })()`);
    if (!lay) continue;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const c = pb.p[y * 48 + x]; if (c < 0 || f[y * 48 + x]) continue;   // the clear side
      assert.equal(px[(sy + y) * W_ + sx + x], band ? storm[c] : c, "tile " + tx + "," + ty + " pixel " + x + "," + y); }
    seen[band ? "band" : "lit"]++; }
  assert.ok(seen.band >= 2 && seen.lit >= 2, "fog-edge tiles checked: " + JSON.stringify(seen));
  assert.ok(p.run("EDGE_TILE.size") > 0); p.run("atlasInstall(__syn.list, __syn.table, __syn.levelTone)"); assert.equal(p.run("EDGE_TILE.size"), 0, "a reinstall clears the edge canvases");
  assert.ok(Object.isFrozen(A.PLACE_RULES), "the runtime default rules cannot be changed");
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

test("48 px: a ford stone takes the place's fog and the storm's dark exactly as the water under it does (no exception for a prop)", () => {
  const FORD = [1, 2, 3].map(n => ({ name: "meadow/prop/ford-" + n, kind: "prop", type: "ford", w: 20, h: 14, offset: [14, 34], px: Int16Array.from({ length: 280 }, (_, i) => (i % 20 === 0 || i % 20 === 19 || i < 20 ? 10 : 9)) }));
  const mk = (px, py, setup) => { const p = place48g1(1, 28, px, py); p.ctx.__syn.list.push(...FORD.map(q => ({ ...q }))); p.run("atlasInstall(__syn.list, __syn.table, __syn.levelTone)");
    p.run(`${setup} layout(S.exp.patch.key).feats.length = 0; S.pods = []; S.exp.live[S.exp.patch.key].cr.length = 0; S.exp.live[S.exp.patch.key].pt = null;`); return p; };
  const lay0 = place48g1(1, 28, 14, 14).run("(() => Array.from(layout(S.exp.patch.key).tiles))()"), steps = lay0.map((t, i) => t === T_.STEP ? i : -1).filter(i => i >= 0); assert.ok(steps.length, "the ford place has stepping stones");
  const stx = 12, sty = 16; assert.ok(steps.includes(sty * 28 + stx));
  // the pixels a stone tile shows: every opaque pixel, the stone's and the water's, through one table
  const check = (p, px, tx, ty, table, f) => { const key = p.run("S.exp.patch.key"), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)"), W_ = p.run("SCR_W"), vy = p.run("VIEW_Y");
    const pb = p.run(`tile48(layout('${key}'), ${ty * 28 + tx}, 0)`), sx = tx * 48 - cam.x, sy = vy + ty * 48 - cam.y; assert.ok(sx >= 0 && sx + 48 <= W_ && sy >= vy && sy + 48 <= vy + 532, "the stone's tile is on screen");
    let stone = 0, water = 0, off = 0, fogged = 0;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const c = pb.p[y * 48 + x]; if (c < 0) continue; const isStone = x >= 14 && x < 34 && y >= 34 && y < 48 && (c === 9 || c === 10);
      if (isStone) { stone++; if (f && f[y * 48 + x]) fogged++; assert.notEqual(table[c], c, "the stone's colour changes under this table"); } else water++;
      if (px[(sy + y) * W_ + sx + x] !== (f && !f[y * 48 + x] ? c : table[c])) off++; }
    assert.ok(stone > 200 && water > 1000 && (!f || fogged > 50), "pixels checked: " + [stone, water, fogged]); assert.equal(off, 0, "the stone and the water under it are drawn through the same table"); };
  // fog: the pawn 5 tiles below the stone (the tile still whole on screen), beyond sight 4
  { const p = mk(stx, sty + 5, "S.exp.fog = { x: 28 % MW + .5, y: Math.floor(28 / MW) + .5, r: 2.4, dx: 0, dy: 0, at: 0 };"); noPuffs(p);
    assert.equal(p.run("sightR(layout(S.exp.patch.key))"), 4); frame48(p, 2); p.clock.t += 600; const px = frame48(p, 3);
    const inS = (x, y) => Math.hypot(x - stx, y - (sty + 5)) <= 4.5, far = (x, y) => x >= 0 && y >= 0 && x < 28 && y < 32 && !inS(x, y), f = wantFar(refGrid(far), stx, sty);
    check(p, px, stx, sty, p.run("PLACE_FOG"), f); }
  // storm: the stone's tile inside the band, dark
  { const p = mk(Math.min(27, stx + 3), sty, "S.exp.storm = { x: (28 % MW) - 3 - 1.25, dir: 1, w: 3, v: .25, t: 0 };"); const px = frame48(p), cam = p.run("camAt(viewOf(48, 0, VIEW_Y, SCR_W, VIEW_H), RT.pl.rx, RT.pl.ry)");
    assert.ok(stx * 48 + 24 - cam.x < 144, "the stone's tile is inside the band"); check(p, px, stx, sty, p.run("PLACE_STORM"), null); }
});

// ---- the view's edge cues: tabs, the Call's hold on the edge, the name tag's positions, the send hint in a place ----
// Each runs at ts 32 and at ts 48 through view.mjs (RT.ts), with motion reduced (the harness's matchMedia matches).
// A place on seed 1's spawn cell, no storm, no fog, the pawn mid-place, nothing else in it unless the test puts it there.
// At 48 the page draws the synthetic catalogue (each piece a solid fill, hash(name) % 40 + 4, with a 1 px ink border), so the place latches RT.ts = 48 itself.
const CUE_SYN = syntheticPieces().map(q => ({ ...q, fill: parseInt(fnvStr(q.name), 16) % 40 + 4 }));
function cuePlace(ts, opts = {}) {
  const p = page({}, undefined, { canvas: true, script: opts.script });
  if (ts === 48) p.run(`atlasInstall(${JSON.stringify(CUE_SYN)}.map(q => { const px = new Int16Array(q.w * q.h).fill(q.fill);
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (!x || !y || x === q.w - 1 || y === q.h - 1) px[y * q.w + x] = C.ink; return Object.assign(q, { px }); }), null, ${JSON.stringify(SYNTH_TONE)})`);
  p.run(`newWorld(1); startExpedition('weather', G.spawns[0]); S.exp.storm = null; S.exp.fog = null; S.exp.pt = ${opts.partner ? "{ id: 1, name: 'Dot', sp: 0, elder: false }" : "null"};
    enterPatch(); { const P = S.exp.patch; P.x = 14; P.y = 13; P.noise = 'creep'; } RT.pl = null; RT.key = null;
    S.pods = S.pods.filter(q => q.k !== S.exp.patch.key); curLive().cr = []; curLive().fr = []; curLive().strike = null; FX.msg = ''; FX.notes = []; FX.pulse = null; FX.cue = null; FX.rings = []; NOW = 5000; render(5);`);
  assert.equal(p.run("RT.ts"), ts, `the place draws at ${ts}`);
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
    p.run(`S.exp.fog = null; enterCave(); S.phase = 'patch'; curLive().cr = []; ${crt(5, 27, 1, "alert")} RT.key = null;`);
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
    const [t] = tabsOf(p), m = js(p, "msgGeom()");
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

  test(`cues at ${ts}: in a fog bank a find's tab reaches out to the Call's range with no sight test, while a creature 5 tiles away gets none`, () => {
    if (ts !== 48) return;   // 5 tiles sideways is still on screen at 32
    const p = cuePlace(ts);
    p.run("{ const c0 = cxy(S.exp.pos); S.exp.fog = { x: c0.x + .5, y: c0.y + .5, r: 3, dx: 0, dy: 0, at: 0 }; }");
    assert.equal(p.run("sightR(curLay())"), 4, "in a fog bank");
    p.run(`S.pods.push({ k: S.exp.patch.key, x: 19, y: 13, h: 1, g: 0, sp: 0, id: 'fp' }); ${crt(7, 9, 13, "approach")} callPlace();`);
    assert.equal(p.run("FX.cue.r"), 6, "muffled: the reach is 6");
    const tabs = tabsOf(p).filter(t => t.id === "f19,13");
    assert.deepEqual(tabsOf(p).filter(t => t.kind !== "find"), [], "no creature tab"); assert.deepEqual(tabs.map(t => t.kind), ["find"], "the pod 5 tiles east, beyond sight 4: a find tab; the '?' creature 5 tiles west: none");
    assert.equal(tabs[0].side, "E"); assert.equal(at(p.run("scr").px(), tabs[0].cx, tabs[0].cy - 11), p.run("C").cream, "cream border");
    p.run("S.exp.patch.x = 15"); p.run("RT.pl = null"); assert.equal(tabsOf(p).filter(t => t.id === "f19,13").length, 0, "walking within 4 tiles: the pod's tile is on screen, no tab");
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

  test(`cues at ${ts}: the name tag refuses a find (a pod, a stone, fruit, the crack) as it refuses a creature, never draws over one, and is not drawn when all five positions are refused`, () => {
    const p = cuePlace(ts, { partner: true }), h2 = ts >> 1;
    p.run("var SPOT = 'none'; const __dt = drawTag; drawTag = s => { SPOT = s; __dt(s); }; curLive().pt = { x: 14, y: 16, st: 'idle', face: 1 }; RT.pt = null; S.exp.ptTagUntil = 9; S.veil[S.exp.patch.key] = new Array(PH).fill(0x0fffffff);");
    const o = js(p, `sprOff(${ts})`), zx1 = Math.max(ts - 1, o.x + 29) + 4, H = o.y + p.run("tagTop(0)");
    const cell = () => { const pl = js(p, "RT.plScr"); return { x: pl.x - h2, y: pl.y - h2 + 3 * ts }; };   // the partner, 3 below the pawn
    const pod = (x, y, out) => `S.pods.push({ k: S.exp.patch.key, x: ${x}, y: ${y}, h: 0, g: 0, sp: 0, id: 'f${x}_${y}', out: ${out ? 1 : 0} });`;
    const stone = (x, y) => `layout(S.exp.patch.key).feats.push({ kind: 'k', id: 'zs${x}', x: ${x}, y: ${y} });`;
    const spot = () => { frameOf(p); return js(p, "SPOT"); };
    const cellPx = (f, c, dx, dy) => { const r = []; for (let y = -2; y < ts + 2; y++) for (let x = -2; x < ts + 2; x++) r.push(f[(c.y + dy * ts + y) * 450 + c.x + dx * ts + x]); return r; };
    const finds = [];   // [dx, dy] of each find relative to the partner's cell
    const sameWithoutTag = (s) => { const c = cell(), f = Int16Array.from(p.run("scr").px()); p.run("S.exp.ptTagUntil = 0;"); frameOf(p); const g = Int16Array.from(p.run("scr").px()); p.run("S.exp.ptTagUntil = 9;");
      for (const [dx, dy] of finds) assert.deepEqual(cellPx(f, c, dx, dy), cellPx(g, c, dx, dy), "find at " + dx + "," + dy + ": its pixels do not change with the tag"); };
    // 1: a pod on the cell below (outlined, as a Call or the partner's nose leaves it): the tag goes right
    p.run(pod(14, 17, true)); finds.push([0, 1]); let s = spot(), c = cell();
    assert.equal(s.panel.x - c.x, zx1 + 6, "a pod below: right, the panel's left edge at col " + (zx1 + 6)); assert.deepEqual(s.ptr, { x: c.x + zx1 + 1, y: c.y + h2 - 1, w: 5, h: 2 }); sameWithoutTag(s);
    // 2: and a creature right, a stone left: above
    p.run(crt(1, 15, 16, "idle") + stone(13, 16)); finds.push([-1, 0]); s = spot(); c = cell();
    if (ts === 48) assert.deepEqual([s.ptr.y - c.y, s.panel.y - c.y], [H - 9, H - 29], "a pod below, a creature right, a stone left: above");
    else assert.equal(s, null, "at 32 the creature's zone also meets the panel above");   // a 40 px name is wider than the 32 px cell
    sameWithoutTag(s);
    // 3: a tab over position 1 and a pod on the cell to the right: left
    p.run("curLive().cr = []; S.pods = []; layout(S.exp.patch.key).feats.length = 0;"); finds.length = 0;
    p.run(`edgeTabs = () => [{ kind: '!', cx: RT.plScr.x, cy: RT.plScr.y + 3 * ${ts} + ${Math.max(ts - 1, o.y + 33) + 4 + 12} - ${h2}, side: 'S', id: 'x' }];` + pod(15, 16, false)); finds.push([1, 0]);
    s = spot(); c = cell(); assert.equal(s.panel.x + s.panel.w - 1 - c.x, -10, "a tab below and a pod right: left"); sameWithoutTag(s);
    // 4: a fruit on the cell above as well as the rest: no tag
    p.run("edgeTabs = () => [];" + pod(14, 17, true) + crt(1, 15, 16, "idle") + stone(13, 16) + "curLive().fr.push({ x: 14, y: 15, put: 1 });"); finds.push([0, 1], [-1, 0], [0, -1]);
    assert.equal(spot(), null, "all five refused: no tag"); sameWithoutTag(null);
    // and it comes back when one clears
    p.run("curLive().fr.length = 0; curLive().cr = [];"); assert.ok(spot(), "a position clears: the tag is back");
    // the zone's size at 48: a find on the diagonal cell leaves a 40 px name below, and refuses a wider one
    if (ts === 48) { p.run("S.pods = []; layout(S.exp.patch.key).feats.length = 0; curLive().cr = [];" + pod(15, 17, false)); s = spot(); c = cell();
      assert.equal(s.panel.y - c.y, Math.max(ts - 1, o.y + 33) + 4 + 6, "a 40 px name: still below"); p.run("S.exp.pt.name = 'Bramblewick';"); s = spot(); c = cell();
      assert.notEqual(s.panel.y - c.y, Math.max(ts - 1, o.y + 33) + 4 + 6, "a wide name: not below over the diagonal find"); }
  });
}

test("the name tag in a cave at 32 px keeps off a seen crack's whole ring: its zone is 53 by 53 from 10 px outside the cell", () => {
  const p = cuePlace(32, { partner: true });
  p.run("var SPOT = 'none'; const __dt = drawTag; drawTag = s => { SPOT = s; __dt(s); }; S.phase = 'patch'; enterCave(); S.phase = 'patch'; RT.key = null; RT.pl = null;");
  assert.equal(p.run("curLay().cave"), true);
  p.run("{ const P = S.exp.patch, L = curLive(); P.x = 14; P.y = 13; L.cr = []; L.fr = []; L.pt = { x: 14, y: 16, st: 'idle', face: 1 }; RT.pt = null; S.exp.ptTagUntil = S.exp.actions + 9; L.seen.d = 1; curLay().feats.push({ kind: 'd', id: 'zd', x: 14, y: 17 }); S.veil[P.key] = new Array(PH).fill(0x0fffffff); FX.msg = ''; }");
  frameOf(p); const s = js(p, "SPOT"), pl = js(p, "RT.plScr"), cx = pl.x - 16, cy = pl.y - 16 + 3 * 32, zone = { x: cx - 10, y: cy + 32 - 10, w: 53, h: 53 };
  const meets = r => r.x < zone.x + zone.w && zone.x < r.x + r.w && r.y < zone.y + zone.h && zone.y < r.y + r.h;
  assert.ok(s, "a tag is drawn (right or left)"); assert.ok(!meets(s.ptr) && !meets(s.panel), "clear of the crack's zone");
  assert.ok(s.panel.y - cy < 32 + 4 + 6, "and not below it");
});
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

// ---- the Companion's screens that agree, and the shell's keys ----
// How a sprite sits on the drawn frame at (x, y): its opaque pixels counted (n) and those the frame differs on (off); `inside` limits the sprite's area.
function sprite(p, expr, x0, y0, inside = () => true) {
  const pb = p.run(expr), cv = pb.canvas(), sp = cv.px(), f = p.run("scr").px(), SW = p.run("SCR_W"); let n = 0, off = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const v = sp[y * cv.width + x]; if (v < 0 || !inside(x, y)) continue; n++; if (f[(y0 + y) * SW + x0 + x] !== v) off++; }
  return { n, off };
}
// A new world with one grown mibi with you; `rec` wraps the named page functions so their calls are recorded.
function world(seed = 1) {
  const p = page({}, undefined, { canvas: true });
  p.run(`newWorld(${seed}); S.mibis.push({ id: 1, name: 'Dot', sp: 0, born: -9, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }); S.carried = [1]; save();`);
  p.run("var __rec = []; function __wrap(n) { const f = globalThis[n]; globalThis[n] = function (...a) { const r = f.apply(this, a); __rec.push({ n, a, r }); return r; }; }");
  p.rec = (...names) => { for (const n of names) p.run(`__wrap(${JSON.stringify(n)})`); };
  p.calls = n => p.run(`__rec.filter(c => c.n === ${JSON.stringify(n)})`);
  p.clear = () => p.run("__rec.length = 0");
  p.key = k => p.run(`FX.lockUntil = 0; act(${JSON.stringify(k)})`);
  return p;
}
// Into the first place of a Weather expedition at the first glint, the pawn facing nothing (✓ is Wait).
function inPlace() {
  const p = world();
  p.key("confirm"); p.key("confirm"); assert.ok(p.run("S.exp"), "the expedition started");
  p.key("confirm"); assert.equal(p.run("S.phase"), "patch", "in a place");
  for (const d of ["down", "up", "left", "right"]) { if (p.run("patchAction() === NOTHING")) break; p.run(`S.exp.patch.face = ${JSON.stringify(d)}; S.exp.face = ${JSON.stringify(d)}`); }
  assert.equal(p.run("patchAction() === NOTHING"), true, "facing nothing: ✓ is Wait");
  return p;
}

test("the Call sign's line reads 'Call lifts the veil: finds show' and is 260 px at 2×", () => {
  const p = world(), l = "Call lifts the veil: finds show";
  assert.equal(p.run("SIGN_LINE.call"), l); assert.equal(p.run(`textW(${JSON.stringify(l)}, 2)`), 260);
  assert.doesNotMatch(PAGE, /The teal CALL button|CALL_HINT|shownMsg/);
});

test("start-pick header at T10: 'Expedition N' and the note, unclipped up to Expedition 999; Weather's bolt 4 px before the note", () => {
  const p = world();
  p.rec("text", "drawTop");
  for (const [type, revealed, note] of [["weather", false, "storm start"], ["deep", false, "pick a start"], ["deep", true, "any seen cell"]]) {
    for (const n of [1, 12, 999]) {
      p.run(`S.turn = 9; S.expN = ${n}; S.ui.type = '${type}'; S.ui.cur = G.spawns[0]; S.revealed.fill(0); ${revealed ? "S.revealed[G.spawns[0]] = 1;" : ""} S.phase = 'place'; FX.msg = '';`);
      p.clear(); p.run("render(0)");
      assert.equal(p.run("'T' + wTurn()"), "T10");
      const top = p.calls("drawTop")[0], rx = top.r, title = "Expedition " + n;
      assert.deepEqual([top.a[0], top.a[1]], [title, note], `${type} ${n}: the title drops its type word`);
      const drawn = p.calls("text").find(c => c.a[1] === rx && c.a[2] === 9);
      assert.equal(drawn && drawn.a[0], note, `${type} ${n}: the note unclipped`);
      const noteW = p.run(`textW(${JSON.stringify(note)}, 2)`), titleEnd = 10 + p.run(`textW(${JSON.stringify(title)}, 2)`);
      const bx = rx - noteW - 16, bolt = sprite(p, "ICON.bolt('mist')", bx, 8);
      if (type === "weather") { assert.ok(bolt.n > 40 && bolt.off === 0, `${n}: the mist bolt at (rx − noteW − 16, 8)`); assert.ok(bx > titleEnd + 4, `${n}: the bolt clears the title`); }
      else { assert.ok(bolt.off > 0, "Deep ground has no icon"); assert.ok(rx - noteW > titleEnd + 4, `${n}: the note clears the title`); }
    }
  }
  assert.doesNotMatch(PAGE, /dotted: storm start/);
});

test("bottom line in a place: the candidates keep the place name before the take kinds go; after a Call the name stays with Wait · Leave", () => {
  const p = inPlace(); p.run("FX.hintNote = null;");   // the first-place control hint would lead the middle; this test is about the usual words
  p.run("leftTotal = () => 2; takeKinds = () => ['charge', 'warm stone']; S.exp.patch && (curLay().land = curLay().land);");
  const land = p.run("LAND_NAME[curLay().land]"), L = p.run("lineFor()");
  assert.equal(L.ok, "Wait"); assert.equal(L.back, "Leave");
  const sv = p.run("placeState(curLay().cell)"), svN = p.run("placeState(curLay().cell, false, true)"), short = p.run("placeState(curLay().cell, true)");
  assert.match(sv, /2 to take: charge · warm stone$/); assert.match(svN, /2 to take$/);
  assert.deepEqual(JSON.parse(JSON.stringify(L.ctx)).map(c => c.replace("\x01", "")).map(c => c.replace(/ · (lull|overcast)$/, "")), [land + " · " + sv, land + " · " + svN, svN, short]);
  // after a Call, drawn: the name and the count stay (the kinds drop first)
  p.key("call"); p.run("S.phase = 'patch'; FX.msg = ''; leftTotal = () => 2; takeKinds = () => ['charge', 'warm stone'];");
  const L2 = p.run("lineFor()"); assert.equal(L2.ok, "Wait");
  // drawn, in a meadow ("meadow · not surveyed · 2 to take" is 276 px in the line's tight spacing, textWT, against 291 available): the name and the count stay, the kinds drop
  p.run("curLay().land = 0"); p.rec("text"); p.clear(); p.run("drawLine(lineFor())");
  const said = p.calls("text").map(c => c.a[0]).join("|");
  assert.match(said, /\|meadow · \|not surveyed · 2 to take$/, "the place name stays: " + said);
  // and whatever the land, a candidate with the name is drawn whenever it fits
  for (let k = 0; k < 4; k++) { p.run(`curLay().land = ${k}`); const c = p.run("lineFor().ctx[1]").replace("\x01", ""), fits = p.run(`textWT(${JSON.stringify(c)}, 2)`) <= 291;
    p.clear(); p.run("drawLine(lineFor())"); const d = p.calls("text").map(c => c.a[0]).join("");
    assert.equal(d.includes(p.run(`LAND_NAME[${k}]`)), fits, `${p.run(`LAND_NAME[${k}]`)}: the name drawn iff "${c}" fits`); }
});

test("focus brackets: none on the empty tile when ✓ is Wait; shown on a thing Confirm acts on", () => {
  const p = inPlace();
  p.rec("brackets"); p.clear(); p.run("FX.msg = ''; render(0)");
  const amber = p.run("C.amber"), f = p.run("frontOf(S.exp.patch)");
  const onFront = () => p.calls("brackets").filter(c => c.a[4] === amber && c.a[2] === c.a[3]);
  assert.equal(onFront().length, 0, "no brackets when ✓ is Wait");
  p.run("const __pa = patchAction; patchAction = () => ({ label: 'Take the pod', run: () => {} });"); p.clear(); p.run("render(0)");
  assert.equal(onFront().length, 1, "brackets on a thing Confirm acts on");
  assert.ok(f);
});

test("the fresh 'Your world' box draws its unseen cells from the map's fog layer, not flat night", () => {
  const p = world();
  p.run("S.revealed.fill(0); S.visited.fill(0); ensureMap(); scr.px().fill(-1); drawWorldInset(100, 100, 0, 6);");
  const f = p.run("scr").px(), fog = p.run("fogCv"), fp = fog.px(), SW = p.run("SCR_W"), MW_ = p.run("MW"), MH_ = p.run("MH"), CELL_ = p.run("CELL"), u = 6;
  let diff = 0, night = 0; const nightI = p.run("HEX.indexOf(C.night)"), N = MW_ * MH_ * u * u;
  for (let c = 0; c < MW_ * MH_; c++) for (let j = 0; j < u; j++) for (let i = 0; i < u; i++) {
    const x = 100 + (c % MW_) * u + i, y = 100 + Math.floor(c / MW_) * u + j, want = fp[(Math.floor(c / MW_) * CELL_ + Math.floor(j * CELL_ / u)) * fog.width + (c % MW_) * CELL_ + Math.floor(i * CELL_ / u)];
    const got = f[y * SW + x]; if (got !== want) diff++; if (got === nightI) night++; }
  assert.ok(diff <= N * 0.02, `the fog layer, cell for cell (${diff} of ${N} pixels differ: the pins, outposts and the last start draw over it)`);
  assert.ok(night < N * 0.5, "not a flat night square");
});

// ---- the shell ----
test("shell: no engravings, the brand line kept, the key icons in their inks, Call as built", () => {
  assert.doesNotMatch(PAGE, /class="engrave"|\.engrave\b/, "no engraving element or rule");
  assert.doesNotMatch(PAGE, />CONFIRM</);
  assert.match(PAGE, /<div class="brand">MINIATURE BEASTS<span>COMPANION<\/span><\/div>/, "the brand line on top stays");
  for (const k of ["Up", "Left", "Right", "Down", "Call", "Back", "Confirm"]) assert.match(PAGE, new RegExp(`aria-label="${k}"`), k + ": aria-label kept");
  assert.match(PAGE, /\.dpad \.key svg\{width:16px; height:16px; fill:#f4f1ec\}/, "pad ink");
  assert.match(PAGE, /\.dpad \.key\{[^}]*#3a3d42,#2e3136\)/, "pad cap base");
  assert.match(PAGE, /<footer class="build-foot" id="buildFoot">[^<]*<\/footer>/); assert.doesNotMatch(PAGE, /obsEl\.hidden = !on; [a-zA-Z]+\.hidden = !on;/, "the build footer is always shown, not tied to the Observer");
  assert.match(PAGE, /\.back\{[^}]*background:#33363b;/, "Back's cap");
  assert.match(PAGE, /\.back \.cap-ico\{background:#f4f1ec; mask: url\(shell\/cap-back-10mm\.png\) center \/ 36px 36px no-repeat luminance\}/, "Back's icon and ink");
  assert.match(PAGE, /\.confirm \.cap-ico\{background:#ffffff; mask: url\(shell\/cap-confirm-10mm\.png\) center \/ 36px 36px no-repeat luminance\}/, "Confirm's icon and ink");
  assert.match(PAGE, /\.confirm\{[^}]*var\(--orange\)/, "Confirm's cap as built");
  assert.match(PAGE, /\.call\{[^}]*#26b5a4[^}]*\}/, "Call's teal cap as built");
  assert.match(PAGE, /\.call svg\{width:26px; height:26px; stroke:#eafff9;/, "Call's icon as built");
  assert.match(PAGE, /aria-label="Call"><svg viewBox="0 0 26 26">/, "Call keeps its SVG");
});
test("shell: the Back and Confirm icons are the signed masters, byte for byte", () => {
  const man = JSON.parse(readFileSync(new URL("../../../art/device-buttons/caps/manifest.json", import.meta.url), "utf8"));
  for (const id of ["cap-back-10mm", "cap-confirm-10mm"]) {
    const e = man.find(m => m.id === id); assert.equal(e.status, "signed");
    const placed = readFileSync(new URL(`../shell/${id}.png`, import.meta.url)), master = readFileSync(new URL(`../../../art/device-buttons/caps/${id}.png`, import.meta.url));
    assert.equal(createHash("sha256").update(placed).digest("hex"), e.sha256, id + ": the manifest's hash");
    assert.ok(placed.equals(master), id + ": byte-identical to the master");
  }
});

test("Cargo's bottom line: a crate with room, the finds in the hold with the bay full; the menu's End row says what it does", () => {
  const p = world(); p.key("confirm"); p.key("confirm"); assert.ok(p.run("S.exp"), "an expedition");
  p.run("S.exp.pos = S.exp.start; S.phase = 'cargo';");
  assert.equal(p.run("canSend()"), true);
  const L = p.run("lineFor()"); assert.equal(L.ok, "End expedition");
  assert.deepEqual(JSON.parse(JSON.stringify(L.ctx)), ["seals a crate · the world turns", "seals a crate"]);
  assert.ok(p.run("textWT('seals a crate', 2)") <= 223, "the short form fits the slot");
  p.run("S.bay = [{}, {}, {}]"); assert.equal(p.run("lineFor().ctx"), "finds stay in the hold");
  assert.ok(p.run("textWT('finds stay in the hold', 2)") <= 223, "fits whole");
  assert.doesNotMatch(PAGE, /seals the hold · the world turns|shows what it seals/);
  assert.match(PAGE, /'shows what it does'/);
});

test("the Call sign never joins another message; it is spent only when it is drawn (not while the swap chooser covers the box), shown once, and never again", () => {
  const p = world(), l = "Call lifts the veil: finds show", c = "? · curious · it will come closer", spent = () => p.run("S.found.includes('callintro')");
  p.run(`S.phase = 'patch'; FX.notes = []; fxSign('call'); fxMsg(${JSON.stringify(c)}, 2); settleOnce();`);
  assert.equal(p.run("FX.msg"), l, "the sign alone; the other message waits"); assert.equal(p.run("FX.sign.sign"), "call"); assert.equal(spent(), true, "drawn in the place: spent");
  p.run("S.found = S.found.filter(k => k !== 'callintro' && k !== 'met:call'); FX.notes = []; S.ui.swap = { sel: 0 }; fxSign('call'); settleOnce();");
  assert.equal(spent(), false, "the chooser covers the box: not spent");
  p.run("S.ui.swap = null; settleOnce();"); assert.equal(spent(), true, "spent once drawn");
  p.run("FX.notes = []; fxSign('call');"); assert.equal(p.run("FX.notes.length"), 0, "never queued again");
  // in play: the first place shows it once
  const q = world(); q.key("confirm"); q.key("confirm"); q.key("confirm"); assert.equal(q.run("S.phase"), "patch");
  let shown = 0, was = false;
  for (let i = 0; i < 30; i++) { q.key(["left", "right", "up", "down"][i % 4]); const now = q.run("FX.msg === SIGN_LINE.call"); if (now && !was) shown++; was = was || now; }
  assert.ok(shown <= 1 && q.run("S.found.includes('callintro')") === true, "shown at most once more, and spent");
});
