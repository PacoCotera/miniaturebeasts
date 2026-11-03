// The seeded world of the Companion: the map, the places and the RNG. Pure: it never reads the page's state, the DOM,
// storage, the clock or Math.random, and never draws. Generator 1 is frozen; a new generator is added beside it, never in its place.

export const NEW_GEN = 3;          // the generator newWorld gives a new world (old saves keep theirs)
export const GENS = [1, 2, 3, 4];  // the generators the page can play

export const MW = 16, MH = 20;                       // world map, cells
export const PW = 28, PH = 32;
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const L = { MEADOW: 0, POND: 1, ROCK: 2, WOOD: 3, WATER: 4, CLIFF: 5 };
export const T = { GRASS: 0, TALL: 1, FLOWERS: 2, DARK: 3, SAND: 4, WATER: 5, REEDS: 6, ROCK: 7, TRUNK: 8, CLIFF: 9, CFLOOR: 10, CWALL: 11, STEP: 12, DEEP: 13, ISLE: 14, FACE: 15, LIP: 16, STAIR: 17, APRON: 18 };
export const T_BLOCK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0];   // 15–18 are generator 2's: faces and lips block, stairs and aprons are walked on

export function hash() {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < arguments.length; i++) {
    const v = arguments[i];
    if (typeof v === 'string') {
      for (let j = 0; j < v.length; j++) { h ^= v.charCodeAt(j); h = Math.imul(h, 16777619); }
    } else {
      const n = Math.floor(v) | 0;
      for (let k = 0; k < 4; k++) { h ^= (n >>> (k * 8)) & 255; h = Math.imul(h, 16777619); }
    }
    h ^= 0x5bd1e995; h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
export function rnd() { return hash.apply(null, arguments) / 4294967296; }
export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function makeRng(seed) {
  const f = mulberry32(seed);
  return {
    f, int: n => Math.floor(f() * n), range: (a, b) => a + Math.floor(f() * (b - a + 1)),
    pick: a => a[Math.floor(f() * a.length)], chance: p => f() < p,
    shuffle: a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
}
export function noise2(seed, x, y, sc) {
  const gx = x / sc, gy = y / sc, x0 = Math.floor(gx), y0 = Math.floor(gy);
  const s = t => t * t * (3 - 2 * t), ux = s(gx - x0), uy = s(gy - y0);
  const a = rnd(seed, x0, y0), b = rnd(seed, x0 + 1, y0), c = rnd(seed, x0, y0 + 1), d = rnd(seed, x0 + 1, y0 + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export function fbm(seed, x, y, sc) { return noise2(seed, x, y, sc) * .65 + noise2(seed + 7, x, y, sc / 2) * .35; }
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const cxy = c => ({ x: c % MW, y: (c / MW) | 0 });
export const cdist = (a, b) => man(cxy(a), cxy(b));

export function passableIn(G, c) { const l = G.land[c]; return (l !== L.WATER || G.ford[c] === 1) && l !== L.CLIFF; }

export function genWorld(seed, gen = 1, biome = 'mixed') {
  if (gen === 4) return genWorld4(seed, biome);
  if (gen === 2) return genWorld2(seed);
  if (gen === 3) return { ...genWorld2(seed), gen: 3 };   // generator 3: generator 2's ground, and the herd floor in its life (genLife3)
  if (gen !== 1) throw new RangeError('unknown world generator: ' + gen);
  const passable = c => passableIn(G, c);
  const R = makeRng(hash(seed, 'world'));
  const N = MW * MH, land = new Array(N), ford = new Array(N).fill(0), island = new Array(N).fill(0);
  const at = (x, y) => y * MW + x;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const m = fbm(hash(seed, 'm'), x, y, 5), h = fbm(hash(seed, 'h'), x, y, 4);
    land[at(x, y)] = m > .6 ? L.WOOD : h > .63 ? L.ROCK : L.MEADOW;
  }
  // One river, top to bottom, meandering on the east half.
  const rxs = []; let rx = 9 + R.int(3);
  for (let y = 0; y < MH; y++) {
    if (y > 0 && R.chance(.45)) { const nx = clamp(rx + (R.chance(.5) ? 1 : -1), 8, 13); if (nx !== rx) { land[at(nx, y - 1)] = L.WATER; rx = nx; } }
    land[at(rx, y)] = L.WATER; rxs[y] = rx;
  }
  // The river widens around an island (seen, not reachable without a swimmer).
  const iy = 11 + R.int(3), ix = rxs[iy];
  for (let y = iy - 1; y <= iy + 1; y++) for (let x = ix - 1; x <= ix + 2; x++) land[at(clamp(x, 0, MW - 1), y)] = L.WATER;
  land[at(rxs[iy - 2], iy - 1)] = L.WATER; land[at(rxs[iy + 2], iy + 1)] = L.WATER;
  land[at(ix, iy)] = L.MEADOW; land[at(ix + 1, iy)] = R.chance(.5) ? L.WOOD : L.MEADOW;
  island[at(ix, iy)] = 1; island[at(ix + 1, iy)] = 1;
  // Two shallow fords so both banks are walkable.
  for (const fy of [1 + R.int(3), 16 + R.int(3)]) for (let x = 0; x < MW; x++) if (land[at(x, fy)] === L.WATER) ford[at(x, fy)] = 1;
  // Cliff band west of the river, with one step; a cave mouth in its face.
  const cy = 5 + R.int(2), xEnd = rxs[cy] - 3, x0 = 1;
  const stepX = x0 + 2 + R.int(Math.max(1, xEnd - x0 - 3));
  for (let x = x0; x <= xEnd; x++) {
    land[at(x, x >= stepX ? cy + 1 : cy)] = L.CLIFF;
    if (x === stepX) land[at(x, cy)] = L.CLIFF;
  }
  let gx = x0 + 1 + R.int(Math.max(1, xEnd - x0 - 1));
  if (gx === stepX) gx = Math.max(x0, gx - 1);
  const gcy = gx >= stepX ? cy + 1 : cy;
  const gate = at(gx, gcy + 1), mouth = at(gx, gcy);
  land[gate] = L.ROCK;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) { const c = at(gx + dx, gcy + 1 + dy); if (land[c] !== L.WATER && land[c] !== L.CLIFF && R.chance(.6)) land[c] = L.ROCK; }
  // A small lake somewhere south-west.
  const lx = 1 + R.int(5), ly = 12 + R.int(6);
  if (land[at(lx, ly)] !== L.CLIFF) land[at(lx, ly)] = L.WATER;
  // Pond edges along every bank.
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = at(x, y); if (land[c] === L.WATER || land[c] === L.CLIFF || island[c] || c === gate) continue;
    const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < MW && Y < MH && land[at(X, Y)] === L.WATER && !ford[at(X, Y)]; });
    if (wet && (land[c] === L.MEADOW || R.chance(.35))) land[c] = L.POND;
  }
  const G = { seed, land, ford, island, gate, mouth, deep: -1, swim: -1, swimDir: null, spawns: [], comp: new Array(N).fill(0) };
  // Largest walkable component (fords count).
  const seen = new Array(N).fill(-1); let best = -1, bestN = 0;
  for (let s = 0; s < N; s++) {
    if (seen[s] >= 0 || !passable(s)) continue;
    let n = 0; const q = [s]; seen[s] = s;
    while (q.length) { const c = q.pop(); n++; const { x, y } = cxy(c);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH) continue; const d = at(X, Y); if (seen[d] < 0 && passable(d)) { seen[d] = s; q.push(d); } } }
    if (n > bestN) { bestN = n; best = s; }
  }
  for (let c = 0; c < N; c++) G.comp[c] = seen[c] === best ? 1 : 0;
  // The deep "?" sits in a rock field away from the gate.
  const rocks = []; for (let c = 0; c < N; c++) if (G.comp[c] && c !== gate && cdist(c, gate) >= 5) (land[c] === L.ROCK ? rocks : []).push(c);
  if (!rocks.length) for (let c = 0; c < N; c++) if (G.comp[c] && cdist(c, gate) >= 5 && land[c] !== L.WATER) rocks.push(c);
  G.deep = R.pick(rocks); land[G.deep] = L.ROCK;
  // The swimmer gate: the reachable bank right across the fast water from the island.
  const isl = []; for (let c = 0; c < N; c++) if (island[c]) isl.push(cxy(c));
  const sc = [];
  for (let c = 0; c < N; c++) {
    if (!G.comp[c] || land[c] === L.WATER || c === gate || c === G.deep || island[c]) continue;
    const p = cxy(c);
    for (const [dn, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
      const X = p.x + dx, Y = p.y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH) continue; const w = at(X, Y);
      if (land[w] !== L.WATER || ford[w]) continue;
      const d = Math.min(...isl.map(i => cheb(i, { x: X, y: Y })));
      if (d <= 1) sc.push({ c, dn, k: d * 100 + Math.min(...isl.map(i => man(i, p))) * 10 + (dn === 'left' || dn === 'right' ? 0 : 1) });
    }
  }
  sc.sort((a, b) => a.k - b.k || a.c - b.c);
  if (sc.length) { G.swim = sc[0].c; G.swimDir = sc[0].dn; }
  // Start glints: one near the cliff gate, the rest spread out.
  const ok = c => G.comp[c] && c !== gate && c !== G.deep && land[c] !== L.WATER &&
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].filter(([dx, dy]) => { const p = cxy(c), X = p.x + dx, Y = p.y + dy; return X >= 0 && Y >= 0 && X < MW && Y < MH && passable(at(X, Y)); }).length >= 6;
  const cand = []; for (let c = 0; c < N; c++) if (ok(c)) cand.push(c);
  const near = cand.filter(c => cdist(c, gate) >= 2 && cdist(c, gate) <= 4);
  if (near.length) G.spawns.push(R.pick(near));
  for (const c of R.shuffle(cand.slice())) { if (G.spawns.length >= 5) break; if (G.spawns.every(s => cdist(s, c) >= 5)) G.spawns.push(c); }
  // An early burrower: beside every start glint there is a rock or wood cell where Tuikis live and
  // an overhang to shelter under, so a burrower pod is reachable in the first storm without the burrow.
  G.glow = [];
  for (const s of G.spawns) {
    const p = cxy(s), nb = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = p.x + dx, y = p.y + dy; if ((!dx && !dy) || x < 0 || y < 0 || x >= MW || y >= MH) continue;
      const c = at(x, y); if (G.comp[c] && passable(c) && land[c] !== L.WATER && c !== gate && c !== G.deep && c !== G.swim && !island[c] && !G.spawns.includes(c)) nb.push(c); }
    if (!nb.length) continue;
    let c = nb.find(n => land[n] === L.ROCK || land[n] === L.WOOD);
    if (c == null) { c = nb[0]; land[c] = L.ROCK; }
    if (!G.glow.includes(c)) G.glow.push(c);
  }
  return G;
}

export const FEAT_MIX = {
  [L.MEADOW]: { b: [2, 3], h: .13, u: [0, 1], k: [1, 2], s: [1, 1], n: [0, 1] },
  [L.POND]: { b: [1, 2], h: .09, u: [2, 3], k: [1, 1], s: [0, 1], n: [0, 1] },
  [L.ROCK]: { b: [0, 1], h: .25, u: [0, 1], k: [2, 3], s: [1, 2], n: [1, 2] },
  [L.WOOD]: { b: [2, 3], h: .09, u: [1, 2], k: [0, 1], s: [1, 1], n: [1, 2] },
  [L.WATER]: { b: [1, 1], h: .2, u: [2, 2], k: [1, 1], s: [0, 0], n: [0, 1] },
};
export const DECOR = 'oemi';   // feature kinds that are scenery: never acted on, never block

export function finishLayout(lay, R, spawnPt0, occ) {
  let spawnPt = spawnPt0;
  const { tiles, feats } = lay, I = (x, y) => y * PW + x;
  const solid = new Uint8Array(PW * PH);
  for (let i = 0; i < PW * PH; i++) solid[i] = T_BLOCK[tiles[i]];
  for (const f of feats) if (!DECOR.includes(f.kind)) solid[I(f.x, f.y)] = 1;
  // Anchor on the largest open region, so an edge band of cliff or water can't swallow the entry.
  const comp = new Int16Array(PW * PH).fill(-1); let best = -1, bestN = 0;
  for (let s0 = 0; s0 < PW * PH; s0++) {
    if (solid[s0] || comp[s0] >= 0) continue; let n = 0; const st = [s0]; comp[s0] = s0;
    while (st.length) { const i = st.pop(), x = i % PW, y = (i / PW) | 0; n++;
      for (const [dx, dy] of Object.values(DIRS)) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue; const j = I(X, Y); if (!solid[j] && comp[j] < 0) { comp[j] = s0; st.push(j); } } }
    if (n > bestN) { bestN = n; best = s0; }
  }
  const reach = new Uint8Array(PW * PH);
  for (let i = 0; i < PW * PH; i++) if (comp[i] === best && best >= 0) reach[i] = 1;
  if (!reach[I(spawnPt.x, spawnPt.y)]) { let bd = 1e9, bp = spawnPt;
    for (let i = 0; i < PW * PH; i++) if (reach[i]) { const x = i % PW, y = (i / PW) | 0, d = Math.hypot(x - spawnPt.x, y - spawnPt.y); if (d < bd) { bd = d; bp = { x, y }; } }
    spawnPt = bp; }
  // Slabs must be pushable where they spawn: some way has a free tile beyond and a reachable tile to stand on,
  // and water or cliff touches at most one side. A slab that fails moves to the nearest spot that passes.
  { const wet = t => t === T.WATER || t === T.DEEP || t === T.CLIFF || t === T.CWALL || t === T.ISLE;
    const ok = (x, y) => { if (x < 2 || y < 2 || x >= PW - 2 || y >= PH - 2) return false;
      if (Object.values(DIRS).filter(([dx, dy]) => wet(tiles[I(x + dx, y + dy)])).length > 1) return false;
      return Object.values(DIRS).some(([dx, dy]) => { const tx = x + dx, ty = y + dy, sx = x - dx, sy = y - dy; return !solid[I(tx, ty)] && tiles[I(tx, ty)] !== T.STEP && tx >= 1 && ty >= 1 && tx < PW - 1 && ty < PH - 1 && reach[I(sx, sy)] && !solid[I(sx, sy)]; }); };
    for (const f of feats) { if (f.kind !== 's' || ok(f.x, f.y)) continue;
      solid[I(f.x, f.y)] = 0; let bd = 1e9, bp = null;
      for (let i = 0; i < PW * PH; i++) { const x = i % PW, y = (i / PW) | 0; if (solid[i] || !reach[i] || tiles[i] === T.STEP || (x === spawnPt.x && y === spawnPt.y)) continue; solid[i] = 1; const good = ok(x, y); solid[i] = 0;
        if (good) { const d = Math.abs(x - f.x) + Math.abs(y - f.y); if (d < bd) { bd = d; bp = { x, y }; } } }
      if (bp) { f.x = bp.x; f.y = bp.y; } solid[I(f.x, f.y)] = 1; reach[I(f.x, f.y)] = 0; } }
  // Drop features nobody could ever stand next to.
  lay.feats = feats.filter(f => DECOR.includes(f.kind) || f.kind === 'g' ||
    Object.values(DIRS).some(([dx, dy]) => { const x = f.x + dx, y = f.y + dy; return x >= 0 && y >= 0 && x < PW && y < PH && reach[I(x, y)]; }));
  lay.reach = reach; lay.spawnPt = spawnPt;
  // Distance to the nearest shelter, for creatures heading for cover.
  const sd = new Int16Array(PW * PH).fill(999), sq = [];
  for (let i = 0; i < PW * PH; i++) if (lay.shelter[i] && !T_BLOCK[tiles[i]]) { sd[i] = 0; sq.push(i); }
  for (let h = 0; h < sq.length; h++) { const i = sq[h], x = i % PW, y = (i / PW) | 0;
    for (const [dx, dy] of Object.values(DIRS)) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue; const j = I(X, Y); if (sd[j] > sd[i] + 1 && !T_BLOCK[tiles[j]]) { sd[j] = sd[i] + 1; sq.push(j); } } }
  lay.sdist = sd;
  return lay;
}

