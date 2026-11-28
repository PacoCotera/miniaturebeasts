// Generator 7, layer 0: the world. Pure: no page state, DOM, storage, clock or Math.random.
// One realm seed, one land. Every value here is a function of the realm seed and a WORLD position (cell units; a cell's centre is its integer
// coordinate), never of a cell number or of the order things were made in. The realm is the atlas of 5 x 5 regions, 80 x 100 cells.
// A layer reads only the layers above it: the fields (height, temperature, humidity, wildness, rockiness) -> filled height and flow (Priority-Flood,
// Barnes, Lehman and Mulla 2014, on flatqueue) -> water, land, levels (fixed thresholds on a per-biome pull of the height), closed over the whole realm.
// The region layer (region.mjs) reads this and adds stairs, trails, set pieces and the checks. Nothing here re-seeds per cell.
import FastNoiseLite from 'fastnoise-lite';
import FlatQueue from 'flatqueue';
import { hash, clamp, MW, MH, L, G2, BIOME_GROUND } from '../logic/world.mjs';
import { slotBiome, ATLAS } from '../regions.mjs';
import { windGrid, gridAt, WIND, erodeHeight, spineRanges } from './shape.mjs';
import { planCuts } from './features.mjs';

export const RW = ATLAS * MW, RH = ATLAS * MH, NR = RW * RH;     // the realm in cells: 80 x 100
export const CW = 24, CH = 28;                                   // a place's tiles (the scheme's open style)
export const BLEND = 2;                                          // neighbouring regions blend over two cells at their shared border

