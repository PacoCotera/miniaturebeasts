// Golden vectors for the seeded world: per generator and seed, a digest of the world (genWorld) and of its places (genPlace), hashed
// with the game's own hash(). Generator 1 has up to 11 places a seed; generator 2 up to 16 more, one per terrain side (placeKeys2).
// Not a suite: CI runs tests/world.test.mjs, which checks src/world.mjs against tests/world-vectors.json.
// The file also holds `view`: literal cases for src/view.mjs (the place camera and coordinates), each input with its output; and `atlas`:
// src/atlas.mjs on a fixed synthetic catalogue (stored in the file, so the vectors test the logic, not the art): literal cases, and
// an FNV-1a digest of every place's layers (generator 2 seeds 1, 7, 42 and generator 1 seed 7, both water frames).
//   node prototypes/exploration/tools/world-vectors.mjs                         the whole file from ../src/world.mjs, JSON to stdout:
//        gens["1"] is checked against the stored file and never re-captured (exits non-zero if it differs); gens["2"] is captured
//   node prototypes/exploration/tools/world-vectors.mjs --page <index.html>     generator 1 from that page's own script, run in a vm
//   node prototypes/exploration/tools/world-vectors.mjs --compare <index.html> [--seeds N]
//        both, for the 16 vector seeds and seeds 0..N-1 (default 1000); exits non-zero on any difference. The page mode is slow.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const SEEDS = [0, 1, 2, 3, 5, 7, 13, 42, 99, 1000, 31337, 65536, 123456789, 2147483647, 2147483648, 4294967295];
const HASH_NOTE = "hash() of src/world.mjs: FNV-1a 32 + murmur3 finaliser; H(name, values) = 8 hex digits";
const FEAT_EXTRA = ["full", "ch", "under"];

const hex = h => (h >>> 0).toString(16).padStart(8, "0");
const VECTORS_FILE = new URL("../tests/world-vectors.json", import.meta.url);

// The places of a world, in the fixed order; repeats and missing ones are dropped.
export function placeKeys(G, L, beacons, depots) {
  const N = G.land.length, keys = [];
  const lowest = pred => { for (let c = 0; c < N; c++) if (pred(c)) return c; return null; };
  const add = k => { if (k != null && !keys.includes(k)) keys.push(k); };
  const cellKey = c => c == null || c < 0 ? null : String(c);
  add(cellKey(G.spawns[0]));
  add(cellKey(G.gate));
  if (G.gate != null && G.gate >= 0) add("c" + G.gate);
  add(cellKey(G.deep));
  if (G.swim >= 0) add(String(G.swim));
  add(cellKey(lowest(c => G.ford[c] === 1)));
  add(cellKey(lowest(c => G.comp[c] && G.land[c] === L.POND)));
  add(cellKey(lowest(c => G.comp[c] && G.land[c] === L.WOOD)));
  add(cellKey(lowest(c => G.comp[c] && G.land[c] === L.ROCK && c !== G.gate && c !== G.deep)));
  add(cellKey(depots.length ? Math.min(...depots) : null));
  add(cellKey(beacons.length ? Math.min(...beacons) : null));
  return keys;
}

// Generator 2's extra places, after placeKeys: for each facing S, N, E, W, the lowest lower-side cell of a RAMP edge of that
// facing, then the lowest upper-side one; then the same for CLIFF edges. A drop faces where its lower side lies.
export function placeKeys2(G, L, beacons, depots, EDGE) {
  const keys = placeKeys(G, L, beacons, depots), W = 16;
  const add = c => { if (c != null && !keys.includes(String(c))) keys.push(String(c)); };
  for (const kind of [EDGE.RAMP, EDGE.CLIFF]) for (const facing of ["S", "N", "E", "W"]) {
    let lo = null, hi = null;
    for (let i = 0; i < G.edge.length; i++) {
      if (G.edge[i] !== kind) continue;
      const a = i >> 1, b = (i & 1) ? a + W : a + 1, f = (i & 1) ? (G.level[a] > G.level[b] ? "S" : "N") : (G.level[a] > G.level[b] ? "E" : "W");
      if (f !== facing) continue;
      const low = G.level[a] < G.level[b] ? a : b, high = low === a ? b : a;
      if (lo == null || low < lo) lo = low; if (hi == null || high < hi) hi = high;
    }
    add(lo); add(hi);
  }
  return keys;
}