// Beacons for the whole world, chosen once: the same seeded roll per cell as before, but a beacon is kept only
// if no beacon already stands within 2 cells (a spacing of at least 3), so two never sit side by side.
export function beaconCells(G, seed) {
  if (G.beacons && G.beacons.seed === seed) return G.beacons.set;
  const set = new Set();
  for (let c = 0; c < MW * MH; c++) { const land = G.land[c]; if (land !== L.ROCK && land !== L.MEADOW) continue;
    const cr = makeRng(hash(seed, 'cairn', c)); if (!cr.chance(land === L.ROCK ? .35 : .08)) continue;
    const p = cxy(c); let near = false; for (const b of set) { const q = cxy(b); if (Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) <= 2) { near = true; break; } }
    if (!near) set.add(c); }
  G.beacons = { seed, set }; return set;
}
// Depots: about six per world, never two in one 5×5 area (Chebyshev distance 5 or more), on open land.
export function depotCells(G, seed) {
  if (G.depots && G.depots.seed === seed) return G.depots.set;
  const set = new Set(), R = makeRng(hash(seed, 'depots')), cand = [];
  for (let c = 0; c < MW * MH; c++) if (passableIn(G, c) && G.land[c] !== L.WATER && !G.island[c] && c !== G.gate && c !== G.deep && c !== G.swim && !beaconCells(G, seed).has(c)) cand.push({ c, r: R.f() });
  cand.sort((a, b) => a.r - b.r);
  for (const { c } of cand) { if (set.size >= 6) break; const p = cxy(c);
    if ([...set].every(d => { const q = cxy(d); return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) >= 5; })) set.add(c); }
  G.depots = { seed, set }; return set;
}
export function genPatch(G, seed, cell) {
  const R = makeRng(hash(seed, 'patch', cell)), ns = hash(seed, 'pn', cell);
  const land = G.land[cell], { x: cx, y: cy } = cxy(cell), isFord = land === L.WATER;
  const tiles = new Uint8Array(PW * PH), shelter = new Uint8Array(PW * PH), feats = [], occ = new Uint8Array(PW * PH);
  const I = (x, y) => y * PW + x, inb = (x, y) => x >= 0 && y >= 0 && x < PW && y < PH;
  const setT = (x, y, t) => { if (inb(x, y)) tiles[I(x, y)] = t; };
  const base = land === L.WOOD ? T.DARK : land === L.ROCK ? T.SAND : T.GRASS;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    let t = base; const n = fbm(ns, x, y, 5);
    if (base === T.GRASS) { if (n > .63) t = T.TALL; else if (rnd(ns, x, y, 1) < .045) t = T.FLOWERS; }
    else if (base === T.DARK) { if (n > .6) t = T.TALL; }
    else if (n < .34) t = T.GRASS;
    tiles[I(x, y)] = t;
  }
  // Edges that face wide water or cliffs on the map become water or cliff here.
  // On the bank across from the island, the edge is fast deep water with the island beyond it.
  const nbLand = (dx, dy) => { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) return -1; const c = y * MW + x;
    if (G.land[c] === L.WATER) return G.ford[c] ? L.POND : L.WATER; return G.land[c]; };
  for (const [dn, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
    const swimSide = cell === G.swim && dn === G.swimDir;
    const nl = nbLand(dx, dy); if (!swimSide && nl !== L.WATER && nl !== L.CLIFF) continue;
    if (isFord && dx === 0) continue;
    const len = dx === 0 ? PW : PH;
    for (let k = 0; k < len; k++) {
      const depth = swimSide ? 7 + Math.round(fbm(ns + 61, k, 0, 4) * 1.5) : 3 + Math.round(fbm(ns + dx * 7 + dy * 13 + 99, k, 0, 4) * 2.5);
      for (let d = 0; d <= depth; d++) {
        const x = dn === 'left' ? d : dn === 'right' ? PW - 1 - d : k, y = dn === 'up' ? d : dn === 'down' ? PH - 1 - d : k;
        if (swimSide) { if (d < 3) setT(x, y, T.ISLE); else if (d < depth) setT(x, y, T.DEEP); else if (!T_BLOCK[tiles[I(x, y)]]) setT(x, y, rnd(ns, x, y, 2) < .5 ? T.REEDS : T.SAND); }
        else if (d < depth) { if (tiles[I(x, y)] !== T.DEEP && tiles[I(x, y)] !== T.ISLE) setT(x, y, nl === L.WATER ? T.WATER : T.CLIFF); }
        else if (nl === L.WATER && !T_BLOCK[tiles[I(x, y)]]) setT(x, y, rnd(ns, x, y, 2) < .5 ? T.REEDS : T.SAND);
      }
    }
  }
  if (isFord) { // a shallow river through the middle, with stepping stones across
    for (let y = 0; y < PH; y++) { const w = Math.round((fbm(ns + 3, 0, y, 4) - .5) * 4);
      for (let x = 9 + w; x <= 18 + w; x++) setT(x, y, T.WATER); setT(8 + w, y, T.REEDS); setT(19 + w, y, T.SAND); }
    for (let x = 0; x < PW; x++) if (tiles[I(x, 16)] === T.WATER) setT(x, 16, T.STEP);
  }
  const keep = i => tiles[i] === T.DEEP || tiles[i] === T.ISLE || tiles[i] === T.CLIFF;
  if (land === L.POND) {
    const px = 6 + R.int(16), py = 5 + R.int(16), rx = 3.5 + R.f() * 2.5, ry = 3.5 + R.f() * 3;
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      if (keep(I(x, y))) continue;
      const dx = (x - px) / rx, dy = (y - py) / ry, v = dx * dx + dy * dy + (fbm(ns + 5, x, y, 3) - .5) * .8;
      if (v < 1) setT(x, y, T.WATER); else if (v < 1.6 && tiles[I(x, y)] !== T.WATER) setT(x, y, rnd(ns, x, y, 3) < .55 ? T.REEDS : T.SAND);
    }
  }
  const walk = (x, y) => inb(x, y) && !T_BLOCK[tiles[I(x, y)]];
  // Rock outcrops with an overhang to shelter under.
  const ovN = Math.max(G.glow.includes(cell) ? 1 : 0, land === L.ROCK ? 2 : land === L.MEADOW ? 1 : R.chance(.45) ? 1 : 0);
  for (let k = 0, tries = 0; k < ovN && tries < 400; tries++) {
    const ox = 2 + R.int(PW - 7), oy = 2 + R.int(PH - 8); let okO = true;
    for (let dy = 0; dy <= 3 && okO; dy++) for (let dx = -1; dx <= 3; dx++) if (!walk(ox + dx, oy + dy)) { okO = false; break; }
    if (!okO) continue;
    for (let dx = 0; dx < 3; dx++) { setT(ox + dx, oy, T.ROCK); setT(ox + dx, oy + 1, T.ROCK); shelter[I(ox + dx, oy + 2)] = 1; occ[I(ox + dx, oy + 2)] = 1; }
    feats.push({ id: 'o' + k, kind: 'o', x: ox, y: oy }); k++;
  }
  // Boulders.
  const rockN = land === L.ROCK ? 6 + R.int(4) : R.int(2) + (land === L.MEADOW ? 1 : 0);
  for (let k = 0; k < rockN; k++) { const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), s = R.chance(.45) ? 1 : 0;
    for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) if (walk(x + dx, y + dy) && (s === 0 || R.chance(.8))) setT(x + dx, y + dy, T.ROCK); }
  // Trees (trunk blocks; the canopy is see-through and gives no shelter).
  const treeN = land === L.WOOD ? 11 + R.int(5) : land === L.MEADOW ? 1 + R.int(2) : R.int(2);
  for (let k = 0, tries = 0; k < treeN && tries < 200; tries++) {
    const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4); let okT = true;
    for (let dy = -1; dy <= 1 && okT; dy++) for (let dx = -1; dx <= 1; dx++) if (!walk(x + dx, y + dy)) { okT = false; break; }
    for (let dy = -2; dy <= 2 && okT; dy++) for (let dx = -2; dx <= 2; dx++) if (inb(x + dx, y + dy) && tiles[I(x + dx, y + dy)] === T.TRUNK) { okT = false; break; }
    if (okT) { setT(x, y, T.TRUNK); k++; }
  }
  // The cliff gate: a narrow burrow in the cliff face under the cave mouth.
  const spawnPt = { x: 14, y: PH - 3 };
  const carve = (x0, y0, x1, y1) => {
    const fix = (x, y) => { if (!inb(x, y)) return; const t = tiles[I(x, y)]; if (t === T.WATER) setT(x, y, T.STEP); else if (T_BLOCK[t]) setT(x, y, base === T.DARK ? T.DARK : T.SAND); occ[I(x, y)] = 1; };
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) fix(x0, y);
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) fix(x, y1);
  };
  if (cell === G.gate) {
    for (let x = 0; x < PW; x++) { const depth = 4 + Math.round(fbm(ns + 41, x, 0, 4) * 2); for (let y = 0; y < depth; y++) setT(x, y, T.CLIFF); }
    const gx = 11 + R.int(6); let gy = 0; while (tiles[I(gx, gy + 1)] === T.CLIFF) gy++;
    for (let dx = -1; dx <= 1; dx++) { setT(gx + dx, gy + 1, T.SAND); occ[I(gx + dx, gy + 1)] = 1; }
    carve(gx, gy + 1, spawnPt.x, spawnPt.y);
    feats.push({ id: 'g', kind: 'g', x: gx, y: gy });
  }
  if (cell === G.swim) { // a pod lies on the island shore, in plain sight and out of reach
    const m = G.swimDir, ix = m === 'left' ? 2 : m === 'right' ? PW - 3 : 13, iy = m === 'up' ? 2 : m === 'down' ? PH - 3 : 15;
    feats.push({ id: 'i', kind: 'i', x: ix, y: iy });
    // keep a dry strip along the bank so the fast water can be reached
    for (let k = 0; k < (m === 'up' || m === 'down' ? PW : PH); k++) {
      for (let d = 10; d <= 12; d++) { const x = m === 'left' ? d : m === 'right' ? PW - 1 - d : k, y = m === 'up' ? d : m === 'down' ? PH - 1 - d : k;
        if (inb(x, y) && T_BLOCK[tiles[I(x, y)]] && tiles[I(x, y)] !== T.DEEP) setT(x, y, base === T.DARK ? T.DARK : T.SAND); }
    }
  }
  // (Tree canopies give no shelter: only overhangs, caves and a lit outpost keep strikes off you.)
  // Interactive features.
  const spot = (minSep) => { for (let t = 0; t < 90; t++) {
      const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), i = I(x, y);
      if (T_BLOCK[tiles[i]] || tiles[i] === T.STEP || occ[i]) continue;
      if (Math.abs(x - spawnPt.x) + Math.abs(y - spawnPt.y) < 4) continue;
      if (feats.some(f => f.kind !== 'o' && Math.abs(f.x - x) + Math.abs(f.y - y) < minSep)) continue;
      occ[i] = 1; return { x, y }; } return null; };
  const mix = FEAT_MIX[land] || FEAT_MIX[L.MEADOW];
  const n = ([a, b]) => a + R.int(b - a + 1);
  const addF = (kind, count, init) => { for (let k = 0; k < count; k++) { const p = spot(3); if (p) feats.push(Object.assign({ id: kind + k, kind, x: p.x, y: p.y }, init ? init() : {})); } };
  addF('b', n(mix.b));
  R.chance(mix.h);   // humming stones were cut this round (they gave Data); the roll stays so layouts don't shift
  addF('u', n(mix.u), () => ({ full: R.chance(.75) }));
  addF('k', n(mix.k), () => ({ ch: R.chance(.1) ? 2 : 0 }));
  addF('s', n(mix.s), () => ({ under: R.chance(.22) ? 'pod' : null }));
  addF('n', n(mix.n) + (cell === G.gate ? 1 : 0));
  // A beacon: lighting it shows land 3 cells around, beyond the Probe's range. (The hash salt keeps its old name so worlds stay the same.)
  if (beaconCells(G, seed).has(cell)) addF('j', 1);
  if (depotCells(G, seed).has(cell)) addF('h', 1);   // a depot: a post with a hut and a mast lamp
  if (cell === G.deep) { const p = { x: 14 + R.int(5) - 2, y: 12 + R.int(4) };
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = p.x + dx, Y = p.y + dy; if (T_BLOCK[tiles[I(X, Y)]]) setT(X, Y, T.SAND); }
    carve(p.x, p.y + 1, spawnPt.x, spawnPt.y);
    for (let i = feats.length - 1; i >= 0; i--) if (cheb(feats[i], p) <= 1 && feats[i].kind !== 'o') feats.splice(i, 1);
    feats.push({ id: 'd', kind: 'd', x: p.x, y: p.y }); }
  const lay = { key: String(cell), cell, cave: false, land, base, tiles, shelter, feats };
  return finishLayout(lay, R, spawnPt, occ);
}

