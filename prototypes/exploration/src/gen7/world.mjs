// Generator 7, layer 0: the world. Pure: no page state, DOM, storage, clock or Math.random.
// One realm seed, one land. Every value here is a function of the realm seed and a WORLD position (cell units; a cell's centre is its integer
// coordinate), never of a cell number or of the order things were made in. The realm is the atlas of 5 x 5 regions, 80 x 100 cells.
// A layer reads only the layers above it: the fields (height, temperature, humidity, wildness, rockiness) -> filled height and flow (Priority-Flood,
// Barnes, Lehman and Mulla 2014, on flatqueue) -> water, land, levels (fixed thresholds on a per-biome pull of the height), closed over the whole realm.
// The region layer (region.mjs) reads this and adds stairs, trails, set pieces and the checks. Nothing here re-seeds per cell.
import FastNoiseLite from 'fastnoise-lite';
import FlatQueue from 'flatqueue';
import { hash, clamp, MW, MH, L, G2, BIOME_GROUND } from '../world.mjs';
import { slotBiome, ATLAS } from '../regions.mjs';

export const RW = ATLAS * MW, RH = ATLAS * MH, NR = RW * RH;     // the realm in cells: 80 x 100
export const CW = 24, CH = 28;                                   // a place's tiles (the scheme's open style)
export const LV = [0.38, 0.52];                                  // the fixed level thresholds [tune], on the pulled height
export const BLEND = 2;                                          // neighbouring regions blend over two cells at their shared border

// ---- the fields ----
// One FastNoiseLite per field, seeded from the realm seed and the field's name. Returns f(x, y) in -1..1.
function noiseField(seed, tag, freq, fractal = 'FBm', octaves = 4) {
  const n = new FastNoiseLite(hash(seed, 'gen7', tag) | 0);
  n.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2); n.SetFrequency(freq);
  n.SetFractalType(FastNoiseLite.FractalType[fractal]); n.SetFractalOctaves(octaves); n.SetFractalGain(0.5);
  return (x, y) => n.GetNoise(x, y);
}
// The fields as one function of a world position: { height, temperature, humidity, wildness, rockiness }, each 0..1. The region samples it at cell
// centres; the place layer (G2) samples the very same function at every tile.
export function fieldsAt(seed) {
  const elev = noiseField(seed, 'elev', 1 / 13), ridge = noiseField(seed, 'ridge', 1 / 10, 'Ridged', 3);
  const wx = noiseField(seed, 'warpx', 1 / 18, 'FBm', 2), wy = noiseField(seed, 'warpy', 1 / 18, 'FBm', 2);
  const moist = noiseField(seed, 'moist', 1 / 9, 'FBm', 3), wild = noiseField(seed, 'wild', 1 / 6, 'FBm', 3), temp = noiseField(seed, 'temp', 1 / 24, 'FBm', 2);
  return (X, Y) => {
    const u = X + 4 * wx(X, Y), v = Y + 4 * wy(X, Y), r = ridge(u, v);   // the domain warp bends the ridges
    const height = clamp(0.5 + 0.36 * elev(u, v) + 0.2 * r, 0, 1), humidity = clamp(0.5 + 0.5 * moist(X, Y), 0, 1);
    const temperature = clamp(0.5 + 0.5 * temp(X, Y) - 0.25 * Math.max(0, height - 0.6), 0, 1);   // the high ground is cooler
    const wildness = clamp(0.55 * humidity + 0.45 * (0.5 + 0.5 * wild(X, Y)) - 0.4 * Math.max(0, height - 0.72) - 0.25 * Math.max(0, 0.4 - temperature), 0, 1);
    return { height, temperature, humidity, wildness, rockiness: clamp((0.5 + 0.5 * r) * (height > 0.5 ? 1 : 0.55), 0, 1) };
  };
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
export const biomeTargets = biome => {
  const B = BIOME_GROUND[biome] || null;
  return { wood: B ? B.wood : G2.WOOD_N, rock: B ? B.rock : G2.ROCK_N, lv: LEVEL_SHARES[biome] || (B ? B.lv : G2.LV_PCT), ...WATER[biome] };
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
  const raw = { seed, E, M, T, F, K, Z, acc, down };
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

const quantile = (sorted, p) => sorted.length ? sorted[clamp(Math.floor(p * (sorted.length - 1)), 0, sorted.length - 1)] : 0;
// the threshold that leaves the top k of a descending-sorted list above it
const cutTop = (desc, k) => k <= 0 ? Infinity : k >= desc.length ? -Infinity : (desc[k - 1] + desc[k]) / 2;
// a region's jitter for attempt t: 0 on attempt 0, otherwise a stable hash of the slot and the attempt, -1..1
const jit = (seed, s, t, tag) => t ? ((hash(seed, 'gen7', 'try', tag, s, t) / 2147483648) - 1) * (1 + t / 4) : 0;   // the swing widens a little with each attempt

// ---- the realm: water, land, levels, closed over the whole realm ----
// tries[s] (0 by default) is region s's attempt number: attempt t moves the slot's water and level pulls a little, so a region that fails its checks
// can be re-drawn. Only the slot's own parameters change, and they blend into the neighbours' border cells by position, so borders keep agreeing.
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
  const wT = new Float64Array(nS), rT = new Float64Array(nS), e0 = new Float64Array(nS), e1 = new Float64Array(nS);
  for (let s = 0; s < nS; s++) {
    const dry = slotCells(s).filter(c => !land[c]), t = tg[s];
    const fs = dry.map(c => F[c]).sort((a, b) => b - a), nw = Math.min(t.wood, Math.max(0, dry.length - 1));
    wT[s] = cutTop(fs, nw);
    const ks = dry.filter(c => F[c] < wT[s]).map(c => K[c]).sort((a, b) => b - a);
    rT[s] = cutTop(ks, Math.min(t.rock, ks.length));
    const es = dry.map(c => E[c]).sort((a, b) => a - b), a = clamp(t.lv[0] / 100 + 0.06 * jit(seed, s, tr(s), 'e0'), 0.04, 0.9), b = clamp((t.lv[0] + t.lv[1]) / 100 + 0.06 * jit(seed, s, tr(s), 'e1'), a + 0.05, 0.95);
    e0[s] = quantile(es, a); e1[s] = Math.max(quantile(es, b), e0[s] + 1e-4);
  }
  const wTc = blend(wT), rTc = blend(rT), e0c = blend(e0), e1c = blend(e1);
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
  const level = new Uint8Array(NR);
  for (let c = 0; c < NR; c++) { const p = LV[0] + (E[c] - e0c[c]) * (LV[1] - LV[0]) / (e1c[c] - e0c[c]); level[c] = land[c] === L.WATER ? 0 : p < LV[0] ? 0 : p < LV[1] ? 1 : 2; }
  for (let c = 0; c < NR; c++) { if (land[c] !== L.WATER) continue; const x = c % RW, y = (c / RW) | 0; for (const [dx, dy] of NB8) if (onR(x + dx, y + dy)) level[(y + dy) * RW + x + dx] = 0; }
  closeLevels(level, RW, RH); fixSaddles(level, RW, RH);
  mergeSmallZones(c => land[c] !== L.WATER || ford[c] === 1, land, level, RW, RH, G2.ZONE_MIN);
  return { seed, tries: tries ? Uint8Array.from(tries) : new Uint8Array(nS), slotBiome: sb, land, wkind, ford, level, E, M, T: R.T, F, K, acc };
}
