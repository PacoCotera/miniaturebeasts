// Golden vectors for the seeded world: per generator and seed, a digest of the world (genWorld) and of its places (genPlace), hashed
// with the game's own hash(). Generator 1 has up to 11 places a seed; generator 2 up to 16 more, one per terrain side (placeKeys2).
// Not a suite: CI runs tests/world.test.mjs, which checks src/world.mjs against tests/world-vectors.json.
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
export function format(seedObjs, capturedFrom, gen2 = null) {
  const seedLine = d => "{ \"seed\": " + JSON.stringify(d.seed) + ", \"world\": " + JSON.stringify(d.world) + ", \"places\": [\n" +
    d.places.map(p => "  " + JSON.stringify(p)).join(",\n") + " ] }";
  return "{ \"format\": 1, \"hash\": " + JSON.stringify(HASH_NOTE) + ",\n  \"capturedFrom\": " + JSON.stringify(capturedFrom) +
    ", \"gens\": { \"1\": { \"seeds\": [\n" + seedObjs.map(seedLine).join(",\n") + "\n] }" +
    (gen2 ? ",\n  \"2\": { \"capturedFrom\": " + JSON.stringify(gen2.capturedFrom) + ", \"seeds\": [\n" + gen2.seeds.map(seedLine).join(",\n") + "\n] }" : "") + " } }\n";
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
  const api2 = await moduleApi(2);
  process.stdout.write(format(g1, stored.capturedFrom, { capturedFrom: headCommit(), seeds: SEEDS.map(s => seedDigest(api2, s)) }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main(process.argv.slice(2));