export function genCave(seed, cell) {
  const R = makeRng(hash(seed, 'cave', cell)), ns = hash(seed, 'cn', cell);
  const tiles = new Uint8Array(PW * PH).fill(T.CWALL), shelter = new Uint8Array(PW * PH).fill(1), feats = [], occ = new Uint8Array(PW * PH);
  const I = (x, y) => y * PW + x, setT = (x, y, t) => { if (x >= 0 && y >= 0 && x < PW && y < PH) tiles[I(x, y)] = t; };
  for (let y = 1; y < PH - 1; y++) for (let x = 1; x < PW - 1; x++) {
    const dx = (x - 13.5) / 12, dy = (y - 15) / 13.5, v = dx * dx + dy * dy + (fbm(ns, x, y, 4) - .5) * .9;
    if (v < .9) setT(x, y, T.CFLOOR);
  }
  for (let k = 0; k < 4; k++) { const px = 5 + R.int(18), py = 5 + R.int(15); for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) if (R.chance(.85)) setT(px + dx, py + dy, T.CWALL); }
  for (let y = 21; y <= 28; y++) for (let x = 12; x <= 16; x++) setT(x, y, T.CFLOOR);
  for (let y = 6; y <= 21; y++) setT(14, y, T.CFLOOR);
  const spawnPt = { x: 14, y: 27 };
  feats.push({ id: 'x', kind: 'x', x: 14, y: 28 }); occ[I(14, 28)] = 1;
  for (let y = 25; y <= 27; y++) for (let x = 13; x <= 15; x++) occ[I(x, y)] = 1;
  const spot = (pred) => { for (let t = 0; t < 120; t++) { const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), i = I(x, y);
      if (tiles[i] !== T.CFLOOR || occ[i] || (pred && !pred(x, y))) continue;
      if (feats.some(f => Math.abs(f.x - x) + Math.abs(f.y - y) < 3)) continue; occ[i] = 1; return { x, y }; } return null; };
  for (let k = 0; k < 3; k++) { const p = spot((x, y) => y >= 13 && y <= 21); if (p) feats.push({ id: 'e' + k, kind: 'e', x: p.x, y: p.y }); }
  for (let k = 0; k < 7; k++) { const p = spot(); if (p) { feats.push({ id: 'm' + k, kind: 'm', x: p.x, y: p.y }); occ[I(p.x, p.y)] = 0; } }
  [2, 2, 0].forEach((ch, k) => { const p = spot(); if (p) feats.push({ id: 'k' + k, kind: 'k', x: p.x, y: p.y, ch }); });
  for (let k = 0; k < 2; k++) { const p = spot(); if (p) feats.push({ id: 'u' + k, kind: 'u', x: p.x, y: p.y, full: true }); }
  { const p = spot(); if (p) feats.push({ id: 'n0', kind: 'n', x: p.x, y: p.y }); }
  { const p = spot(); if (p) feats.push({ id: 's0', kind: 's', x: p.x, y: p.y, under: 'pod' }); }
  const lay = { key: 'c' + cell, cell, cave: true, land: L.ROCK, base: T.CFLOOR, tiles, shelter, feats };
  finishLayout(lay, R, spawnPt, occ);
  for (let i = 0; i < PW * PH; i++) if (tiles[i] === T.CFLOOR && !lay.reach[i] && !lay.feats.some(f => f.y * PW + f.x === i)) tiles[i] = T.CWALL;
  return lay;
}

export function genPlace(G, seed, key) {
  if (G.gen >= 2) return key[0] === 'c' ? genCave2(seed, +key.slice(1)) : genPatch2(G, seed, +key);
  return key[0] === 'c' ? genCave(seed, +key.slice(1)) : genPatch(G, seed, +key);
}

// ---- generator 2 (integer only) ----
// Terrain levels and stairs: today's meadow with three height levels, one-level steps, cliff edges and stairs (ramp edges) on a spanning
// tree. Integers only, so a C port gives the same worlds: every random number comes from hash() or makeRng(...).int(n), every
// sort breaks ties by the lower index, arrays are of fixed size and queues are capped at 320. No generator 2 world writes L.CLIFF.

export const LEVELS = 3;
export const EDGE = { OPEN: 0, CLIFF: 1, RAMP: 2 };          // 3 LEDGE, 4 RIVER, 5 FOREST, 6 GATE reserved for phases 2–5
export const STAIR = { W: 2, H: 2, LANDING_ROWS: 1, FACE_ROWS_PER_LEVEL: 2, JITTER: 4,
                       PER_EDGE: 1, MIN_RUN_BETWEEN: 2, PITCH: 4 };
export const CLIFF_EDGE_GAPS = 0;                              // cliff edges are solid
export const G2 = { TRIES: 8, P1: 8, P2: 4, WOOD_N: 80, ROCK_N: 48, RAMP_Q: 16384, LV_PCT: [15, 45, 40],
                    ZONE_MIN: 4, MIN_SHARE_PCT: 10, MIN_COMP_PCT: 70, START_REACH: 12, SADDLE_SCANS: 64 };
// The terrain layer of a generator 2 place: the piece kind in lay.terr, its mask or part in lay.tmask.
export const TERR = { NONE: 0, LIP: 1, FACE: 2, SIDE: 3, SHADOW: 4, STAIR: 5, LANDING: 6, FOOT: 7, APRON_TOP: 8 };

const NC = MW * MH;
const NB8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];   // N, NE, E, SE, S, SW, W, NW: a lip's mask bits
const SIDES = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];

// Value noise in Q15 (0–32767) at integer x, y >= 0 on a lattice of P.
const sm = f => (((f * f) >>> 15) * (98304 - 2 * f)) >>> 15;          // smoothstep in Q15
const lerpQ = (a, b, w) => a + (((b - a) * w) >> 15);                  // arithmetic shift (floor)
export function noiseQ(s, x, y, P) {
  const ix = (x / P) | 0, iy = (y / P) | 0, fx = (((x % P) * 32768) / P) | 0, fy = (((y % P) * 32768) / P) | 0;
  const v = (i, j) => hash(s, i, j) >>> 17, sx = sm(fx), sy = sm(fy);
  return lerpQ(lerpQ(v(ix, iy), v(ix + 1, iy), sx), lerpQ(v(ix, iy + 1), v(ix + 1, iy + 1), sx), sy); }
const n2 = (s, x, y, P1 = G2.P1, P2 = G2.P2) => ((2 * noiseQ(hash(s, 1), x, y, P1) + noiseQ(hash(s, 2), x, y, P2)) / 3) | 0;   // two octaves, lattices 8 and 4
// noiseQ over a place's tiles (0 <= x < PW, 0 <= y < PH) with each lattice value hashed once: the same numbers as noiseQ(s, x, y, P).
function noiseTab(s, P) {
  const gw = (((PW - 1) / P) | 0) + 2, gh = (((PH - 1) / P) | 0) + 2, g = new Int32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) g[j * gw + i] = hash(s, i, j) >>> 17;
  return (x, y) => { const ix = (x / P) | 0, iy = (y / P) | 0, sx = sm((((x % P) * 32768) / P) | 0), sy = sm((((y % P) * 32768) / P) | 0), k = iy * gw + ix;
    return lerpQ(lerpQ(g[k], g[k + 1], sx), lerpQ(g[k + gw], g[k + gw + 1], sx), sy); };
}

// Edges (D10): edge[2c] is the kind of cell c's east side, edge[2c + 1] of its south side.
export function edgeIndex(a, dir) {   // a is a cell, dir a DIRS key; the caller has checked the neighbour is on the map
  return dir === 'right' ? 2 * a : dir === 'left' ? 2 * (a - 1) : dir === 'down' ? 2 * a + 1 : 2 * (a - MW) + 1; }
export function edgeKindIn(G, a, dir) { return G.edge ? G.edge[edgeIndex(a, dir)] : EDGE.OPEN; }   // generator 1: every edge is open
export function canStepIn(G, a, dir) {
  const [dx, dy] = DIRS[dir], x = a % MW + dx, y = ((a / MW) | 0) + dy;
  if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
  const b = y * MW + x, k = edgeKindIn(G, a, dir);
  return passableIn(G, b) && (k === EDGE.OPEN || k === EDGE.RAMP); }   // an unknown kind blocks
// A stair's first tile along its side: i is the edge index, len PW on north and south sides, PH on east and west; seed is the world seed.
export function stairPos(seed, i, len) { return (len / 2 - 1) + (hash(seed, 'stair', i) % 9) - 4; }

const onMapXY = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const rankTop = (vals, cells, n) => cells.slice().sort((a, b) => vals[b] - vals[a] || a - b).slice(0, n);
const nearWater = (land, c) => { const x = c % MW, y = (c / MW) | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (onMapXY(x + dx, y + dy) && land[(y + dy) * MW + x + dx] === L.WATER) return true;
  return false; };

// A biome's river setting (generator 4): B.river = { axis, lo, hi, turnP, iy, n, ford } -- 'ns', 'we' or 'pick' (north or west, by the
// biome's own stream), the band the water stays in, the percent chance of a bend a step, the along-axis rows the island may take, the
// channels (the second and later each on a stream of their own; with a span, each channel covers that many rows and they meet in the rows they share) and the ford lines. It draws on streams of its own, so generators 2 and 3
// never see it.
function g4Course(sub, J) {
  const RV = makeRng(sub('rv4')), axis = J.axis === 'pick' ? (RV.int(2) ? 'ns' : 'we') : J.axis;
  const len = axis === 'ns' ? MH : MW, cross = axis === 'ns' ? MW : MH, cell = (t, a) => axis === 'ns' ? t * MW + a : a * MW + t;
  const chans = [], water = [];
  const nc = J.n || 1;
  for (let k = 0; k < nc; k++) {   // with a span, the channels each cover that many rows, the first from the start and the last to the end, and the ones between spread out: they meet in the rows they share
    const R = makeRng(sub('rc' + k)), pos = new Int32Array(len), from = J.span && nc > 1 ? ((k * (len - J.span) / (nc - 1)) | 0) : 0, to = J.span && nc > 1 ? from + J.span - 1 : len - 1;
    let p = J.lo + R.int(J.hi - J.lo + 1);
    for (let t = from; t <= to; t++) {
      if (t > from && R.int(100) < J.turnP) { const np = clamp(p + (R.int(2) ? 1 : -1), J.lo, J.hi); if (np !== p) { water.push(cell(t - 1, np)); p = np; } }
      pos[t] = p; water.push(cell(t, p));
    }
    chans.push({ pos, from, to });
  }
  // the island sits on the channel that covers its row and the two rows each side
  const lo = J.iy[0], hi = Math.min(J.iy[1], len - 3), ok = [];
  for (let t = lo; t <= hi; t++) { const j = chans.findIndex(ch => ch.from <= t - 2 && ch.to >= t + 2); if (j >= 0) ok.push([t, j]); }
  const [it, ch] = ok[RV.int(ok.length)], main = chans[ch].pos;
  return { axis, len, cross, cell, chans, water, RV, it, ix: main[it], main };
}

// A biome's height (stage 2): the noise on its lattices and a slope. The slope rises toward the mountain edge, or, for a valley, on both
// sides of the river by the cell's distance from it (rxs, the river's column in each row).
function g4Height(sub, B, rxs) {
  const H = new Int32Array(NC), sH = sub('h'), orient = sub('orient') & 3;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const xr = (orient & 1) ? MW - 1 - x : x;
    H[y * MW + x] = n2(sH, x, y, B.hP1, B.hP2) + (B.valley ? ((B.rampQ * Math.abs(x - rxs[y]) / 8) | 0) : ((B.rampQ * xr / 15) | 0)); }
  return H;
}