// ---- the fields ----
// One FastNoiseLite per field, seeded from the realm seed and the field's name. Returns f(x, y) in -1..1.
// (noise-time-1) The field is read through simplex2(): the library's 2D OpenSimplex2 fractal (FBm or Ridged, weighted strength 0) with every operation in the same order, so the same double
// to the last bit, without the per-octave method dispatch and closures; the library supplies the seed, the fractal bounding and the gradient table. noise-time.mjs digests the values.
const SQRT3 = 1.7320508075688772935274463415059, F2 = 0.5 * (SQRT3 - 1), G2S = (3 - SQRT3) / 6;
const PX = 501125321, PY = 1136930381, C2A = 2 * (1 - 2 * G2S) * (1 / G2S - 2), C2B = -2 * (1 - 2 * G2S) * (1 - 2 * G2S), G2M = 2 * G2S - 1, G2N = G2S - 1, SCALE = 99.83685446303647;
function single(seed, x, y, G) {
  const i0 = Math.floor(x), j0 = Math.floor(y), xi = x - i0, yi = y - j0, t = (xi + yi) * G2S, x0 = xi - t, y0 = yi - t, i = Math.imul(i0, PX), j = Math.imul(j0, PY);
  let n0 = 0, n1 = 0, n2 = 0, h;
  const a = 0.5 - x0 * x0 - y0 * y0;
  if (a > 0) { h = Math.imul(seed ^ i ^ j, 0x27d4eb2d); h ^= h >> 15; h &= 254; n0 = a * a * (a * a) * (x0 * G[h] + y0 * G[h | 1]); }
  const c = C2A * t + (C2B + a);
  if (c > 0) { const x2 = x0 + G2M, y2 = y0 + G2M; h = Math.imul(seed ^ (i + PX) ^ (j + PY), 0x27d4eb2d); h ^= h >> 15; h &= 254; n2 = c * c * (c * c) * (x2 * G[h] + y2 * G[h | 1]); }
  if (y0 > x0) {
    const x1 = x0 + G2S, y1 = y0 + G2N, b = 0.5 - x1 * x1 - y1 * y1;
    if (b > 0) { h = Math.imul(seed ^ i ^ (j + PY), 0x27d4eb2d); h ^= h >> 15; h &= 254; n1 = b * b * (b * b) * (x1 * G[h] + y1 * G[h | 1]); }
  } else {
    const x1 = x0 + G2N, y1 = y0 + G2S, b = 0.5 - x1 * x1 - y1 * y1;
    if (b > 0) { h = Math.imul(seed ^ (i + PX) ^ j, 0x27d4eb2d); h ^= h >> 15; h &= 254; n1 = b * b * (b * b) * (x1 * G[h] + y1 * G[h | 1]); }
  }
  return (n0 + n1 + n2) * SCALE;
}
function simplex2(n, ridged) {
  const seed0 = n._Seed, freq = n._Frequency, oct = n._Octaves, lac = n._Lacunarity, gain = n._Gain, bound = n._FractalBounding, G = Float64Array.from(n._Gradients2D);
  return (px, py) => {
    let x = px * freq, y = py * freq; const t = (x + y) * F2; x += t; y += t;
    let sum = 0, amp = bound, seed = seed0;
    for (let o = 0; o < oct; o++) {
      const v = single(seed++, x, y, G);
      if (ridged) sum += (Math.abs(v) * -2 + 1) * amp; else sum += v * amp;
      x *= lac; y *= lac; amp *= gain;
    }
    return sum;
  };
}
export function noiseField(seed, tag, freq, fractal = 'FBm', octaves = 4) {
  const n = new FastNoiseLite(hash(seed, 'gen7', tag) | 0);
  n.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2); n.SetFrequency(freq);
  n.SetFractalType(FastNoiseLite.FractalType[fractal]); n.SetFractalOctaves(octaves); n.SetFractalGain(0.5);
  return simplex2(n, fractal === 'Ridged');
}
// The fields as one function of a world position: { height, temperature, humidity, wildness, rockiness }, each 0..1. The region samples it at cell
// centres; the place layer (G2) samples the very same function at every tile.
// The shape passes (shape.mjs) can each be switched off for the before-and-after measures (setShape); the game runs them all.
let SHAPE_ON = { erode: true, wind: true, spine: true };
export const shapeOn = () => SHAPE_ON;
export function setShape(over) { SHAPE_ON = { ...SHAPE_ON, ...over }; rawCache.clear(); windCache.clear(); }
const windCache = new Map();
// rain with the wind (world-f3a R3): half the humidity is today's noise, half a sweep of moisture across the realm's height from the west
function windOf(seed, core) {
  const key = seed + ':' + (SHAPE_ON.wind ? 1 : 0); let g = windCache.get(key); if (g) return g;
  const E = new Float64Array(NR), M0 = new Float64Array(NR);
  for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) { const f = core(X, Y, undefined); E[Y * RW + X] = f.height; M0[Y * RW + X] = f.humidity; }
  g = windGrid(spined(seed, E), M0, RW, RH);   // the wind meets the ranges where they are drawn
  if (windCache.size > 8) windCache.clear();
  windCache.set(key, g); return g;
}
// the height with its ranges drawn as spines (world-f3a R2); the raising height is estimated from the biomes' level shares
function spined(seed, E) {
  if (!SHAPE_ON.spine) return E;
  const tgt = slotBiomes(seed).map(biomeTargets), q = new Float64Array(tgt.length);
  for (let s = 0; s < tgt.length; s++) q[s] = quantile(slotCells(s).map(c => E[c]).sort((a, b) => a - b), clamp(tgt[s].lv[0] / 100, 0.04, 0.9));
  return spineRanges(E, blend(q), new Uint8Array(NR), RW, RH);
}
// the height of fieldsAt alone (the same number, the other fields not read): the realm's edge probe reads thousands of tiles
export function heightAt(seed) {
  const elev = noiseField(seed, 'elev', 1 / 13), ridge = noiseField(seed, 'ridge', 1 / 10, 'Ridged', 3), wx = noiseField(seed, 'warpx', 1 / 18, 'FBm', 2), wy = noiseField(seed, 'warpy', 1 / 18, 'FBm', 2);
  return (X, Y) => { const u = X + 4 * wx(X, Y), v = Y + 4 * wy(X, Y), r = ridge(u, v); return clamp(0.5 + 0.36 * elev(u, v) + 0.2 * r, 0, 1); };
}
export function fieldsAt(seed) {
  const elev = noiseField(seed, 'elev', 1 / 13), ridge = noiseField(seed, 'ridge', 1 / 10, 'Ridged', 3);
  const wx = noiseField(seed, 'warpx', 1 / 18, 'FBm', 2), wy = noiseField(seed, 'warpy', 1 / 18, 'FBm', 2);
  const moist = noiseField(seed, 'moist', 1 / 9, 'FBm', 3), wild = noiseField(seed, 'wild', 1 / 6, 'FBm', 3), temp = noiseField(seed, 'temp', 1 / 24, 'FBm', 2);
  let wind = null;
  const core = (X, Y, wn) => {
    const u = X + 4 * wx(X, Y), v = Y + 4 * wy(X, Y), r = ridge(u, v);   // the domain warp bends the ridges
    const height = clamp(0.5 + 0.36 * elev(u, v) + 0.2 * r, 0, 1), humidity = clamp(wn === undefined ? 0.5 + 0.5 * moist(X, Y) : 0.5 + WIND.GAIN * ((1 - WIND.MIX) * (0.5 + 0.5 * moist(X, Y)) + WIND.MIX * wn - 0.5), 0, 1);
    const temperature = clamp(0.5 + 0.5 * temp(X, Y) - 0.25 * Math.max(0, height - 0.6), 0, 1);   // the high ground is cooler
    const wildness = clamp(0.55 * humidity + 0.45 * (0.5 + 0.5 * wild(X, Y)) - 0.4 * Math.max(0, height - 0.72) - 0.25 * Math.max(0, 0.4 - temperature), 0, 1);
    return { height, temperature, humidity, wildness, rockiness: clamp((0.5 + 0.5 * r) * (height > 0.5 ? 1 : 0.55), 0, 1) };
  };
  return (X, Y) => { if (wind === null) wind = SHAPE_ON.wind ? windOf(seed, core) : false; return core(X, Y, wind ? gridAt(wind, RW, RH, X, Y) : undefined); };
}