// api: { hash, L, genWorld(seed) -> G, genPlace(G, seed, key) -> layout, beaconCells(G, seed) -> Set, depotCells(G, seed) -> Set }
export function worldDigest(api, G) {
  const H = (name, values) => hex(api.hash(name, ...values));
  const d = {
    keys: G.gen === 2 ? Object.keys(G).join(",") : Object.keys(G).filter(k => k !== "beacons" && k !== "depots").join(","),
    land: H("land", G.land), ford: H("ford", G.ford), island: H("island", G.island), comp: H("comp", G.comp),
    gate: G.gate, mouth: G.mouth, deep: G.deep === undefined ? null : G.deep, swim: G.swim,
    swimDir: G.swimDir == null ? null : G.swimDir, spawns: [...G.spawns], glow: [...G.glow],
  };
  if (G.gen === 2) Object.assign(d, { gen: G.gen, attempt: G.attempt, orient: G.orient, level: H("level", G.level), edge: H("edge", G.edge),
    cross: G.cross.map(e => e.c + ":" + e.side + ":" + e.kind) });
  return d;
}
export function placeDigest(api, lay, gen = 1) {
  const H = (name, values) => hex(api.hash(name, ...values));
  const stream = [];
  for (const f of lay.feats) {
    for (const k of Object.keys(f)) if (!["id", "kind", "x", "y", ...FEAT_EXTRA].includes(k)) throw new Error("unhashed feature field: " + k);
    stream.push("f", f.id, f.kind, f.x, f.y);
    for (const k of FEAT_EXTRA) {
      if (!Object.prototype.hasOwnProperty.call(f, k)) continue;
      const v = f[k];
      if (typeof v === "boolean") stream.push(k, v ? 1 : 0);
      else if (v === null) stream.push(k, "null");
      else if (typeof v === "string" || typeof v === "number") stream.push(k, v);
      else throw new Error("unhashable feature value: " + k);
    }
  }
  return {
    key: lay.key, cell: lay.cell, cave: lay.cave, land: lay.land, base: lay.base, spawnPt: [lay.spawnPt.x, lay.spawnPt.y],
    tiles: H("tiles", lay.tiles), shelter: H("shelter", lay.shelter), reach: H("reach", lay.reach), sdist: H("sdist", lay.sdist),
    feats: lay.feats.length, featsHash: H("feats", stream),
    ...(gen === 2 ? { terr: H("terr", lay.terr || new Uint8Array(lay.tiles.length)), tmask: H("tmask", lay.tmask || new Uint8Array(lay.tiles.length)),
      stairs: lay.stairs || [] } : {}),
  };
}
export function seedDigest(api, seed) {
  const G = api.genWorld(seed);
  const world = worldDigest(api, G);
  world.beacons = [...api.beaconCells(G, seed)];
  world.depots = [...api.depotCells(G, seed)];
  const keys = api.gen === 2 ? placeKeys2(G, api.L, world.beacons, world.depots, api.EDGE) : placeKeys(G, api.L, world.beacons, world.depots);
  const places = keys.map(key => placeDigest(api, api.genPlace(G, seed, key), api.gen || 1));
  return { seed, world, places };
}