// Stage 1: base land, today's meadow made integer.
// B is a biome's ground (generator 4, BIOME_GROUND); without one this is generator 2's land to the bit.
function g2Land(sub, B) {
  const at = (x, y) => y * MW + x;
  const land = new Uint8Array(NC), ford = new Uint8Array(NC), island = new Uint8Array(NC);
  const m = new Int32Array(NC), r = new Int32Array(NC), sM = sub('m'), sR = sub('r'), all = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { m[at(x, y)] = n2(sM, x, y, B ? B.mP1 : undefined, B ? B.mP2 : undefined); r[at(x, y)] = n2(sR, x, y); }
  for (let c = 0; c < NC; c++) all.push(c);
  const C = B && B.river ? g4Course(sub, B.river) : null, H = C ? g4Height(sub, B, C.chans[0].pos) : null;   // a biome's height is made here: its rock may stand on the high ground
  if (H && B.woodLow) for (let c = 0; c < NC; c++) m[c] -= (H[c] * B.woodLow) >> 3;   // wood prefers the low ground
  for (const c of rankTop(m, all, B ? B.wood : G2.WOOD_N)) land[c] = L.WOOD;
  if (H && B.rockHigh) for (let c = 0; c < NC; c++) r[c] += H[c];
  for (const c of rankTop(r, all.filter(c => land[c] !== L.WOOD), B ? B.rock : G2.ROCK_N)) land[c] = L.ROCK;
  const R = makeRng(sub('river'));
  const smallLakes = RL => {   // a biome's small lakes of one or two cells
    for (let k = 0, tries = 0; k < B.lakes && tries < 400; tries++) {
      const x = 1 + RL.int(MW - 2), y = 1 + RL.int(MH - 2), c = at(x, y), two = RL.int(100) < B.lakeTwo, dx = RL.int(2), c2 = dx ? c + 1 : c + MW;
      const free = d => land[d] !== L.WATER && !island[d] && !ford[d] && land[d] !== L.CLIFF;
      if (!free(c) || (two && (!free(c2) || (dx && x + 1 >= MW - 1) || (!dx && y + 1 >= MH - 1)))) continue;
      land[c] = L.WATER; if (two) land[c2] = L.WATER; k++;
    }
  };
  if (B && B.river) {   // the biome's own course, island row and fords
    const J = B.river, { RV, it, ix } = C, pos0 = C.main;
    for (const c of C.water) land[c] = L.WATER;
    for (let t = it - 1; t <= it + 1; t++) for (let a = ix - 1; a <= ix + 2; a++) land[C.cell(t, clamp(a, 0, C.cross - 1))] = L.WATER;
    land[C.cell(it - 1, pos0[it - 2])] = L.WATER; land[C.cell(it + 1, pos0[it + 2])] = L.WATER;
    land[C.cell(it, ix)] = L.MEADOW; land[C.cell(it, ix + 1)] = RV.int(2) ? L.WOOD : L.MEADOW;
    island[C.cell(it, ix)] = 1; island[C.cell(it, ix + 1)] = 1;
    // a ford line is a whole row (or column) of the water; it keeps two lines clear of the island
    const fordLine = a => { for (let b = 0; b < C.cross; b++) { const c = C.cell(a, b); if (land[c] === L.WATER) ford[c] = 1; } };
    const clear = a => { a = clamp(a, 1, C.len - 2); while (Math.abs(a - it) <= 2) a += a >= it ? 1 : -1; return clamp(a, 1, C.len - 2); };
    for (let k = 0; k < J.ford; k++) fordLine(clear((J.ford > 1 ? 1 + ((k * (C.len - 5) / (J.ford - 1)) | 0) : (C.len >> 1) - 1) + RV.int(3)));
    const RF = makeRng(sub('fords'));
    for (let k = 0; k < B.fords; k++) fordLine(clear(4 + 3 * k + RF.int(2)));
    const lx = 1 + RV.int(5), ly = 12 + RV.int(6); if (J.lake !== 0) land[at(lx, ly)] = L.WATER;   // generator 2's one-cell lake, unless the biome has none
    smallLakes(makeRng(sub('lakes')));
    if (B.pools) {   // grown pools: each from a seed cell on the low ground or two cells from the water, by 4-neighbour steps that prefer the cell with the most of its own pool on its sides (twice) and around it
      const RP = makeRng(sub('pools')), inner = c => { const x = c % MW, y = (c / MW) | 0; return x >= 1 && y >= 1 && x < MW - 1 && y < MH - 1; };
      const nb8 = c => NB8.map(([dx, dy]) => [c % MW + dx, ((c / MW) | 0) + dy]).filter(([x, y]) => onMapXY(x, y)).map(([x, y]) => y * MW + x);
      const dry = []; for (let c = 0; c < NC; c++) if (inner(c) && land[c] !== L.WATER && !island[c]) dry.push(c);
      const lowest = new Set(dry.slice().sort((a, b) => H[a] - H[b] || a - b).slice(0, (dry.length / 4) | 0));
      const bare = (c, own) => land[c] !== L.WATER ? true : own.has(c);   // a cell whose water, if any, is its own pool's
      const okCell = (c, own) => inner(c) && land[c] !== L.WATER && !island[c] && !ford[c] && nb8(c).every(d => bare(d, own));
      // a straight run of 3 or more cells, one wide: each cell has no pool cell above and below (or left and right) of it
      const bar = P => { const has = (x, y) => P.has(y * MW + x);
        for (const c of P) { const x = c % MW, y = (c / MW) | 0;
          if (has(x + 1, y) && has(x + 2, y) && [0, 1, 2].every(i => !has(x + i, y - 1) && !has(x + i, y + 1))) return true;
          if (has(x, y + 1) && has(x, y + 2) && [0, 1, 2].every(i => !has(x - 1, y + i) && !has(x + 1, y + i))) return true; }
        return false; };
      const nb4 = c => NB8.filter((_, i) => i % 2 === 0).map(([dx, dy]) => [c % MW + dx, ((c / MW) | 0) + dy]).filter(([x, y]) => onMapXY(x, y)).map(([x, y]) => y * MW + x);
      // a cross or a T: a cell with 3 or more pool sides, two of whose side cells have only the one pool side of their own
      const fork = P => { for (const c of P) { const sd = nb4(c).filter(d => P.has(d)); if (sd.length >= 3 && sd.filter(d => nb4(d).filter(e => P.has(e)).length === 1).length >= 2) return true; } return false; };
      for (let k = 0, tries = 0; k < B.pools && tries < 400; tries++) {
        const none = new Set(), seeds = dry.filter(c => okCell(c, none) && (lowest.has(c) || nb8(c).some(d => nb8(d).some(e => land[e] === L.WATER))));
        if (!seeds.length) break;
        const P = new Set([seeds[RP.int(seeds.length)]]), size = B.poolMin + RP.int(B.poolMax - B.poolMin + 1);
        while (P.size < size) {
          const score = new Map();
          for (const c of P) for (const d of nb4(c)) if (!P.has(d) && okCell(d, P) && !score.has(d)) score.set(d, 2 * nb4(d).filter(e => P.has(e)).length + nb8(d).filter(e => P.has(e)).length);
          if (!score.size) break;
          const best = Math.max(...score.values()), top = [...score].filter(([, v]) => v === best).map(([d]) => d).sort((a, b) => a - b);
          P.add(top[RP.int(top.length)]);
        }
        if (P.size < B.poolMin || bar(P) || fork(P)) continue;
        for (const c of P) land[c] = L.WATER;
        k++;
      }
    }
  } else {
    const rxs = new Int32Array(MH);
    let rx = 9 + R.int(3);
    for (let y = 0; y < MH; y++) {
      if (y > 0 && R.int(100) < 45) { const nx = clamp(rx + (R.int(2) ? 1 : -1), 8, 13); if (nx !== rx) { land[at(nx, y - 1)] = L.WATER; rx = nx; } }
      land[at(rx, y)] = L.WATER; rxs[y] = rx;
    }
    const iy = 11 + R.int(3), ix = rxs[iy];
    for (let y = iy - 1; y <= iy + 1; y++) for (let x = ix - 1; x <= ix + 2; x++) land[at(clamp(x, 0, MW - 1), y)] = L.WATER;
    land[at(rxs[iy - 2], iy - 1)] = L.WATER; land[at(rxs[iy + 2], iy + 1)] = L.WATER;
    land[at(ix, iy)] = L.MEADOW; land[at(ix + 1, iy)] = R.int(2) ? L.WOOD : L.MEADOW;
    island[at(ix, iy)] = 1; island[at(ix + 1, iy)] = 1;
    for (const fy of [1 + R.int(3), 16 + R.int(3)]) for (let x = 0; x < MW; x++) if (land[at(x, fy)] === L.WATER) ford[at(x, fy)] = 1;
    const lx = 1 + R.int(5), ly = 12 + R.int(6);
    land[at(lx, ly)] = L.WATER;
    if (B) {   // a biome's own streams, so nothing above moves: more fords, then small lakes
      const RF = makeRng(sub('fords')), RL = makeRng(sub('lakes'));
      for (let k = 0; k < B.fords; k++) { const fy = 4 + 3 * k + RF.int(2); for (let x = 0; x < MW; x++) if (land[at(x, fy)] === L.WATER) ford[at(x, fy)] = 1; }
      smallLakes(RL);
    }
  }
  const wetRing = B && B.ring8 ? NB8 : SIDES.map(([, dx, dy]) => [dx, dy]);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = at(x, y); if (land[c] === L.WATER || island[c]) continue;
    let wet = false;
    for (const [dx, dy] of wetRing) { const X = x + dx, Y = y + dy; if (onMapXY(X, Y) && land[at(X, Y)] === L.WATER && !ford[at(X, Y)]) wet = true; }
    if (wet && (land[c] === L.MEADOW || R.int(100) < (B ? B.pondP : 35))) land[c] = L.POND;
  }
  return { land, ford, island, H };
}

// The exact closure: two raster passes, so that every pair of 8-neighbours differs by at most 1. It only lowers cells.
function g2Close(lv) {
  const mn = (c, n) => { if (lv[n] + 1 < lv[c]) lv[c] = lv[n] + 1; };
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    if (x > 0) mn(c, c - 1); if (x > 0 && y > 0) mn(c, c - MW - 1); if (y > 0) mn(c, c - MW); if (x < MW - 1 && y > 0) mn(c, c - MW + 1); }
  for (let c = NC - 1; c >= 0; c--) { const x = c % MW, y = (c / MW) | 0;
    if (x < MW - 1) mn(c, c + 1); if (x < MW - 1 && y < MH - 1) mn(c, c + MW + 1); if (y < MH - 1) mn(c, c + MW); if (x > 0 && y < MH - 1) mn(c, c + MW - 1); }
}
const isSaddle = (lv, a) => { const b = a + 1, c = a + MW, d = a + MW + 1; return lv[a] === lv[d] && lv[b] === lv[c] && lv[a] !== lv[b]; };
function g2Saddles(lv) {
  for (let k = 0; k < G2.SADDLE_SCANS; k++) {
    let fixed = 0;
    for (let y = 0; y < MH - 1; y++) for (let x = 0; x < MW - 1; x++) { const a = y * MW + x;
      if (!isSaddle(lv, a)) continue;
      if (lv[a] > lv[a + 1]) lv[a + MW + 1]--; else lv[a + MW]--;   // the higher pair's larger-index cell
      fixed++; }
    if (!fixed) return;
    g2Close(lv);
  }
}
// Zones: 4-connected groups of passable, non-island cells of one level, numbered in cell-index scan order.
function g2Zones(Gp, lv) {
  const id = new Int16Array(NC).fill(-1), q = new Int16Array(NC), cells = [], lvOf = [];
  for (let s = 0; s < NC; s++) {
    if (id[s] >= 0 || !passableIn(Gp, s) || Gp.island[s]) continue;
    const z = cells.length, list = []; let h = 0, t = 0; q[t++] = s; id[s] = z;
    while (h < t) { const c = q[h++], x = c % MW, y = (c / MW) | 0; list.push(c);
      for (const [, dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (!onMapXY(X, Y)) continue; const d = Y * MW + X;
        if (id[d] < 0 && passableIn(Gp, d) && !Gp.island[d] && lv[d] === lv[s]) { id[d] = z; q[t++] = d; } } }
    cells.push(list); lvOf.push(lv[s]);
  }
  return { id, cells, lvOf, n: cells.length };
}
// Stage 3 step 5: a small zone whose bordering zones all have one level takes it (not upward beside water). Up to 4 rounds.
function g2SmallZones(Gp, lv, zoneMin = G2.ZONE_MIN) {
  for (let round = 0; round < 4; round++) {
    const Z = g2Zones(Gp, lv); let changed = false;
    for (let z = 0; z < Z.n; z++) {
      if (Z.cells[z].length >= zoneMin) continue;
      let to = -1, mixed = false, wet = false;
      for (const c of Z.cells[z]) { const x = c % MW, y = (c / MW) | 0; if (nearWater(Gp.land, c)) wet = true;
        for (const [, dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (!onMapXY(X, Y)) continue; const o = Z.id[Y * MW + X];
          if (o < 0 || o === z) continue; if (to < 0) to = Z.lvOf[o]; else if (to !== Z.lvOf[o]) mixed = true; } }
      if (to < 0 || mixed || (to !== 0 && wet)) continue;
      for (const c of Z.cells[z]) lv[c] = to;
      changed = true;
    }
    if (!changed) break;
    g2Close(lv);
  }
  g2Saddles(lv);
}
// Stage 6: the largest 4-connected set under canStepIn; ties keep the lowest start.
function g2Comp(Gp) {
  const seen = new Int16Array(NC).fill(-1), q = new Int16Array(NC), comp = new Uint8Array(NC); let best = -1, bestN = 0;
  for (let s = 0; s < NC; s++) {
    if (seen[s] >= 0 || !passableIn(Gp, s)) continue;
    let h = 0, t = 0; q[t++] = s; seen[s] = s;
    while (h < t) { const c = q[h++], x = c % MW, y = (c / MW) | 0;
      for (const [dir, dx, dy] of SIDES) { if (!canStepIn(Gp, c, dir)) continue; const d = (y + dy) * MW + x + dx; if (seen[d] < 0) { seen[d] = s; q[t++] = d; } } }
    if (t > bestN) { bestN = t; best = s; }
  }
  for (let c = 0; c < NC; c++) comp[c] = seen[c] === best && best >= 0 ? 1 : 0;
  return comp;
}
// The cells reachReach would give from c within Chebyshev r: a BFS over canStepIn, without the island.
function g2ReachCount(Gp, c0, r) {
  const seen = new Uint8Array(NC), q = new Int16Array(NC), x0 = c0 % MW, y0 = (c0 / MW) | 0; let h = 0, t = 0; q[t++] = c0; seen[c0] = 1;
  while (h < t) { const c = q[h++], x = c % MW, y = (c / MW) | 0;
    for (const [dir, dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (!onMapXY(X, Y)) continue; const d = Y * MW + X;
      if (seen[d] || !canStepIn(Gp, c, dir) || Gp.island[d] || Math.max(Math.abs(X - x0), Math.abs(Y - y0)) > r) continue; seen[d] = 1; q[t++] = d; } }
  return t;
}

// One attempt t (0–7; 8 is the fallback). Returns the world, or null when a set piece has no cell.
function g2Attempt(seed, t, B) {
  const s0 = B && B.name ? hash(seed, 'g4', B.name, t) : hash(seed, 'g2', t), sub = k => hash(s0, k), fallback = t === G2.TRIES;
  const { land, ford, island, H: H4 } = g2Land(sub, B);
  const orient = hash(s0, 'orient') & 3, lv = new Uint8Array(NC), edge = new Uint8Array(2 * NC);
  const Gp = { land, ford, island, edge };
  let Z = null;
  if (!fallback) {
    // Stage 2: height, rising toward the mountain edge (east, or west when orient bit 0 is set).
    const H = H4 || new Int32Array(NC), sH = sub('h');
    if (!H4) for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const xr = (orient & 1) ? MW - 1 - x : x; H[y * MW + x] = n2(sH, x, y) + ((G2.RAMP_Q * xr / 15) | 0); }
    // Stage 3: levels by rank, the water ring, the closure, saddles, small zones.
    const dry = []; for (let c = 0; c < NC; c++) if (land[c] !== L.WATER) dry.push(c);
    dry.sort((a, b) => H[a] - H[b] || a - b);
    const lvp = B ? B.lv : G2.LV_PCT, q0 = (dry.length * lvp[0] / 100) | 0, q1 = (dry.length * (lvp[0] + lvp[1]) / 100) | 0;
    dry.forEach((c, i) => { lv[c] = i < q0 ? 0 : i < q1 ? 1 : 2; });
    for (let c = 0; c < NC; c++) if (nearWater(land, c)) lv[c] = 0;
    g2Close(lv);
    g2Saddles(lv);
    g2SmallZones(Gp, lv, B ? B.zoneMin : G2.ZONE_MIN);
    Z = g2Zones(Gp, lv);
  } else {
    // The fallback: every level 0, one mouth cell raised to 1.
    const cand = [];
    for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
      if (x >= 1 && x <= MW - 2 && y <= MH - 2 && land[c] !== L.WATER && land[c + MW] !== L.WATER && !island[c + MW] && !nearWater(land, c)) cand.push(c); }
    if (!cand.length) return null;
    lv[cand[makeRng(sub('flat')).int(cand.length)]] = 1;
  }
  // Stage 4: edges.
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    if (x < MW - 1 && lv[c] !== lv[c + 1]) edge[2 * c] = EDGE.CLIFF;
    if (y < MH - 1 && lv[c] !== lv[c + MW]) edge[2 * c + 1] = EDGE.CLIFF; }
  // Stage 5: ramps by spanning tree over the zones (Kruskal on hashed keys).
  if (!fallback) {
    const cand = [];
    for (let i = 0; i < 2 * NC; i++) { if (edge[i] !== EDGE.CLIFF) continue; const a = i >> 1, b = (i & 1) ? a + MW : a + 1;
      if (passableIn(Gp, a) && passableIn(Gp, b) && !island[a] && !island[b]) cand.push({ i, a, b, key: hash(s0, 'ramp', i) }); }
    cand.sort((p, q) => p.key - q.key || p.i - q.i);
    const up = new Int16Array(Z.n); for (let z = 0; z < Z.n; z++) up[z] = z;
    const find = z => { while (up[z] !== z) z = up[z]; return z; };
    for (const e of cand) { const ra = find(Z.id[e.a]), rb = find(Z.id[e.b]); if (ra === rb) continue; up[ra < rb ? rb : ra] = ra < rb ? ra : rb; edge[e.i] = EDGE.RAMP; }
    if (B && B.extraStairs) {   // a biome's own stairs besides the spanning tree's: extraStairs percent as many again, on cliff edges, each clear of a stair beside it on the same wall
      let have = 0; for (let i = 0; i < 2 * NC; i++) if (edge[i] === EDGE.RAMP) have++;
      const along = i => (i & 1) ? [i - 2, i + 2] : [i - 2 * MW, i + 2 * MW];
      for (let k = 0, want = ((have * B.extraStairs + 50) / 100) | 0; k < want;) {
        const pick = cand.filter(e => edge[e.i] === EDGE.CLIFF && land[e.a] !== L.WATER && land[e.b] !== L.WATER && along(e.i).every(j => j < 0 || j >= 2 * NC || edge[j] !== EDGE.RAMP))
          .sort((p, q) => hash(s0, 'xramp', p.i) - hash(s0, 'xramp', q.i) || p.i - q.i)[0];
        if (!pick) break; edge[pick.i] = EDGE.RAMP; k++;
      }
    }
  }
  const cross = [];
  for (let i = 0; i < 2 * NC; i++) if (edge[i] === EDGE.RAMP) cross.push({ c: i >> 1, side: (i & 1) ? 's' : 'e', kind: 'ramp' });
  // Stage 6.
  const comp = g2Comp(Gp);
  // Stage 7: set pieces, each with its own generator.
  const RG = makeRng(sub('gate')), gc = [];
  for (let c = MW; c < NC; c++) { const x = c % MW;
    if (x >= 1 && x <= MW - 2 && edge[2 * (c - MW) + 1] === EDGE.CLIFF && lv[c - MW] === lv[c] + 1 && comp[c] && land[c] !== L.WATER && land[c - MW] !== L.WATER) gc.push(c); }
  if (!gc.length) return null;
  const gate = gc[RG.int(gc.length)], mouth = gate - MW;
  land[gate] = L.ROCK;
  { const gx = gate % MW, gy = (gate / MW) | 0;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) { const X = gx + dx, Y = gy + dy; if (!onMapXY(X, Y)) continue; const c = Y * MW + X;
      if (land[c] !== L.WATER && RG.int(100) < 60) land[c] = L.ROCK; } }
  const RD = makeRng(sub('deep')), rocks = [];
  for (let c = 0; c < NC; c++) if (comp[c] && c !== gate && land[c] === L.ROCK && cdist(c, gate) >= 5) rocks.push(c);
  if (!rocks.length) for (let c = 0; c < NC; c++) if (comp[c] && land[c] !== L.WATER && cdist(c, gate) >= 5) rocks.push(c);
  if (!rocks.length) return null;
  const deep = rocks[RD.int(rocks.length)]; land[deep] = L.ROCK;
  // The swimmer gate: generator 1's rule.
  let swim = -1, swimDir = null;
  { const isl = []; for (let c = 0; c < NC; c++) if (island[c]) isl.push(cxy(c));
    const sc = [];
    for (let c = 0; c < NC; c++) {
      if (!comp[c] || land[c] === L.WATER || c === gate || c === deep || island[c]) continue;
      const p = cxy(c);
      for (const [dn, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
        const X = p.x + dx, Y = p.y + dy; if (!onMapXY(X, Y)) continue; const w = Y * MW + X;
        if (land[w] !== L.WATER || ford[w]) continue;
        const d = Math.min(...isl.map(i => cheb(i, { x: X, y: Y })));
        if (d <= 1) sc.push({ c, dn, k: d * 100 + Math.min(...isl.map(i => man(i, p))) * 10 + (dn === 'left' || dn === 'right' ? 0 : 1) });
      }
    }
    sc.sort((a, b) => a.k - b.k || a.c - b.c);
    if (sc.length) { swim = sc[0].c; swimDir = sc[0].dn; } }
  // Start glints: one near the gate, the rest spread out.
  const RS = makeRng(sub('spawn')), spawns = [];
  const ok = c => { if (!comp[c] || c === gate || c === deep || land[c] === L.WATER) return false;
    const x = c % MW, y = (c / MW) | 0; let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (onMapXY(X, Y) && passableIn(Gp, Y * MW + X) && lv[Y * MW + X] === lv[c]) n++; }
    return n >= 6 && g2ReachCount(Gp, c, 2) >= G2.START_REACH; };
  const sc = []; for (let c = 0; c < NC; c++) if (ok(c)) sc.push(c);
  const near = sc.filter(c => cdist(c, gate) >= 2 && cdist(c, gate) <= 4);
  if (near.length) spawns.push(near[RS.int(near.length)]);
  const sh = sc.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = RS.int(i + 1), v = sh[i]; sh[i] = sh[j]; sh[j] = v; }
  for (const c of sh) { if (spawns.length >= 5) break; if (spawns.every(s => cdist(s, c) >= 5)) spawns.push(c); }
  // Glow neighbours: generator 1's rule, on the spawn's level.
  const glow = [];
  for (const s of spawns) {
    const p = cxy(s), nb = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = p.x + dx, y = p.y + dy; if ((!dx && !dy) || !onMapXY(x, y)) continue;
      const c = y * MW + x; if (comp[c] && passableIn(Gp, c) && land[c] !== L.WATER && c !== gate && c !== deep && c !== swim && !island[c] && !spawns.includes(c) && lv[c] === lv[s]) nb.push(c); }
    if (!nb.length) continue;
    let c = nb.find(n => land[n] === L.ROCK || land[n] === L.WOOD);
    if (c == null) { c = nb[0]; land[c] = L.ROCK; }
    if (!glow.includes(c)) glow.push(c);
  }
  // Beacons and outposts, computed here in the memo shape beaconCells and depotCells return.
  const bset = new Set();
  for (let c = 0; c < NC; c++) { if ((land[c] !== L.ROCK && land[c] !== L.MEADOW) || !comp[c]) continue;
    const cr = makeRng(hash(s0, 'cairn', c)); if (cr.int(100) >= (land[c] === L.ROCK ? 35 : 8)) continue;
    const p = cxy(c); let close = false; for (const b of bset) if (cheb(p, cxy(b)) <= 2) { close = true; break; }
    if (!close) bset.add(c); }
  const dc = [], dset = new Set();
  for (let c = 0; c < NC; c++) if (comp[c] && land[c] !== L.WATER && !island[c] && c !== gate && c !== deep && c !== swim && !bset.has(c)) dc.push({ c, k: hash(s0, 'depot', c) });
  dc.sort((a, b) => a.k - b.k || a.c - b.c);
  for (const { c } of dc) { if (dset.size >= 6) break; const p = cxy(c); if ([...dset].every(d => cheb(p, cxy(d)) >= 5)) dset.add(c); }
  return { seed, land, ford, island, gate, mouth, deep, swim, swimDir, spawns, comp, glow, gen: 2, attempt: t, orient, level: lv, edge, cross,
    beacons: { seed, set: bset }, depots: { seed, set: dset } };
}