// ---- the biomes' targets ----
// Land shares are today's BIOME_GROUND counts (cells of 320): wood, rock; level shares by rank; the water rules are the pull toward the biome's box:
// riv: a cell is river where the flow into it reaches this; lake: a filled depression deeper than this is a lake; pool: moisture above this holds a pool;
// pond: where land touches water and humidity is above this, it is pond edge; cap: the most a region's water takes of its cells (the walkable-cells floor).
const WATER = {
  mixed:    { cap: 0.08, riv: 100, lake: 0.24, pool: 9, pond: 0.38 },
  woods:    { cap: 0.08, riv: 100, lake: 0.24, pool: 9, pond: 0.34 },
  fells:    { cap: 0.08, riv: 100, lake: 0.24, pool: 9, pond: 0.5 },
  marsh:    { cap: 0.13, riv: 90, lake: 0.2, pool: 0.87, pond: 0.3 },
  downs:    { cap: 0.08, riv: 100, lake: 0.24, pool: 9, pond: 0.45 },
  thickets: { cap: 0.08, riv: 100, lake: 0.24, pool: 9, pond: 0.4 },
  tallwood: { cap: 0.08, riv: 100, lake: 0.24, pool: 9, pond: 0.36 },
  tarns:    { cap: 0.10, riv: 110, lake: 0.16, pool: 9, pond: 0.4 },
  meres:    { cap: 0.15, riv: 110, lake: 0.17, pool: 0.85, pond: 0.25 },
};
const LEVEL_SHARES = { mixed: G2.LV_PCT, marsh: [15, 35, 50], meres: [15, 35, 50] };   // the low belts keep a third level; the rest are today's
// map-levels-build-1 (change 1, owner 2026-11-19 "okay"): high ground is the exception. `lv[0]` is the share of a slot's dry cells kept low: the raise line sits at the 70% quantile (lowland is the base; hills, ranges
// and plateaus rise out of it), read by slotE0 and spined(). Today's 15% left 85% raised before water.
const RAISE_LINE = 70;
export const biomeTargets = biome => {
  const B = BIOME_GROUND[biome] || null, lv = LEVEL_SHARES[biome] || (B ? B.lv : G2.LV_PCT);
  return { wood: B ? B.wood : G2.WOOD_N, rock: B ? B.rock : G2.ROCK_N, lv: [RAISE_LINE, ...lv.slice(1)], ...WATER[biome] };
};