export async function moduleApi(gen = 1) {
  const W = await import(new URL("../src/world.mjs", import.meta.url));
  return { gen, hash: W.hash, L: W.L, EDGE: W.EDGE, genWorld: s => W.genWorld(s, gen), genPlace: W.genPlace, beaconCells: W.beaconCells, depotCells: W.depotCells };
}
// The page's whole script in a vm with the browser stubbed (the stub of freeze.test.mjs's page()); its own genWorld,
// genPatch, genCave, beaconCells and depotCells, which read the page's globals G and S.
export function pageApi(file) {
  const PAGE = readFileSync(file, "utf8"), m = PAGE.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no classic <script> in " + file);
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const clock = { t: 1000, timers: [] }, store = {};
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
    matchMedia: () => ({ matches: true }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(m[1], ctx);
  const run = src => vm.runInContext(src, ctx);
  const P = run("({ hash, L, genWorld, genPatch, genCave, beaconCells, depotCells })");
  return {
    hash: P.hash, L: P.L,
    genWorld: seed => { run("S.seed = " + seed + "; layoutCache.clear();"); return P.genWorld(seed); },
    genPlace: (G, seed, key) => key[0] === "c" ? P.genCave(+key.slice(1)) : P.genPatch(+key),
    beaconCells: (G, seed) => P.beaconCells(seed),
    depotCells: (G, seed) => P.depotCells(seed),
  };
}

// One seed object per line; inside it, one line per place. capturedFrom is generator 1's; generator 2 carries its own.
export function format(seedObjs, capturedFrom, gen2 = null, view = null, atlas = null) {
  const seedLine = d => "{ \"seed\": " + JSON.stringify(d.seed) + ", \"world\": " + JSON.stringify(d.world) + ", \"places\": [\n" +
    d.places.map(p => "  " + JSON.stringify(p)).join(",\n") + " ] }";
  return "{ \"format\": 1, \"hash\": " + JSON.stringify(HASH_NOTE) + ",\n  \"capturedFrom\": " + JSON.stringify(capturedFrom) +
    ", \"gens\": { \"1\": { \"seeds\": [\n" + seedObjs.map(seedLine).join(",\n") + "\n] }" +
    (gen2 ? ",\n  \"2\": { \"capturedFrom\": " + JSON.stringify(gen2.capturedFrom) + ", \"seeds\": [\n" + gen2.seeds.map(seedLine).join(",\n") + "\n] }" : "") + " }" +
    (view ? ",\n  \"view\": [\n" + view.map(c => "  " + JSON.stringify(c)).join(",\n") + "\n]" : "") +
    (atlas ? ",\n  \"atlas\": { \"levelTone\": " + JSON.stringify(atlas.levelTone) + ",\n  \"catalogue\": [\n" + atlas.catalogue.map(c => "  " + JSON.stringify(c)).join(",\n") +
      "\n],\n  \"cases\": [\n" + atlas.cases.map(c => "  " + JSON.stringify(c)).join(",\n") + "\n],\n  \"places\": [\n" + atlas.places.map(c => "  " + JSON.stringify(c)).join(",\n") +
      "\n],\n  \"shadowGrid\": " + JSON.stringify(atlas.shadowGrid) + ",\n  \"noMacro\": " + JSON.stringify(atlas.noMacro) + ",\n  \"placesNoMacro\": [\n" + (atlas.placesNoMacro || []).map(c => "  " + JSON.stringify(c)).join(",\n") + "\n] }" : "") + " }\n";
}

// src/view.mjs's cases: a `view` argument is viewOf's five arguments, a `box` is the module's named box; the output is captured.
export const VIEW_CASES = [
  { name: "viewOf", fn: "viewOf", args: [48, 0, 32, 450, 532] },
  { name: "camAt at spawn", fn: "camAt", args: [{ view: [48, 0, 32, 450, 532] }, 672, 1392] },
  { name: "visTiles at spawn", fn: "visTiles", args: [{ view: [48, 0, 32, 450, 532] }, { x: 471, y: 1004 }] },
  { name: "camAt one step right", fn: "camAt", args: [{ view: [48, 0, 32, 450, 532] }, 720, 1392] },
  { name: "camAt two steps right", fn: "camAt", args: [{ view: [48, 0, 32, 450, 532] }, 768, 1392] },
  { name: "camAt mid-place", fn: "camAt", args: [{ view: [48, 0, 32, 450, 532] }, 624, 720] },
  { name: "camAt top-left corner", fn: "camAt", args: [{ view: [48, 0, 32, 450, 532] }, 0, 0] },
  { name: "camAt bottom-right corner", fn: "camAt", args: [{ view: [48, 0, 32, 450, 532] }, 1296, 1488] },
  { name: "camAt at 32 (today's value)", fn: "camAt", args: [{ view: [32, 0, 32, 450, 532] }, 448, 928] },
  { name: "tileScr", fn: "tileScr", args: [{ view: [48, 0, 32, 450, 532] }, { x: 471, y: 1004 }, 14, 29] },
  { name: "scrTile", fn: "scrTile", args: [{ view: [48, 0, 32, 450, 532] }, { x: 471, y: 1004 }, 201, 420] },
  { name: "sprOff 48", fn: "sprOff", args: [48] },
  { name: "sprOff 32", fn: "sprOff", args: [32] },
  ...[[609, 298], [513, 586], [225, -134], [417, 538], [-111, 394], [465, 154]].map(([bx, by]) =>
    ({ name: "edgePoint to " + bx + "," + by, fn: "edgePoint", args: [{ box: "ON_SCREEN" }, 225, 298, bx, by] })),
  ...[[4, 5], [5, 0], [0, -6]].map(([dx, dy]) =>   // the pawn on tile (13, 15) with the camera at (423, 478): its centre at (225, 298)
    ({ name: "tileOnScreen " + dx + "," + dy, fn: "tileOnScreen", args: [{ view: [48, 0, 32, 450, 532] }, { x: 423, y: 478 }, 13 + dx, 15 + dy, { box: "ON_SCREEN" }] })),
  // the 48 px edge rules: the coverage of a tile by its 9-bit far mask (the FNV of its 2304 bytes), the 6 px storm step over the 4 × 4 Bayer cell for each distance, the band's columns
  ...[0x100, 0x001, 0x002, 0x0ff, 0x1fe, 0x180].map(m => ({ name: "coverFar " + m.toString(16), fn: "coverFar", args: [m], digest: true })),
  ...[0, 1, 2, 3, 4, 5, 6].map(d => ({ name: "stormStep d=" + d, fn: "stormStep", each: Array.from({ length: 16 }, (_, i) => [d, i & 3, i >> 2]) })),
  { name: "stormCols48 over the gap 2.75 to 0", fn: "stormCols48", each: Array.from({ length: 12 }, (_, i) => [20 * (3 - (11 - i) / 4)]) },
];
export function viewArgs(V, args) { return args.map(a => a && a.view ? V.viewOf(...a.view) : a && a.box ? V[a.box] : a); }
// A case's output: the call's value; `each` is a list of argument lists (booleans as 0 and 1); `digest` is the FNV of a byte array.
export function viewOut(V, c) { const call = a => V[c.fn](...viewArgs(V, a));
  if (c.each) return c.each.map(a => { const r = call(a); return r === true ? 1 : r === false ? 0 : r; });
  const r = call(c.args); return c.digest ? fnv(Array.from(r).join(",")) : r; }
export function viewVectors(V) { return VIEW_CASES.map(c => ({ ...c, out: viewOut(V, c) })); }

// The synthetic catalogue: every list the layers read, with no corner-in and no shadow piece so the fallbacks run.
const SP = (name, kind, w, h, more = {}) => ({ name, status: "signed", kind, w, h, offset: [0, 0], ...more });
export function syntheticPieces() {
  const out = [];
  for (let i = 0; i < 4; i++) out.push(SP("t/lawn/" + i, "ground", 48, 48, { set: "lawn", variant: String(i) }));
  out.push(SP("t/sand/0", "ground", 48, 48, { set: "sand" }));
  for (let i = 0; i < 2; i++) out.push(SP("t/deep/" + i, "ground", 48, 48, { set: "deep", variant: String(i) }));
  for (const q of ["nw", "ne", "se", "sw"]) for (const st of ["fill", "edgeh", "edgev", "outer", "inner"]) for (const f of [1, 2]) out.push(SP("t/water/" + q + "-" + st + "-f" + f, "shore", 24, 24, { set: "water", quad: q, state: st, frame: f }));
  for (const q of ["nw", "ne", "se", "sw"]) for (const st of ["fill", "edgeh", "edgev", "edgev0", "outer", "outer0", "inner"]) out.push(SP("t/lip/" + q + "-" + st, "lip", 24, 24, { quad: q, state: st }));
  for (let i = 0; i < 3; i++) out.push(SP("t/face/w3/" + i, "face", 144, 96, { cells: [3, 2], variant: String(i) }));
  for (let i = 0; i < 2; i++) out.push(SP("t/face/w2/" + i, "face", 96, 96, { cells: [2, 2], variant: String(i) }));
  for (let i = 0; i < 2; i++) out.push(SP("t/face/w1/" + i, "face", 48, 96, { cells: [1, 2], variant: String(i) }));
  for (const sd of ["w", "e"]) for (let i = 0; i < 2; i++) out.push(SP("t/cap/" + sd + i, "cap", 48, 96, { cells: [1, 2], side: sd, variant: String(i) }));
  for (const [sd, w, ox] of [["e", 36, 0], ["w", 44, 4]]) {
    for (let i = 0; i < 3; i++) out.push(SP("t/side/" + sd + "/mid" + i, "side", w, 48, { side: sd, end: "none", offset: [ox, 0], variant: String(i) }));
    out.push(SP("t/side/" + sd + "/top", "side", w, 24, { side: sd, end: "top", offset: [ox, 0] }));
    out.push(SP("t/side/" + sd + "/foot", "side", w, 24, { side: sd, end: "foot", offset: [ox, 24] }));
    out.push(SP("t/side/" + sd + "/tail", "side", w, 96, { side: sd, end: "tail", offset: [ox, 0] }));
  }
  for (let i = 0; i < 2; i++) out.push(SP("t/stair/S" + i, "stair", 96, 96, { cells: [2, 2], facing: "S", variant: String(i) }));
  out.push(SP("t/stair/N", "stair", 96, 48, { cells: [2, 1], facing: "N" }), SP("t/stair/E", "stair", 96, 96, { cells: [2, 2], facing: "E" }), SP("t/stair/W", "stair", 96, 96, { cells: [2, 2], facing: "W" }));
  for (const [k, kind] of [["landing", "landing"], ["foot", "foot"], ["apron", "apron-top"]]) for (const part of [0, 1]) out.push(SP("t/" + k + "/" + "lr"[part], kind, 48, 48, { cells: [1, 1], part }));
  out.push(SP("t/prop/boulder-1", "prop", 33, 30, { type: "boulder" }), SP("t/prop/boulder-2", "prop", 43, 38, { type: "boulder" }));
  out.push(SP("t/prop/reeds-1", "prop", 54, 76, { type: "reeds" }), SP("t/prop/reeds-2", "prop", 56, 76, { type: "reeds" }));
  out.push(SP("t/prop/flowers-1", "prop", 43, 35, { type: "flowers" }), SP("t/prop/flowers-2", "prop", 46, 48, { type: "flowers" }));
  for (let i = 0; i < 2; i++) out.push(SP("t/decal/tall" + i, "decal", 12, 14, { set: "tall", variant: String(i) }));
  for (const [i, w, h] of [[0, 28, 35], [1, 19, 14], [2, 9, 7]]) out.push(SP("t/decal/grass/" + i, "decal", w, h, { set: "grass", variant: String(i) }));
  for (let i = 0; i < 2; i++) out.push(SP("t/rock/" + i, "material", 48, 48, { set: "rock", variant: String(i) }));
  for (const q of ["nw", "ne", "se", "sw"]) for (const r of [42, 60]) for (const f of [1, 2]) out.push(SP("t/macro/" + q + "-r" + r + "-f" + f, "shore-macro", 96, 96, { cells: [2, 2], quad: q, radius: r, frame: f }));
  for (const st of ["e", "s", "es", "c"]) out.push(SP("t/shadow/" + st, "shadow", 48, 48, { set: "cast", state: st }));
  for (const q of ["nw", "ne", "se", "sw"]) for (const st of ["fill", "edgeh", "edgev", "outer", "inner"]) out.push(SP("t/sandshore/" + q + "-" + st, "shore", 24, 24, { set: "sand", quad: q, state: st }));
  for (const q of ["nw", "ne", "se", "sw"]) for (const st of ["fill", "edgeh", "edgev", "outer", "inner"]) for (const f of [1, 2]) out.push(SP("t/watersand/" + q + "-" + st + "-f" + f, "shore", 24, 24, { set: "water-sand", quad: q, state: st, frame: f }));
  for (const q of ["nw", "ne", "se", "sw"]) for (const r of [42, 60]) for (const f of [1, 2]) out.push(SP("t/macrosand/" + q + "-r" + r + "-f" + f, "shore-macro", 96, 96, { cells: [2, 2], quad: q, radius: r, frame: f, set: "sand-margin" }));
  return out;
}
export const SYNTH_TONE = ["dark", "none", "light"];
// The digests captured before the shore macros, the face and water tones, the cast shadow, the reeds' stagger, generator 1's runs
// and the sand shore, kept checkable under the conditions they were
// captured with: the catalogue without its macro pieces, the old tone table, and those rules off.
export const NO_MACRO = { levelTone: ["none", "none", "light"], rules: { macros: false, faceTone: false, waterTone: false, shadow: false, reedStagger: false, g1Runs: false, sandShore: false, waterSand: false, darkShadow: false, grassDecals: false, sideShadow: false }, without: "shore-macro" };
export const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); };
// The literal cases: quarter states by mask, the lawn variants' top-left 4 × 3, the FACE run split for lengths 1–9 with both caps,
// and the exact decode.
export const ATLAS_CASES = [
  ...[[1, false], [0x41, false], [0x80, false], [0x14, false], [0x14, true]].flatMap(([m, z]) => ["nw", "ne", "se", "sw"].map(q => ({ name: "lipState " + m + " " + q + (z ? " zero" : ""), fn: "lipState", args: [m, q, z] }))),
  ...[1, 0x41, 0x80, 0x14].flatMap(m => ["nw", "ne", "se", "sw"].map(q => ({ name: "shoreState " + m + " " + q, fn: "shoreState", args: [m, q] }))),
  ...[4, 3, 2].map(n => ({ name: "lawnVariants top-left 4×3, n " + n, fn: "lawnVariants", args: [{ key: "hand" }, 1, n], crop: [4, 3] })),
  ...[
    ["a 4×4 water square in a 6×6 lawn grid", 6, 6, [[1, 1, 4, 4, 5]]],
    ["a 2×2 pond", 4, 4, [[1, 1, 2, 2, 5]]],
    ["a 4×4 square touching the grid's border", 6, 6, [[0, 0, 4, 4, 5]]],
    ["a block with a stepping stone", 4, 4, [[1, 1, 2, 2, 5], [2, 2, 1, 1, 12]]],
    ["a block with deep water", 4, 4, [[1, 1, 2, 2, 5], [1, 1, 1, 1, 13]]],
  ].map(([name, w, h, rects]) => ({ name: "shoreMacros " + name, fn: "shoreMacros", args: [{ grid: [w, h, rects] }, w, h] })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(len => ({ name: "faceRunSplit length " + len + " with both caps", fn: "faceRunSplit", args: [{ cat: true }, 7, "run", 0, len - 1, 2, 4] })),
  { name: "decodeExact one off-palette pixel", fn: "decodeExact", args: [[0, 0, 0, 255, 9, 9, 9, 255, 255, 0, 0, 255, 0, 0, 0, 0], 2, 2, [[0, 0, 0], [255, 0, 0]]] },
  { name: "decodeExact alpha 128", fn: "decodeExact", args: [[0, 0, 0, 128, 0, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0], 2, 2, [[0, 0, 0], [255, 0, 0]]] },
  { name: "decodeExact all exact", fn: "decodeExact", args: [[0, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0], 2, 2, [[0, 0, 0], [255, 0, 0]]] },
];
// A hand grid for the macro cases: lawn (0), with rects [x, y, w, h, code] laid over it in order.
const gridAt = ([w, h, rects]) => { const g = new Array(w * h).fill(0); for (const [x0, y0, rw, rh, code] of rects) for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) g[y * w + x] = code; return (x, y) => g[y * w + x]; };
// A case's output, as the vectors store it: plain data, piece objects by name.
export function atlasCaseOut(A, cat, c) {
  const args = c.args.map(a => a && a.cat ? cat : a && a.grid ? gridAt(a.grid) : a), r = A[c.fn](...(c.fn === "decodeExact" ? [Uint8Array.from(args[0]), ...args.slice(1)] : args));
  if (c.fn === "lawnVariants") { const [w, h] = c.crop; return Array.from({ length: h }, (_, y) => r.slice(y * 28, y * 28 + w)); }
  if (c.fn === "faceRunSplit") return r.map(o => [o.x, o.piece.name, o.j]);
  if (c.fn === "decodeExact") return { px: [...r.px], bad: r.bad };
  return r;
}
// The places the digests cover: generator 2 seeds 1, 7 and 42 and generator 1 seed 7, every place but caves.
export function atlasPlaces(W) {
  const out = [];
  for (const [gen, seed] of [[2, 1], [2, 7], [2, 42], [1, 7]]) {
    const G = W.genWorld(seed, gen), keys = gen === 2 ? placeKeys2(G, W.L, [...G.beacons.set], [...G.depots.set], W.EDGE) : placeKeys(G, W.L, [...W.beaconCells(G, seed)], [...W.depotCells(G, seed)]);
    for (const key of keys) if (key[0] !== "c") out.push({ gen, seed, key, G });
  }
  return out;
}
// The art director's proof place (the drop's meadow-drop-place.py): its layout ('1' plateau, 'F' face, '.' lawn,
// 'w' water) and, for every '.' cell, the shadow state the script picks (its lines 50–57: raised is '1' or 'F'; s when the north cell
// is 'F'; c when only the north-west is raised), transcribed here.
export const PROOF_GRID = ["..................", "...1111111........", "..111111111....11.", "..111111111...111.", "..FF1111111...FFF.", "..FF1111111...FFF.",
  "....11111FF.......", "....FFFFF.........", "....FFFFF.....www.", "..........wwwwwww.", ".....ssss.wwwwwww.", ".....ssssswwwwwww."];