// An attempt passes when all of these hold; the fallback is not held to the level shares or the ramp count.
function g2Check(G, fallback) {
  const lv = G.level, land = G.land, comp = G.comp, bad = [];
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy] of NB8) { const X = x + dx, Y = y + dy; if (!onMapXY(X, Y)) continue; const n = Y * MW + X;
      if (Math.abs(lv[c] - lv[n]) > 1) bad.push('step'); if (land[c] === L.WATER && lv[n] !== 0) bad.push('ring'); }
    if (land[c] === L.WATER && lv[c] !== 0) bad.push('ring');
    if (x < MW - 1 && y < MH - 1 && isSaddle(lv, c)) bad.push('saddle'); }
  for (let Y = 0; Y <= MH; Y++) for (let X = 0; X <= MW; X++) { let ranks = 0;
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) { const x = X + dx, y = Y + dy; if (!onMapXY(x, y)) continue; const c = y * MW + x;
      ranks |= 1 << (land[c] === L.WATER ? 0 : 1 + lv[c]); }
    if (((ranks & 1) + ((ranks >> 1) & 1) + ((ranks >> 2) & 1) + ((ranks >> 3) & 1)) > 2) bad.push('corner'); }
  if (!(G.gate >= 0)) bad.push('gate');
  if (G.spawns.length !== 5 || !(cdist(G.spawns[0], G.gate) >= 2 && cdist(G.spawns[0], G.gate) <= 4)) bad.push('spawns');
  const inComp = c => c >= 0 && comp[c] === 1;
  if (!inComp(G.deep) || !G.spawns.every(inComp) || !G.glow.every(inComp) || (G.swim >= 0 && !inComp(G.swim)) ||
      ![...G.beacons.set].every(inComp) || G.depots.set.size !== 6 || ![...G.depots.set].every(inComp)) bad.push('comp');
  let dry = 0, dryComp = 0; const per = [0, 0, 0];
  for (let c = 0; c < NC; c++) if (land[c] !== L.WATER && !G.island[c]) { dry++; if (comp[c]) dryComp++; per[lv[c]]++; }
  if (dryComp * 100 < G2.MIN_COMP_PCT * dry) bad.push('compShare');
  if (!fallback) {
    if (per.some(n => n * 100 < G2.MIN_SHARE_PCT * dry)) bad.push('share');
    if (G.cross.length < 1) bad.push('ramps');
  }
  return [...new Set(bad)];
}

export function genWorld2(seed) {
  for (let t = 0; t < G2.TRIES; t++) { const G = g2Attempt(seed, t); if (G && !g2Check(G, false).length) return G; }
  const G = g2Attempt(seed, G2.TRIES);
  if (G && !g2Check(G, true).length) return G;
  throw new RangeError('generator 2: no valid world for seed ' + seed);
}

// finishLayout with squared distances, ties by tile index; faces and lips count as wet beside a slab.
function finishLayout2(lay, spawnPt0) {
  let spawnPt = spawnPt0;
  const { tiles, feats } = lay, I = (x, y) => y * PW + x, NP = PW * PH, FAR = 1 << 30, DV = Object.values(DIRS);
  const solid = new Uint8Array(NP);
  for (let i = 0; i < NP; i++) solid[i] = T_BLOCK[tiles[i]];
  for (const f of feats) if (!DECOR.includes(f.kind)) solid[I(f.x, f.y)] = 1;
  const comp = new Int16Array(NP).fill(-1); let best = -1, bestN = 0;
  for (let s0 = 0; s0 < NP; s0++) {
    if (solid[s0] || comp[s0] >= 0) continue; let n = 0; const st = [s0]; comp[s0] = s0;
    while (st.length) { const i = st.pop(), x = i % PW, y = (i / PW) | 0; n++;
      for (const [dx, dy] of DV) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue; const j = I(X, Y); if (!solid[j] && comp[j] < 0) { comp[j] = s0; st.push(j); } } }
    if (n > bestN) { bestN = n; best = s0; }
  }
  const reach = new Uint8Array(NP);
  for (let i = 0; i < NP; i++) if (comp[i] === best && best >= 0) reach[i] = 1;
  if (!reach[I(spawnPt.x, spawnPt.y)]) { let bd = FAR, bp = spawnPt;
    for (let i = 0; i < NP; i++) if (reach[i]) { const x = i % PW, y = (i / PW) | 0, d = (x - spawnPt.x) * (x - spawnPt.x) + (y - spawnPt.y) * (y - spawnPt.y); if (d < bd) { bd = d; bp = { x, y }; } }
    spawnPt = bp; }
  { const wet = t => t === T.WATER || t === T.DEEP || t === T.CLIFF || t === T.CWALL || t === T.ISLE || t === T.FACE || t === T.LIP;
    const ok = (x, y) => { if (x < 2 || y < 2 || x >= PW - 2 || y >= PH - 2) return false;
      let w = 0; for (const [dx, dy] of DV) if (wet(tiles[I(x + dx, y + dy)])) w++;
      if (w > 1) return false;
      return DV.some(([dx, dy]) => { const tx = x + dx, ty = y + dy, sx = x - dx, sy = y - dy; return !solid[I(tx, ty)] && tiles[I(tx, ty)] !== T.STEP && tx >= 1 && ty >= 1 && tx < PW - 1 && ty < PH - 1 && reach[I(sx, sy)] && !solid[I(sx, sy)]; }); };
    for (const f of feats) { if (f.kind !== 's' || ok(f.x, f.y)) continue;
      solid[I(f.x, f.y)] = 0; let bd = FAR, bp = null;
      for (let i = 0; i < NP; i++) { const x = i % PW, y = (i / PW) | 0; if (solid[i] || !reach[i] || tiles[i] === T.STEP || (x === spawnPt.x && y === spawnPt.y)) continue; solid[i] = 1; const good = ok(x, y); solid[i] = 0;
        if (good) { const d = Math.abs(x - f.x) + Math.abs(y - f.y); if (d < bd) { bd = d; bp = { x, y }; } } }
      if (bp) { f.x = bp.x; f.y = bp.y; } solid[I(f.x, f.y)] = 1; reach[I(f.x, f.y)] = 0; } }
  lay.feats = feats.filter(f => DECOR.includes(f.kind) || f.kind === 'g' ||
    DV.some(([dx, dy]) => { const x = f.x + dx, y = f.y + dy; return x >= 0 && y >= 0 && x < PW && y < PH && reach[I(x, y)]; }));
  lay.reach = reach; lay.spawnPt = spawnPt;
  const sd = new Int16Array(NP).fill(999), sq = [];
  for (let i = 0; i < NP; i++) if (lay.shelter[i] && !T_BLOCK[tiles[i]]) { sd[i] = 0; sq.push(i); }
  for (let h = 0; h < sq.length; h++) { const i = sq[h], x = i % PW, y = (i / PW) | 0;
    for (const [dx, dy] of DV) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue; const j = I(X, Y); if (sd[j] > sd[i] + 1 && !T_BLOCK[tiles[j]]) { sd[j] = sd[i] + 1; sq.push(j); } } }
  lay.sdist = sd;
  return lay;
}