// ---- blending: a region's parameters are its own inside and blend over BLEND cells at each shared border ----
const sm = t => t * t * (3 - 2 * t);
function axisBlend(X, size, n) {
  const s = (X / size) | 0, l = X - s * size, dl = l + 0.5, dr = size - l - 0.5;
  if (dl < BLEND && s > 0) return [s, s - 1, 0.5 * (1 - sm(dl / BLEND))];
  if (dr < BLEND && s < n - 1) return [s, s + 1, 0.5 * (1 - sm(dr / BLEND))];
  return [s, s, 0];
}
const BL = (() => {   // per realm cell: the four slot indices and their weights
  const i = new Int8Array(NR * 4), w = new Float64Array(NR * 4);
  for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
    const c = Y * RW + X, [sx, ox, wx] = axisBlend(X, MW, ATLAS), [sy, oy, wy] = axisBlend(Y, MH, ATLAS);
    i[4 * c] = sy * ATLAS + sx; i[4 * c + 1] = sy * ATLAS + ox; i[4 * c + 2] = oy * ATLAS + sx; i[4 * c + 3] = oy * ATLAS + ox;
    w[4 * c] = (1 - wx) * (1 - wy); w[4 * c + 1] = wx * (1 - wy); w[4 * c + 2] = (1 - wx) * wy; w[4 * c + 3] = wx * wy;
  }
  return { i, w };
})();
const blend = vals => { const out = new Float64Array(NR);
  for (let c = 0; c < NR; c++) { const k = 4 * c; out[c] = vals[BL.i[k]] * BL.w[k] + vals[BL.i[k + 1]] * BL.w[k + 1] + vals[BL.i[k + 2]] * BL.w[k + 2] + vals[BL.i[k + 3]] * BL.w[k + 3]; }
  return out; };
export const slotOfCell = (X, Y) => ((Y / MH) | 0) * ATLAS + ((X / MW) | 0);
const slotCells = s => { const ax = s % ATLAS, ay = (s / ATLAS) | 0, o = []; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) o.push((ay * MH + y) * RW + ax * MW + x); return o; };

// ---- the raw realm: fields, filled height, flow (depends on the seed only) ----
const rawCache = new Map();
export function rawRealm(seed) {
  if (rawCache.has(seed)) return rawCache.get(seed);
  const at = fieldsAt(seed), E = new Float64Array(NR), M = new Float64Array(NR), T = new Float64Array(NR), F = new Float64Array(NR), K = new Float64Array(NR);
  for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) { const c = Y * RW + X, f = at(X, Y); E[c] = f.height; M[c] = f.humidity; T[c] = f.temperature; F[c] = f.wildness; K[c] = f.rockiness; }
  // Priority-Flood with epsilon from the realm's rim: Z is the height with every depression filled; the order the cells leave the queue is a valid flow order.
  const Z = new Float64Array(NR), done = new Uint8Array(NR), order = new Int32Array(NR), q = new FlatQueue();
  let n = 0;
  for (let c = 0; c < NR; c++) { const x = c % RW, y = (c / RW) | 0; if (x === 0 || y === 0 || x === RW - 1 || y === RH - 1) { Z[c] = E[c]; done[c] = 1; q.push(c, E[c]); } }
  const nb4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (q.length) {
    const c = q.pop(), x = c % RW, y = (c / RW) | 0; order[n++] = c;
    for (const [dx, dy] of nb4) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= RW || Y >= RH) continue; const m = Y * RW + X; if (done[m]) continue; done[m] = 1; Z[m] = Math.max(E[m], Z[c] + 1e-6); q.push(m, Z[m]); }
  }
  // D4 flow: each cell drains to its lowest filled neighbour; the rim drains off the realm. Accumulation counts the catchment, weighted by humidity.
  const down = new Int32Array(NR).fill(-1), acc = new Float64Array(NR);
  for (let c = 0; c < NR; c++) { const x = c % RW, y = (c / RW) | 0; if (x === 0 || y === 0 || x === RW - 1 || y === RH - 1) continue;
    let best = -1; for (const [dx, dy] of nb4) { const m = (y + dy) * RW + x + dx; if (Z[m] < Z[c] && (best < 0 || Z[m] < Z[best])) best = m; } down[c] = best; }
  for (let k = NR - 1; k >= 0; k--) { const c = order[k]; acc[c] += 0.4 + M[c]; if (down[c] >= 0) acc[down[c]] += acc[c]; }
  // water wears the land (world-f3a R1): a light stream-power pass on the height; the levels are cut from this, the water and the flow above stay as the noise made them
  // ranges first drawn as spines (world-f3a R2) on the noise height, where the raising height is estimated from the biomes' level shares; then the water wears the result
  const Es = spined(seed, E);
  const wetW = Float64Array.from(M, v => 0.4 + v), Ee = SHAPE_ON.erode ? erodeHeight(Es, wetW, RW, RH) : Es;
  const raw = { seed, E, Ee, M, T, F, K, Z, acc, down };
  if (rawCache.size > 8) rawCache.clear();
  rawCache.set(seed, raw); return raw;
}

// ---- the realm's slot biomes ----
export const slotBiomes = seed => { const o = []; for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) o.push(slotBiome(seed, ax, ay, 2)); return o; };