export function proofStates(grid) {
  const at = (r, c) => (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length ? grid[r][c] : null), raised = (r, c) => at(r, c) === "1" || at(r, c) === "F", out = [];
  for (let r = 0; r < grid.length; r++) { let row = ""; for (let c = 0; c < grid[0].length; c++) {
    if (grid[r][c] !== ".") { row += " "; continue; } const e = raised(r, c - 1), s = at(r - 1, c) === "F";
    const st = e && s ? "es" : e ? "e" : s ? "s" : raised(r - 1, c - 1) ? "c" : null; row += st === null ? "-" : st === "es" ? "B" : st; } out.push(row); }
  return out;   // per cell: e, s, B (es), c, - (none), space (not a lawn cell)
}
export function atlasVectors(A, W, stored) {
  const catalogue = syntheticPieces(), cat = A.catalogue(catalogue, SYNTH_TONE);
  const cases = ATLAS_CASES.map(c => ({ ...c, out: atlasCaseOut(A, cat, c) }));
  const places = atlasPlaces(W).map(({ gen, seed, key, G }) => { const lay = W.genPlace(G, seed, key), level = G.level ? G.level[lay.cell] : null;
    return { gen, seed, key, level, fr0: fnv(JSON.stringify(A.placeLayers(lay, seed, cat, 0, level))), fr1: fnv(JSON.stringify(A.placeLayers(lay, seed, cat, 1, level))) }; });
  // the digests from before the macros and the face and water tones: kept as stored (with their conditions), never recaptured
  const placesNoMacro = stored && stored.atlas && (stored.atlas.placesNoMacro || stored.atlas.places);
  return { levelTone: SYNTH_TONE, catalogue, cases, places, noMacro: NO_MACRO, placesNoMacro, shadowGrid: { grid: PROOF_GRID, states: proofStates(PROOF_GRID) } };
}