// The terrain bands of a place: kind, mask and tile code for each tile on the outer two rows and columns.
function g2Bands(G, cell, tiles, terr, tmask) {
  const cx = cell % MW, cy = (cell / MW) | 0, l = G.level[cell], I = (x, y) => y * PW + x;
  const onMap = (dx, dy) => onMapXY(cx + dx, cy + dy);
  const lvAt = (dx, dy) => onMap(dx, dy) ? G.level[(cy + dy) * MW + cx + dx] : l;   // off the map, the edge is never a drop
  const N = lvAt(0, -1), S = lvAt(0, 1), W = lvAt(-1, 0), E = lvAt(1, 0), NW = lvAt(-1, -1), NE = lvAt(1, -1), SW = lvAt(-1, 1), SE = lvAt(1, 1);
  const set = (x, y, kind, m, code) => { const i = I(x, y); terr[i] = kind; tmask[i] = m; if (code >= 0) tiles[i] = code; };
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    if (x > 1 && x < PW - 2 && y > 1 && y < PH - 2) continue;
    let m = 0;
    for (let b = 0; b < 8; b++) { const X = x + NB8[b][0], Y = y + NB8[b][1], dx = X < 0 ? -1 : X >= PW ? 1 : 0, dy = Y < 0 ? -1 : Y >= PH ? 1 : 0;
      if ((dx || dy) && lvAt(dx, dy) < l) m |= 1 << b; }
    if (m) { set(x, y, TERR.LIP, m, T.LIP); continue; }
    if (y <= 1 && N > l) { let b = y === 1 ? 1 : 0;
      if (x === 0) { if (W > l) b |= 8; else if (!(W === l && NW > l)) b |= 2; }
      if (x === PW - 1) { if (E > l) b |= 16; else if (!(E === l && NE > l)) b |= 4; }
      set(x, y, TERR.FACE, b, T.FACE); continue; }
    const west = x === 0 && W > l, east = x === PW - 1 && E > l;
    if (west || east) { let b = west ? 1 : 0; const hiN = west ? NW : NE, hiS = west ? SW : SE;
      if (y === 0 && !(N === l && hiN > l)) b |= 2;
      if (y === PH - 1 && !(S === l && hiS > l)) { b |= 4; if (S === l && onMap(west ? -1 : 1, 1) && hiS === l) b |= 8; }
      set(x, y, TERR.SIDE, b, T.FACE); continue; }
    if (y <= 1 && x === 0 && NW > l && N === l && onMap(-1, 0) && W === l) { set(x, y, TERR.SIDE, 1 | 16 | (y === 1 ? 4 : 0), T.FACE); continue; }   // bit 4: the side tail
    if (y <= 1 && x === PW - 1 && NE > l && N === l && onMap(1, 0) && E === l) { set(x, y, TERR.SIDE, 16 | (y === 1 ? 4 : 0), T.FACE); continue; }
    if (y === PH - 1 && S > l) set(x, y, TERR.SHADOW, 0, -1);
  }
}
// The stairs of a place, one per ramp side, with their entry tiles.
function g2Stairs(G, seed, cell, tiles, terr, tmask) {
  const cx = cell % MW, cy = (cell / MW) | 0, l = G.level[cell], stairs = [];
  for (const [dir, dx, dy] of SIDES) {
    if (!onMapXY(cx + dx, cy + dy)) continue;
    const i = edgeIndex(cell, dir); if (G.edge[i] !== EDGE.RAMP) continue;
    const lo = G.level[(cy + dy) * MW + cx + dx] > l;
    const facing = dir === 'up' ? (lo ? 'S' : 'N') : dir === 'down' ? (lo ? 'N' : 'S') : dir === 'left' ? (lo ? 'E' : 'W') : (lo ? 'W' : 'E');
    const vertical = dir === 'up' || dir === 'down', s = stairPos(seed, i, vertical ? PW : PH);
    const xy = (k, d) => ({ x: dir === 'left' ? d : dir === 'right' ? PW - 1 - d : k, y: dir === 'up' ? d : dir === 'down' ? PH - 1 - d : k });
    const put = (k, d, kind, m, code) => { const p = xy(k, d), j = p.y * PW + p.x; terr[j] = kind; tmask[j] = m; tiles[j] = code; };
    const fc = { S: 0, N: 1, E: 2, W: 3 }[facing] << 4;
    const stair = depth => { const ps = []; for (let d = 0; d < depth; d++) for (let k = s; k <= s + 1; k++) ps.push(xy(k, d));
      const x0 = Math.min(...ps.map(p => p.x)), y0 = Math.min(...ps.map(p => p.y));
      for (const p of ps) { const j = p.y * PW + p.x; terr[j] = TERR.STAIR; tmask[j] = fc | ((p.y - y0) * 2 + (p.x - x0)); tiles[j] = T.STAIR; } };
    let ed;
    if (lo && facing === 'N') { put(s, 0, TERR.FOOT, 0, T.APRON); put(s + 1, 0, TERR.FOOT, 1, T.APRON); ed = 0; }
    else if (lo) { stair(2); put(s, 2, TERR.FOOT, 0, T.APRON); put(s + 1, 2, TERR.FOOT, 1, T.APRON); ed = 2; }
    else if (facing === 'N') { stair(1); put(s, 1, TERR.APRON_TOP, 0, T.APRON); put(s + 1, 1, TERR.APRON_TOP, 1, T.APRON); ed = 1; }
    else { put(s, 0, TERR.LANDING, 0, T.APRON); put(s + 1, 0, TERR.LANDING, 1, T.APRON); ed = 0; }
    stairs.push({ dir, facing, role: lo ? 'lo' : 'hi', s, entry: xy(s, ed) });
  }
  return stairs;
}