// ---- closure over the realm (today's rules, on the realm's cells) ----
export const NB8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];
// the exact closure: two raster passes, so that every pair of 8-neighbours differs by at most 1; it only lowers cells
export function closeLevels(lv, W, H) {
  const mn = (c, n) => { if (lv[n] + 1 < lv[c]) lv[c] = lv[n] + 1; };
  for (let c = 0; c < W * H; c++) { const x = c % W, y = (c / W) | 0;
    if (x > 0) mn(c, c - 1); if (x > 0 && y > 0) mn(c, c - W - 1); if (y > 0) mn(c, c - W); if (x < W - 1 && y > 0) mn(c, c - W + 1); }
  for (let c = W * H - 1; c >= 0; c--) { const x = c % W, y = (c / W) | 0;
    if (x < W - 1) mn(c, c + 1); if (x < W - 1 && y < H - 1) mn(c, c + W + 1); if (y < H - 1) mn(c, c + W); if (x > 0 && y < H - 1) mn(c, c + W - 1); }
}
export const isSaddle = (lv, a, W) => { const b = a + 1, c = a + W, d = a + W + 1; return lv[a] === lv[d] && lv[b] === lv[c] && lv[a] !== lv[b]; };
export function fixSaddles(lv, W, H) {
  for (let k = 0; k < G2.SADDLE_SCANS; k++) {
    let fixed = 0;
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) { const a = y * W + x;
      if (!isSaddle(lv, a, W)) continue;
      if (lv[a] > lv[a + 1]) lv[a + W + 1]--; else lv[a + W]--;   // the higher pair's larger-index cell
      fixed++; }
    if (!fixed) return;
    closeLevels(lv, W, H);
  }
}
// Zones: 4-connected groups of passable cells of one level. pass(c) says whether a cell can be walked (dry, or a ford).
export function levelZones(pass, lv, W, H) {
  const N = W * H, id = new Int32Array(N).fill(-1), qu = new Int32Array(N), cells = [], lvOf = [];
  for (let s = 0; s < N; s++) {
    if (id[s] >= 0 || !pass(s)) continue;
    const z = cells.length, list = []; let h = 0, t = 0; qu[t++] = s; id[s] = z;
    while (h < t) { const c = qu[h++], x = c % W, y = (c / W) | 0; list.push(c);
      for (const [dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const d = Y * W + X;
        if (id[d] < 0 && pass(d) && lv[d] === lv[s]) { id[d] = z; qu[t++] = d; } } }
    cells.push(list); lvOf.push(lv[s]);
  }
  return { id, cells, lvOf, n: cells.length };
}
// a small zone whose bordering zones all have one level takes it (not upward beside water); up to 4 rounds
function mergeSmallZones(pass, land, lv, W, H, zoneMin) {
  const nearWater = c => { const x = c % W, y = (c / W) | 0; for (const [dx, dy] of NB8) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && land[Y * W + X] === L.WATER) return true; } return false; };
  for (let round = 0; round < 4; round++) {
    const Z = levelZones(pass, lv, W, H); let changed = false;
    for (let z = 0; z < Z.n; z++) {
      if (Z.cells[z].length >= zoneMin) continue;
      let to = -1, mixed = false, wet = false;
      for (const c of Z.cells[z]) { const x = c % W, y = (c / W) | 0; if (nearWater(c)) wet = true;
        for (const [dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const o = Z.id[Y * W + X];
          if (o < 0 || o === z) continue; if (to < 0) to = Z.lvOf[o]; else if (to !== Z.lvOf[o]) mixed = true; } }
      if (to < 0 || mixed || (to !== 0 && wet)) continue;
      for (const c of Z.cells[z]) lv[c] = to;
      changed = true;
    }
    if (!changed) break;
    closeLevels(lv, W, H);
  }
  fixSaddles(lv, W, H);
}