function headCommit() {
  try { return execFileSync("git", ["rev-parse", "--short=8", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch (e) { return "unknown"; }
}

async function main(argv) {
  const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  if (opt("--compare")) {
    const n = +(opt("--seeds") || 1000), seeds = [...SEEDS, ...Array.from({ length: n }, (_, i) => i)];
    const mod = await moduleApi(), page = pageApi(opt("--compare"));
    const bad = []; let places = 0;
    for (const s of seeds) {
      const a = seedDigest(page, s), b = seedDigest(mod, s); places += a.places.length;
      if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(s);
    }
    console.log("compare: " + seeds.length + " seeds, " + places + " places, " + bad.length + " differ" + (bad.length ? " (first: " + bad.slice(0, 3).join(", ") + ")" : ""));
    process.exitCode = bad.length ? 1 : 0;
    return;
  }
  if (opt("--page")) { process.stdout.write(format(SEEDS.map(s => seedDigest(pageApi(opt("--page")), s)), headCommit())); return; }
  // Generator 1 is never re-captured: the module's digests must equal the stored ones, which are kept with their capturedFrom.
  const stored = JSON.parse(readFileSync(VECTORS_FILE, "utf8")), api1 = await moduleApi(1), g1 = SEEDS.map(s => seedDigest(api1, s));
  if (JSON.stringify(g1) !== JSON.stringify(stored.gens["1"].seeds)) { console.error("generator 1 differs from tests/world-vectors.json; it is never re-captured"); process.exitCode = 1; return; }
  // generator 2 keeps its stored capture (and its capturedFrom) while the module still gives the same digests
  const api2 = await moduleApi(2), g2 = SEEDS.map(s => seedDigest(api2, s)), same2 = stored.gens["2"] && JSON.stringify(g2) === JSON.stringify(stored.gens["2"].seeds);
  const V = await import(new URL("../src/view.mjs", import.meta.url)), A = await import(new URL("../src/atlas.mjs", import.meta.url)), W = await import(new URL("../src/world.mjs", import.meta.url));
  process.stdout.write(format(g1, stored.capturedFrom, { capturedFrom: same2 ? stored.gens["2"].capturedFrom : headCommit(), seeds: g2 }, viewVectors(V), atlasVectors(A, W, stored)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main(process.argv.slice(2));