export function genPatch2(G, seed, cell) {
  const R = makeRng(hash(seed, 'p2', cell)), ns = hash(seed, 'pn2', cell), NP = PW * PH;
  const land = G.land[cell], { x: cx, y: cy } = cxy(cell), isFord = land === L.WATER;
  const tiles = new Uint8Array(NP), shelter = new Uint8Array(NP), feats = [], occ = new Uint8Array(NP);
  const terr = new Uint8Array(NP), tmask = new Uint8Array(NP), resv = new Uint8Array(NP);
  const I = (x, y) => y * PW + x, inb = (x, y) => x >= 0 && y >= 0 && x < PW && y < PH;
  const setT = (x, y, t) => { if (inb(x, y)) tiles[I(x, y)] = t; };
  const base = land === L.WOOD ? T.DARK : land === L.ROCK ? T.SAND : T.GRASS;
  // 1. Base tiles.
  { const q5 = noiseTab(hash(ns, 1), 5), q3 = noiseTab(hash(ns, 2), 3);   // n2 with lattices 5 and 3
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      let t = base; const n = ((2 * q5(x, y) + q3(x, y)) / 3) | 0;
      if (base === T.GRASS) { if (n > 20644) t = T.TALL; else if (hash(ns, x, y, 1) % 1000 < 45) t = T.FLOWERS; }
      else if (base === T.DARK) { if (n > 19661) t = T.TALL; }
      else if (n < 11141) t = T.GRASS;
      tiles[I(x, y)] = t;
    } }
  // 2. Water bands and the swimmer side (no cell is L.CLIFF in generator 2).
  const nbLand = (dx, dy) => { const x = cx + dx, y = cy + dy; if (!onMapXY(x, y)) return -1; const c = y * MW + x;
    if (G.land[c] === L.WATER) return G.ford[c] ? L.POND : L.WATER; return G.land[c]; };
  for (const [dn, dx, dy] of SIDES) {
    const swimSide = cell === G.swim && dn === G.swimDir;
    const nl = nbLand(dx, dy); if (!swimSide && nl !== L.WATER) continue;
    if (isFord && dx === 0) continue;
    const len = dx === 0 ? PW : PH;
    for (let k = 0; k < len; k++) {
      const depth = swimSide ? 7 + ((noiseQ(ns + 61, k, 0, 4) * 3 + 32768) >> 16) : 3 + ((noiseQ(ns + dx * 7 + dy * 13 + 99, k, 0, 4) * 5 + 32768) >> 16);
      for (let d = 0; d <= depth; d++) {
        const x = dn === 'left' ? d : dn === 'right' ? PW - 1 - d : k, y = dn === 'up' ? d : dn === 'down' ? PH - 1 - d : k;
        if (swimSide) { if (d < 3) setT(x, y, T.ISLE); else if (d < depth) setT(x, y, T.DEEP); else if (!T_BLOCK[tiles[I(x, y)]]) setT(x, y, hash(ns, x, y, 2) & 1 ? T.REEDS : T.SAND); }
        else if (d < depth) { if (tiles[I(x, y)] !== T.DEEP && tiles[I(x, y)] !== T.ISLE) setT(x, y, T.WATER); }
        else if (nl === L.WATER && !T_BLOCK[tiles[I(x, y)]]) setT(x, y, hash(ns, x, y, 2) & 1 ? T.REEDS : T.SAND);
      }
    }
  }
  // 3. Terrain bands, then stairs; from here on no random placement touches the terrain layer or the ring around a stair.
  g2Bands(G, cell, tiles, terr, tmask);
  const stairs = g2Stairs(G, seed, cell, tiles, terr, tmask);
  for (let i = 0; i < NP; i++) if (terr[i] >= TERR.STAIR) { const x = i % PW, y = (i / PW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) resv[I(x + dx, y + dy)] = 1; }
  const free = i => !terr[i] && !resv[i];
  // 4. Ford river.
  if (isFord) {
    for (let y = 0; y < PH; y++) { const w = (noiseQ(ns + 3, 0, y, 4) - 16384 + 4096) >> 13;
      for (let x = 9 + w; x <= 18 + w; x++) setT(x, y, T.WATER); setT(8 + w, y, T.REEDS); setT(19 + w, y, T.SAND); }
    for (let x = 0; x < PW; x++) if (tiles[I(x, 16)] === T.WATER) setT(x, 16, T.STEP);
  }
  const keep = i => tiles[i] === T.DEEP || tiles[i] === T.ISLE || terr[i] !== 0;
  // 5. Pond.
  if (land === L.POND) {
    const px = 6 + R.int(16), py = 5 + R.int(16), rxq = 56 + R.int(41), ryq = 56 + R.int(49), q = noiseTab(ns + 5, 3);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const i = I(x, y); if (keep(i) || resv[i]) continue;
      const X = (x - px) * 16, Y = (y - py) * 16;
      const v = ((X * X * 4096 / (rxq * rxq)) | 0) + ((Y * Y * 4096 / (ryq * ryq)) | 0) + ((q(x, y) / 10) | 0) - 1638;
      if (v < 4096) setT(x, y, T.WATER); else if (v < 6554 && tiles[i] !== T.WATER) setT(x, y, hash(ns, x, y, 3) % 100 < 55 ? T.REEDS : T.SAND);
    }
  }
  const walk = (x, y) => inb(x, y) && !T_BLOCK[tiles[I(x, y)]] && free(I(x, y));
  // 6. Overhangs, boulders, trees.
  const fellsRock = G.biome === 'fells' && land === L.ROCK, footN = fellsRock && cy > 0 && G.level[cell - MW] > G.level[cell];
  // Under a stair from a cliff (the north one first, then south, west, east), the other half of the stones falls as a fan below the stair, opening away from the cliff: a row is the stair's foot row plus the smallest of three rolls over the place's depth, and the stones are single tiles, alternately on the two sides of the stair's columns, within the fan's width.
  const fanSt = fellsRock ? ['up', 'down', 'left', 'right'].map(dn => stairs.find(st => st.dir === dn && st.role === 'lo')).find(Boolean) || null : null;
  // On a Fells stair place no overhang stands within 5 columns and 6 rows of the stair's entry or on its screen, and none lies on a path that step 9 will carve (a cut overhang reads as two pillars).
  const ovBar = new Set(), pathCells = new Set();   // pathCells: the tiles step 9 will carve, which clear any stone on them
  if (fanSt) {
    for (let dy = -6; dy <= 6; dy++) for (let dx = -5; dx <= 5; dx++) if (inb(fanSt.entry.x + dx, fanSt.entry.y + dy)) ovBar.add(I(fanSt.entry.x + dx, fanSt.entry.y + dy));
    const cx0 = Math.max(0, Math.min(PW * 48 - 450, fanSt.entry.x * 48 + 24 - 225)), cy0 = Math.max(0, Math.min(PH * 48 - 532, fanSt.entry.y * 48 + 24 - 266));   // the stair's screen (450 x 532, the camera clamped to the place): no overhang on it either
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const sx = x * 48 + 24 - cx0, sy = y * 48 + 24 - cy0; if (sx >= 0 && sx < 450 && sy >= 0 && sy < 532) ovBar.add(I(x, y)); }
    const mark = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) { ovBar.add(I(x0, y)); pathCells.add(I(x0, y)); } for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { ovBar.add(I(x, y1)); pathCells.add(I(x, y1)); } };
    for (const st of stairs) { const k = st.s, p = st.dir === 'up' ? { x: k, y: 3 } : st.dir === 'down' ? { x: k, y: PH - 4 } : st.dir === 'left' ? { x: 3, y: k } : { x: PW - 4, y: k };
      mark(st.entry.x, st.entry.y, p.x, p.y); mark(p.x, p.y, 14, p.y); mark(14, p.y, 14, PH - 3); }
  }
  const ovN = Math.max(G.glow.includes(cell) ? 1 : 0, land === L.ROCK ? 2 : land === L.MEADOW ? 1 : R.int(100) < 45 ? 1 : 0);
  for (let k = 0, tries = 0; k < ovN && tries < 400; tries++) {
    const ox = 2 + R.int(PW - 7), oy = 2 + R.int(PH - 8); let okO = true;
    for (let dy = 0; dy <= 3 && okO; dy++) for (let dx = -1; dx <= 3; dx++) if (!walk(ox + dx, oy + dy)) { okO = false; break; }
    if (okO && fanSt) for (let dy = 0; dy <= 2 && okO; dy++) for (let dx = 0; dx < 3; dx++) if (ovBar.has(I(ox + dx, oy + dy))) { okO = false; break; }
    if (!okO) continue;
    for (let dx = 0; dx < 3; dx++) { setT(ox + dx, oy, T.ROCK); setT(ox + dx, oy + 1, T.ROCK); shelter[I(ox + dx, oy + 2)] = 1; occ[I(ox + dx, oy + 2)] = 1; }
    feats.push({ id: 'o' + k, kind: 'o', x: ox, y: oy }); k++;
  }
  // Generator 4's Fells: a rock place has four times the stone placements (eight times on a stair place), half of them gathered at the foot of a cliff on the stair's side (north when there is a cliff but no stair).
  const rockN = land === L.ROCK ? (6 + R.int(4)) * (fellsRock ? (fanSt ? 8 : 7) : 1) : R.int(2) + (land === L.MEADOW ? 1 : 0);
  const fdir = fanSt ? fanSt.dir : footN ? 'up' : null, fvert = fdir === 'up' || fdir === 'down', fspan = fvert ? PW : PH, fext = fvert ? PH : PW;
  const fxy = (k, d) => ({ x: fdir === 'left' ? d : fdir === 'right' ? PW - 1 - d : k, y: fdir === 'up' ? d : fdir === 'down' ? PH - 1 - d : k });
  const edDepth = fanSt ? (fdir === 'up' ? fanSt.entry.y : fdir === 'down' ? PH - 1 - fanSt.entry.y : fdir === 'left' ? fanSt.entry.x : PW - 1 - fanSt.entry.x) : 0;
  // the stair's screen (450 x 532, the camera centred on the entry and clamped to the place), as the columns (rows, for a west or east stair) across the stair it shows
  const scrX0 = fanSt ? Math.max(0, Math.min(PW * 48 - 450, fanSt.entry.x * 48 + 24 - 225)) : 0, scrY0 = fanSt ? Math.max(0, Math.min(PH * 48 - 532, fanSt.entry.y * 48 + 24 - 266)) : 0;
  const onScr = (x, y) => { const sx = x * 48 + 24 - scrX0, sy = y * 48 + 24 - scrY0; return sx >= 0 && sx < 450 && sy >= 0 && sy < 532; };
  const acrossOn = k => fvert ? onScr(k, fanSt.entry.y) : onScr(fanSt.entry.x, k);
  let fanN = 0, footN2 = 0, onCount = 0; const rowCnt = new Map();
  // A fan stone's column: in the walk-in (the first 3 rows below the stair) the fan keeps clear of the stair's columns; past it, the left half reaches from s - w to s and the right half from s + 1 to s + 1 + w, the stair's own columns included (w is the fan's width at that row).
  const fanCol = (side, dd) => { const w = 1 + dd - edDepth; return dd >= edDepth + 3 ? (side ? fanSt.s + 1 + R.int(w + 1) : fanSt.s - R.int(w + 1)) : (side ? fanSt.s + 2 + R.int(w) : fanSt.s - 1 - R.int(w)); };
  const fanOn = [];   // the fan stones placed on the screen, last last: the backstop lifts the last one when the screen is full
  const depthOf = (x, y) => fdir === 'up' ? y : fdir === 'down' ? PH - 1 - y : fdir === 'left' ? x : PW - 1 - x; const footSide = [0, 0];
  // the foot-row stones of a stair place alternate sides of the stair's columns too, each at a random column of its side (a side with fewer than 3 columns of room is skipped), so neither side of the screen is bare
  const footLo = fanSt ? 2 : 0, footHi = fanSt ? fspan - 3 : 0, roomL = fanSt ? fanSt.s - footLo : 0, roomR = fanSt ? footHi - (fanSt.s + 2) + 1 : 0;
  // No stone of a Fells rock place makes a straight run of 3 or more on one row or one column, inside any group (a run reads laid even with a stone hanging off its end): such a stone takes its next roll, and is dropped after 4. Carved-path tiles count as clear and overhang tiles are left out.
  const ovTiles = new Set(); for (const f of feats) if (f.kind === 'o') for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 2; dy++) ovTiles.add(I(f.x + dx, f.y + dy));
  const lineBad = (x, y) => { const i0 = I(x, y); if (tiles[i0] === T.ROCK) return false;
    if (pathCells.has(i0)) return true;   // a stone on the path is carved away: roll again
    const rock = (u, v) => inb(u, v) && tiles[I(u, v)] === T.ROCK && !ovTiles.has(I(u, v)) && !pathCells.has(I(u, v));
    let h = 1, w = 1; for (let u = x - 1; rock(u, y); u--) h++; for (let u = x + 1; rock(u, y); u++) h++; for (let v = y - 1; rock(x, v); v--) w++; for (let v = y + 1; rock(x, v); v++) w++;
    return h >= 3 || w >= 3; };
  for (let k = 0; k < rockN; k++) {
    const footRow = footN || fanSt ? k % 2 : 0, fan = fanSt && !footRow;
    let kk, dd, s = 0;
    if (fanSt) {
      let side;
      if (fan) { side = fanN++ % 2 ? 1 : 0; }
      else { side = footN2++ % 2 ? (roomR < 3 ? 0 : 1) : (roomL >= 3 ? 0 : 1); }
      if (!fan) footSide[side]++;
      for (let tr = 0; tr < 4; tr++) {
        if (fan) { dd = Math.min(edDepth + Math.min(R.int(fext - 4), R.int(fext - 4), R.int(fext - 4)), fext - 3); kk = fanCol(side, dd); }
        else { const lo = side ? fanSt.s + 2 : footLo, len = side ? roomR : roomL, vis = [];   // the first 3 foot-row stones of a side fall in its columns on the screen
          if (footSide[side] <= 3) for (let c = lo; c < lo + len; c++) if (acrossOn(c)) vis.push(c);
          kk = footSide[side] <= 3 && vis.length ? vis[R.int(vis.length)] : lo + R.int(len); dd = 2 + R.int(3); }
        const { x, y } = fxy(kk, dd);
        if (!walk(x, y)) break;
        if (lineBad(x, y)) continue;
        if (onScr(x, y) && tiles[I(x, y)] !== T.ROCK) { if (onCount >= 20) break; if ((rowCnt.get(fvert ? y : x) || 0) >= 4) continue; onCount++; rowCnt.set(fvert ? y : x, (rowCnt.get(fvert ? y : x) || 0) + 1); }   // the 21st stone on the stair's screen is skipped, and a 5th in a row (a column, for a west or east stair) rolls again
        if (fan && onScr(x, y) && tiles[I(x, y)] !== T.ROCK) fanOn.push({ x, y, prev: tiles[I(x, y)] });
        setT(x, y, T.ROCK); break;
      }
      continue;
    }
    else if (fellsRock) {   // a plain Fells rock place: 55% single tiles and 45% small heaps (a tile and 1 to 3 of its 8 neighbours), no tile making a straight run of 3 and none completing a full 2 x 2
      const heap = R.int(100) >= 55, fullAt = (X, Y) => { const rk = (u, v) => (tiles[I(u, v)] === T.ROCK && !ovTiles.has(I(u, v))) || (u === X && v === Y);
        for (const [ax, ay] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (rk(X + ax, Y + ay) && rk(X + ax + 1, Y + ay) && rk(X + ax, Y + ay + 1) && rk(X + ax + 1, Y + ay + 1)) return true; return false; };
      let sx = -1, sy = -1;
      for (let tr = 0; tr < 4; tr++) {
        kk = 2 + R.int(fdir ? fspan - 4 : PW - 4); dd = footRow ? 2 + R.int(3) : 2 + R.int(fdir ? fext - 4 : PH - 4);
        const { x, y } = fdir ? fxy(kk, dd) : { x: kk, y: dd };
        if (!walk(x, y)) break;
        if (tiles[I(x, y)] === T.ROCK || lineBad(x, y) || fullAt(x, y)) continue;
        setT(x, y, T.ROCK); sx = x; sy = y; break;
      }
      if (heap && sx >= 0) { const nb = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], take = 1 + R.int(3);
        for (let j = 0, got = 0; j < nb.length && got < take; j++) { const m = j + R.int(nb.length - j), t = nb[m]; nb[m] = nb[j]; nb[j] = t;
          const X = sx + t[0], Y = sy + t[1]; if (!walk(X, Y) || tiles[I(X, Y)] === T.ROCK || lineBad(X, Y) || fullAt(X, Y)) continue; setT(X, Y, T.ROCK); got++; } }
      continue; }
    else { kk = 2 + R.int(fdir ? fspan - 4 : PW - 4); dd = footRow ? 2 + R.int(3) : 2 + R.int(fdir ? fext - 4 : PH - 4); s = R.int(100) < 45 && !footRow ? 1 : 0; }   // a foot-row stone is a single tile
    const { x, y } = fdir ? fxy(kk, dd) : { x: kk, y: dd };
    for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) if (walk(x + dx, y + dy) && (s === 0 || R.int(100) < 80)) setT(x + dx, y + dy, T.ROCK); }
  // A stair screen that ends with fewer than 10 stones gets fan stones on the screen until it holds 10, each under the same line rule.
  for (let tr = 0; fanSt && onCount < 10 && tr < 120; tr++) {
    const side = fanN++ % 2 ? 1 : 0, dd = Math.min(edDepth + Math.min(R.int(fext - 4), R.int(fext - 4), R.int(fext - 4)), fext - 3), kk = fanCol(side, dd), { x, y } = fxy(kk, dd);
    if (!inb(x, y) || !onScr(x, y) || !walk(x, y) || tiles[I(x, y)] === T.ROCK || (rowCnt.get(fvert ? y : x) || 0) >= 4 || lineBad(x, y)) continue;
    setT(x, y, T.ROCK); onCount++; rowCnt.set(fvert ? y : x, (rowCnt.get(fvert ? y : x) || 0) + 1);
  }
  // The backstop: the 4 columns s - 1 to s + 2 hold a stone 5 or more rows out on the screen; if not, one more fan stone goes there (the last fan stone on a full screen is lifted first).
  if (fanSt) {
    const inBand = (x, y) => { const k = fvert ? x : y; return k >= fanSt.s - 1 && k <= fanSt.s + 2; };
    let has = false; for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (tiles[I(x, y)] === T.ROCK && !ovTiles.has(I(x, y)) && onScr(x, y) && depthOf(x, y) >= 5 && inBand(x, y)) has = true;
    if (!has) {
      if (onCount >= 20 && fanOn.length) { const f = fanOn.pop(); tiles[I(f.x, f.y)] = f.prev; onCount--; rowCnt.set(fvert ? f.y : f.x, rowCnt.get(fvert ? f.y : f.x) - 1); }
      for (let tr = 0; tr < 120; tr++) {
        const kk = fanSt.s - 1 + R.int(4), dd = 5 + R.int(fext - 8), { x, y } = fxy(kk, dd);
        if (!inb(x, y) || !onScr(x, y) || !walk(x, y) || tiles[I(x, y)] === T.ROCK || (rowCnt.get(fvert ? y : x) || 0) >= 4 || lineBad(x, y)) continue;
        setT(x, y, T.ROCK); onCount++; rowCnt.set(fvert ? y : x, (rowCnt.get(fvert ? y : x) || 0) + 1); break;
      }
    }
  }
  const treeN = land === L.WOOD ? 11 + R.int(5) : land === L.MEADOW ? 1 + R.int(2) : R.int(2);
  for (let k = 0, tries = 0; k < treeN && tries < 200; tries++) {
    const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4); let okT = true;
    for (let dy = -1; dy <= 1 && okT; dy++) for (let dx = -1; dx <= 1; dx++) if (!walk(x + dx, y + dy)) { okT = false; break; }
    for (let dy = -2; dy <= 2 && okT; dy++) for (let dx = -2; dx <= 2; dx++) if (inb(x + dx, y + dy) && tiles[I(x + dx, y + dy)] === T.TRUNK) { okT = false; break; }
    if (okT) { setT(x, y, T.TRUNK); k++; }
  }
  // 7. The burrow, on the bottom row of the gate's south-facing face.
  const spawnPt = { x: 14, y: PH - 3 };
  const carve2 = (x0, y0, x1, y1) => {
    const fix = (x, y) => { if (!inb(x, y) || terr[I(x, y)]) return; const t = tiles[I(x, y)]; if (t === T.WATER) setT(x, y, T.STEP); else if (T_BLOCK[t]) setT(x, y, base === T.DARK ? T.DARK : T.SAND); occ[I(x, y)] = 1; };
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) fix(x0, y);
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) fix(x, y1);
  };
  if (cell === G.gate) {
    const gx = 11 + R.int(6);
    for (let dx = -1; dx <= 1; dx++) { setT(gx + dx, 2, T.SAND); occ[I(gx + dx, 2)] = 1; }
    carve2(gx, 2, spawnPt.x, spawnPt.y);
    feats.push({ id: 'g', kind: 'g', x: gx, y: 1 });
  }
  // 8. The swimmer island and the dry strip (which never opens the terrain layer).
  if (cell === G.swim) {
    const m = G.swimDir, ix = m === 'left' ? 2 : m === 'right' ? PW - 3 : 13, iy = m === 'up' ? 2 : m === 'down' ? PH - 3 : 15;
    feats.push({ id: 'i', kind: 'i', x: ix, y: iy });
    for (let k = 0; k < (m === 'up' || m === 'down' ? PW : PH); k++) {
      for (let d = 10; d <= 12; d++) { const x = m === 'left' ? d : m === 'right' ? PW - 1 - d : k, y = m === 'up' ? d : m === 'down' ? PH - 1 - d : k;
        if (inb(x, y) && !terr[I(x, y)] && T_BLOCK[tiles[I(x, y)]] && tiles[I(x, y)] !== T.DEEP) setT(x, y, base === T.DARK ? T.DARK : T.SAND); }
    }
  }
  // 9. A path for each stair: straight inward to depth 3, then horizontal and vertical to the spawn point.
  for (const st of stairs) {
    const k = st.s, p = st.dir === 'up' ? { x: k, y: 3 } : st.dir === 'down' ? { x: k, y: PH - 4 } : st.dir === 'left' ? { x: 3, y: k } : { x: PW - 4, y: k };
    carve2(st.entry.x, st.entry.y, p.x, p.y);
    carve2(p.x, p.y, spawnPt.x, p.y);
    carve2(spawnPt.x, p.y, spawnPt.x, spawnPt.y);
  }
  // 10. Features.
  const spot = (minSep) => { for (let t = 0; t < 90; t++) {
      const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), i = I(x, y);
      if (T_BLOCK[tiles[i]] || tiles[i] === T.STEP || tiles[i] === T.STAIR || tiles[i] === T.APRON || occ[i] || !free(i)) continue;
      if (Math.abs(x - spawnPt.x) + Math.abs(y - spawnPt.y) < 4) continue;
      if (feats.some(f => f.kind !== 'o' && Math.abs(f.x - x) + Math.abs(f.y - y) < minSep)) continue;
      occ[i] = 1; return { x, y }; } return null; };
  const mix = FEAT_MIX[land] || FEAT_MIX[L.MEADOW];
  const n = ([a, b]) => a + R.int(b - a + 1);
  const addF = (kind, count, init) => { for (let k = 0; k < count; k++) { const p = spot(3); if (p) feats.push(Object.assign({ id: kind + k, kind, x: p.x, y: p.y }, init ? init() : {})); } };
  addF('b', n(mix.b));
  addF('u', n(mix.u), () => ({ full: R.int(100) < 75 }));
  addF('k', n(mix.k), () => ({ ch: R.int(100) < 10 ? 2 : 0 }));
  addF('s', n(mix.s), () => ({ under: R.int(100) < 22 ? 'pod' : null }));
  addF('n', n(mix.n) + (cell === G.gate ? 1 : 0));
  if (G.beacons.set.has(cell)) addF('j', 1);
  if (G.depots.set.has(cell)) addF('h', 1);
  if (cell === G.deep) { const p = { x: 14 + R.int(5) - 2, y: 12 + R.int(4) };
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = p.x + dx, Y = p.y + dy; if (T_BLOCK[tiles[I(X, Y)]]) setT(X, Y, T.SAND); }
    carve2(p.x, p.y + 1, spawnPt.x, spawnPt.y);
    for (let i = feats.length - 1; i >= 0; i--) if (cheb(feats[i], p) <= 1 && feats[i].kind !== 'o') feats.splice(i, 1);
    feats.push({ id: 'd', kind: 'd', x: p.x, y: p.y }); }
  const lay = { key: String(cell), cell, cave: false, land, base, tiles, shelter, feats, terr, tmask, stairs };
  return finishLayout2(lay, spawnPt);
}