// A way up exists only in a south-facing face (the one painted piece), so a stair joins a cell to the one south of it, the higher to the north. A level zone of a region whose only cliff
// edges to the rest face north or east or west could never be reached by a stair: such a zone takes the level of what rings it (a pocket is filled, a stranded plateau is lowered).
// Raised level never goes next to water (water and its neighbours are level 0). Per slot window, repeated over the realm until nothing moves.
function joinSouth(land, ford, lv, tr) {
  const wetNear = c => { const x = c % RW, y = (c / RW) | 0; if (land[c] === L.WATER) return true; for (const [dx, dy] of NB8) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < RW && Y < RH && land[Y * RW + X] === L.WATER) return true; } return false; };
  const NC = MW * MH;
  for (let round = 0; round < 8; round++) {
    let flips = 0;
    for (let s = 0; s < ATLAS * ATLAS; s++) {
      const cells = slotCells(s), pass = c => land[cells[c]] !== L.WATER || ford[cells[c]] === 1, loc = Uint8Array.from(cells, w => lv[w]);
      const Z = levelZones(pass, loc, MW, MH), uS = Int32Array.from({ length: Z.n }, (_, z) => z), uA = uS.slice();
      const fnd = (u, z) => { while (u[z] !== z) z = u[z]; return z; }, uni = (u, a, b) => { a = fnd(u, a); b = fnd(u, b); if (a !== b) u[a < b ? b : a] = a < b ? a : b; };
      const edges = [];   // every cliff edge between two zones: [zone a, zone b, joins south-facing?, length]
      // the east and south edge of each cell, in that order, with no array made per cell; the walkable test read once per cell
      const ok = new Uint8Array(NC); for (let c = 0; c < NC; c++) ok[c] = pass(c) ? 1 : 0;
      for (let c = 0; c < NC; c++) { if (!ok[c]) continue;
        for (let k = 0; k < 2; k++) { const south = k === 1, d = south ? MW : 1;
          if (!south && c % MW === MW - 1) continue; const n = c + d; if (n >= NC || !ok[n] || loc[c] === loc[n]) continue;
          uni(uA, Z.id[c], Z.id[n]); const sf = south && loc[c] > loc[n]; if (sf) uni(uS, Z.id[c], Z.id[n]);
          edges.push([Z.id[c], Z.id[n], sf]); } }
      const size = new Map(); for (let z = 0; z < Z.n; z++) { const g = fnd(uS, z); size.set(g, (size.get(g) || 0) + Z.cells[z].length); }
      const byAll = new Map(); for (const g of size.keys()) { const k = fnd(uA, g); if (!byAll.has(k)) byAll.set(k, []); byAll.get(k).push(g); }
      // each group's border counts in one pass over the edges (the groups do not change in the loop below, and the sort decides the order fully)
      const touchOf = new Map();
      for (const [a, b, sf] of edges) { if (sf) continue; const ga = fnd(uS, a), gb = fnd(uS, b); if (ga === gb) continue;
        let t = touchOf.get(ga); if (!t) touchOf.set(ga, t = new Map()); t.set(a, (t.get(a) || 0) + 1);
        let u = touchOf.get(gb); if (!u) touchOf.set(gb, u = new Map()); u.set(b, (u.get(b) || 0) + 1); }
      for (const gs of byAll.values()) {
        if (gs.length < 2) continue;
        gs.sort((a, b) => size.get(b) - size.get(a) || a - b);
        for (const g of gs.slice(1)) {   // a group no south-facing edge joins to the largest: flip the zone of it that borders the rest the longest
          const touch = touchOf.get(g) || new Map();
          const order = [...touch].sort((p, q) => q[1] - p[1] || p[0] - q[0]);
          for (const [z] of order) {
            const to = 1 - Z.lvOf[z]; if (to === 1 && Z.cells[z].some(c => wetNear(cells[c]))) continue;
            for (const c of Z.cells[z]) lv[cells[c]] = to; flips++; break;
          }
        }
      }
    }
    if (!flips) break;
    closeLevels(lv, RW, RH); fixSaddles(lv, RW, RH);
  }
}

const quantile = (sorted, p) => sorted.length ? sorted[clamp(Math.floor(p * (sorted.length - 1)), 0, sorted.length - 1)] : 0;
// the threshold that leaves the top k of a descending-sorted list above it
const cutTop = (desc, k) => k <= 0 ? Infinity : k >= desc.length ? -Infinity : (desc[k - 1] + desc[k]) / 2;
// a region's jitter for attempt t: 0 on attempt 0, otherwise a stable hash of the slot and the attempt, -1..1
const jit = (seed, s, t, tag) => t ? ((hash(seed, 'gen7', 'try', tag, s, t) / 2147483648) - 1) * (1 + t / 4) : 0;   // the swing widens a little with each attempt

