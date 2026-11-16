// noise-time-1: times the world's fields (warp, fbm, fieldsAt, qCell) and digests every field value, in Node or in the small engine (quickjs-ng).
//   node engine-cut.mjs <outdir>
//   qjs --std <outdir>/prototypes/exploration/tools/noise-time.mjs -- [--mode=time|digest] [--seed=7]      (or: node <same file> --mode=...)
// time:   one JSON line: ms per step (cold, no cache), then a cold place, a warm place (neighbour of one made), the realm.
// digest: one JSON line of hashes over every value a field makes: the noise itself, fieldsAt over a spread of places for seeds 7, 13, 42, the realm's own fields, qCell of 50 places per seed.
import { warp, fbm, detail, subSeed } from "../../core/base/noise.mjs";
import { fieldsAt, rawRealm } from "../src/gen7/world.mjs";
import { realm7 } from "../src/gen7/region.mjs";
import { levelsOf, qCell, levelCell, CW, CH } from "../src/gen7/levels.mjs";

const inQjs = typeof globalThis.scriptArgs !== "undefined";
const args = inQjs ? globalThis.scriptArgs : process.argv;
const arg = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const MODE = arg("mode", "time"), SEED = Number(arg("seed", "7")), RUNS = Number(arg("runs", "5"));
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const mix = (h, v) => { h ^= v >>> 0; return Math.imul(h, 16777619) >>> 0; };
const mixF = (h, v) => { f64[0] = v; h = mix(h, u32[0]); return mix(h, u32[1]); };

// the realm's inland places, a fixed spread (the same list as land-digest.mjs)
const places = (seed, count) => { const o = []; for (let n = 0; n < count; n++) o.push([6 + ((n * 37 + seed * 11) % 66), 6 + ((n * 53 + seed * 7) % 86)]); return o; };

if (MODE === "digest") {
  const out = {};
  let hn = 2166136261;   // the noise functions over a grid of positions and seeds
  for (const s of [7, 13, 42, 99991, 2654435761]) for (let i = 0; i < 400; i++) {
    const px = (i * 7919) % 400000 - 200000, py = (i * 104729) % 400000 - 200000, w = warp(px, py, s, 12);
    hn = mix(hn, w.x); hn = mix(hn, w.y); hn = mix(hn, fbm(px, py, 5, 4, s)); hn = mix(hn, fbm(px, 2 * py, 3, 2, s)); hn = mix(hn, detail(i - 200, 3 * i - 300, s));
  }
  out.noise = hn;
  for (const s of [7, 13, 42]) {
    const at = fieldsAt(s); let h = 2166136261;
    for (let i = 0; i < 3000; i++) { const f = at(((i * 37) % 800) / 10 - 0.5 + (i % 7) / 13, ((i * 53) % 1000) / 10 - 0.5 + (i % 5) / 11);
      h = mixF(h, f.height); h = mixF(h, f.temperature); h = mixF(h, f.humidity); h = mixF(h, f.wildness); h = mixF(h, f.rockiness); }
    out[`at${s}`] = h;
  }
  { const raw = rawRealm(SEED); let h = 2166136261; for (const k of ["E", "M", "T", "F", "K"]) for (let c = 0; c < raw[k].length; c++) h = mixF(h, raw[k][c]); out.realmFields = h; }
  for (const s of [7, 13, 42]) {
    const L = levelsOf(realm7(s).realm); let all = 2166136261;
    for (const [X, Y] of places(s, 50)) { const q = qCell(L, X, Y); for (let i = 0; i < q.length; i++) all = mix(all, q[i]); }
    out[`q${s}`] = all;
  }
  console.log(JSON.stringify(out));
} else {
  // each step is timed cold (a fresh seed each repeat) over a fixed count, ms per 1000 calls
  const out = { engine: inQjs ? "qjs" : "node", seed: SEED };
  const timeIt = (n, fn) => { const t = []; for (let r = 0; r < RUNS; r++) { const t0 = now(); fn(r); t.push(now() - t0); } return +med(t).toFixed(1); };
  out.warp1000 = timeIt(0, (r) => { let s = 0; for (let i = 0; i < 1000; i++) s += warp(256 * i + 128, 256 * (i * 3) + 128, 12345 + r, 12).x; return s; });
  out.fbm4_1000 = timeIt(0, (r) => { let s = 0; for (let i = 0; i < 1000; i++) s += fbm(256 * i + 128, 256 * (i * 3) + 128, 5, 4, 777 + r); return s; });
  out.fieldsAt1000 = timeIt(0, (r) => { const at = fieldsAt(7 + r); let s = 0; for (let i = 0; i < 1000; i++) s += at(i / 13, i / 7).height; return s; });
  out.height1000 = timeIt(0, (r) => { const at = fieldsAt(7 + r); let s = 0; for (let i = 0; i < 1000; i++) s += at.height ? at.height(i / 13, i / 7) : at(i / 13, i / 7).height; return s; });
  out.wobble2oct1000 = timeIt(0, (r) => { let s = 0; for (let i = 0; i < 1000; i++) s += fbm(256 * i + 128, 256 * (i * 3) + 128, 3, 2, 555 + r); return s; });
  // the realm
  const t0 = now(); const R = realm7(SEED); out.realmMs = +(now() - t0).toFixed(0);
  const L = levelsOf(R.realm), X = 40, Y = 40;
  out.qCell25 = timeIt(0, (r) => { const L2 = levelsOf(realm7(SEED).realm); L2.q.clear(); for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) qCell(L2, X + i, Y + 10 * r + j); });
  // a cold place: the cell's 5 x 5 window of fields and every pass; then its east neighbour warm
  const cold = [], warm = [];
  for (let r = 0; r < RUNS; r++) { const cy = 12 + r * 6; let t = now(); levelCell(L, 30, cy); cold.push(now() - t); t = now(); levelCell(L, 31, cy); warm.push(now() - t); }
  out.coldPlaceMs = +med(cold).toFixed(0); out.warmPlaceMs = +med(warm).toFixed(0);
  console.log(JSON.stringify(out));
}