export function genCave2(seed, cell) {
  const R = makeRng(hash(seed, 'cave', cell)), ns = hash(seed, 'cn', cell);
  const tiles = new Uint8Array(PW * PH).fill(T.CWALL), shelter = new Uint8Array(PW * PH).fill(1), feats = [], occ = new Uint8Array(PW * PH);
  const I = (x, y) => y * PW + x, setT = (x, y, t) => { if (x >= 0 && y >= 0 && x < PW && y < PH) tiles[I(x, y)] = t; };
  for (let y = 1; y < PH - 1; y++) for (let x = 1; x < PW - 1; x++) {
    const X = 2 * x - 27, Y = 2 * y - 30;
    const v = ((X * X * 4096 / 576) | 0) + ((Y * Y * 4096 / 729) | 0) + ((noiseQ(ns, x, y, 4) / 9) | 0) - 1820;
    if (v < 3686) setT(x, y, T.CFLOOR);
  }
  for (let k = 0; k < 4; k++) { const px = 5 + R.int(18), py = 5 + R.int(15); for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) if (R.int(100) < 85) setT(px + dx, py + dy, T.CWALL); }
  for (let y = 21; y <= 28; y++) for (let x = 12; x <= 16; x++) setT(x, y, T.CFLOOR);
  for (let y = 6; y <= 21; y++) setT(14, y, T.CFLOOR);
  const spawnPt = { x: 14, y: 27 };
  feats.push({ id: 'x', kind: 'x', x: 14, y: 28 }); occ[I(14, 28)] = 1;
  for (let y = 25; y <= 27; y++) for (let x = 13; x <= 15; x++) occ[I(x, y)] = 1;
  const spot = (pred) => { for (let t = 0; t < 120; t++) { const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), i = I(x, y);
      if (tiles[i] !== T.CFLOOR || occ[i] || (pred && !pred(x, y))) continue;
      if (feats.some(f => Math.abs(f.x - x) + Math.abs(f.y - y) < 3)) continue; occ[i] = 1; return { x, y }; } return null; };
  for (let k = 0; k < 3; k++) { const p = spot((x, y) => y >= 13 && y <= 21); if (p) feats.push({ id: 'e' + k, kind: 'e', x: p.x, y: p.y }); }
  for (let k = 0; k < 7; k++) { const p = spot(); if (p) { feats.push({ id: 'm' + k, kind: 'm', x: p.x, y: p.y }); occ[I(p.x, p.y)] = 0; } }
  [2, 2, 0].forEach((ch, k) => { const p = spot(); if (p) feats.push({ id: 'k' + k, kind: 'k', x: p.x, y: p.y, ch }); });
  for (let k = 0; k < 2; k++) { const p = spot(); if (p) feats.push({ id: 'u' + k, kind: 'u', x: p.x, y: p.y, full: true }); }
  { const p = spot(); if (p) feats.push({ id: 'n0', kind: 'n', x: p.x, y: p.y }); }
  { const p = spot(); if (p) feats.push({ id: 's0', kind: 's', x: p.x, y: p.y, under: 'pod' }); }
  const lay = { key: 'c' + cell, cell, cave: true, land: L.ROCK, base: T.CFLOOR, tiles, shelter, feats };
  finishLayout2(lay, spawnPt);
  for (let i = 0; i < PW * PH; i++) if (tiles[i] === T.CFLOOR && !lay.reach[i] && !lay.feats.some(f => f.y * PW + f.x === i)) tiles[i] = T.CWALL;
  return lay;
}
// ---- end generator 2 ----

// ---- life: the creatures and the world's buried pods ----
// The roster, in species-id order (an id is a slot: new species are appended, never inserted). `hab` is the lands a species lives on;
// `nest` marks the species that holds the glow cells and the cave under the cliff. The page's SPECIES rows take their `hab` from here.
export const ROSTER = [
  { name: 'Loika', hab: [L.MEADOW, L.POND] },
  { name: 'Tuikis', hab: [L.WOOD, L.ROCK], nest: true },
  { name: 'Untuva', hab: [L.WOOD, L.MEADOW, L.POND] },
];
export const groundName = (land, cave) => cave ? 'cave' : ['meadow', 'pond', 'rock', 'wood', 'pond', 'rock'][land];
// A realm is a pure function of (seed, generator, roster); it reads G only, never a save. Generators 1 and 2 keep their life as it was
// (genLife12, frozen); generator 3 has the herd floor (genLife3).
export function genLife(G, seed, roster = ROSTER) {
  return G.gen >= 4 ? genLife3(G, seed, roster, G.biome) : G.gen >= 3 ? genLife3(G, seed, roster) : genLife12(G, seed, roster);
}

// Generators 1 and 2: each cell draws from its habitat's pool, so a species can be missing from a realm. Frozen: saves and vectors depend on it.
function genLife12(G, seed, roster) {
  const cr = [], pods = []; let id = 1;
  const add = (sp, c, cv) => { cr.push({ id, sp, c, cv: cv ? 1 : 0, b: Math.round(rnd(seed, 'bold', id) * 100) / 100, s: 0 }); id++; };
  for (let c = 0; c < MW * MH; c++) {
    const l = G.land[c]; if (!passableIn(G, c) || l === L.WATER) continue;
    const pool = roster.map((_, i) => i).filter(s => roster[s].hab.includes(l)); if (!pool.length) continue;
    const r = rnd(seed, 'pop', c); let n = 0;
    if (G.spawns.includes(c)) n = 4 + Math.floor(rnd(seed, 'pn', c) * 3);
    else if (r < .3) n = 4 + Math.floor(rnd(seed, 'pn', c) * 5);
    else if (r < .55) n = 1 + (rnd(seed, 'pm', c) < .5 ? 1 : 0);
    const a = pool[Math.floor(rnd(seed, 'pa', c) * pool.length)], b = pool[Math.floor(rnd(seed, 'pb', c) * pool.length)];
    for (let i = 0; i < n; i++) add(i % 3 === 2 ? b : a, c, 0);
  }
  for (const c of G.glow) { const have = cr.filter(w => w.c === c && w.sp === 1).length; for (let i = have; i < 3; i++) add(1, c, 0); }
  for (let i = 0; i < 2; i++) add(1, G.gate, 0);
  for (let i = 0; i < 4; i++) add(1, G.gate, 1);   // Tuikis nest under the cliff
  const R = makeRng(hash(seed, 'pods'));
  const homes = R.shuffle([...new Set(cr.filter(w => !w.cv && !G.spawns.includes(w.c) && G.comp[w.c]).map(w => w.c))]);
  for (let i = 0; i < Math.min(7, homes.length); i++) {
    const c = homes[i], here = cr.filter(w => w.c === c);
    pods.push({ id: 'w' + i, k: String(c), x: -1, y: -1, sp: R.pick(here).sp, h: 1, bur: 1, g: groundName(G.land[c], false), how: 'ground' });
  }
  pods.push({ id: 'cv', k: 'c' + G.gate, x: -1, y: -1, sp: 0, h: 0, bur: 1, g: 'cave', how: 'ground' }); // a Loika sheltered here once
  return { cr, pods };
}

// Generator 3 (integer only): every species has its own seed stream, so a species added to the roster never moves another's herds, its
// ids or its pods. Each species draws its herds over its own habitat; then the floor tops it up to at least HERD.FLOOR herds of
// HERD.SIZE or more on the reachable component, placed by construction, never rerolled: herd k comes from hash(seed, 'herd', species, k).
export const HERD = { SIZE: 3, FLOOR: 2, PODS: 2 };   // a herd is 3 or more in one cell (the sweep's tracks threshold); 2 buried pods a species
export function genLife3(G, seed, roster, biome) {
  const N = MW * MH, pct = (...a) => hash(seed, ...a) % 100, cr = [], pods = [];
  roster.forEach((r, sp) => {
    const live = c => passableIn(G, c) && G.land[c] !== L.WATER && r.hab.includes(G.land[c]), n = new Array(N).fill(0);
    for (let c = 0; c < N; c++) {
      if (!live(c)) continue;
      if (G.spawns.includes(c)) { if (pct('spawn', sp, c) < 70) n[c] = 4 + pct('pn', sp, c) % 3; continue; }
      const q = pct('pop', sp, c);
      if (q < 15) n[c] = 4 + pct('pn', sp, c) % 5; else if (q < 35) n[c] = 1 + pct('pm', sp, c) % 2;
    }
    if (r.nest) { for (const c of G.glow) n[c] = Math.max(n[c], 3); if (G.gate >= 0) n[G.gate] += 2; }
    const herd = c => G.comp[c] === 1 && n[c] >= HERD.SIZE;
    let have = 0; const open = [];
    for (let c = 0; c < N; c++) { if (herd(c)) have++; else if (live(c) && G.comp[c] === 1) open.push(c); }
    for (let k = 0; have < HERD.FLOOR && open.length; k++, have++) {
      const R = makeRng(hash(seed, 'herd', sp, k)), c = open.splice(R.int(open.length), 1)[0];
      n[c] = Math.max(n[c], HERD.SIZE + R.int(3));
    }
    // Generator 4: a biome's habitat herds doubled. A species that lives on the biome's land gets as many more herds there as it has
    // (at least the floor's), on its own stream, placed by construction on the reachable component.
    const hl = BIOME_HABITAT[biome];
    if (hl !== undefined && r.hab.includes(hl)) {
      let there = 0; const room = [];
      for (let c = 0; c < N; c++) if (G.land[c] === hl && live(c) && G.comp[c] === 1) { if (n[c] >= HERD.SIZE) there++; else room.push(c); }
      for (let k = 0, more = Math.max(there, HERD.FLOOR); k < more && room.length; k++) {
        const R = makeRng(hash(seed, 'herd4', sp, k)), c = room.splice(R.int(room.length), 1)[0];
        n[c] = HERD.SIZE + R.int(3);
      }
    }
    let i = 0; const mine = (c, cv) => cr.push({ id: 0, sp, c, cv, b: pct('bold', sp, i++) / 100, s: 0 });
    for (let c = 0; c < N; c++) for (let j = 0; j < n[c]; j++) mine(c, 0);
    if (r.nest && G.gate >= 0) for (let j = 0; j < 4; j++) mine(G.gate, 1);   // the nest under the cliff
    const R = makeRng(hash(seed, 'pods', sp));
    const homes = R.shuffle([...new Set(cr.filter(w => w.sp === sp && !w.cv && !G.spawns.includes(w.c) && G.comp[w.c]).map(w => w.c))]);
    for (let j = 0; j < Math.min(HERD.PODS, homes.length); j++) {
      const c = homes[j];
      pods.push({ id: 'w' + sp + 'p' + j, k: String(c), x: -1, y: -1, sp, h: 1, bur: 1, g: groundName(G.land[c], false), how: 'ground' });
    }
  });
  cr.forEach((w, i) => { w.id = i + 1; });
  pods.push({ id: 'cv', k: 'c' + G.gate, x: -1, y: -1, sp: 0, h: 0, bur: 1, g: 'cave', how: 'ground' });   // a Loika sheltered here once
  return { cr, pods };
}

// ---- generator 4 (integer only): biomes ----
// Generator 2's ground with a land-weight table per biome, and generator 3's life with the biome's habitat herds doubled. `mixed` is
// generator 3's ground to the bit. Every other biome re-weights generator 2's own stages (BIOME_GROUND) and draws on its own seed streams.
// No cell is L.CLIFF here, as in generator 2: a cliff is an edge between levels, so the Fells' cliffs are their doubled height changes.
export const BIOMES = ['mixed', 'woods', 'fells', 'marsh'];
//   river: the river setting (g4Course); mP1, mP2: the wood noise lattices (generator 2: 8, 4; Woods ranks on a coarser noise for one body of forest);
//   wood, rock: how many cells the noise ranks take for each land (generator 2: 80 and 48); fords: extra ford rows (generator 2 has 2 rows);
//   lakes, lakeTwo: extra small lakes and the percent of them with a second cell; pondP, ring8: the pond edge (generator 2: 35 percent, 4 sides);
//   hP1, hP2, rampQ, lv, zoneMin: the height noise lattices, the slope toward the mountain edge, the level shares by rank and the smallest zone kept
//   (generator 2: 8, 4, 16384, 15 45 40, 4). Fells: a valley (the slope rises on both sides of the river by its distance from it, rampQ at 8 cells),
//   the rock ranked on the high ground (rockHigh), the wood on the low (woodLow), a few small tarns, and extraStairs: that percent of stairs again on cliff
//   edges besides the spanning tree's, so the walls stay long and the stairs are twice generator 2's. Marsh: its ground is low, so its ranks put most of it on the top level.
const RIVER_G2 = { axis: 'ns', lo: 8, hi: 13, turnP: 45, iy: [3, 16], n: 1, ford: 2 };   // generator 2's river band, with the island row drawn from 3 to 16
export const BIOME_GROUND = {
  mixed: null,
  woods: { name: 'woods', river: { axis: 'pick', lo: 2, hi: 13, turnP: 60, iy: [3, 16], n: 1, ford: 1 }, mP1: 16, mP2: 8, wood: 200, rock: 36, fords: 0, lakes: 0, lakeTwo: 0, pondP: 50, ring8: false, hP1: 8, hP2: 4, rampQ: 16384, lv: [15, 45, 40], zoneMin: 4 },
  fells: { name: 'fells', river: { axis: 'ns', lo: 5, hi: 10, turnP: 15, iy: [3, 16], n: 1, ford: 2, lake: 0 }, valley: true, rockHigh: true, woodLow: 6, extraStairs: 110, wood: 66, rock: 128, fords: 0, lakes: 5, lakeTwo: 80, pondP: 0, ring8: false, hP1: 8, hP2: 4, rampQ: 24576, lv: [20, 35, 45], zoneMin: 4 },
  marsh: { name: 'marsh', river: { axis: 'ns', lo: 2, hi: 13, turnP: 40, iy: [3, 16], n: 2, span: 11, ford: 2, lake: 0 }, pools: 6, poolMin: 3, poolMax: 6, wood: 78, rock: 44, fords: 2, lakes: 0, lakeTwo: 0, pondP: 50, ring8: true, hP1: 8, hP2: 4, rampQ: 16384, lv: [0, 10, 90], zoneMin: 4 },
};
export const WALK_MIN = 260;   // a biome world holds at least this many walkable cells on its reachable component
// The land a biome's habitat herds stand on: a species whose habitat holds it has its herds there doubled.
export const BIOME_HABITAT = { woods: L.WOOD, fells: L.ROCK, marsh: L.POND };

function walkCells(G) { let n = 0; for (let c = 0; c < NC; c++) n += G.comp[c]; return n; }
export function genWorld4(seed, biome = 'mixed') {
  if (!BIOMES.includes(biome)) throw new RangeError('unknown biome: ' + biome);
  const B = BIOME_GROUND[biome];
  const done = G => ({ ...G, gen: 4, biome, shade: shadeCells(G, seed, biome) });
  for (let t = 0; t < G2.TRIES; t++) { const G = g2Attempt(seed, t, B); if (G && !g2Check(G, false).length && walkCells(G) >= WALK_MIN) return done(G); }
  const G = g2Attempt(seed, G2.TRIES, B);
  if (G && !g2Check(G, true).length) return done(G);
  throw new RangeError('generator 4: no valid ' + biome + ' world for seed ' + seed);
}
// The Shade (deep wood under a closed canopy): one in three of a Woods world's reachable wood places, the most enclosed first (a wood place
// with the most wood around it), ties by a hash and then the lower cell. Other biomes have none.
function shadeCells(G, seed, biome) {
  const shade = new Uint8Array(NC);
  if (biome !== 'woods') return shade;
  const wood = [];
  for (let c = 0; c < NC; c++) if (G.land[c] === L.WOOD && G.comp[c] && !G.island[c]) {
    const x = c % MW, y = (c / MW) | 0; let n = 0;
    for (const [dx, dy] of NB8) if (onMapXY(x + dx, y + dy) && G.land[(y + dy) * MW + x + dx] === L.WOOD) n++;
    wood.push({ c, n, k: hash(seed, 'shade', c) });
  }
  wood.sort((a, b) => b.n - a.n || a.k - b.k || a.c - b.c);
  for (let i = 0, k = (wood.length / 3) | 0; i < k; i++) shade[wood[i].c] = 1;
  return shade;
}
// ---- end generator 4 ----