// ---- the realm: water, land, levels, closed over the whole realm ----
// tries[s] (0 by default) is region s's attempt number: attempt t moves the slot's water and level pulls a little, so a region that fails its checks
// can be re-drawn. Only the slot's own parameters change, and they blend into the neighbours' border cells by position, so borders keep agreeing.
// The e0 pass (world-topdown-spec-1 2.1 step 3): every level the realm decides is written into its raising height. A cell whose level is not the sign of the height at its centre
// (water, its ring, closures, joins, the coast's taper) gets e0 one EDIT past the height, so the tile land rule (levels.mjs) agrees with the realm by construction. Water is always low.
export const EDIT = 0.16, EDIT_CUT = 0.9;
export function editE0(realm) {
  const { land, level, E, e0 } = realm;
  for (let c = 0; c < e0.length; c++) { const want = land[c] === L.WATER ? 0 : level[c], have = E[c] >= e0[c] ? 1 : 0; if (have !== want) e0[c] = want ? E[c] - EDIT : E[c] + EDIT; }
  // a cut cell (a ravine's) is held low harder: the land is read at a position moved by the warp, so a cut one cell wide would otherwise be read from the raised cells beside it
  if (realm.cuts) for (const k of [...realm.cuts.ravines, ...realm.cuts.gaps]) for (const c of k.cells) if (e0[c] < E[c] + EDIT_CUT) e0[c] = E[c] + EDIT_CUT;
}
const ringOf = () => Uint8Array.from({ length: NR }, (_, c) => { const x = c % RW, y = (c / RW) | 0; return x === 0 || y === 0 || x === RW - 1 || y === RH - 1 ? 1 : 0; });   // the cells the coast will take
export function buildRealm(seed, tries = null) {
  const R = rawRealm(seed), { E, M, F, K, Z, acc } = R, nS = ATLAS * ATLAS, sb = slotBiomes(seed), tg = sb.map(biomeTargets), tr = s => (tries ? tries[s] : 0);
  // water: pulled by the slot's rules
  const pr = k => blend(Float64Array.from(tg, (t, s) => k === 'riv' ? t.riv * (1 + 0.25 * jit(seed, s, tr(s), 'riv')) : k === 'lake' ? t.lake * (1 + 0.25 * jit(seed, s, tr(s), 'lake')) : t[k]));
  const riv = pr('riv'), lake = pr('lake'), pool = pr('pool'), pondM = pr('pond');
  const land = new Uint8Array(NR), wkind = new Uint8Array(NR);   // wkind: 1 river, 2 lake or pool
  // each cell's water score is the largest of its ratios to the rules; it is water at a score of 1, or above the slot's cap: where a region would hold more water
  // than its biome's share, its threshold rises to the cap, so the land keeps its shape and only the smallest bodies dry up
  const score = new Float64Array(NR), kindOf = new Uint8Array(NR);
  for (let c = 0; c < NR; c++) { const a = acc[c] / riv[c], b = Math.max((Z[c] - E[c]) / lake[c], M[c] / pool[c]); score[c] = Math.max(a, b); kindOf[c] = a >= b ? 1 : 2; }
  const th = new Float64Array(nS);
  for (let s = 0; s < nS; s++) { const sc = slotCells(s).map(c => score[c]).sort((x, y) => y - x), k = Math.floor(tg[s].cap * MW * MH * (1 + 0.2 * jit(seed, s, tr(s), 'cap')));
    th[s] = Math.max(1, k < sc.length ? (sc[k - 1] + sc[k]) / 2 : 1); }
  const thc = blend(th);
  for (let c = 0; c < NR; c++) if (score[c] >= thc[c]) { wkind[c] = kindOf[c]; land[c] = L.WATER; }
  // calibration per slot over its own dry cells: wood and rock thresholds, and the height quantiles that put the fixed level thresholds at the level shares
  const wT = new Float64Array(nS), rT = new Float64Array(nS), e0 = new Float64Array(nS);
  for (let s = 0; s < nS; s++) {
    const dry = slotCells(s).filter(c => !land[c]), t = tg[s];
    const fs = dry.map(c => F[c]).sort((a, b) => b - a), nw = Math.min(t.wood, Math.max(0, dry.length - 1));
    wT[s] = cutTop(fs, nw);
    const ks = dry.filter(c => F[c] < wT[s]).map(c => K[c]).sort((a, b) => b - a);
    rT[s] = cutTop(ks, Math.min(t.rock, ks.length));
  }
  // the raising height per slot: the height's quantile over the slot's dry cells that puts the fixed level threshold at the level share (the height is the noise as water wore it, and ranges drawn as spines)
  const slotE0 = Eh => { for (let s = 0; s < nS; s++) { const dry = slotCells(s).filter(c => !land[c]), es = dry.map(c => Eh[c]).sort((a, b) => a - b), a = clamp(tg[s].lv[0] / 100 + 0.06 * jit(seed, s, tr(s), 'e0'), 0.04, 0.9); e0[s] = quantile(es, a); } return blend(e0); };
  const Eh = R.Ee, e0c = slotE0(Eh);
  const wTc = blend(wT), rTc = blend(rT);
  for (let c = 0; c < NR; c++) { if (land[c]) continue; land[c] = F[c] >= wTc[c] ? L.WOOD : K[c] >= rTc[c] ? L.ROCK : L.MEADOW; }
  const onR = (x, y) => x >= 0 && y >= 0 && x < RW && y < RH;
  const pond = [];
  for (let c = 0; c < NR; c++) { if (land[c] !== L.MEADOW || M[c] < pondM[c]) continue; const x = c % RW, y = (c / RW) | 0;
    if (SIDES.some(([dx, dy]) => onR(x + dx, y + dy) && land[(y + dy) * RW + x + dx] === L.WATER)) pond.push(c); }
  for (const c of pond) land[c] = L.POND;
  // fords: where water runs one cell wide between two banks, about one in four (a stable hash of the world edge)
  const ford = new Uint8Array(NR), dryAt = (x, y) => onR(x, y) && land[y * RW + x] !== L.WATER;
  for (let c = 0; c < NR; c++) { if (land[c] !== L.WATER) continue; const x = c % RW, y = (c / RW) | 0;
    if (((dryAt(x - 1, y) && dryAt(x + 1, y)) || (dryAt(x, y - 1) && dryAt(x, y + 1))) && hash(seed, 'gen7', 'ford', x, y) % 100 < 28) ford[c] = 1; }
  // levels: fixed thresholds on the pulled height; water and its 8 neighbours are level 0; then today's closure, saddles and small zones
  const level = new Uint8Array(NR);   // one raised level only (the art director, Call 1): 0 or 1
  for (let c = 0; c < NR; c++) level[c] = land[c] === L.WATER ? 0 : Eh[c] >= e0c[c] ? 1 : 0;
  for (let c = 0; c < NR; c++) { if (land[c] !== L.WATER) continue; const x = c % RW, y = (c / RW) | 0; for (const [dx, dy] of NB8) if (onR(x + dx, y + dy)) level[(y + dy) * RW + x + dx] = 0; }
  closeLevels(level, RW, RH); fixSaddles(level, RW, RH);
  mergeSmallZones(c => land[c] !== L.WATER || ford[c] === 1, land, level, RW, RH, G2.ZONE_MIN);
  joinSouth(land, ford, level);
  // the tile layer reads the noise height against e0: what water and the spines did to the height is carried by e0 (the raw height less the worn one), so the two scales agree
  // the cuts (world-f3 F3): stream ravines and through-ravines lower cells of `level` here, before the raising heights are written, so the tile layer holds them low
  const cutIn = { RW, RH, level, land, ford, wkind, acc: Int32Array.from(acc, v => Math.round(v)), down: R.down, coast: ringOf(), slot: Uint8Array.from({ length: NR }, (_, c) => slotOfCell(c % RW, (c / RW) | 0)),
    lift: Int32Array.from({ length: NR }, (_, c) => Math.round(1000 * (Eh[c] - e0c[c]))), seat: c => { const w = c + 2 * RW; return ((c / RW) | 0) % MH !== MH - 1 && (w >= NR || land[w] !== L.WATER || ford[w] === 1); } };
  const cuts = planCuts(cutIn); level.set(cuts.level);
  const line = Float64Array.from(e0c);   // the raise line in the worn height's own scale (a cell is raised where the worn height reaches it)
  for (let c = 0; c < NR; c++) e0c[c] += E[c] - Eh[c];
  const realm = { seed, tries: tries ? Uint8Array.from(tries) : new Uint8Array(nS), slotBiome: sb, land, wkind, ford, level, E, worn: Eh, line, cuts, M, T: R.T, F, K, acc, e0: e0c };
  editE0(realm);
  return realm;   // e0: the height at which a cell is raised, per cell, which the place layer reads at tile scale
}
